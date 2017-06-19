import React, {Component} from "react";
import {connect} from "react-redux";
import {Alert, PageHeader, Table} from "react-bootstrap";
import {doctorInboxLoad} from "../actions";
import Spinner from "react-spinner";
import "./DoctorInbox.scss";
import CaseStatus from "./CaseStatus";


class DoctorInbox extends Component {
    componentWillMount() {
        return this.props.doctorInboxLoad(this.props.tvClient, this.props.doctorUserId);
    }

    caseTile(c) {
        return <li key={c.caseDocId}>
            <a href={`#/inbox/${c.caseDocId}`}>
                <h3>{c.document.patientName}</h3>
                <Table className="patient-info">
                    <tbody>
                    <tr>
                        <th>Case ID</th>
                        <td>{c.document.caseId}</td>
                    </tr>
                    <tr>
                        <th>Status</th>
                        <td><CaseStatus status={c.status}/></td>
                    </tr>
                    <tr>
                        <th>Birth Date</th>
                        <td>{c.document.dob}</td>
                    </tr>
                    <tr>
                        <th>Height</th>
                        <td>{c.document.patientHeight}</td>
                    </tr>
                    <tr>
                        <th>Weight</th>
                        <td>{c.document.patientWeight}</td>
                    </tr>
                    <tr>
                        <th>Sex</th>
                        <td>{c.document.sex}</td>
                    </tr>
                    </tbody>
                </Table>
            </a>
        </li>;
    }

    render() {
        return <div>
            <PageHeader>My Cases</PageHeader>

            <div className="doctor-inbox-container">

                {this.props.loading && <Spinner/>}

                {this.props.error && <Alert bsStyle="danger">{this.props.error.message}</Alert>}

                {this.props.casesToApprove && this.props.casesToReview && <div>
                    <div className="doctor-inbox-column">
                        <h2>To Diagnose</h2>
                        <ul>
                            {this.props.casesToReview.map(this.caseTile)}
                        </ul>
                    </div>
                    <div className="doctor-inbox-column">
                        <h2>To Approve</h2>
                        <ul>
                            {this.props.casesToApprove.map(this.caseTile)}
                        </ul>
                    </div>
                </div>}
            </div>
        </div>
    }
}

const mapStateToProps = state => {
    return {
        tvClient: state.login.tvClient,
        doctorUserId: state.login.user.id,
        loading: state.doctorInbox.loading,
        error: state.doctorInbox.error,
        casesToApprove: state.doctorInbox.casesToApprove,
        casesToReview: state.doctorInbox.casesToReview,
    };
};

export default connect(mapStateToProps, {doctorInboxLoad})(DoctorInbox);
