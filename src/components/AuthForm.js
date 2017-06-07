import React, {Component} from "react";
import {Alert, Button, Form, FormGroup} from "react-bootstrap";
import PropTypes from "prop-types";
import "./AuthForm.scss";

class AuthForm extends Component {
    render() {
        return <div className="auth-form-container">
            <Form onSubmit={this.props.onSubmit.bind(this)}>

                <img className="company-logo" src="/logo.png" alt="Logo"/>
                <div className="company-name">TrueDiagnostics</div>

                {this.props.authError && <Alert bsStyle="danger">
                    {this.props.authError.message}
                </Alert>}

                {this.props.children}

                <FormGroup>
                    <Button type="submit" disabled={this.props.authInProgress}>
                        {this.props.submitLabel}
                    </Button>
                </FormGroup>
            </Form>
            <div className="auth-form-background"/>
        </div>;
    }
}

AuthForm.propTypes = {
    onSubmit: PropTypes.func.isRequired,
    authError: PropTypes.object,
    authInProgress: PropTypes.bool,
    submitLabel: PropTypes.string
};

export default AuthForm;
