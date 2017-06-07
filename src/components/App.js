import React from "react";
import {connect} from "react-redux";
import Navbar from "./Navbar";
import Flash from "./Flash";
import "./App.scss";

function App({children}) {
    return <div>
        <Navbar/>
        <Flash/>
        {children}
    </div>
}

export default connect(false)(App);
