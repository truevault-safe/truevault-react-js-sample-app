const chalk = require('chalk');
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const randomString = require('randomstring');
const fs = require('fs');
const TrueVaultClient = require('tv-js-sdk');
const apiHelpers = require('../src/api-helpers.js');
const dateFormat = require('dateFormat');
const GroupPolicyBuilder = require('../src/group-policy');
const sendgrid = require('sendgrid');
const {insertCaseRow, approveCaseRow, reviewCaseRow} = require('../server/db');
const DiagnosisDocument = require('../src/diagnosis-document.js');

// When running in nodejs, browser APIs aren't available so we need to load polyfills
// eslint-disable-next-line no-native-reassign
fetch = require('node-fetch');
// eslint-disable-next-line no-native-reassign
FormData = require('form-data');
// eslint-disable-next-line no-native-reassign
btoa = require('btoa');

const optionDefinitions = [
    {name: 'admin-api-key', type: String, description: 'API key of a FULL_ADMIN user for creating everything'},
    {name: 'preserve-dotenv', type: Boolean, description: 'If provided, .env won\'t be overwritten'},
    {name: 'account-id', type: String, description: 'TV account ID'},
    {name: 'password', type: String, description: 'Password for created test accounts'},
    {
        name: 'sendgrid-api-key',
        type: String,
        description: 'Sendgrid API key with mail send and transactional email permissions'
    },
    {name: 'client-url', type: String, description: 'Full URL where client is hosted, e. g. http://localhost:3000'},
    {name: 'generate-dummy-data', type: Boolean, description: 'Generate given number of dummy cases'},
    {name: 'help', type: Boolean, description: 'Displays help message'}
];

const usageInfo = [
    {
        header: 'TV Account Setup',
        content: "Creates all the TV objects needed by the sample app, and generates a .env."
    },
    {
        header: 'options',
        optionList: optionDefinitions
    }
];

let options = {};
try {
    options = commandLineArgs(optionDefinitions);
} catch (e) {
    console.log(chalk.red(e.message));
    console.log(getUsage(usageInfo));
    return process.exit(1);
}

if (!options['account-id']) {
    console.log(chalk.red('--account-id is required'));
    console.log(getUsage(usageInfo));
    return process.exit(1);
}

if (!options['sendgrid-api-key']) {
    console.log(chalk.red('--sendgrid-api-key is required'));
    console.log(getUsage(usageInfo));
    return process.exit(1);
}

if (options.help) {
    console.log(getUsage(usageInfo));
    return process.exit(0);
}

// TV requires unique object names, so we're likely to get name conflicts in development. To avoid this, we append
// a bit of random noise to each name.
const nameNoise = () => randomString.generate({
    length: 5,
    readable: true
});

async function createSendgridTemplate(sendgridAPIKey, name, body) {
    const sg = sendgrid(sendgridAPIKey);
    const createTemplateRequest = sg.emptyRequest();

    createTemplateRequest.body = {
        name: name
    };
    createTemplateRequest.method = 'POST';
    createTemplateRequest.path = '/v3/templates';

    const createTemplateResponse = await sg.API(createTemplateRequest);

    const templateId = createTemplateResponse.body.id;
    const createTemplateVersion = sg.emptyRequest();
    createTemplateVersion.body = body;
    createTemplateVersion.method = 'POST';
    createTemplateVersion.path = `/v3/templates/${templateId}/versions`;
    const sendgridTemplateId = templateId;
    await sg.API(createTemplateVersion);

    console.log(chalk.green(`Created SendGrid transactional email template ${chalk.bold(name)} with ID ${chalk.bold(sendgridTemplateId)}`));

    return sendgridTemplateId;
}

