/**
 * TrueDiagnostics stores PII in TrueVault, and non-PII with this NodeJS server. This file holds
 * the bulk of the NodeJS application code, and all "internal API" endpoints. This is included in
 * our Sample App to show how you can store non-PII data anyway you want when using TrueVault. The
 * majority of the endpoints here do not interact with TrueVault, because the client-side code
 * communicates directly with TrueVault. The notable exception is email sending. Search this file
 * for 'email' to see how you TrueVault can help you send event-driven emails to your customers
 * without storing their email (PII) on your server.
 *
 * If you're reviewing the Sample App to better understand how to integrate with TrueVault, you
 * don't need to look closely at this server component. In your application, this piece will be all
 * your custom code and will necessarily be quite different.
 */
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const chalk = require('chalk');
const app = express();
require('dotenv').config({path: '../.env'});
const TrueVaultClient = require('truevault');
const {db, insertCaseRow, reviewCaseRow, approveCaseRow} = require('./db');
// eslint-disable-next-line no-native-reassign
fetch = require('node-fetch');
// eslint-disable-next-line no-native-reassign
btoa = require('btoa');
// eslint-disable-next-line no-native-reassign
atob = require('atob');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_INVITE_PATIENT_TEMPLATE_ID = process.env.SENDGRID_INVITE_PATIENT_TEMPLATE_ID;
const SENDGRID_APPROVED_TEMPLATE_ID = process.env.SENDGRID_APPROVED_TEMPLATE_ID;

if (!SENDGRID_API_KEY) {
    console.error(chalk.red('Sendgrid config keys not in environment. Generate .env in the root directory by following the README instructions.'));
    process.exit(1);
}

app.use(morgan('combined'));
app.use(express.static('public'));
app.use(bodyParser.json());

/**
 * Reads the TrueVault user belonging to the provided access token and validates whether the user is
 * allowed to make a request based on their role (e.g. admin, doctor, patient).
 *
 * @param authorizedRoles List of roles that are authorized to make the request. If the role of the
 *          user matches any of the roles in this list, the request is permitted.
 */
function validateRoleMiddleware(...authorizedRoles) {
    return async (req, res, next) => {
        const accessToken = req.headers['x-tv-access-token'];
        const tvClient = new TrueVaultClient(accessToken);
        req.tvClient = tvClient;
        try {
            const user = await tvClient.readCurrentUser();
            const role = user.attributes.role;
            if (authorizedRoles.includes(role)) {
                req.user = user;
                next();
            } else {
                res.status(403).send(`Role not authorized: ${role}`);
            }
        } catch(error) {
            res.status(401).send(error);
        }
    };
}

function formatRow(row) {
    return {
        caseDocId: row.case_doc_id,
        diagnosisDocId: row.diagnosis_doc_id,
        status: row.status,
        approverId: row.approver_id,
        reviewerId: row.reviewer_id,
        patientUserId: row.patient_user_id,
        readGroupId: row.read_group_id
    };
}

app.post('/api/case', validateRoleMiddleware('admin'), async (req, res) => {
    try {
        if (req.body.approverId === req.body.reviewerId) {
            return res.status(403).send(`Reviewer and approver cannot be the same`);
        }
        await insertCaseRow(req.body.caseDocId, req.body.diagnosisDocId, req.body.approverId, req.body.reviewerId, req.body.readGroupId);
        res.sendStatus(201);
    } catch (e) {
        console.log(chalk.red(`Error creating case: ${e.stack}`));
        res.status(500).send(`An error occurred: ${e}`);
    }
});

app.get('/api/case/mine', validateRoleMiddleware('doctor'), async (req, res) => {
    try {
        const cases = await db.query("SELECT * FROM cases WHERE (approver_id=$1 AND status='WAITING_FOR_APPROVAL') OR (reviewer_id=$1 AND status='WAITING_FOR_REVIEW')",
            req.user.id);
        res.send(JSON.stringify(cases.map(c => formatRow(c))), null, 2);
    } catch (e) {
        console.log(chalk.red(`Error listing cases: ${e.stack}`));
        res.sendStatus(500).send(`An error occurred: ${e}`);
    }
});

app.get('/api/case/patient', validateRoleMiddleware('patient'), async (req, res) => {
    try {
        const caseMetadata = await db.one('SELECT * FROM cases WHERE patient_user_id=$1', req.user.id);
        res.send(JSON.stringify(formatRow(caseMetadata), null, 2));
    } catch (e) {
        console.log(chalk.red(`Error getting patient's case: ${e.stack}`));
        res.status(500).send(`An error occurred: ${e}`);
    }
});

app.post('/api/case/id/:caseDocId/review', validateRoleMiddleware('doctor'), async (req, res) => {
    try {
        const caseMetadata = await db.one('SELECT * FROM cases WHERE case_doc_id=($1)', req.params.caseDocId);
        if (caseMetadata.reviewer_id !== req.user.id) {
            return res.status(403).send(`User is not reviewer of case`);
        }
        if (!['WAITING_FOR_REVIEW', 'WAITING_FOR_APPROVAL'].includes(caseMetadata.status)) {
            return res.status(403).send(`Case is not in reviewable state: ${caseMetadata.status}`);
        }
        await reviewCaseRow(req.params.caseDocId);
        res.sendStatus(200);
    } catch (e) {
        console.log(chalk.red(`Error reviewing case: ${e.stack}`));
        return res.sendStatus(500).send(`An error occurred: ${e}`);
    }
});

