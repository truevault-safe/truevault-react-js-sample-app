import React, {Component} from "react";
import {connect} from "react-redux";
import {login} from "../actions";
import {ControlLabel, FormControl, FormGroup} from "react-bootstrap";
import AuthForm from "./AuthForm";

class LoginForm extends Component {
    login(e) {
        e.preventDefault();

        let mfaCode = this.mfaCode ? this.mfaCode.value : null;

        this.props.login(this.username.value, this.password.value, mfaCode);
    }

    render() {
        return <AuthForm onSubmit={this.login.bind(this)} authError={this.props.loginError} submitLabel="Login"
                         authInProgress={this.props.loggingIn}>
            <FormGroup controlId="username">
                <ControlLabel>Username</ControlLabel>
                <FormControl type="text" inputRef={ref => this.username = ref}/>
            </FormGroup>

            <FormGroup controlId="password">
                <ControlLabel>Password</ControlLabel>
                <FormControl type="password" inputRef={ref => this.password = ref}/>
            </FormGroup>

            {this.props.mfaRequired && <FormGroup controlId="mfaCode">
                <ControlLabel>MFA Code</ControlLabel>
                <FormControl type="number" placeholder="000000" inputRef={ref => this.mfaCode = ref}/>
            </FormGroup>}
        </AuthForm>;
    }
}

const mapStateToProps = (state) => {
    return {
        loggingIn: state.login.loggingIn,
        loginError: state.login.loginError,
        mfaRequired: state.login.mfaRequired
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        login: (username, password, mfaCode) => {
            dispatch(login(username, password, mfaCode));
        }
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(LoginForm);
