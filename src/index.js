import React from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {applyMiddleware, combineReducers, createStore} from "redux";
import logger from "redux-logger";
import thunk from "redux-thunk";
import promise from "redux-promise";
import {hashHistory, IndexRedirect, Route, Router} from "react-router";
import {routerActions, routerMiddleware, routerReducer, syncHistoryWithStore} from "react-router-redux";
import {UserAuthWrapper} from "redux-auth-wrapper";
import * as reducers from "./reducers";
import Login from "./components/Login";
import App from "./components/App";
import NewCase from "./components/NewCase";
import CaseList from "./components/CaseList";
import "bootstrap/dist/css/bootstrap.css";
import "./index.scss";
import "./bootstrap-theme.scss";
import AdminDashboard from "./components/AdminDashboard";
import DoctorInbox from "./components/DoctorInbox";
import DoctorCaseView from "./components/DoctorCaseView";
import PatientSignup from "./components/PatientSignup";
import PatientDashboard from "./components/PatientDashboard";

// In Redux, reducers update the application state based on the actions. Here, we combine the reducers defined in
// reducers.js with the routing-handling reducer provided by react-router-redux. For more details on redux reducers,
// see http://redux.js.org/docs/basics/Reducers.html and for info on react-router-redux see
// https://github.com/reactjs/react-router-redux
const combinedReducer = combineReducers({
    routing: routerReducer,
    ...reducers
});


const store = createStore(combinedReducer, applyMiddleware(routerMiddleware(hashHistory), thunk, promise, logger));

// This instructs the routing library to use hash-based URLs (e. g. domain.com/#some-page, domain.com/#some-other-page)
// as opposed to path-based URLs (e. g. domain.com/some-page, domain.com/some-other-page) or some other mechanism.
// Hash-based URLs work well for this app since they're supported by all deployment mechanisms.
const history = syncHistoryWithStore(hashHistory, store);

function defaultPathForRole(role) {
    switch (role) {
        case 'admin':
            return '/admin_dashboard';
        case 'doctor':
            return '/inbox';
        case 'patient':
            return '/patient_dashboard';
        default:
            return '';
    }
}

function authenticatedFailureRedirectPath(state, ownProps) {
    if (!state || !state.login || !state.login.user) {
        // If the user is not authenticated, then send them to the automatically chosen login path
        return ownProps.location.query.redirect || '';
    } else {
        // If the user is authenticated and we get here, then that means they tried to load a page that their role
        // doesn't allow. So, the best we can do is send them to the default page for their role.
        return defaultPathForRole(state.login.user.attributes.role);
    }
}

// Used for redux-auth-wrapper's "allowRedirectBack". That config key determines whether to honor the redirectPath.
// When the navigation event is REPLACE, the redirect happened because of redux-auth-wrapper redirecting the user.
// In that case, we don't want to honor redirectPath since we'll get a redirect loop.
const allowAuthenticatedRedirectBack = location => location.action !== 'REPLACE';

// These higher-order React components allow wrapping a React component so that it is only usable by users with
// a certain role. They use the UserAuthWrapper helper provided by [ReduxAuthWrapper](https://github.com/mjrussell/redux-auth-wrapper).
const UserIsAuthenticatedAdmin = UserAuthWrapper({
    authSelector: state => state.login.user,
    predicate: user => user && user.attributes && user.attributes.role === 'admin',
    redirectAction: routerActions.replace,
    wrapperDisplayName: 'UserIsAuthenticatedAdmin',
    failureRedirectPath: authenticatedFailureRedirectPath,
    allowRedirectBack: allowAuthenticatedRedirectBack
});


const UserIsAuthenticatedDoctor = UserAuthWrapper({
    authSelector: state => state.login.user,
    predicate: user => user && user.attributes && user.attributes.role === 'doctor',
    redirectAction: routerActions.replace,
    wrapperDisplayName: 'UserIsAuthenticatedDoctor',
    failureRedirectPath: authenticatedFailureRedirectPath,
    allowRedirectBack: allowAuthenticatedRedirectBack
});


const UserIsAuthenticatedPatient = UserAuthWrapper({
    authSelector: state => state.login.user,
    predicate: user => user && user.attributes && user.attributes.role === 'patient',
    redirectAction: routerActions.replace,
    wrapperDisplayName: 'UserIsAuthenticatedPatient',
    failureRedirectPath: authenticatedFailureRedirectPath,
    allowRedirectBack: allowAuthenticatedRedirectBack
});

const UserIsPatientSignup = UserAuthWrapper({
    authSelector: state => state.routing.locationBeforeTransitions.query,
    predicate: query => !!query.api_key,
    redirectAction: routerActions.replace,
    wrapperDisplayName: 'UserIsPatientSignup',
    allowRedirectBack: false
});

const UserIsNotAuthenticated = UserAuthWrapper({
    authSelector: state => state.login,
    predicate: login => !login.user,
    redirectAction: routerActions.replace,
    wrapperDisplayName: 'UserIsNotAuthenticated',
    failureRedirectPath: (state, ownProps) => {
        if (!state || !state.login || !state.login.user) {
            return '';
        }

        return ownProps.location.query.redirect || defaultPathForRole(state.login.user.attributes.role);
    },
    allowRedirectBack: false
});

// This renders the application. The main application component just instantiates the router boilerplate, and a series
// of React components (e. g. Login, DoctorInbox, etc). Each of these components implements a single screen of the app,
// and is displayed when the associated path is loaded. For instance, loading #cases/new in the browser will render
// the NewCase component defined in /src/components/NewCase.js, assuming the user is authenticated as an admin.
ReactDOM.render(
    <Provider store={store}>
        <div>
            <Router history={history}>
                <Route path="/" component={App}>
                    <IndexRedirect to="login"/>
                    <Route path="login" component={UserIsNotAuthenticated(Login)}/>
                    <Route path="admin_dashboard" component={UserIsAuthenticatedAdmin(AdminDashboard)}/>
                    <Route path="inbox" component={UserIsAuthenticatedDoctor(DoctorInbox)}/>
                    <Route path="inbox/:caseId" component={UserIsAuthenticatedDoctor(DoctorCaseView)}/>
                    <Route path="cases" component={UserIsAuthenticatedAdmin(CaseList)}/>
                    <Route path="cases/new" component={UserIsAuthenticatedAdmin(NewCase)}/>
                    <Route path="patient_signup" component={UserIsPatientSignup(PatientSignup)}/>
                    <Route path="patient_dashboard" component={UserIsAuthenticatedPatient(PatientDashboard)}/>
                </Route>
            </Router>
        </div>
    </Provider>
    ,
    document.getElementById('root')
);