app.post('/api/case/id/:caseDocId/approve', validateRoleMiddleware('doctor'), async (req, res) => {
    try {
        const caseMetadata = await db.one('SELECT * FROM cases WHERE case_doc_id=($1)', req.params.caseDocId);
        if (caseMetadata.approver_id !== req.user.id) {
            return res.status(403).send(`User is not approver of case`);
        }
        if (caseMetadata.status !== 'WAITING_FOR_APPROVAL') {
            return res.status(403).send(`Case is not in approvable state: ${caseMetadata.status}`);
        }

        const recipientUserId = caseMetadata.patient_user_id;
        if (recipientUserId) {
            const substitutions = {
                "{{name}}": {user_attribute: "name"}
            };
            console.log(`Sending approval notification email to user id ${recipientUserId} with substitutions ${JSON.stringify(substitutions, null, 2)}`);
            // Note that we can send an email to this user without knowing their email address. We only need to know their
            // TrueVault User ID, which is not identifiable. This is important, because we don't want this NodeJS
            // server to fall under the purview of HIPAA, so we cannot handle PII (email).
            // Given the User's ID, TrueVault will lookup the user's email address as specified, and call SendGrid on
            // your behalf.
            await req.tvClient.sendEmailSendgrid(SENDGRID_API_KEY, recipientUserId,
                SENDGRID_APPROVED_TEMPLATE_ID, {literal_value: "sample-app@truevault.com"},
                {user_attribute: "email"}, substitutions);
        }

        await approveCaseRow(req.params.caseDocId);
        res.sendStatus(200);
    } catch (e) {
        console.log(chalk.red(`Error approving case: ${e.stack}`));
        return res.sendStatus(500).send(`An error occurred: ${e}`);
    }
});

app.post('/api/case/id/:caseDocId/patient', validateRoleMiddleware('admin'), async (req, res) => {
    try {
        const recipientUserId = req.body.patientUserId;
        await db.none("UPDATE cases SET patient_user_id=($1) WHERE case_doc_id=($2)", [recipientUserId, req.params.caseDocId]);

        const substitutions = {
            "{{name}}": {user_attribute: "name"},
            "{{api_key}}": {literal_value: req.body.patientUserApiKey}
        };
        console.log(`Sending email to user id ${recipientUserId} with substitutions ${JSON.stringify(substitutions, null, 2)}`);
        await req.tvClient.sendEmailSendgrid(SENDGRID_API_KEY, recipientUserId,
            SENDGRID_INVITE_PATIENT_TEMPLATE_ID, {literal_value: "sample-app@truevault.com"},
            {user_attribute: "email"}, substitutions);

        res.sendStatus(200);
    } catch (e) {
        console.log(chalk.red(`Error associating patient with case: ${e.stack}`));
        return res.status(500).send(`An error occurred: ${e}`);
    }
});

app.get('/api/case/id/:caseDocIds', validateRoleMiddleware('admin', 'doctor'), async (req, res) => {
    try {
        const cases = await db.query('SELECT * FROM cases WHERE case_doc_id IN ($1:csv)',
            [req.params.caseDocIds.split(',')]);
        res.send(JSON.stringify(cases.map(c => formatRow(c))), null, 2);
    } catch (e) {
        console.log(chalk.red(`Error listing cases: ${e.stack}`));
        res.sendStatus(500).send(`An error occurred: ${e}`);
    }
});

app.get('/api/dashboard/stats', validateRoleMiddleware('admin'), async (req, res) => {
    try {
        const averageReviewTimeSecs = (await db.one('SELECT floor(avg(EXTRACT(EPOCH FROM(case_reviewed_at - case_created_at)))) AS avg_review_time FROM cases WHERE case_reviewed_at IS NOT NULL')).avg_review_time;
        const averageApproveTimeSecs = (await db.one('SELECT floor(avg(EXTRACT(EPOCH FROM(case_approved_at - case_reviewed_at)))) AS avg_approved_time FROM cases WHERE case_reviewed_at IS NOT NULL')).avg_approved_time;

        const reviewCasesRemaining = parseInt((await db.one('SELECT COUNT(*) FROM cases WHERE case_reviewed_at IS NULL')).count, 10);
        const approveCasesRemaining = parseInt((await db.one('SELECT COUNT(*) FROM cases WHERE case_approved_at IS NULL AND case_reviewed_at IS NOT NULL')).count, 10);

        const reviewResponseTimes = await db.query('SELECT reviewer_id AS "doctorUserId", floor(avg(EXTRACT(EPOCH FROM(case_reviewed_at - case_created_at)))) AS "avgResponseTime" FROM cases WHERE (case_reviewed_at IS NOT NULL) GROUP BY reviewer_id ORDER BY "avgResponseTime"');
        const approveResponseTimes = await db.query('SELECT approver_id AS "doctorUserId", floor(avg(EXTRACT(EPOCH FROM(case_approved_at - case_reviewed_at)))) AS "avgResponseTime" FROM cases WHERE (case_reviewed_at IS NOT NULL) GROUP BY approver_id ORDER BY "avgResponseTime"');

        const response = {
            createToReview: {
                avgResponseTime: averageReviewTimeSecs,
                casesRemaining: reviewCasesRemaining,
                responseTimes: reviewResponseTimes
            },
            reviewToApprove: {
                avgResponseTime: averageApproveTimeSecs,
                casesRemaining: approveCasesRemaining,
                responseTimes: approveResponseTimes
            }
        };
        res.send(JSON.stringify(response), null, 2);
    } catch (e) {
        console.log(chalk.red(`Error getting case statistics: ${e.stack}`));
        res.sendStatus(500).send(`An error occurred: ${e}`);
    }
});

// This isn't customizable because the client's package.json needs to hard-code the port, so that the dev webpack server
// knows how to proxy requests to the API server.
const PORT = 3001;

app.listen(PORT, () => {
    console.log(`Sample app server listening on port ${PORT}`);
});
