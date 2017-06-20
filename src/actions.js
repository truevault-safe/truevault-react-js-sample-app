/**
 * This file contains "actions", which are global methods used to modify global application state. This
 * pattern strikes a balance between the convenience of a single source of global state and avoiding the
 * risk of globally mutating global state. Suppose a particular Component wants to add a flash message.
 * It doesn't directly update the global state. Instead, it uses the `displayFlashMessage` action. That
 * method dispatches an action, which is handled by reducers.js.
 *
 * For more details about this pattern, refer to the [Actions](http://redux.js.org/docs/basics/Actions.html) and
 * [Reducers](http://redux.js.org/docs/basics/Reducers.html) sections of the [redux documentation](http://redux.js.org/).
 * Note that we also use the [redux action helpers](https://github.com/acdlite/redux-actions) to reduce the amount
 * of boilerplate.
 */
import {createAction} from "redux-actions";
import {push} from "react-router-redux";
import TrueVaultClient from "tv-js-sdk";
import apiHelpers from "./api-helpers.js";
import InternalApiClient from "../src/internal-api-client.js";
import DiagnosisDocument from "./diagnosis-document.js";

export const internalApiClient = new InternalApiClient('');

const removeFlashMessage = createAction('REMOVE_FLASH_MESSAGE');
let flashIdCounter = 0;

function displayFlashMessage(style, message) {
    const action = createAction('DISPLAY_FLASH_MESSAGE');
    return dispatch => {
        const key = `flash-${flashIdCounter++}`;
        dispatch(action({style, message, key}));
        setTimeout(() => dispatch(removeFlashMessage(flashIdCounter)), 5000);
    };
}

function updateDoctorCache(tvClient) {
    const action = createAction('UPDATE_DOCTOR_CACHE');
    return async dispatch => {
        // Since approver and reviewer are stored in a normalized manner, it's handy for the UI to have a cache of
        // doctor user ID -> doctor name. This action downloads all of the users, and then organizes them into
        // a map of doctor user ID -> doctor name.
        const users = await tvClient.listUsers();
        const doctors = users.filter(u => u.attributes && u.attributes.role === 'doctor');
        const idToDoctor = {};
        doctors.forEach(d => idToDoctor[d.id] = d);
        return dispatch(action(idToDoctor));
    };
}

const loginStart = createAction('LOGIN_START');
const loginSuccess = createAction('LOGIN_SUCCESS');
const loginFailure = createAction('LOGIN_FAILURE');
/**
 * Logs in to the application by calling the TrueVault login API Endpoint. Note that this doesn't interact with the
 * Internal API for authentication, it is all done through TrueVault directly from the browser. TrueVault credentials
 * shouldn't pass through the server if you can avoid it.
 * @param username The username, stored in TrueVault
 * @param password The password, validated by TrueVault
 * @returns {function(*)}
 */
export function login(username, password) {
    return async dispatch => {
        dispatch(loginStart());
        try {
            const tvClient = await TrueVaultClient.login(process.env.REACT_APP_ACCOUNT_ID, username, password);

            // The login endpoint doesn't return user attributes. We need those to get the user's name and role, so
            // we load the full user object.
            const user = await tvClient.readCurrentUser();

            // A properly created user will always have name and role attributes. However, a user could conceivably be
            // edited in the console or created incorrectly. We check to make sure the attributes are properly configured,
            // to avoid UI errors down the line.
            const role = user.attributes.role;
            if (role !== 'admin' && role !== 'doctor' && role !== 'patient') {
                throw Error(`Invalid user; role attribute must be admin|doctor|patient but was ${role}`);
            }

            const name = user.attributes.name;
            if (!name) {
                throw Error('Invalid user; name attribute must be present');
            }

            // Admins and doctors can see a case's reviewer and approver. The case metadata only contains the TrueVault
            // user IDs, but we want to display the doctor's name. To quickly lookup a doctor's name by ID, we populate
            // a cache of doctor ID -> name as part of the login process.
            if (role === 'admin' || role === 'doctor') {
                await dispatch(updateDoctorCache(tvClient));
            }

            dispatch(loginSuccess({tvClient, user}));
        } catch (e) {
            dispatch(loginFailure(e));
        }
    };
}

const logoutAction = createAction('LOGOUT');
/**
 * Logout temporarily doesn't call TrueVault's logout endpoint, but it could for added security. Calling the TrueVault
 * logout endpoint invalidates the provided AccessToken, which is a good security practice (omitted for this version of
 * the sample app since the interaction is simple).
 * @returns {function(*)}
 */
