import React, {Component} from "react";
import ReactDOM from "react-dom";
import {connect} from "react-redux";
import {Alert, Button, Form, FormControl, FormGroup, InputGroup, Overlay, Popover} from "react-bootstrap";
import {assignCaseToNewPatient} from "../actions";
import Spinner from "react-spinner";


class InvitePatientOverlay extends Component {
    constructor(props) {
        super(props);
        this.state = {show: false};
    }

    invitePatient(e) {
        e.preventDefault();

        const patientEmail = e.target.email.value;
        this.props.assignCaseToNewPatient(this.props.tvClient, this.props.caseDocument.documentId, this.props.caseDocument.readGroupId, patientEmail, this.props.caseDocument.patientName, this.hide.bind(this));
    }

    hide() {
        this.setState({show: false});
    }

    render() {
        return <div>
            <Button ref="target" onClick={e => this.setState({show: true})} disabled={this.props.assignCaseInProgress}>Invite
                Patient</Button>

            <Overlay show={this.state.show} rootClose target={props => ReactDOM.findDOMNode(this.refs.target)}
                     onHide={this.hide.bind(this)} placement="left">
                <Popover id="invite-patient" title="Email" className="invite-patient-overlay">

                    {this.props.assignCaseError && <Alert bsStyle="danger">{this.props.assignCaseError.message}</Alert>}

                    <Form inline onSubmit={this.invitePatient.bind(this)}>
                        <FormGroup controlId="email">
                            <InputGroup>
                                <FormControl type="email" required placeholder="patient@domain.tld"/>

                                {this.props.assignCaseInProgress && <InputGroup.Addon><Spinner/></InputGroup.Addon>}
                                {!this.props.assignCaseInProgress &&
                                <InputGroup.Button>
                                    <Button type="submit">
                                        Invite
                                    </Button>
                                </InputGroup.Button>
                                }
                            </InputGroup>
                        </FormGroup>
                    </Form>
                </Popover>
            </Overlay>
        </div>
    }
}

const mapStateToProps = state => {
    return {
        tvClient: state.login.tvClient,
        assignCaseInProgress: state.assignCaseToNewPatient.loading,
        assignCaseError: state.assignCaseToNewPatient.error
    };
};

export default connect(mapStateToProps, {assignCaseToNewPatient})(InvitePatientOverlay);
