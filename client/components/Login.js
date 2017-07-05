import React from 'react';
import { browserHistory } from 'react-router';
import FireBaseTools, { firebaseUsersRef, firebaseAuth, firebaseApp, firebaseMessaging } from '../../utils/firebase'
import firebase from 'firebase';

export default class App extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      val: "",
      signUpEmail: "email",
      signUpPassword: "password",
      logInEmail: "email",
      logInPassword: "password",
      user: "",
      toggleLogin: true,
    }
    this.handleLogin = this.handleLogin.bind(this);
    this.handleSignUp = this.handleSignUp.bind(this);
    this.handleFacebookLogin = this.handleFacebookLogin.bind(this);
  }

  handleFacebookLogin () {
    FireBaseTools.loginWithProvider('facebook')
    .then((user) => {
      user = user.additionalUserInfo.profile
      if (user.age_range.min < 18){
        alert("You are too young for this. Come back later")
        throw new Error("baby detected")
      } else {
        if (!firebaseUsersRef.child(firebaseAuth.currentUser.uid).child("name")){
          firebaseUsersRef.child(firebaseAuth.currentUser.uid).set({
            name: user.name,
            gender: user.gender,
            imageUrl: user.picture.data.url,
            age: null,
            bio: `I'm ${user.name}. Check me out on facebook`
            })
          }
        }
      })
      .then(() => {
        browserHistory.push('/profile/edit')
      })
      .catch((error) => {
        alert("Sorry, but you got an error:", error.message)
      });
    }



  handleLogin (event) {
    firebaseAuth.signInWithEmailAndPassword(this.state.logInEmail, this.state.logInPassword).catch(function(error){
      var errorCode = error.code;
      var errorMessage = error.message;
    })
    .then(() => {
      return firebaseMessaging.getToken()
    })
    .then(token => {
      return firebaseUsersRef.child(firebaseAuth.currentUser.uid).set({
        accessToken: token
      })
    })
    .then(() => {
    if (firebaseAuth.currentUser) browserHistory.push("profile")
    else alert ("Seems like you don't have an account yet. Create one below!")
    })
  }

  handleSignUp (event) {
    if (firebaseAuth && this.state.signUpPassword.length >= 6){
      firebaseAuth.createUserWithEmailAndPassword(this.state.signUpEmail, this.state.signUpPassword)
      .then(() => {
        return firebaseMessaging.getToken()
      })
      .then(token => {
        return firebaseUsersRef.child(firebaseAuth.currentUser.uid).set({
          name: "Happy Fullstacker",
          email: this.state.signUpEmail,
          password: this.state.signUpPassword,
          imageUrl: `http://i.imgur.com/GGMIIKS.png`,
          gender: 'male',
          age: 22,
          bio: "Fullstack rules",
          accessToken: token
        }, () => {
        browserHistory.push('signup');
        });
      })
      .catch(function(error){
        var errorCode = error.code;
        var errorMessage = error.message;
      })
    } else {
      alert("Invalid Password: Must be at least six characters")
    }
  }

  componentDidMount(){
    firebaseAuth.signOut();
    if (firebaseAuth.currentUser){
      this.setState({user: firebaseAuth.currentUser.uid})
    }
  }

  render() {
    return (
      <div>
      <img id="login-img" src='./img/logo-animated.gif' />
       <div>
        <div className="container">
         {this.state.toggleLogin ? ( <div>
              <input className="login-input"
                onChange={(evt) => {
                  this.setState({logInEmail:  evt.target.value});
                }}
                placeholder="email"
              />
              <input className="login-input"
                onChange={(evt) => {
                  this.setState({logInPassword:  evt.target.value})
                }}
                placeholder="password"

              />
              <button className="btn login-btn"
                title="Login"
                color="white"
                onClick={this.handleLogin}
              > Log in </button>
            </div>) : (<div>
            <input className="login-input"
              onChange={(evt) => {
                this.setState({signUpEmail: evt.target.value});
              }}
              placeholder="email"
            />
            <input className="login-input"
              onChange={(evt) => {
                this.setState({signUpPassword: evt.target.value})
              }}
              placeholder="password"
            />
            <button className="btn signup-btn"
              title="Sign up"
              onClick={this.handleSignUp}
              color="white"
            > Sign up </button>
          </div>)}
            <button
              id="fb-login"
              className="btn toggle-btn"
              title="Sign in with Facebook"
              onClick={this.handleFacebookLogin}
          > Sign in with Facebook </button>
          <button id={!this.state.toggleLogin ? "returning" : "new"} className="btn toggle-btn center"  onClick={()=>{this.setState({toggleLogin: !this.state.toggleLogin})}} >
          {!this.state.toggleLogin ? "Returning? Login" : "New here? Sign up"}
          </button>
        </div>
      </div>
    </div>
    );
  }
}
