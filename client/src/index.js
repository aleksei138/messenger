import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Home from './components/home/Home'
import Login from './components/Login'
import SignUp from './components/SignUp'
import reportWebVitals from './reportWebVitals';
import { Route, BrowserRouter as Router } from 'react-router-dom'
import { Redirect } from 'react-router-dom'

function IsAuthentificated() {
  return localStorage.getItem("authentication");
}

const PrivateRoute = ({ component: Component, ...rest }) => (
  <Route {...rest} render={(props) => (
      IsAuthentificated()
          ? <Component {...props} />
          : <Redirect to='/login' />
  )} />
)

const LoggedInRoute = ({ component: Component, ...rest }) => (
  <Route {...rest} render={(props) => (
      IsAuthentificated()          
          ? <Redirect to='/' />
          : <Component {...props} />
  )} />
)

const routing = (
  <Router>
     <PrivateRoute exact path="/" component={Home}/>
     <LoggedInRoute path="/login" component={Login} />
     <Route path="/signup" component={SignUp} />
  </Router>
)

ReactDOM.render(
  routing,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