async function createSendgridInvitePatientTemplate(sendgridAPIKey, clientURL) {
    const templateName = `tv-truediagnostics-invite-patient-${nameNoise()}`;

    const signupUrl = `${clientURL}#/patient_signup?api_key={{api_key}}`;

    const templateBody = {
        name: templateName,
        subject: 'Welcome to TrueDiagnostics',
        html_content: `Hi {{name}},<br>You've been invited to see your diagnosis and imagery. Please register at 
        <a href="${signupUrl}">${signupUrl}</a>.`,
        plain_content: `Hi {{name}},\nYou've been invited to see your diagnosis and imagery. Please register at ${signupUrl}.`
    };

    return createSendgridTemplate(sendgridAPIKey, templateName, templateBody);
}

async function createSendgridApprovedTemplate(sendgridAPIKey, clientURL) {
    const templateName = `tv-truediagnostics-approved-${nameNoise()}`;

    const dashboardURL = `${clientURL}#/patient_dashboard`;

    const templateBody = {
        name: templateName,
        subject: 'TrueDiagnostics Case Approved',
        html_content: `Hi {{name}},<br>Your diagnosis has been approved. See details at <a href="${dashboardURL}">${dashboardURL}</a>.`,
        plain_content: `Hi {{name}},\nYour diagnosis has been approved. See details at ${dashboardURL}.`
    };

    return createSendgridTemplate(sendgridAPIKey, templateName, templateBody);
}

async function createCasesVault(tvClient) {
    const casesVaultName = `truediagnostics-cases-${nameNoise()}`;
    const response = await tvClient.createVault(casesVaultName);
    console.log(chalk.green(`Created vault ${chalk.bold(casesVaultName)} with id ${chalk.bold(response.vault.id)}`));
    return response.vault.id;
}

async function createAdminUser(tvClient, password) {
    const adminUserName = `truediagnostics-admin-${nameNoise()}`;
    const user = await tvClient.createUser(adminUserName, password, {role: 'admin', name: 'Alex Administrator'});
    const adminUserId = user.user_id;
    console.log(chalk.green(`Created admin user ${chalk.bold(adminUserName)}:${password} with id ${chalk.bold(adminUserId)}`));
    return adminUserId;
}

async function createDoctorUser(tvClient, lastName, password) {
    const doctorUserName = `truediagnostics-dr-${lastName.toLowerCase()}-${nameNoise()}`;
    const doctorFullName = `Dr. ${lastName}`;
    const user = await tvClient.createUser(doctorUserName, password, {role: 'doctor', name: doctorFullName});
    const doctorUserId = user.user_id;
    console.log(chalk.green(`Created doctor user ${chalk.bold(doctorFullName)} (${doctorUserName}:${password}) with id ${chalk.bold(doctorUserId)}`));
    return doctorUserId;
}

async function createDoctorUsers(tvClient, password) {
    const doctorNames = ['Johnson', 'Blackwell', 'Baker', 'Smith'];
    const createDoctorPromises = doctorNames.map(name => createDoctorUser(tvClient, name, password));
    return await Promise.all(createDoctorPromises);
}

async function createAdminsGroup(tvClient, adminUserId, casesVaultId) {
    const adminsGroupName = `truediagnostics-admins-${nameNoise()}`;
    const adminPolicy =  new GroupPolicyBuilder()
        // Create documents, BLOBs, and groups
        .create(`Vault::${casesVaultId}::Document::`)
        .create(`Vault::${casesVaultId}::Blob::`)
        .create('Group::')
        // Need both of these to search and read all documents
        .read(`Vault::${casesVaultId}::Document::.*`)
        .read(`Vault::${casesVaultId}::Search::`)
        // Update all documents
        .update(`Vault::${casesVaultId}::Document::.*`)
        // Read all Blobs
        .read(`Vault::${casesVaultId}::Blob::.*`)
        // List all Users
        .read('User::')
        // Read all Users
        .read('User::.*')
        .create('User::')
        .create('User::.*::Message')
        // Allow adding newly created patients users to the patients group and the per-case groups
        .create(`Group::.*::GroupMembership::.*`)
        .build();

    const group = await tvClient.createGroup(adminsGroupName, adminPolicy, [adminUserId]);
    console.log(chalk.green(`Created admins group ${chalk.bold(adminsGroupName)} with id ${chalk.bold(group.id)}`));
    return group.id;
}

