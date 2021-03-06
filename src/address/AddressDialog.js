/*global FB*/
import React, { Component } from 'react';
import * as firebase from 'firebase';
import config, {constant} from '../config/default';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import IconButton from '@material-ui/core/IconButton';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/Close';
import Slide from '@material-ui/core/Slide';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText  from '@material-ui/core/ListItemText';
import AddressList from './AddressList';
import AddressView from './AddressView';
import {connect} from "react-redux";
import { toggleAddressDialog } from '../actions';

function Transition(props) {
  return <Slide direction="left" {...props} />;
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

class AddressDialog extends React.Component {
  constructor(props) {
    super(props);
    this.props.openDialog(this.openDialog);
  }    

  handleRequestClose = () => {
    this.props.toggleAddressDialog(false);
  };

  
  render() {
    const { classes, open } = this.props;
    return (
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
            <AddressList/>
            <AddressView/>
            </div>
        </Dialog>);
  }
}

AddressDialog.propTypes = {
  classes: PropTypes.object.isRequired,
};

const mapStateToProps = (state, ownProps) => {
  return {
    open: state.addressDialog.open,
  };
}

const mapDispatchToProps = (dispatch) => {
  return {
    toggleAddressDialog: flag => 
      dispatch(toggleAddressDialog(flag)),
  }
};


export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(AddressDialog));
