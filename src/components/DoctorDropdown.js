import React, {Component} from "react";
import {FormControl} from "react-bootstrap";
import {connect} from "react-redux";


class DoctorDropdown extends Component {
    render() {
        return <FormControl componentClass="select" placeholder="select" inputRef={this.props.inputRef}>
            {Object.values(this.props.userIdToDoctor).map(d => {
                return <option value={d.id} key={d.id}>{d.attributes.name}</option>
            })}
        </FormControl>;
    }
}

const mapStateToProps = state => {
    return {
        userIdToDoctor: state.doctorCache.userIdToDoctor
    }
};

export default connect(mapStateToProps)(DoctorDropdown);

