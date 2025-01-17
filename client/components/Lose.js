import React from 'react';
import FireBaseTools, { firebaseUsersRef, firebaseQuizRef, firebaseAuth } from '../../utils/firebase.js';
import { Link } from 'react-router'

export default class Lose extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            usersObj: {},
            userData: {},
            otherData: {},
            allMatches: {},
            myAnswers: [],
            theirAnswers: [],
            heartStatus: 0,
            theirName: '',
            finishedQuiz: false
        }
        this.otherUser = null;
        this.matchRef = null;
        this.otherUserMatch = null;
        this.dataRef = null;
        this.usersRef = null;
    }

    componentDidMount () {

     firebaseAuth.onAuthStateChanged((user) => {
      if (user) {

        this.usersRef = firebaseUsersRef.on('value', snapshot => {
            this.setState({usersObj: snapshot.val()})
        })

        let user = firebaseAuth.currentUser.uid;
        let data = firebaseUsersRef.child(user)

        this.dataRef = data.on('value',
            (snapshot) => {
                this.setState({userData: snapshot.val()});
            },
            (errorObject) => {
                console.error('The read failed: ' + errorObject.code)
            })

        let matchRef = firebaseUsersRef.child(user).child('matches');
        this.matchRef = matchRef
        //We obtain an object with all the user's matches from the database
        //We preserve this object to state on allMatches
        //Then, we find the most recent match by comparing timestamps
        matchRef.on("value", (snapshot) => {
            this.setState({allMatches: snapshot.val()})
                let max = 0;
                let maxKey;
                let matchKeys = Object.keys(snapshot.val()).forEach(key => {
                    let timestamp = snapshot.val()[key].timestamp;
                    if (timestamp > max) {
                        max = timestamp;
                        maxKey = key;
                    }})

                    //Update finishedQuiz to true
                    data.child('matches').child(maxKey).update({
                        finishedQuiz: true,
                    });

                    let questions = snapshot.val()[maxKey] ? snapshot.val()[maxKey].round1 : null
                    let myAnswers = [];
                    if (questions) {
                    Object.keys(questions).forEach(question => {
                        console.log(question)
                        console.log(questions[question])
                        myAnswers.push(questions[question]);
                    })
                    this.setState({myAnswers: myAnswers})
                    }
                    //To get theirAnswers:
                    //1) Find matched user. Latest match key is maxKey, which corresponds to the matched user's username
                    //2) Find latest match of matched user's data, whose key will be the current user's username, and get data.
                            //Set data to otherData
                    //3) Apply same process to get answers. Set them to state as theirAnswers
                    //4) Compare answers and find heartStatus. Set it to state as heartStatus, render page
                    //5) Update database heartStatus for other user
                    //6) Update database heartStatus for own user

                    //1)
                        //let matchedUserRef = firebaseUsersRef.child(maxKey)
                    //2)
                    let user = firebaseAuth.currentUser.uid;
                    let otherUserMatchRef = firebaseUsersRef.child(maxKey).child('matches').child(user)
                    this.otherUserMatch = otherUserMatchRef
                    otherUserMatchRef.on('value',
                        (snapshot) => {
                            this.setState({otherData: snapshot.val()});
                            //3)
                            console.log("other user", snapshot.val())
                            let theirQuestions = snapshot.val() ? snapshot.val().round1 : null
                            let theirAnswers = [];
                            if (theirQuestions) {
                                Object.keys(questions).forEach(question => {
                                    if (question) theirAnswers.push(theirQuestions[question])
                                })
                                this.setState({theirAnswers: theirAnswers});
                                let heartStatus = 0;
                                //4)
                                if (myAnswers.length && theirAnswers.length) {
                                    for (let i = 0 ; i < myAnswers.length ; i++) {
                                        if (myAnswers[i] == theirAnswers[i]) heartStatus++
                                    }
                                    if(this.state.heartStatus === 0){
                                        this.setState({heartStatus: heartStatus}, () => {
                                            console.log(this.state.heartStatus, myAnswers, theirAnswers)
                                        })
                                        //5
                                        console.log('RESETTING THE HEART STATUS')
                                        otherUserMatchRef.update({
                                            'heartStatus': heartStatus
                                        })
                                        //6)
                                        matchRef.child(maxKey).update({
                                            heartStatus: heartStatus
                                        })
                                    }
                                    //Check in database the finishedQuiz status of both users
                                    let theyFinishedQuiz = snapshot.val().finishedQuiz;
                                    firebaseUsersRef.child(user).child('matches').child(maxKey).on('value',
                                        (snapshot) => {
                                            let iFinishedQuiz = snapshot.val().finishedQuiz;
                                            let finishedQuiz = iFinishedQuiz && theyFinishedQuiz;
                                            this.setState({finishedQuiz});
                                        })
                                }
                            }
                        },
                        (errorObject) => {
                            console.error('The read failed: ' + errorObject.code)
                        })
                    //Getting name of matched user
                    let otherUserRef = firebaseUsersRef.child(maxKey)
                    this.otherUser = otherUserRef
                    otherUserRef.on('value',
                        (snapshot) => {
                            let theirName = snapshot.val().name;
                            this.setState({theirName: theirName})
                        })
                }
        ,
        (errorObject) => {
            console.error('The read failed: ' + errorObject.code)
        });
      }
      })

    }

    componentWillUnmount(){
        firebaseUsersRef.off();
        firebaseQuizRef.off()
        firebaseUsersRef.child(firebaseAuth.currentUser.uid).child('matches').off()
        firebaseUsersRef.child(firebaseAuth.currentUser.uid).off()
        if (this.otherUser) this.otherUser.off()
        if (this.otherUserMatch) this.otherUserMatch.off()
        if (this.matchRef) this.matchRef.off()
     }

    render() {
        return (
            <div>
              <Link to="/profile"><p id="waiting-back" className="caps back"><span className="glyphicon glyphicon-chevron-left"></span>back to profile</p></Link>
              <img src="/img/no-hearts-loop.gif" id="five-hearts" />
              <div id="lose-text">
                <h1 className="fancy-type caps center">Uh oh, you {this.state.theirName ? this.state.theirName : "guys"} ran out of hearts.</h1>
                <h4 className="center">Head back to your profile to match with someone new!</h4>
              </div>
            </div>
        )
    }

}

