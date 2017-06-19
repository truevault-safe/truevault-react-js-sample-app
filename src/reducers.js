/**
 * These reducers update the global application state based on the actions they handle. For the most part, each reducer
 * simply sets loading flags, stores errors, and stores loaded data. To avoid the common boilerplate when creating
 * [Redux Reducers](http://redux.js.org/docs/basics/Reducers.html), we use the the `handleActions` helper from
 * [Redux Actions](https://github.com/acdlite/redux-actions).
 *
 * Each reducer we defined with `handleActions` is available on the store. For instance, when the
 * `DOCTOR_INBOX_LOAD_START` action is dispatched, the `doctorInbox` reducer sets loading=true. That means that
 * store.doctorInbox.loading === true. Any component that wants to display a loading indicator for the doctor inbox
 * can then bind store.doctorInbox.loading to a prop, and reference it in JSX.
 */

import {handleActions} from "redux-actions";

export const doctorInbox = handleActions({
    DOCTOR_INBOX_LOAD_START: state => {
        return Object.assign({}, state, {
            loading: true,
            error: null,
            casesToApprove: null,
            casesToReview: null
        });
    },
    DOCTOR_INBOX_LOAD_ERROR: (state, action) => {
        return Object.assign({}, state, {
            loading: false,
            error: action.payload,
            casesToApprove: null,
            casesToReview: null
        });
    },
    DOCTOR_INBOX_LOAD_SUCCESS: (state, action) => {
        return Object.assign({}, state, {
            loading: false,
            error: null,
            ...action.payload
        });
    }
}, {});

export const doctorCache = handleActions({
    UPDATE_DOCTOR_CACHE: (state, action) => {
        return Object.assign({}, state, {
            userIdToDoctor: action.payload
        });
    }
}, {});

export const statsView = handleActions({
    STATS_VIEW_START: state => {
        return {
            stats: null,
            loading: true,
            error: null
        };
    },
    STATS_VIEW_ERROR: (state, action) => {
        return {
            stats: null,
            loading: false,
            error: action.payload
        };
    },
    STATS_VIEW_SUCCESS: (state, action) => {
        return {
            stats: action.payload,
            loading: false,
            error: null
        };
    }
}, {});

export const addCase = handleActions({
    CASE_ADD_START: state => {
        return Object.assign({}, state, {
            addingCase: true,
            addCaseError: null,
            bytesLoaded: null,
            bytesTotal: null
        });
    },
    CASE_ADD_PROGRESS: (state, action) => {
        return Object.assign({}, state, {
            bytesLoaded: action.payload.bytesLoaded,
            bytesTotal: action.payload.bytesTotal
        });
    },
    CASE_ADD_ERROR: (state, action) => {
        return Object.assign({}, state, {
            addingCase: false,
            addCaseError: action.payload
        });
    },
    CASE_ADD_SUCCESS: state => {
        return Object.assign({}, state, {
            addingCase: false,
            addCaseError: null
        });
    }
}, {});

export const caseView = handleActions({
    CASE_VIEW_START: state => {
        return {
            caseData: null,
            caseMetadata: null,
            diagnosisDocId: null,
            loading: true,
            error: null
        };
    },
    CASE_VIEW_ERROR: (state, action) => {
        return {
            caseData: null,
            caseMetadata: null,
            diagnosisDocId: null,
            loading: false,
            error: action.payload
        };
    },
    CASE_VIEW_SUCCESS: (state, action) => {
        return {
            caseData: action.payload.caseData,
            caseMetadata: action.payload.caseMetadata,
            diagnosisDocId: action.payload.diagnosisDocId,
            loading: false,
            error: null
        };
    }
}, {});

export const caseSubmitReview = handleActions({
    CASE_SUBMIT_REVIEW_START: state => {
        return {
            loading: true,
            error: null
        };
    },
    CASE_SUBMIT_REVIEW_ERROR: (state, action) => {
        return {
            loading: false,
            error: action.payload
        };
    },
    CASE_SUBMIT_REVIEW_SUCCESS: (state, action) => {
        return {
            loading: false,
            error: null
        };
    }
}, {});

export const caseSubmitApproval = handleActions({
    CASE_SUBMIT_APPROVAL_START: state => {
        return {
            loading: true,
            error: null
        };
    },
    CASE_SUBMIT_APPROVAL_ERROR: (state, action) => {
        return {
            loading: false,
            error: action.payload
        };
    },
    CASE_SUBMIT_APPROVAL_SUCCESS: (state, action) => {
        return {
            loading: false,
            error: null
        };
    }
}, {});

export const caseList = handleActions({
    CASE_LIST_START: state => {
        return Object.assign({}, state, {
            cases: [],
            loading: true,
            error: null,
        });
    },
    CASE_LIST_ERROR: (state, action) => {
        return Object.assign({}, state, {
            loading: false,
            error: action.payload
        });
    },
    CASE_LIST_SUCCESS: (state, action) => {
        const paginationInfo = action.payload.info;
        paginationInfo.current_page = Math.max(1, paginationInfo.current_page);
        return Object.assign({}, state, {
            loading: false,
            cases: action.payload.cases,
            paginationInfo: paginationInfo,
            error: null,
        });
    },

    ASSIGN_CASE_TO_NEW_PATIENT_SUCCESS: (state, action) => {
        const cases = state.cases.map(c => {
            if (c.documentId === action.payload.caseDocId) {
                c.patientUserId = action.payload.patientUserId;
            }
            return c;
        });

        return Object.assign({}, state, {cases});
    }
}, {
    cases: [],
    paginationInfo: {}
});

export const assignCaseToNewPatient = handleActions({
    ASSIGN_CASE_TO_NEW_PATIENT_START: state => {
        return {
            loading: true,
            error: null
        };
    },
    ASSIGN_CASE_TO_NEW_PATIENT_ERROR: (state, action) => {
        return {
            loading: false,
            error: action.payload
        };
    },
    ASSIGN_CASE_TO_NEW_PATIENT_SUCCESS: () => {
        return {
            loading: false,
            error: null
        };
    }
}, {loading: false, error: null});

export const login = handleActions({
    LOGIN_START: (state) => {
        return Object.assign({}, state, {
            loggingIn: true,
            loginError: null,
        });
    },
    LOGIN_FAILURE: (state, action) => {
        return Object.assign({}, state, {
            loggingIn: false,
            tvClient: null,
            user: null,
            loginError: action.payload,
            mfaRequired: action.payload.error && action.payload.error.type === 'USER.MFA_CODE_REQUIRED'
        });
    },
    LOGIN_SUCCESS: (state, action) => {
        return Object.assign({}, state, {
            loggingIn: false,
            tvClient: action.payload.tvClient,
            user: action.payload.user,
            loginError: null,
            mfaRequired: false
        });
    },
    LOGOUT: state => {
        return Object.assign({}, state, {
            tvClient: null,
            user: null,
            mfaRequired: false
        });
    }
}, {});

export const flash = handleActions({
    DISPLAY_FLASH_MESSAGE: (state, action) => {
        return [action.payload, ...state];
    },
    REMOVE_FLASH_MESSAGE: (state, action) => {
        return state.filter(flash => flash.key === action.payload);
    }
}, []);

export const patientSignup = handleActions({
    PATIENT_SIGNUP_START: () => {
        return {
            loading: true,
            error: null
        };
    },
    PATIENT_SIGNUP_ERROR: (state, action) => {
        return {
            loading: false,
            error: action.payload
        };
    },
    LOGIN_SUCCESS: () => {
        return {
            loading: false,
            error: null
        };
    }
}, {loading: false, error: null});
