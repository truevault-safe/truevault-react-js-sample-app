const pgp = require('pg-promise')();
const db = pgp({
                   host: '127.0.0.1',
                   port: 5432,
                   database: 'tv_sample_app',
                   user: 'tv_sample_app_dev',
                   password: 'secret',
                   application_name: 'tv_sample_app'
               });

module.exports = {
    db,

    insertCaseRow: async (caseDocId, diagnosisDocId, approverId, reviewerId, readGroupId,
                           caseCreatedAt = 'now') => {
        await db.none(
            "INSERT INTO cases (case_doc_id, diagnosis_doc_id, approver_id, reviewer_id, read_group_id, case_created_at, status) VALUES ($1, $2, $3, $4, $5, $6, 'WAITING_FOR_REVIEW')",
            [caseDocId, diagnosisDocId, approverId, reviewerId, readGroupId, caseCreatedAt]);
    },

    reviewCaseRow: async (caseDocId, caseReviewedAt = 'now') => {
        await db.none(
            "UPDATE cases SET status='WAITING_FOR_APPROVAL', case_reviewed_at=($1) WHERE case_doc_id=($2)",
            [caseReviewedAt, caseDocId]);
    },

    approveCaseRow: async (caseDocId, caseApprovedAt = 'now') => {
        await db.none(
            "UPDATE cases SET status='APPROVED', case_approved_at=($1) WHERE case_doc_id=($2)",
            [caseApprovedAt, caseDocId]);
    }
};
