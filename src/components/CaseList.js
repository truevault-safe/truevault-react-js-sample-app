import React, {Component} from "react";
import {
    Alert,
    Button,
    ControlLabel,
    Form,
    FormControl,
    FormGroup,
    Glyphicon,
    PageHeader,
    Pagination,
    Table
} from "react-bootstrap";
import {listCases} from "../actions";
import "./CaseList.scss";
import Spinner from "react-spinner";
import "react-spinner/react-spinner.css";
import {connect} from "react-redux";
import InvitePatientOverlay from "./InvitePatientOverlay";
import CaseStatus from "./CaseStatus";

class CaseList extends Component {
    constructor(props) {
        super(props);

        this.state = {
            sortKey: this.props.isDoctor ? 'dueDate' : null,
            sortDirection: 'asc'
        };
    }

    componentWillMount() {
        this.changeListPage(1)
    }

    changeListPage(page) {
        let filter = {
            caseId: {
                type: 'wildcard',
                value: '*'
            }
        };

        if (this.state.dueBefore) {
            filter.dueDate = {
                type: 'range',
                value: {
                    lte: this.state.dueBefore
                }
            };
        }

        let sort = [];
        if (this.state.sortKey) {
            let sortObj = {};
            sortObj[this.state.sortKey] = this.state.sortDirection;
            sort.push(sortObj);
        }

        this.props.listCases(this.props.accessToken, 'and', filter, sort, page, 10);
    }

    toggleSortDirection(key) {
        return () => {
            let newSortDirection = 'asc';
            if (this.state.sortKey === key && this.state.sortDirection === 'asc') {
                newSortDirection = 'desc';
            }

            this.setState({
                sortKey: key,
                sortDirection: newSortDirection
            }, () => this.changeListPage(this.props.paginationInfo.current_page));
        };
    }

    sortIndicator(key) {
        if (this.state.sortKey === key && this.state.sortDirection === 'asc') {
            return <Glyphicon glyph="arrow-up"/>;
        } else if (this.state.sortKey === key && this.state.sortDirection === 'desc') {
            return <Glyphicon glyph="arrow-down"/>;
        }
    }

    dueBeforeChange(event) {
        this.setState({
            dueBefore: event.target.value || null
        }, () => this.changeListPage(this.props.paginationInfo.current_page))
    }

    tableHeader(sortKey, label) {
        return <th className="sortable"
                   onClick={this.toggleSortDirection(sortKey)}>{label} {this.sortIndicator(sortKey)}</th>;
    }

    doctorName(doctorId) {
        const doctor = this.props.userIdToDoctor[doctorId];
        return doctor && doctor.attributes && doctor.attributes.name;
    }

    render() {
        return <div>
            <PageHeader>
                Patient cases
                <Button bsStyle="primary" className="pull-right" href="#/cases/new">+ Add a Patient Case</Button>

                <Form inline className="case-list-filters">
                    <FormGroup controlId="dueDate">
                        <ControlLabel>Due Before: </ControlLabel>
                        <FormControl type="date" onChange={this.dueBeforeChange.bind(this)}/>
                    </FormGroup>
                </Form>
            </PageHeader>

            <div className="case-list-container">
                {this.props.listError && <Alert bsStyle="danger">{this.props.listError.message}</Alert>}

                <div className="case-list-summary">{this.props.paginationInfo.total_result_count}
                    {' '}case{this.props.paginationInfo.total_result_count === 1 ? '' : 's'} listed.
                </div>

                <Table className="case-list sortable">
                    <thead>
                    <tr>
                        {this.tableHeader('status', 'Case Status')}
                        {this.tableHeader('caseId', 'Case ID')}
                        {this.tableHeader('patientName', 'Patient Name')}
                        <th>Reviewer</th>
                        <th>Approver</th>
                        {this.tableHeader('dueDate', 'Due Date')}
                        <th/>
                    </tr>
                    </thead>
                    <tbody>
                    {
                        this.props.cases.map(c => {
                            return <tr key={c.documentId}>
                                <td><CaseStatus bullet status={c.status}/></td>
                                <td>{c.caseId}</td>
                                <td>{c.patientName}</td>
                                <td>{this.doctorName(c.reviewerId)}</td>
                                <td>{this.doctorName(c.approverId)}</td>
                                <td>{c.dueDate}</td>
                                <td>
                                    {!c.patientUserId && <InvitePatientOverlay caseDocument={c}/>}
                                </td>
                            </tr>
                        })
                    }
                    </tbody>
                </Table>
                {this.props.casesLoading && <Spinner/>}
                <div className="text-center">
                    <Pagination
                        boundaryLinks
                        first
                        prev
                        next
                        last
                        maxButtons={5}
                        items={this.props.paginationInfo.num_pages}
                        activePage={this.props.paginationInfo.current_page}
                        onSelect={this.changeListPage.bind(this)}/>
                </div>
            </div>
        </div>
    }
}

const mapStateToProps = state => {
    return {
        isDoctor: state.login.user.attributes.role === 'doctor',
        accessToken: state.login.user.access_token,
        cases: state.caseList.cases,
        casesLoading: state.caseList.loading,
        paginationInfo: state.caseList.paginationInfo,
        listError: state.caseList.error,
        userIdToDoctor: state.doctorCache.userIdToDoctor
    };
};

export default connect(mapStateToProps, {listCases})(CaseList);