async function createDoctorsGroup(tvClient, userIds) {
    const doctorsGroupName = `truediagnostics-doctors-${nameNoise()}`;

    const doctorPolicy = new GroupPolicyBuilder()
        .read('User::')
        .read('User::.*')
        // Allow doctor credentials to send notifications to patients when a case is reviewed/approved
        .create('User::.*::Message')
        .build();

    const group = await tvClient.createGroup(doctorsGroupName, doctorPolicy, userIds);
    console.log(chalk.green(`Created doctors group ${chalk.bold(doctorsGroupName)} with id ${chalk.bold(group.id)}`));
    return group.id;
}

async function createPatientsGroup(tvClient) {
    const patientsGroupName = `truediagnostics-patients-${nameNoise()}`;

    const patientsPolicy = new GroupPolicyBuilder()
        // Allow a patient to rotate their API key (for signup flow) and view their own attributes
        .read('User::$[id=self.id]')
        .update('User::$[id=self.id]')
        .build();

    const group = await tvClient.createGroup(patientsGroupName, patientsPolicy);
    const patientsGroupId = group.id;
    console.log(chalk.green(`Created patients group ${chalk.bold(patientsGroupName)} with id ${chalk.bold(patientsGroupId)}`));
    return patientsGroupId;
}

async function createCasesSchema(tvClient, casesVaultId) {
    const casesSchemaName = `truediagnostics-cases-${nameNoise()}`;
    const fields = [
        {index: true, name: 'caseId', type: 'string'},
        {index: true, name: 'patientName', type: 'string'},
        {index: true, name: 'dueDate', type: 'date'},
    ];
    const response = await tvClient.createSchema(casesVaultId, casesSchemaName, fields);
    console.log(chalk.green(`Created cases schema with id ${chalk.bold(response.schema.id)}`));
    return response.schema.id;
}

