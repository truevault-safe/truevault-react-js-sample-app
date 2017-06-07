import React, {Component} from "react";
import PropTypes from "prop-types";
import "./CaseIdLabel.scss";

class CaseIdLabel extends Component {
    render() {
        return <span className="case-id-label">ID: {this.props.caseId}</span>;
    }
}

CaseIdLabel.propTypes = {
    caseId: PropTypes.string.isRequired
};

export default CaseIdLabel;

