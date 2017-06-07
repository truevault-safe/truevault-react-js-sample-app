import React, {Component} from "react";
import PropTypes from "prop-types";

import "./CaseStatus.scss";

class CaseStatus extends Component {
    static caseStatus(status) {
        return {
                WAITING_FOR_APPROVAL: 'Awaiting approval',
                WAITING_FOR_REVIEW: 'In review',
                APPROVED: 'Approved'
            }[status] || status;
    }

    render() {
        return <span className={`case-status-${this.props.status}`}>{this.props.bullet && '\u2022 '}{CaseStatus.caseStatus(this.props.status)}</span>;
    }
}

CaseStatus.propTypes = {
    status: PropTypes.string.isRequired,
    bullet: PropTypes.bool
};

export default CaseStatus;
