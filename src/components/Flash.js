import React, {Component} from "react";
import {connect} from "react-redux";
import {Alert} from "react-bootstrap";
import "./Flash.scss";
import {CSSTransitionGroup} from "react-transition-group";

class Flash extends Component {
    render() {
        return <CSSTransitionGroup transitionName="flash-message" transitionEnter={false}
                                   transitionLeaveTimeout={500}>
            {
                this.props.messages.map(message => <Alert bsStyle={message.style} key={message.key}>{message.message}</Alert>)
            }
        </CSSTransitionGroup>;
    }
}

const mapStateToProps = state => {
    return {
        messages: state.flash,
    };
};

export default connect(mapStateToProps)(Flash);
