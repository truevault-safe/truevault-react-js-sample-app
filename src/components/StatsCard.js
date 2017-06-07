import React, {Component} from "react";
import PropTypes from "prop-types";
import "./StatsCard.scss";
import StatHighlight from './StatHighlight';
import DoctorResponseTimeTable from './DoctorResponseTimeTable';
import {formatDuration} from './format-duration';

class StatsCard extends Component {
    render() {
        return <div className="stats-card">
            <h6>{`Case ${this.props.startStatus}`} <span className="arrow-symbol">→</span> {this.props.endStatus}</h6>
            <div className="stat-highlights">
                <StatHighlight label="Average conversion" value={formatDuration(this.props.stats.avgResponseTime)}/>
                <StatHighlight label="Cases not reviewed" value={this.props.stats.casesRemaining.toString()}/>
            </div>
            <DoctorResponseTimeTable responseTimes={this.props.stats.responseTimes}/>
        </div>;
    }
}

StatsCard.propTypes = {
    stats: PropTypes.object.isRequired,
    startStatus: PropTypes.string.isRequired,
    endStatus: PropTypes.string.isRequired
};

export default StatsCard;
