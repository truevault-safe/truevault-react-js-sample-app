import React, {Component} from "react";
import {connect} from "react-redux";
import {viewAdminDashboardStats} from "../actions";
import {Alert, PageHeader} from 'react-bootstrap';
import Spinner from 'react-spinner';
import StatsCard from './StatsCard';

class AdminDashboard extends Component {

    componentDidMount() {
        this.props.viewAdminDashboardStats(this.props.accessToken);
    }

    render() {
        return <div>
            <PageHeader>Dashboard</PageHeader>

            {this.props.statsError && <Alert bsStyle="danger">{this.props.statsError.message}</Alert>}

            {this.props.statsLoading && <Spinner/>}

            {this.props.stats && <div>
                <StatsCard stats={this.props.stats.createToReview} startStatus="Assigned" endStatus="Reviewed"/>
                <StatsCard stats={this.props.stats.reviewToApprove} startStatus="Reviewed" endStatus="Approved"/>
            </div>
            }
        </div>;
    }
}

const mapStateToProps = (state) => {
    console.log("admin dashboard mapStateToProps state.login.tvclient", state.login.tvClient);
    console.log("tvClient.accessToken", state.login.tvClient.accessToken);
    console.log("tvClient.accessToken", state.login.tvClient.accessToken);
    
    return {
        accessToken: state.login.tvClient.accessToken,
        stats: state.statsView.stats,
        statsLoading: state.statsView.loading,
        statsError: state.statsView.error
    };
};

export default connect(mapStateToProps, {viewAdminDashboardStats})(AdminDashboard);
