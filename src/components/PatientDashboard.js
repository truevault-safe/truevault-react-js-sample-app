import React, {Component} from "react";
import {connect} from "react-redux";
import Spinner from "react-spinner";
import {Alert, Col, Grid, PageHeader, Row} from "react-bootstrap";
import {internalApiClient, viewCase} from "../actions";
import BlobCarousel from "./BlobCarousel";
import "./PatientDashboard.scss";
import CaseIdLabel from "./CaseIdLabel";
import CaseStatus from "./CaseStatus";

class PatientDashboard extends Component {
    async componentWillMount() {
        const caseMetadataRequest = internalApiClient.getPatientCase(this.props.tvClient.apiKeyOrAccessToken);

        this.props.viewCase(this.props.tvClient, caseMetadataRequest);
    }

    render() {
        return <div className="patient-dashboard">
            <PageHeader>
                Patient Case {this.props.caseData && <CaseIdLabel caseId={this.props.caseData.caseId}/>}
            </PageHeader>

            {this.props.loading && <Spinner/>}

            {this.props.error && <Alert bsStyle="danger">{this.props.error.message}</Alert>}

            {this.props.caseData && <Grid>
                <Row>
                    <Col md={12}>
                        <h3>Images</h3>
                    </Col>
                </Row>


                <Row>
                    <Col md={12}>
                        <BlobCarousel style={{width: '100%'}}
                                      tvClient={this.props.tvClient}
                                      imageIds={this.props.caseData.caseImageIds || []}
                                      vaultId={process.env.REACT_APP_CASES_VAULT_ID}/>
                    </Col>
                </Row>

                <hr/>

                <div className="diagnosis">
                    <Row>
                        <Col md={12}>
                            <h3>Diagnosis</h3>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={2}><h5>Status</h5></Col>
                        <Col md={10}><CaseStatus status={this.props.caseMetadata.status}/></Col>
                    </Row>
                    {this.props.caseMetadata.status !== 'WAITING_FOR_REVIEW' && <div>
                        <Row>
                            <Col md={2}><h5>Summary</h5></Col>
                            <Col md={10}>{this.props.caseData.summary}</Col>
                        </Row>
                        <Row>
                            <Col md={2}><h5>Description</h5></Col>
                            <Col md={10}>{this.props.caseData.description}</Col>
                        </Row>
                    </div>
                    }
                </div>
            </Grid>}
        </div>;
    }
}

const mapStateToProps = state => {
    return {
        tvClient: state.login.tvClient,
        loading: state.caseView.loading,
        error: state.caseView.error,
        caseData: state.caseView.caseData,
        caseMetadata: state.caseView.caseMetadata
    };
};

export default connect(mapStateToProps, {viewCase})(PatientDashboard);
