import React, {Component} from "react";
import PropTypes from "prop-types";
import "./StatHighlight.scss";

class StatHighlight extends Component {
    render() {
        return <div className="stat-highlight">
            <h5>{this.props.label}</h5>
            <h2>{this.props.value}</h2>
        </div>;
    }
}

StatHighlight.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
};

export default StatHighlight;
