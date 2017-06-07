import React, {Component} from "react";
import {connect} from "react-redux";
import PropTypes from "prop-types";
import "./DoctorResponseTimeTable.scss";
import {ProgressBar} from 'react-bootstrap';
import {formatDuration} from './format-duration';

class DoctorResponseTimeTable extends Component {

    doctorName(doctorUserId) {
        const doctor = this.props.userIdToDoctor[doctorUserId];
        return doctor && doctor.attributes && doctor.attributes.name;
    }

    render() {
        const longestResponseTime = this.props.responseTimes[this.props.responseTimes.length - 1].avgResponseTime;
        return <div className="doctor-response-times">
            <h5>Doctor response times</h5>
            <ul>{this.props.responseTimes.map(d => {
                return <li key={d.doctorUserId}>
                    <div className="doctor-name">{this.doctorName(d.doctorUserId)}</div>
                    <ProgressBar now={d.avgResponseTime} max={longestResponseTime}/>
                    <div className="response-time">{formatDuration(d.avgResponseTime)}</div>
                </li>;
            })}</ul>
        </div>;
    }
}

DoctorResponseTimeTable.propTypes = {
    responseTimes: PropTypes.array.isRequired
};

const mapStateToProps = (state) => {
    return {
        userIdToDoctor: state.doctorCache.userIdToDoctor
    };
};

export default connect(mapStateToProps)(DoctorResponseTimeTable);
