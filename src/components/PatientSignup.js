import React, {Component} from "react";
import {connect} from "react-redux";
import {patientSignup} from "../actions";
import AuthForm from "./AuthForm";
import {ControlLabel, FormControl, FormGroup} from "react-bootstrap";

class PatientSignup extends Component {
    patientSignup(e) {
        e.preventDefault();
        this.props.patientSignup(this.props.userApiKey, e.target.password.value);
    }

    render() {
        return <AuthForm onSubmit={this.patientSignup.bind(this)} submitLabel="Sign Up" authInProgress={this.props.signupInProgress} authError={this.props.signupError}>
            <FormGroup controlId="password">
                <ControlLabel>Choose Password</ControlLabel>
                <FormControl type="password" required/>
            </FormGroup>
        </AuthForm>;
    }
}

const mapStateToProps = (state) => {
    return {
        userApiKey: state.routing.locationBeforeTransitions.query.api_key,
        signupInProgress: state.patientSignup.loading,
        signupError: state.patientSignup.error
    };
};

export default connect(mapStateToProps, {patientSignup})(PatientSignup);
