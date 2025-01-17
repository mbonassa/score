import './index.scss';

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, browserHistory, IndexRoute } from 'react-router';

import { Profile, Login, EditProfile, DailyMatch, Signup, Quiz, Waiting, Wait, Load, MatchHistory, Random, Chat, Lose } from './components';


ReactDOM.render(
   <Router history={browserHistory}>
      <Route path="/" >
        <IndexRoute component={Login} />
        <Route path="/lostmatch" component={Lose}/>
        <Route path="/wait" component={Wait}/>
        <Route path="/load" component={Load}/>
        <Route path="/profile" component={Profile}/>
        <Route path="/profile/edit" component={EditProfile} />
        <Route path="/login" component={Login}/>
        <Route path="/quiz" component={Quiz}/>
        <Route path="/signup" component={Signup}/>
        <Route path="/match" component={DailyMatch}/>
        <Route path="/matchHistory" component={MatchHistory}/>
        <Route path="/waiting" component={Waiting}/>
        <Route path="/random" component={Random}/>
        <Route path="/chat/:partnerId" component={Chat}/>
      </Route>
    </Router>,
    document.getElementById('app')
)
