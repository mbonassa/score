import React from 'react'
import { browserHistory } from 'react-router';
import { firebaseDb, firebaseAuth, firebaseUsersRef } from '../../utils/firebase'
import ignite, { withAuth, FireInput } from '../../utils/ignite'
import { randomize } from '../../utils/helperFunctions'
import { ChatMessage } from './ChatMessage'

export default ignite(withAuth(class extends React.Component {

  constructor(props){
    super(props);
    this.state = {
      input: '',
      userInfo: {},
      partnerInfo: {},
      randomNumbers: [],
      questions: []
    }
    this.sendMessage = this.sendMessage.bind(this)
    this.handleInput = this.handleInput.bind(this)
    this.askQuestion = this.askQuestion.bind(this)
    this.answerQuestion = this.answerQuestion.bind(this)
    this.judgeQuestion = this.judgeQuestion.bind(this)

    this.currentMatch = null;
  }

  //---------------- LIFECYCLE HOOKS  ----------- //


  componentDidMount(){
     firebaseAuth.onAuthStateChanged((user) => {
      if (user) {
        this.setState({randomNumbers: randomize(20).slice(2)})

        //grabbing question data, current user data, and all user data

        firebaseDb.ref('Questions').on('value', snapshot => {
          this.setState({questions: snapshot.val()})
        })

        firebaseUsersRef.child(firebaseAuth.currentUser.uid).on('value', snapshot => {
          this.setState({userInfo: snapshot.val()}, () => {
            this.currentMatch = this.state.userInfo.matches[this.props.partnerId]
            // if we have won or lost the match, let's... unmatch!
            if (
              this.props.partnerId === this.state.userInfo.partnerId &&
              (
                this.state.userInfo.matches[this.state.userInfo.partnerId].heartStatus > 4 || this.state.userInfo.matches[this.state.userInfo.partnerId].heartStatus < 0 ||
                this.state.userInfo.matches[this.state.userInfo.partnerId].askedQuestions > 8
              )
            ){
              this.unmatch();
            }
          })
        });

        firebaseUsersRef.child(this.props.partnerId).on('value', snapshot => {
          this.setState({partnerInfo: snapshot.val()})
        });
      } else {
        alert("You're not logged in")
        browserHistory.push('login')
      }
    })
  }

  // these two components grab the messageHistory container (holds every message) and whenever the component updates, set the scroll height to the bottom of that container. credit to patrick kim (https://github.com/ptrkkim/stackathon)

  componentWillUpdate() {
    const node = this.container;
    this.shouldScroll = node.scrollTop + node.offsetHeight >= node.scrollHeight;
  }

  componentDidUpdate() {
    const node = this.container;
      node.scrollTop = node.scrollHeight;
  }


  componentWillUnmount(){
    firebaseDb.ref('Questions').off()
    firebaseUsersRef.child(firebaseAuth.currentUser.uid).off();
    firebaseUsersRef.child(this.props.partnerId).off();
  }

  //---------------- UTILITY FUNCTIONS  ----------- //

  unmatch(){
    firebaseUsersRef.child(firebaseAuth.currentUser.uid).update({
      partnerId: ''
    })
    firebaseUsersRef.child(this.props.partnerId).update({
      partnerId: ''
    })
  }

  handleInput(evt){
    this.setState({input: evt.target.value})
  }


  //we call this function directly from an onsubmit and through other functions. if it is called from another function we only care about the custom text passed in. otherwise let's use the state
  sendMessage(event, text){
    let msg;
    if (event){
      event.preventDefault()
      msg = this.state.input
    }
    if (!this.props.fireRef) return
    if (text) {
      msg = text
    }
    return this.props.fireRef.push({
      timestamp: Date.now(),
      from: firebaseAuth.currentUser.uid,
      body: `${msg}`
    })
    .then(() => {
      this.setState({input: ''})
      return firebaseDb.ref('Users').child(this.props.partnerId).child('matches').child(firebaseAuth.currentUser.uid).child('chat').push({
        timestamp: Date.now(),
        from: firebaseAuth.currentUser.uid,
        body: `${msg}`
      })
    })
  }

  renderSendMsg(user, submitFunc) {
    if (!user) {
      return <span>You must be logged in to send messages.</span>
    }
    return (
      <form onSubmit={(evt) =>{
        submitFunc(evt)
      }
    }>
        <input onChange={this.handleInput} value={this.state.input} name='body'/>
        <input type='submit'/>
      </form>
    )
  }

  //---------------- ROLE FUNCTIONS ----------- //

// these functions define each role, so there are three (waiters dont have anything to do)


// pick from four predefined questions. at the start both players are the asker, and when one player picks, the other player becomes the answerer

  askQuestion(number){
    return () => {
      firebaseUsersRef.child(firebaseAuth.currentUser.uid).child('matches').child(this.props.partnerId).update({
        selectedQuestion: this.state.questions[number],
        isAsker: false,
        isAnswerer: false,
        isJudge: false
      })
      firebaseUsersRef.child(this.props.partnerId).child('matches').child(firebaseAuth.currentUser.uid).update({
        selectedQuestion: this.state.questions[number],
        isAsker: false,
        isAnswerer: true,
        isJudge: false
      })
      let msg = `Question ${this.state.userInfo.matches[this.props.partnerId].askedQuestions}: ${this.state.questions[number]}`
      this.sendMessage(null, msg)
    }
  }


//sends one message. better be a good one (really this is just sendmessage with a db update afterward)

  answerQuestion(event, text){
    this.sendMessage(event, text)
    .then(() => {
      firebaseUsersRef.child(firebaseAuth.currentUser.uid).child('matches').child(this.props.partnerId).update({
        selectedQuestion: 'Waiting...',
        isAsker: false,
        isAnswerer: false,
        isJudge: false
      })
      firebaseUsersRef.child(this.props.partnerId).child('matches').child(firebaseAuth.currentUser.uid).update({
        selectedQuestion: 'Waiting...',
        isAsker: false,
        isAnswerer: false,
        isJudge: true
      })
    })
  }


//curried function. returns a function that changes the heartstatus by whatever heartsToAdd is set at

  judgeQuestion(heartsToAdd){
    return () => {
      let newHearts = this.state.userInfo.matches[this.props.partnerId].heartStatus + heartsToAdd
      firebaseUsersRef.child(firebaseAuth.currentUser.uid).child('matches').child(this.props.partnerId).update({
        selectedQuestion: 'Waiting...',
        heartStatus: newHearts,
        askedQuestions: this.currentMatch.askedQuestions + 1,
        isAsker: false,
        isAnswerer: false,
        isJudge: false
      })
      firebaseUsersRef.child(this.props.partnerId).child('matches').child(firebaseAuth.currentUser.uid).update({
        selectedQuestion: 'Waiting...',
        askedQuestions: this.currentMatch.askedQuestions + 1,
        heartStatus: newHearts,
        isAsker: true,
        isAnswerer: false,
        isJudge: false
      })
      let msg = `${this.state.userInfo.name} changed the heartstatus by ${heartsToAdd}!`
      this.sendMessage(null, msg)
    }
  }

// this is a big render! to explain from top-bottom:
// chat renders message history all the time.
// after that it sees if the match is won or lost. if either is true, it displays that.
// after that it checks to see your state in the game. there are four states you can be in. it checks questioner -> answerer -> judge -> waiter, and renders one of these four states


  render() {
    const { user, snapshot, asEntries } = this.props,
          messages = asEntries(snapshot)

    return (
      <div>
        <div className="messageHistory" ref={ele => { this.container = ele; }}>
          {
            messages.map(({key, fireRef}) => {
              return <ChatMessage key={key} fireRef={fireRef}/>
            })
          }
        </div>
        <hr />
        {
          this.currentMatch && this.currentMatch.heartStatus > 4 ?
          <div>
            <p> Your HeartRate is maxed out! Get chattin'! </p>
            {this.renderSendMsg(user, this.sendMessage)}
          </div>
          :
          this.currentMatch && (this.currentMatch.heartStatus < 0 || this.currentMatch.askedQuestions > 8) ?
          <div>
            <p> You ran out of hearts... </p>
            <Link to="profile"> Match again? </Link>
          </div>
          :
          this.state.userInfo.matches && this.state.userInfo.matches[this.props.partnerId].isAsker ?
          <div>
            <p> YOU'RE ASKING! </p>
            {
              this.state.randomNumbers.map(number => {
                return <p key={number} onClick={this.askQuestion(number)}> {this.state.questions[number]} </p>
              })
            }
          </div>
          :
          this.state.userInfo.matches && this.state.userInfo.matches[this.props.partnerId].isAnswerer ?
          <div>
            <p>YOU'RE ANSWERING</p>
            <p> Your question: </p>
            <p> { this.state.userInfo.matches[this.props.partnerId].selectedQuestion } </p>
            <div>
              {this.renderSendMsg(user, this.answerQuestion)}
            </div>
          </div>
          :
          this.state.userInfo.matches && this.state.userInfo.matches[this.props.partnerId].isJudge ?
          <div>
            <p> YOU'RE JUDGING </p>
            <button onClick={this.judgeQuestion(1)}>LIKE</button>
            <button onClick={this.judgeQuestion(-1)}>DON'T LIKE</button>
          </div>
          :
          <p> Waiting on your partner's response... </p>
        }
        <div>
          <p> You have {this.state.userInfo.matches ? this.state.userInfo.matches[this.props.partnerId].heartStatus : 0} hearts </p>
        </div>
      </div>
    )
  }
}))