export function logout() {
    return dispatch => {
        // Need to force the URL to be `/login`, because rerendering the current page causes the auth framework to append an unwanted `redirect` query param (which causes a redirect loop)
        dispatch(push('/login'));
        dispatch(logoutAction());
    };
}

const statsViewStart = createAction('STATS_VIEW_START');
const statsViewError = createAction('STATS_VIEW_ERROR');
const statsViewSuccess = createAction('STATS_VIEW_SUCCESS');

/**
 * This action doesn't interact with TrueVault directly from the client, it loads aggregate analytics data from the
 * Internal API Server. This demonstrates how you can easily add your own server side data processing for de-identified
 * data. In this case, we perform relatively simple analytics but you could perform complex data science algorithms in
 * your application.
 * @param tvAccessToken For Internal API authentication. Use the same TrueVault AccessToken that you
 *      would send to TrueVault. The NodeJS server can use it to validate the user is who they claim to be, and
 *      authorize actions accordingly.
 * @returns {function(*)}
 */
export function viewAdminDashboardStats(tvAccessToken) {
    return async dispatch => {
        try {
            dispatch(statsViewStart());
            const dashboardStats = await internalApiClient.getAdminDashboardStats(tvAccessToken);
            dispatch(statsViewSuccess(dashboardStats));
        } catch (error) {
            dispatch(statsViewError(error));
        }
    };
}

const caseAddStart = createAction('CASE_ADD_START');
const caseAddProgress = createAction('CASE_ADD_PROGRESS');
const caseAddError = createAction('CASE_ADD_ERROR');
const caseAddSuccess = createAction('CASE_ADD_SUCCESS');

/**
 * Returns an array of Promises to upload the given blobs. When all of the returned promises resolve, the given
 * files have uploaded successfully. Progress events are fired via the CASE_ADD_PROGRESS event defined above.
 * @param tvClient TrueVaultClient
 * @param caseFiles Array of HTML5 File instances. See https://developer.mozilla.org/en-US/docs/Web/API/File for information
 * on the HTML5 File interface
 * @param dispatch Method for dispatching a redux action; presumably, [store.dispatch](http://redux.js.org/docs/api/Store.html#dispatch)
 * @returns {Array} Array of Promise
 */
const prepareBlobPromises = function (tvClient, caseFiles, dispatch) {

    let createBlobPromises = [];
    if (caseFiles.length === 0) {
        dispatch(caseAddProgress({bytesTotal: 0}));
    } else {
        const totalFileSize = caseFiles.map(caseFile => caseFile.size).reduce((acc, val) => acc + val);

        // Use a parallel array of File object to bytes loaded because we cannot use Files or object URLs as object keys
        const caseFileBytesUploaded = caseFiles.map(() => 0);
        createBlobPromises = caseFiles.map(caseFile => {
            return tvClient.createBlobWithProgress(process.env.REACT_APP_CASES_VAULT_ID, caseFile, (pe) => {
                const caseFileIndex = caseFiles.indexOf(caseFile);
                caseFileBytesUploaded[caseFileIndex] = pe.loaded;
                const totalBytesLoaded = caseFileBytesUploaded.reduce((acc, val) => acc + val);
                dispatch(caseAddProgress({bytesLoaded: totalBytesLoaded, bytesTotal: totalFileSize}));
            });
        });
    }
    return createBlobPromises;
};

/**
 * This method does a lot of work under the covers to de-identify the case data and store the non-PII in our Internal
 * API and the PII (or possible PII like images and free-text) in TrueVault. See the Api Helper by the same name
 * for details on the approach.
 */
export function createCase(tvClient, caseId, patientName, sex, dob, patientHeight, patientWeight,
                           dueDate, caseFiles, approverId, reviewerId) {
    return async dispatch => {
        dispatch(caseAddStart());
        const createBlobPromises = prepareBlobPromises(tvClient, caseFiles, dispatch);

        try {
            await apiHelpers.createCase(internalApiClient.createCase.bind(internalApiClient),
                tvClient,
                process.env.REACT_APP_CASES_VAULT_ID,
                process.env.REACT_APP_CASES_SCHEMA_ID,
                createBlobPromises, caseId, patientName, sex, dob,
                patientHeight, patientWeight,
                dueDate, approverId, reviewerId);
            dispatch(caseAddSuccess());
            dispatch(displayFlashMessage('success', 'Case Added'));
            dispatch(push('/cases'));
        } catch (error) {
            dispatch(caseAddError(error));
        }
    };
}

