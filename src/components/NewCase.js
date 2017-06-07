import React, {Component} from "react";
import {connect} from "react-redux";
import {
    Alert,
    Button,
    Col,
    ControlLabel,
    Form,
    FormControl,
    FormGroup,
    Image,
    InputGroup,
    PageHeader,
    ProgressBar,
    Row
} from "react-bootstrap";
import {createCase} from "../actions";
import dateFormat from "dateformat";
import "./NewCase.scss";
import DoctorDropdown from "./DoctorDropdown";

class NewCase extends Component {
    constructor(props) {
        super(props);
        this.state = {
            caseFiles: [],
            caseFileUrls: []
        };
    }

    newCase(e) {
        e.preventDefault();

        this.props.createCase(
            this.props.accessToken,
            this.caseId.value,
            this.patientName.value,
            this.sex.value,
            dateFormat(new Date(this.dob.valueAsDate), "yyyy-mm-dd"),
            this.patientHeight.valueAsNumber,
            this.patientWeight.valueAsNumber,
            dateFormat(new Date(this.dueDate.valueAsDate), "yyyy-mm-dd"),
            this.state.caseFiles,
            this.approver.value,
            this.reviewer.value
        );
    }

    handleBrowseImagesClick(e) {
        e.preventDefault();

        this.fileInput.click();
    }

    handleFileChange(e) {
        e.preventDefault();

        this.setState({
            caseFiles: [...e.target.files],
            // Set object URLs one time so that images don't re-render when state changes
            caseFileUrls: [...e.target.files].map(caseFile => URL.createObjectURL(caseFile))
        });
    }

    getProgressPercentage(bytesLoaded, bytesTotal) {
        if (bytesTotal === 0) {
            // Total set to 0 means 100 percent is complete
            return 100;
        } else if (!bytesTotal) {
            // Total not set, so 0 percent is complete
            return 0;
        }
        return Math.min((bytesLoaded / bytesTotal) * 100, 100);
    }

    render() {
        return <div>
            <PageHeader>
                Add a case
                <small>Please enter the following patient case information as well as other notes if necessary</small>
            </PageHeader>
            <Form onSubmit={this.newCase.bind(this)} className="new-case-form">

                <legend>Patient Information</legend>

                {this.props.addCaseError && <Alert bsStyle="danger">
                    {this.props.addCaseError.message}
                </Alert>}

                <FormGroup controlId="caseId">
                    <ControlLabel>Case ID</ControlLabel>
                    <FormControl type="text" placeholder="111-111-1111" inputRef={ref => this.caseId = ref}/>
                </FormGroup>

                <FormGroup controlId="dueDate">
                    <ControlLabel>Due Date</ControlLabel>
                    <FormControl type="date" inputRef={ref => this.dueDate = ref}/>
                </FormGroup>

                <FormGroup controlId="patientName">
                    <ControlLabel>Patient Name</ControlLabel>
                    <FormControl type="text" placeholder="Patient Name" inputRef={ref => this.patientName = ref}/>
                </FormGroup>

                <FormGroup controlId="sex">
                    <ControlLabel>Sex</ControlLabel>
                    <FormControl type="text" inputRef={ref => this.sex = ref}/>
                </FormGroup>

                <FormGroup controlId="dob">
                    <ControlLabel>DOB</ControlLabel>
                    <FormControl type="date" inputRef={ref => this.dob = ref}/>
                </FormGroup>

                <FormGroup controlId="reviewer">
                    <ControlLabel>Reviewer</ControlLabel>
                    <DoctorDropdown inputRef={ref => this.reviewer = ref}/>
                </FormGroup>

                <FormGroup controlId="approver">
                    <ControlLabel>Approver</ControlLabel>
                    <DoctorDropdown inputRef={ref => this.approver = ref}/>
                </FormGroup>

                <FormGroup controlId="patientHeight" className="patient-height">
                    <ControlLabel>Patient Height</ControlLabel>
                    <InputGroup>
                        <FormControl type="number" inputRef={ref => this.patientHeight = ref}/>
                        <InputGroup.Addon>ft</InputGroup.Addon>
                    </InputGroup>
                </FormGroup>

                <FormGroup controlId="patientWeight" className="patient-weight">
                    <ControlLabel>Patient Weight</ControlLabel>
                    <InputGroup>
                        <FormControl type="number" inputRef={ref => this.patientWeight = ref}/>
                        <InputGroup.Addon>lbs</InputGroup.Addon>
                    </InputGroup>
                </FormGroup>

                <legend>Upload images</legend>

                <Row>
                {
                    this.state.caseFileUrls.map(url => {
                        return <Col className="thumbnail-col" md={4} key={url}>
                            <Image src={url} thumbnail/>
                        </Col>
                    })
                }
                </Row>

                <div className="progress-box">
                    {this.props.addingCase ? (
                        <ProgressBar now={this.getProgressPercentage(this.props.bytesLoaded, this.props.bytesTotal)}/>
                    ) : (
                        <div>
                            <input type="file" multiple accept="image/*" style={{display: 'none'}}
                                   onChange={this.handleFileChange.bind(this)} ref={ref => this.fileInput = ref}/>
                            <a href="#" onClick={this.handleBrowseImagesClick.bind(this)}>Browse Images</a>
                        </div>
                    )}

                </div>

                <FormGroup className="submit-buttons">
                    <Button type="submit" disabled={this.props.addingCase} className="pull-right">
                        Add
                    </Button>
                </FormGroup>


            </Form>
        </div>
    }
}

const mapStateToProps = state => {
    return {
        addingCase: state.addCase.addingCase,
        addCaseError: state.addCase.addCaseError,
        bytesLoaded: state.addCase.bytesLoaded,
        bytesTotal: state.addCase.bytesTotal,
        accessToken: state.login.user.access_token
    };
};

const mapDispatchToProps = dispatch => {
    return {
        createCase: (...params) => dispatch(createCase(...params))
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(NewCase);
