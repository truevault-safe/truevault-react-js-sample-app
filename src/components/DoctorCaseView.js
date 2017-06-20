import "./DoctorCaseView.scss";

import React, {Component} from "react";
import {connect} from "react-redux";
import {Alert, Button, Col, ControlLabel, Form, FormControl, FormGroup, PageHeader, Row, Table} from "react-bootstrap";
import Spinner from "react-spinner";
import {internalApiClient, submitApproval, submitReview, viewCase} from "../actions";
import BlobCarousel from "./BlobCarousel";
import CaseIdLabel from "./CaseIdLabel";
import CaseStatus from "./CaseStatus";

class DoctorCaseView extends Component {
    componentWillMount() {
        const getCaseMetadataRequest = internalApiClient.getCase(this.props.tvClient.apiKeyOrAccessToken, this.props.routeParams.caseId);

        this.props.viewCase(this.props.tvClient, getCaseMetadataRequest);
    }

    submitReview(e) {
        e.preventDefault();

        this.props.submitReview(this.props.tvClient, this.props.routeParams.caseId,
            this.props.diagnosisDocId, this.summary.value, this.description.value);
    }

    submitApproval(e) {
        e.preventDefault();

        this.props.submitApproval(this.props.tvClient.apiKeyOrAccessToken, this.props.routeParams.caseId);
    }

    caseUpdateForm(submitFunction, submitting, formDisabled, buttonLabel) {
        return <Form onSubmit={submitFunction.bind(this)} className="diagnosis-form">
            <h3>Diagnosis</h3>

            <FormGroup>
                <ControlLabel>Status: <CaseStatus status={this.props.caseMetadata.status}/></ControlLabel>
            </FormGroup>
            <FormGroup controlId="summary">
                <ControlLabel>Summary</ControlLabel>
                <FormControl type="text" placeholder="1 to 2 sentences"
                             inputRef={ref => this.summary = ref}
                             defaultValue={this.props.caseData.summary}
                             disabled={formDisabled}/>
            </FormGroup>
            <FormGroup controlId="description">
                <ControlLabel>Description</ControlLabel>
                <FormControl componentClass="textarea"
                             placeholder="Longer explanation of the diagnosis"
                             inputRef={ref => this.description = ref}
                             defaultValue={this.props.caseData.description}
                             disabled={formDisabled}/>
            </FormGroup>
            <FormGroup className="submit-buttons">
                <Button type="submit" disabled={submitting}>{buttonLabel}</Button>
            </FormGroup>
        </Form>;
    }

    render() {
        return <div className="dr-case-view">
            <PageHeader>
                Review case {this.props.caseData && <CaseIdLabel caseId={this.props.caseData.caseId} />}

                <Button className="pull-right" href="#/inbox">Cancel</Button>
            </PageHeader>

            {this.props.loading && <Spinner/>}

            {this.props.caseViewError && <Alert bsStyle="danger">{this.props.caseViewError.message}</Alert>}
            {this.props.caseSubmitReviewError &&
            <Alert bsStyle="danger">{this.props.caseSubmitReviewError.message}</Alert>}
            {this.props.caseSubmitApprovalError &&
            <Alert bsStyle="danger">{this.props.caseSubmitApprovalError.message}</Alert>}

            {this.props.caseData && this.props.caseMetadata && <div className="dr-case-view-container">
                <Row>
                    <Col md={8}>
                        <BlobCarousel tvClient={this.props.tvClient}
                                      imageIds={this.props.caseData.caseImageIds || []}
                                      vaultId={process.env.REACT_APP_CASES_VAULT_ID}/>
                    </Col>

                    <Col md={4}>

                        {this.props.userId === this.props.caseMetadata.reviewerId && this.caseUpdateForm(
                            this.submitReview, this.props.submittingReview, false,
                            'Submit Diagnosis')}

                        {this.props.userId === this.props.caseMetadata.approverId && this.caseUpdateForm(
                            this.submitApproval, this.props.submittingApproval, true,
                            'Approve')}

                        <div className="patient-information">
                            <h3>Patient Information</h3>
                            <Table>
                                <tbody>
                                <tr>
                                    <th>Birth Date</th>
                                    <td>{this.props.caseData.dob}</td>
                                </tr>
                                <tr>
                                    <th>Height</th>
                                    <td>{this.props.caseData.patientHeight}</td>
                                </tr>
                                <tr>
                                    <th>Weight</th>
                                    <td>{this.props.caseData.patientWeight}</td>
                                </tr>
                                <tr>
                                    <th>Sex</th>
                                    <td>{this.props.caseData.sex}</td>
                                </tr>
                                </tbody>
                            </Table>
                        </div>
                    </Col>
                </Row>
            </div>}
        </div>;
    }
}

const mapStateToProps = state => {
    return {
        tvClient: state.login.tvClient,
        userId: state.login.user.id,
        loading: state.caseView.loading,
        caseViewError: state.caseView.error,
        caseSubmitReviewError: state.caseSubmitReview.error,
        caseSubmitApprovalError: state.caseSubmitApproval.error,
        caseData: state.caseView.caseData,
        caseMetadata: state.caseView.caseMetadata,
        diagnosisDocId: state.caseView.diagnosisDocId,
        submittingReview: state.caseSubmitReview.loading,
        submittingApproval: state.caseSubmitReview.loading
    };
};

export default connect(mapStateToProps, {viewCase, submitReview, submitApproval})(DoctorCaseView);
