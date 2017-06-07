const tv = require('./tv.js');
const GroupPolicyBuilder = require('./group-policy');
const CaseDocument = require('./case-document.js');

/**
 * Creates a TrueVault Group that grants its members Read-only access to the case data, including the main case
 * document, the secondary "diagnosis" document, and all associated images.
 * @param accessToken For TrueVault authentication
 * @param vaultId The Vault where cases are stored
 * @param documentId The id for the primary document for the case
 * @param diagnosisDocId The id for the diagnosis doc, the secondary document for the diagnosis data
 * @param blobIds The ids for all associated image BLOBs
 * @param approverId The id of the user who is assigned to approve this case, since this user needs read access
 * @param reviewerId The TrueVault User Id of the user who is assigned to review this case, since this user needs
 *          read access. Note: this reviewer will also need access to Update the diagnosis doc, see #createReviewerGroup
 * @returns {Promise.<*|Promise>}
 */
async function createReadGroup(accessToken, vaultId, documentId, diagnosisDocId,
                               blobIds, approverId, reviewerId) {
    const blobResources = [...blobIds].map(id => {
        return `Vault::${vaultId}::Blob::${id}`;
    });
    const readGroupPolicy = new GroupPolicyBuilder()
        .read(`Vault::${vaultId}::Document::${documentId}`)
        .read(`Vault::${vaultId}::Document::${diagnosisDocId}`)
        .read(...blobResources)
        .build();
    return tv.createGroup(accessToken, `case-${documentId}-read`, readGroupPolicy,
        [approverId, reviewerId]);
}

/**
 * Creates a TrueVault Group that grants its members update-access to the diagnosis document. This group should only
 * ever contain the reviewer in normal usage, since the approver can only approve the reviewer's diagnosis, not update the diagnosis.
 * @param accessToken For TrueVault authentication
 * @param documentId The id for the primary document for the case (in this method, only used for group naming)
 * @param diagnosisDocId The id for the diagnosis doc, the secondary document for the diagnosis data. This method
 *             gives the reviewer user update permission to this document.
 * @param reviewerId The TrueVault User Id of the user who is assigned to review this case, since this user needs
 *          to be able to update the diagnosis document. The approver doesn't get this privilege on purpose, which
 *          is why the diagnosis document is a separate TrueVault resource.
 * @returns {Promise.<*|Promise>}
 */
async function createReviewerGroup(accessToken, vaultId, documentId, diagnosisDocId, reviewerId) {
    // Only the reviewer can update the diagnosis document
    const reviewerGroupPolicy = new GroupPolicyBuilder()
        .update(`Vault::${vaultId}::Document::${diagnosisDocId}`)
        .build();
    return tv.createGroup(accessToken, `case-${documentId}-reviewer`,
        reviewerGroupPolicy, [reviewerId]);
}

/**
 * This method saves data in TrueVault and the internal server. It also creates a new group to
 * ensure the Reviewer Doctor and Approver Doctor can access the data appropriately, but other
 * Doctors cannot. It does a few non-obvious things:
 *
 *   - Upload images and structured PHI to TrueVault. Create a second empty TrueVault document
 *     to hold the reviewer's notes, to allow different permissions for the case data (read only for
 *     reviewer) and the report notes (read/write by reviewer).
 *   - Create groups that enforce desired access to the TrueVault images, case data, and review
 *     data.
 *   - Save metadata to the internal server (not TrueVault) to allow custom aggregate analytics
 *     and workflow rules.
 *
 * `internalCaseCreator` is a function used to create a new case on the internal database. In the
 * setup script's case, this interacts with the database directly to create scenarios that are not
 * possible to express using the public API. In the UI's case, it will call the API via HTTP.
 */
async function createCase(internalCaseCreator, accessToken, vaultId, schemaId, createBlobPromises,
                          caseId, patientName, sex, dob, patientHeight, patientWeight, dueDate,
                          approverId, reviewerId) {
    if (reviewerId === approverId) {
        throw Error("Approver and reviewer cannot be the same");
    }
    const createBlobResponses = await Promise.all(createBlobPromises);
    const caseImageIds = createBlobResponses.map(response => response.blob_id);

    const caseDocument = new CaseDocument(caseId, patientName, sex, dob, patientHeight,
        patientWeight, dueDate, caseImageIds);

    const [caseDocResponse, diagnosisDocResponse] = await Promise.all([
        tv.createDocument(accessToken, vaultId, schemaId, caseDocument),
        tv.createDocument(accessToken, vaultId, null, {})
    ]);
    const caseDocId = caseDocResponse.document.id;
    const diagnosisDocId = diagnosisDocResponse.document.id;

    const readGroup = await createReadGroup(accessToken, vaultId, caseDocId, diagnosisDocId, caseImageIds, approverId, reviewerId);

    const createReviewerGroupRequest = createReviewerGroup(accessToken, vaultId, caseDocId, diagnosisDocId, reviewerId);

    const createInternalCaseRequest = internalCaseCreator(accessToken, caseDocId,
        diagnosisDocId, approverId, reviewerId, readGroup.id, vaultId);

    await Promise.all([createReviewerGroupRequest, createInternalCaseRequest]);
}

module.exports = {createCase};