const caseViewStart = createAction('CASE_VIEW_START');
const caseViewError = createAction('CASE_VIEW_ERROR');
const caseViewSuccess = createAction('CASE_VIEW_SUCCESS');

/**
 * Viewing a Case requires loading information from two data sources: Internal API & TrueVault. First the non-PII
 * metadata is loaded from the Internal API, then the TrueVault Documents and BLOBs are loaded.
 * @param tvClient TrueVaultClient
 * @param getCaseMetadataRequest The request for case metadata from the Internal API, once returned we can extract
 *          TrueVault Document Ids to load the rest of the data.
 * @returns {function(*)}
 */
export function viewCase(tvClient, getCaseMetadataRequest) {
    return async dispatch => {
        dispatch(caseViewStart());

        try {
            const caseMetadata = await getCaseMetadataRequest;

            const [caseDocument, caseReviewDocument] = await tvClient.getDocuments(process.env.REACT_APP_CASES_VAULT_ID, [caseMetadata.caseDocId, caseMetadata.diagnosisDocId]);

            dispatch(caseViewSuccess({
                caseMetadata,
                caseData: {
                    ...caseDocument.document,
                    ...caseReviewDocument.document
                },
                diagnosisDocId: caseMetadata.diagnosisDocId
            }));
        } catch (error) {
            dispatch(caseViewError(error));
        }
    };

}

const caseSubmitReviewStart = createAction('CASE_SUBMIT_REVIEW_START');
const caseSubmitReviewError = createAction('CASE_SUBMIT_REVIEW_ERROR');
const caseSubmitReviewSuccess = createAction('CASE_SUBMIT_REVIEW_SUCCESS');

/**
 * Only the reviewing doctor can perform this action, which populates the summary & description for the diagnosis.
 * The caseDoc isn't impacted by this change. In fact, the reviewer only has read access to that document. The reviewer
 * has update access to the diagnosis doc, which allows this user (and none other) to fill out the diagnosis form.
 * This is a pretty detailed security precaution, ensuring a hacker who reverse engineers the app wouldn't be able to
 * "review" the case if they were only the "approver". It adds the complexity of requiring two TrueVault Documents,
 * which some teams may skip for simplicity. We include it to show the absolute best approach from a hard-line security
 * standpoint.
 * @param tvClient TrueVaultClient for TV requests. Its apiKeyOrAccessToken is also used for Internal API authentication.
 * @param caseDocId The id for the case document, which will not be updated
 * @param diagnosisDocId The id for the diagnosis document, which will be updated with the summary and description
 * @param summary The terse diagnosis. Since this is free-text, it may contain PII. We store it TrueVault for safety.
 * @param description The long-form diagnosis Since this is free-text, it may contain PII. We store it TrueVault for safety.
 * @returns {function(*)}
 */
export function submitReview(tvClient, caseDocId, diagnosisDocId, summary, description) {
    return async dispatch => {
        dispatch(caseSubmitReviewStart());
        const caseReviewDocument = new DiagnosisDocument(summary, description);
        try {
            await Promise.all([
                tvClient.updateDocument(process.env.REACT_APP_CASES_VAULT_ID, diagnosisDocId, caseReviewDocument),
                internalApiClient.reviewCase(tvClient.apiKeyOrAccessToken, caseDocId)
            ]);
            dispatch(caseSubmitReviewSuccess());
            dispatch(displayFlashMessage('success', 'Your review was submitted successfully'));
            dispatch(push('/inbox'));
        } catch (error) {
            dispatch(caseSubmitReviewError(error));
        }
    };
}

const caseSubmitApprovalStart = createAction('CASE_SUBMIT_APPROVAL_START');
const caseSubmitApprovalError = createAction('CASE_SUBMIT_APPROVAL_ERROR');
const caseSubmitApprovalSuccess = createAction('CASE_SUBMIT_APPROVAL_SUCCESS');

/**
 * Calls the Internal API to approve the reviewer's diagnosis. This doesn't interact with TrueVault at all, since the
 * approver isn't even allowed to update the diagnosis. Only the reviewer is.
 * @param tvAccessToken For Internal API authentication only (no TrueVault interaction)
 * @param caseDocId The id for the case, so the Internal API can update the status it stores
 * @returns {function(*)}
 */