function randomDateInRange(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function createDummyCases(tvClient, vaultId, schemaId, doctorUserIds) {
    const generateDummyData = options['generate-dummy-data'];
    if (!generateDummyData) {
        return;
    }

    const patientNames = [
        "James Smith",
        "Michael Smith",
        "Robert Smith",
        "David Smith",
        "James Johnson",
        "Michael Johnson",
        "William Smith",
        "James Williams",
        "Robert Johnson",
        "Mary Smith",
        "James Brown",
        "John Smith",
        "David Johnson",
        "Michael Brown",
        "Maria Garcia",
        "Michael Williams",
        "Michael Jones",
        "James Jones",
        "Maria Rodriguez",
        "Robert Brown",
        "Michael Miller",
        "Robert Jones",
        "Robert Williams",
        "William Johnson",
        "James Davis",
        "Mary Johnson",
        "Maria Martinez",
        "Charles Smith",
        "David Brown",
        "Robert Miller"
    ];

    const DAYS_IN_YEAR = 365;
    const today = new Date();
    const summary = 'Osteoarthritis';
    const description = 'Patient has arthritis in both hands and in the mid to lower spine';

    function getTodaysDatePlusDays(days) {
        const today = new Date();
        today.setDate(today.getDate() + days);
        return today;
    }

    function randomReviewerApproverIds(userIds) {
        const reviewerIdIndex = Math.floor(Math.random() * userIds.length);
        const approverIdIndex = (reviewerIdIndex + 1) % userIds.length;
        return [userIds[reviewerIdIndex], userIds[approverIdIndex]];
    }

    const dataPath = 'scripts/dummy-data';
    const caseImagePaths = fs.readdirSync(dataPath);

    const createRandomCase = async function (caseId, patientName, approverUserId, reviewerUserId,
                                           internalCaseCreator) {
        const sex = Math.random() >= 0.5 ? 'M' : 'F';
        const dob = dateFormat(randomDateInRange(getTodaysDatePlusDays(-60 * DAYS_IN_YEAR),
            getTodaysDatePlusDays(-10 * DAYS_IN_YEAR)), "yyyy-mm-dd");
        const patientHeight = Math.floor(4 + Math.random() * (7 - 4));
        const patientWeight = Math.floor(80 + Math.random() * (250 - 80));
        const dueDate = dateFormat(randomDateInRange(today, getTodaysDatePlusDays(30)),
            "yyyy-mm-dd");

        const caseFiles = caseImagePaths.map(
            casePath => fs.createReadStream(`${dataPath}/${casePath}`));
        const createBlobPromises = caseFiles.map(
            caseFile => tvClient.createBlob(vaultId, caseFile));

        await apiHelpers.createCase(internalCaseCreator, tvClient, vaultId, schemaId,
            createBlobPromises, caseId, patientName, sex, dob, patientHeight, patientWeight,
            dueDate, approverUserId, reviewerUserId);
        console.log(chalk.green(`Created case ${chalk.bold(caseId)}`));
    };

    const createInternalCaseWithRandomTimes = async (tvAccessToken, caseDocId, diagnosisDocId,
                                                     approverId, reviewerId, readGroupId, vaultId) => {
        const tvClient = new TrueVaultClient(tvAccessToken);
        const caseCreatedAtDate = randomDateInRange(getTodaysDatePlusDays(-3), today);
        const caseCreatedAtStr = caseCreatedAtDate.toISOString();
        await insertCaseRow(caseDocId, diagnosisDocId, approverId, reviewerId, readGroupId,
            caseCreatedAtStr);

        // 50% chance a case will be reviewed
        if ( Math.random() >= 0.5 ) {
            const caseReviewedAtDate = randomDateInRange(caseCreatedAtDate, today);
            const caseReviewedAtStr = caseReviewedAtDate.toISOString();
            const caseReviewDocument = new DiagnosisDocument(summary, description);
            await Promise.all([
                reviewCaseRow(caseDocId, caseReviewedAtStr),
                tvClient.updateDocument(vaultId, diagnosisDocId, caseReviewDocument)
            ]);

            // 50% chance a reviewed case will be approved
            if ( Math.random() >= 0.5 ) {
                const caseApprovedAtDate = randomDateInRange(caseReviewedAtDate, today);
                const caseApprovedAtStr = caseApprovedAtDate.toISOString();
                await approveCaseRow(caseDocId, caseApprovedAtStr);
            }
        }
    };

    // Create at least one case per doctor that is approved for cosmetic purposes when viewing the
    // admin dashboard
    const createApprovedInternalCase = async (tvAccessToken, caseDocId, diagnosisDocId,
                                              approverId, reviewerId, readGroupId, vaultId) => {
        const tvClient = new TrueVaultClient(tvAccessToken);
        const caseCreatedAtDate = randomDateInRange(getTodaysDatePlusDays(-3), today);
        const caseCreatedAtStr = caseCreatedAtDate.toISOString();
        await insertCaseRow(caseDocId, diagnosisDocId, approverId, reviewerId, readGroupId,
            caseCreatedAtStr);

        const caseReviewedAtDate = randomDateInRange(caseCreatedAtDate, today);
        const caseReviewedAtStr = caseReviewedAtDate.toISOString();
        const caseReviewDocument = new DiagnosisDocument(summary, description);
        await Promise.all([
            reviewCaseRow(caseDocId, caseReviewedAtStr),
            tvClient.updateDocument(vaultId, diagnosisDocId, caseReviewDocument)
        ]);

        const caseApprovedAtDate = randomDateInRange(caseReviewedAtDate, today);
        const caseApprovedAtStr = caseApprovedAtDate.toISOString();
        await approveCaseRow(caseDocId, caseApprovedAtStr);
    };

    const randomStateCaseRequests = patientNames.map(async (patientName, index) => {
        const [reviewerId, approverId] = randomReviewerApproverIds(doctorUserIds);
        await createRandomCase(("00000" + index).slice(-5), patientName, reviewerId, approverId,
            createInternalCaseWithRandomTimes);
    });

    const guaranteedApprovalCaseRequests = doctorUserIds.map(
        async (approverUserId, approverIdIndex) => {
            // Choose a different user ID for the reviewer
            const reviewerUserId = doctorUserIds[(approverIdIndex + 1) % doctorUserIds.length];
            // Reuses the first few patient names
            await createRandomCase(("11111" + approverIdIndex).slice(-5),
                patientNames[approverIdIndex], approverUserId, reviewerUserId,
                createApprovedInternalCase);
        });

    await Promise.all([...randomStateCaseRequests, ...guaranteedApprovalCaseRequests]);
}

function generateDotEnv(accountId, casesVaultId, casesSchemaId, sendgridApiKey, sendgridInvitePatientTemplateId, sendgridApprovedTemplateId, patientsGroupId) {
    const dotenv = `
REACT_APP_ACCOUNT_ID=${accountId}
REACT_APP_CASES_VAULT_ID=${casesVaultId}
REACT_APP_CASES_SCHEMA_ID=${casesSchemaId}
REACT_APP_PATIENTS_GROUP_ID=${patientsGroupId}

SENDGRID_API_KEY=${sendgridApiKey}
SENDGRID_INVITE_PATIENT_TEMPLATE_ID=${sendgridInvitePatientTemplateId}
SENDGRID_APPROVED_TEMPLATE_ID=${sendgridApprovedTemplateId}
    `.trim();

    console.log('New dotenv:');
    console.log(chalk.dim(dotenv));

    if (!options['preserve-dotenv']) {
        if (fs.existsSync('.env')) {
            fs.renameSync('.env', '.env.bak');
            console.log(chalk.green('Moved .env to .env.bak'));
        }
        console.log(chalk.green('Wrote new .env'));
        console.log(chalk.cyan(chalk.bold('Remember to restart dev yarn server and node server')));
        fs.writeFileSync('.env', dotenv);
    } else {
        console.log(chalk.dim('Skipping write to .env'));
    }
    return Promise.resolve();
}

async function runSetup () {
    try {
        const adminApiKey = options['admin-api-key'];
        const adminTvClient = new TrueVaultClient(adminApiKey);
        const password = options['password'] || 'asdf';
        const vaultId = await createCasesVault(adminTvClient);
        const schemaId = await createCasesSchema(adminTvClient, vaultId);
        const sendgridAPIKey = options['sendgrid-api-key'];
        const clientURL = options['client-url'] || 'http://localhost:3000';
        const sendgridInvitePatientTemplateId = await createSendgridInvitePatientTemplate(sendgridAPIKey, clientURL);
        const sendgridApprovedTemplateId = await createSendgridApprovedTemplate(sendgridAPIKey, clientURL);
        const adminUserId = await createAdminUser(adminTvClient, password);
        const doctorUserIds = await createDoctorUsers(adminTvClient, password);
        const patientsGroupId = await createPatientsGroup(adminTvClient, vaultId);
        await createAdminsGroup(adminTvClient, adminUserId, vaultId);
        await createDoctorsGroup(adminTvClient, doctorUserIds);
        await createDummyCases(adminTvClient, vaultId, schemaId, doctorUserIds);
        generateDotEnv(options['account-id'], vaultId, schemaId, sendgridAPIKey, sendgridInvitePatientTemplateId, sendgridApprovedTemplateId, patientsGroupId);
        return process.exit(0);
    } catch (e) {
        console.log(chalk.red(e.stack));
        if (e.response) {
            console.log(e.response);
        }
        return process.exit(1);
    }
}

runSetup();
