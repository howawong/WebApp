

import React, { Component } from 'react';
import * as firebase from 'firebase';
import config, {constant} from './config/default';
import Button from 'material-ui/Button';
import Dialog, { DialogTitle } from 'material-ui/Dialog';
import IconButton from 'material-ui/IconButton';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import CloseIcon from 'material-ui-icons/Close';
import Slide from 'material-ui/transitions/Slide';
import List, { ListItem, ListItemIcon, ListItemText } from 'material-ui/List';
import {connect} from "react-redux";
import { togglePublicProfileDialog } from './actions';
import {getUserConcernMessages, getUserPublishMessages, getUserCompleteMessages, getUserProfile} from './UserProfile';

function Transition(props) {
  return <Slide direction="right" {...props} />;
}


const styles = {
  appBar: {
    position: 'relative',
  },
  flex: {
    flex: 1,
  },
  container: {
   overflowY: 'auto'
  }
};

class PublicProfile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {userProfile: null};
    this.concernMessages = null;
    this.publishMessages = null;
    this.completeMessages = null;
  } 

  componentDidMount() {
    if (this.props.id != "") {
      //console.log("componentDidMount id  " + this.props.id);
      var user = {uid: this.props.id};
      this.fetchUserProfile(user);
    }
  }

  fetchUserProfile(user) {
    this.setState({userProfile: null});
    this.concernMessages = null;
    this.publishMessages = null;
    this.completeMessages = null;
    getUserProfile(user).then((userProfile)=>{
      getUserConcernMessages(user).then((concernMessages)=>{
        getUserPublishMessages(user).then((publishMessages)=>{
          getUserCompleteMessages(user).then((completeMessages)=>{
            this.completeMessages = completeMessages;
            this.concernMessages = concernMessages;
            this.publishMessages = publishMessages;
            this.setState({user: user, userProfile: userProfile});
          });
        });            
      });
    });
  }

  componentDidUpdate(prevProps, prevState) {
//    console.log(prevProps.id + " id  " + this.props.id);
//    console.log(prevProps.open + " open " + this.props.open);
    if (prevProps.id != this.props.id && this.props.id != "") {
      var user = {uid: this.props.id};
      this.fetchUserProfile(user);
    }
  }


  handleRequestClose = () => {
    this.props.togglePublicProfileDialog(false);
  };

  
  render() {
    var displayName = "...";
    let imageHtml = "等一下";
    if(this.state.userProfile != null) {
      displayName = this.state.userProfile.displayName;
      imageHtml =         <img src={this.state.userProfile.photoURL}/>;
    }    
    const { classes, open } = this.props;
    return (
      <div>
        <br/>
        <Dialog fullScreen  open={open} onRequestClose={this.handleRequestClose} transition={Transition} unmountOnExit>
          <AppBar className={classes.appBar}>
              <Toolbar>
                      <IconButton color="contrast" onClick={this.handleRequestClose} aria-label="Close">
                          <CloseIcon />
                      </IconButton>
                      <Typography variant="title" color="inherit" className={classes.flex}>{constant.addressBookLabel}</Typography>           
                  </Toolbar>
              </AppBar>
              <div className={classes.container}>
          <br/>
            <h2>簡介</h2>
            名字: {displayName} <br/>
            {imageHtml}
            <br/>
            關注事件: <br/>
            {this.concernMessages} <br/>
            發佈事件: <br/>
            {this.publishMessages} <br/>
            完成事件: <br/>
            {this.completeMessages} <br/>   
          </div>
        </Dialog>
      </div>);
  }
}

PublicProfile.propTypes = {
  classes: PropTypes.object.isRequired,
};

const mapStateToProps = (state, ownProps) => {
  return {
    open: state.publicProfileDialog.open,
    id: state.publicProfileDialog.id
  };
}

const mapDispatchToProps = (dispatch) => {
  return {
    togglePublicProfileDialog: flag => 
      dispatch(togglePublicProfileDialog(flag)),
  }
};


export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(PublicProfile));