export function submitApproval(tvAccessToken, caseDocId) {
    return async dispatch => {
        dispatch(caseSubmitApprovalStart());
        try {
            await internalApiClient.approveCase(tvAccessToken, caseDocId);
            dispatch(caseSubmitApprovalSuccess());
            dispatch(displayFlashMessage('success', 'Your approval was submitted successfully'));
            dispatch(push('/inbox'));
        } catch (error) {
            dispatch(caseSubmitApprovalError(error));
        }
    };
}

const caseListStart = createAction('CASE_LIST_START');
const caseListError = createAction('CASE_LIST_ERROR');
const caseListSuccess = createAction('CASE_LIST_SUCCESS');

/**
 * When we list cases, we're actually using the TrueVault search api under the hood. This gives us the ability to
 * filter, sort, and paginate the results. After getting a list of cases from TrueVault, we have all the PII but not
 * all of the metadata (like status, assigned doctors, etc) so we call our Internal API to load that information.
 *
 * Note how the order of operations is different with the #doctorInboxLoad function. Depending on what data you need
 * to filter, you can call either TrueVault or your Internal API first, then use the results to retrieve the remaining
 * data.
 *
 * @param tvClient TrueVaultClient
 * @param filterType 'and' or 'or', how to evaluate the multiple filters
 * @param filter an object describing how to filter results
 * @param sort an object describing multi-sort order
 * @param page which page in the result set
 * @param perPage how many results per page
 * @returns {function(*)}
 */
export function listCases(tvClient, filterType, filter, sort, page, perPage) {
    return async dispatch => {
        dispatch(caseListStart());
        let searchOption = {
            full_document: true,
            page: page,
            per_page: perPage,
            schema_id: process.env.REACT_APP_CASES_SCHEMA_ID,
            filter_type: filterType,
            filter,
            sort
        };

        try {
            // Download PHI from TrueVault
            const result = await tvClient.searchDocuments(process.env.REACT_APP_CASES_VAULT_ID, searchOption);
            const documents = result.data.documents.map(doc => Object.assign(
                {documentId: doc.document_id},
                JSON.parse(atob(doc.document))
            ));

            // Download non-PHI data (approver, reviewer) from server
            const caseMetadataRecords = await internalApiClient.getCases(tvClient.apiKeyOrAccessToken, documents.map(d => d.documentId));

            // Build a mapping of TV document ID to non-PHI data
            const documentIdToCaseMetadata = {};
            caseMetadataRecords.forEach(caseMetadata => documentIdToCaseMetadata[caseMetadata.caseDocId] = caseMetadata);

            // Merge non-PHI data into PHI data
            documents.forEach(d => {
                const caseMetadata = documentIdToCaseMetadata[d.documentId];
                d.approverId = caseMetadata && caseMetadata.approverId;
                d.reviewerId = caseMetadata && caseMetadata.reviewerId;
                d.status = caseMetadata && caseMetadata.status;
                d.patientUserId = caseMetadata && caseMetadata.patientUserId;
                d.readGroupId = caseMetadata && caseMetadata.readGroupId;
            });

            dispatch(caseListSuccess({cases: documents, info: result.data.info}));
        } catch (error) {
            dispatch(caseListError(error));
        }
    };
}

const doctorInboxLoadStart = createAction('DOCTOR_INBOX_LOAD_START');
const doctorInboxLoadError = createAction('DOCTOR_INBOX_LOAD_ERROR');
const doctorInboxLoadSuccess = createAction('DOCTOR_INBOX_LOAD_SUCCESS');
/**
 * Unlike the case list for admins, the doctor inbox load calls the Internal API to get a quick snapshot of which
 * cases the Dr. has assigned to them for approval or review. This is a great example of how some times you will request
 * data based on non-PII criteria through your internal API first. The results will include TrueVault IDs, which you can
 * then retrieve through the TrueVault API. Finally, you can merge the data to show it to the user.
 *
 * @param tvClient TrueVaultClient for TV requests. Its apiKeyOrAccessToken is also used for Internal API authentication.
 * @param doctorUserId The doctor whose assigned cases we're loading
 * @returns {function(*)}
 */
