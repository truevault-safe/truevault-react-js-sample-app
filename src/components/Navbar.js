import React, {Component} from "react";
import {Nav, Navbar, NavItem} from "react-bootstrap";
import {connect} from "react-redux";
import {logout} from "../actions";
import "./Navbar.scss";

class MainNavBar extends Component {
    render() {
        if (this.props.activeHref === '/login' || this.props.activeHref === '/patient_signup') {
            return null;
        }
        return <Navbar inverse className="navbar-static-top">
            <Navbar.Header>
                <Navbar.Toggle/>
            </Navbar.Header>
            <Navbar.Collapse>
                <Nav activeHref={'#' + this.props.activeHref}>
                    {this.props.isLoggedIn && this.props.isAdmin && <NavItem href="#/admin_dashboard">Dashboard</NavItem>}
                    {this.props.isLoggedIn && this.props.isAdmin && <NavItem href="#/cases">Cases</NavItem>}
                    {this.props.isLoggedIn && this.props.isAdmin && <NavItem href="#/cases/new">New Case</NavItem>}
                    {this.props.isLoggedIn && this.props.isDoctor && <NavItem href="#/inbox">Inbox</NavItem>}
                    {this.props.isLoggedIn && this.props.isPatient && <NavItem href="#/patient_dashboard">Dashboard</NavItem>}
                    {!this.props.isLoggedIn && <NavItem href="#/login">Login</NavItem>}
                </Nav>
                <Navbar.Text pullRight>
                    {this.props.name}
                </Navbar.Text>
                <Nav pullRight>
                    {this.props.isLoggedIn && <NavItem onClick={this.props.logout}>Logout</NavItem>}
                </Nav>
            </Navbar.Collapse>
        </Navbar>;
    }
}


const mapStateToProps = (state) => {
    // The navbar component can only set the active link based on exact hrefs. This is a problem, because
    // we want to highlight the 'Inbox' link when a doctor views a specific case, even though in that situation
    // the href won't be exactly #/inbox. This workaround avoids the problem by manually changing the navbar's
    // concept of the activeHref to '#/inbox' when viewing a specific case.
    let activeHref = state.routing.locationBeforeTransitions.pathname;
    if (activeHref.startsWith('/inbox')) {
        activeHref = '/inbox';
    }

    return {
        isLoggedIn: !!state.login.user,
        activeHref: activeHref,
        isAdmin: state.login.user && state.login.user.attributes.role === 'admin',
        isDoctor: state.login.user && state.login.user.attributes.role === 'doctor',
        isPatient: state.login.user && state.login.user.attributes.role === 'patient',
        name: state.login.user && state.login.user.attributes.name
    }
};

export default connect(mapStateToProps, {logout})(MainNavBar);