export function doctorInboxLoad(tvClient, doctorUserId) {
    return async dispatch => {
        dispatch(doctorInboxLoadStart());

        try {
            // Query non-PHI data from server
            const cases = await internalApiClient.listMyCases(tvClient.apiKeyOrAccessToken);

            const tvDocIds = cases.map(c => c.caseDocId);
            const casesToApprove = cases.filter(c => c.approverId === doctorUserId);
            const casesToReview = cases.filter(c => c.reviewerId === doctorUserId);

            // Load PHI data from TrueVault
            const documents = await tvClient.getDocuments(process.env.REACT_APP_CASES_VAULT_ID, tvDocIds);
            const documentIdToDocument = {};
            documents.forEach(doc => documentIdToDocument[doc.id] = doc.document);

            // Merge non-PHI and PHI data
            casesToApprove.forEach(c => c.document = documentIdToDocument[c.caseDocId]);
            casesToReview.forEach(c => c.document = documentIdToDocument[c.caseDocId]);

            dispatch(doctorInboxLoadSuccess({casesToApprove, casesToReview}));
        } catch (e) {
            dispatch(doctorInboxLoadError(e));
        }
    };
}

const assignCaseToNewPatientStart = createAction('ASSIGN_CASE_TO_NEW_PATIENT_START');
const assignCaseToNewPatientError = createAction('ASSIGN_CASE_TO_NEW_PATIENT_ERROR');
const assignCaseToNewPatientSuccess = createAction('ASSIGN_CASE_TO_NEW_PATIENT_SUCCESS');
/**
 * Assigning a case to a patient does a few things:
 *  - It creates a new user for that patient, so they can log in and see their case
 *  - It gives that user permission to actually see the case using TrueVault groups
 *  - It associates the user with the case in the Internal API, so the id-mapping is maintained
 *
 *  Note: In a real-world application, you might have many cases per patient-user. We took a simpler approach in this
 *  sample code, but it should be clear how you could search for patient users first if you wanted to chose an existing
 *  patient instead.
 *
 * @param tvClient TrueVaultClient for TV requests. Its apiKeyOrAccessToken is also used for Internal API authentication.
 * @param caseDocId The case that this patient will be added to
 * @param readGroupId The id for the TrueVault Group that allows reading this case
 * @param patientEmail The email address for the patient, to send an invite
 * @param patientName The patient's name, for profile management
 * @param successCallback What to do when this completes
 * @returns {function(*)}
 */
export function assignCaseToNewPatient(tvClient, caseDocId, readGroupId, patientEmail, patientName, successCallback) {
    return async dispatch => {
        try {
            dispatch(assignCaseToNewPatientStart());

            const user = await tvClient.createUser(patientEmail, null, {
                email: patientEmail,
                role: 'patient',
                name: patientName
            });

            const addUserToPatientsGroupRequest = tvClient.addUsersToGroup(process.env.REACT_APP_PATIENTS_GROUP_ID, [user.id]);

            const addUserToCaseReadGroupRequest = tvClient.addUsersToGroup(readGroupId, [user.id]);

            const associateCaseWithPatientRequest = internalApiClient.associateCaseWithPatient(tvClient.apiKeyOrAccessToken, caseDocId, user.id, user.api_key);

            await Promise.all([addUserToPatientsGroupRequest, addUserToCaseReadGroupRequest, associateCaseWithPatientRequest]);

            if (successCallback) {
                successCallback();
            }
            dispatch(assignCaseToNewPatientSuccess({patientUserId: user.id, caseDocId}));
        } catch (e) {
            dispatch(assignCaseToNewPatientError(e));
        }
    };
}

const patientSignupStart = createAction('PATIENT_SIGNUP_START');
const patientSignupError = createAction('PATIENT_SIGNUP_ERROR');

/**
 * When a patient signs up via their email invitation, we have an API key. This API key lasts forever and allows
 * performing updates on the user, so it's equivalent to a password reset token. This method validates the API key,
 * updates the password, and then rotates the API key so that the invitation can't be reused.
 * @param userApiKey
 * @param newPassword
 */
export function patientSignup(userApiKey, newPassword) {
    return async dispatch => {
        try {
            dispatch(patientSignupStart());

            const signupTvClient = new TrueVaultClient(userApiKey);

            // Load the user. This ensures the API key is valid, and determines the current user's ID
            const user = await signupTvClient.readCurrentUser();

            await signupTvClient.updateUserPassword(user.id, newPassword);

            // Store a TrueVaultClient with newly generated access token so that the user stays
            // logged in after the API key is invalidated
            const accessToken = await signupTvClient.createUserAccessToken(user.id);
            const tvClient = new TrueVaultClient(accessToken);

            // Generate a new API key to invalidate the API key sent in the email
            await signupTvClient.createUserApiKey(user.id);

            dispatch(displayFlashMessage('success', 'Password Set'));
            dispatch(loginSuccess({tvClient, user}));
            dispatch(push('/patient_dashboard'));
        } catch (e) {
            dispatch(patientSignupError(e));
        }
    };
}
