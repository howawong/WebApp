/*global FB*/
import React, { Component } from 'react';
import {connect} from 'react-redux';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import CloseIcon from '@material-ui/icons/Close';
import TextField from '@material-ui/core/TextField';
import { withStyles } from '@material-ui/core/styles';
import Slide from '@material-ui/core/Slide';
import LocationButton from '../LocationButton';
import SelectedMenu from '../SelectedMenu';
import {constant} from '../config/default';
import {addComment} from '../MessageDB';
import IntegrationReactSelect from '../IntegrationReactSelect';
import CustomTags from '../CustomTags';
import {
  checkAuthState,
} from '../actions';
import SignInButton from '../SignInButton'



function Transition(props) {
  return <Slide direction="up" {...props} />;
}


const styles = theme => ({
  fab: {
    margin: 0,
    top: 'auto',
    right: 20,
    bottom: 20,
    left: 'auto',
    position: 'fixed',
  },
  container: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  flex: {
    flex: 1,
  },  
  textField: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit,
  },
  formControl: {
    margin: theme.spacing.unit,
  },
  dialogContainer: {
    padding: '0.5rem'
  },
  dialogTitle: {
    background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)'  
  }
});

function Transition(props) {
  return <Slide direction="up" {...props} />;
}

class PostCommentView extends Component {
  constructor(props) {
    super(props);
    var tags = [];
    if(this.props.message.tag) {
      tags = this.tagTextToTags(this.props.message.tag);
    }

    this.state = {popoverOpen: false, buttonShow: false, 
      // comment
      commentSelection: '發表回應',
      text: "",
      geolocation: null,
      streetAddress: null,
      changeStatus: null,
      createdAt: null,
      link: null,
      tags: tags};
    this.handleTagChange = this.handleTagChange.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
    this.handleAddition = this.handleAddition.bind(this);
    this.handleDrag = this.handleDrag.bind(this);      
  }

  componentDidMount() {
    if (this.props.user != null && this.props.user.user != null) {
      //console.log("DidMount Enable Post");
      this.setState({buttonShow: true});
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.user != this.props.user && this.props.user != null) {
      //console.log("DidUpdate Enable Post");
      const {user} = this.props.user;
      if (user) {
        this.setState({buttonShow: true});
      } else {
        this.setState({buttonShow: false});
      }
    }
  }  

  handleRequestOpen(evt) {
    evt.preventDefault();
    var tags = [];
    if(this.props.message.tag) {
      tags = this.tagTextToTags(this.props.message.tag);
    }
    //console.log("Request for open " + this.state.popoverOpen);
    this.setState({
     // Comment
        commentSelection: '發表回應',
        text: "",
        geolocation: null,
        streetAddress: null,
        changeStatus: null,
        createdAt: null,
        hide: false,
        link: null,
        tags: tags,
        popoverOpen: true,
        anchorEl: evt.currentTarget
    });
  }

  handleClose() {
    this.setState({popoverOpen: false});
  };

  tagTextToTags(tag) {
    var rv = [];
    tag.map((text) => {
      var id = rv.length;
      rv.push({id:id, text:text});
    });
    return rv
  }

  onSubmit() {
    if (this.props.user != null) {
      const {user, userProfile} = this.props.user;
      if (user) {
        var photo = null;
        var commentText = null;
        var tags = null;
        var geolocation = null;
        var streetAddress = null;
        var link = null;
        var status = null;
        switch(this.state.commentSelection) {
            case  constant.commentOptions[0]: //"發表回應":
                commentText = this.state.text;
                break;
            case constant.commentOptions[2]: //"要求更改現況": 
                status = this.state.changeStatus;
                break;
            case constant.commentOptions[1]: //"要求更改地點": 
                geolocation = this.locationButton.geolocation;
                streetAddress = this.locationButton.streetAddress;
                break;
            case constant.commentOptions[3]: //"要求更改外部連結":
                link = this.state.link;
                break;
            case constant.commentOptions[4]: //"要求更改分類"
                tags = this.state.tags.map((tag) => tag.text);
                break;
        }
        this.setState({popoverOpen: false});
        return addComment(this.props.messageUUID, user, userProfile, photo, commentText, tags, geolocation, streetAddress, link, status).then(function(commentId){return commentId;});
      }
    }
    this.setState({popoverOpen: false});
    return null;
  }

  commentOptionSelection(selectedValue) {
      this.setState({commentSelection: selectedValue});
  }

  handleTagChange(value) {
    let tags = [];
    if(value != null && value != '') {
      var partsOfStr = value.split(',');
      let i = 0;
      partsOfStr.forEach(function(element) {
        tags.push({
          id: tags.length + 1,
          text: element
        });
      });
    } 
    this.setState({tags: tags});
  }

  handleDelete(i) {
    let tags = this.state.tags;
    tags.splice(i, 1);
    this.setState({tags: tags});
  }

  handleAddition(tag) {
    let tags = this.state.tags;
    tags.push({
    id: tags.length + 1,
    text: tag
    });
    this.setState({tags: tags});
  }

  handleDrag(tag, currPos, newPos) {
    let tags = this.state.tags;

    // mutate array
    tags.splice(currPos, 1);
    tags.splice(newPos, 0, tag);

    // re-render
    this.setState({ tags: tags });
  }



  render() {
    const classes = this.props.classes;
    const { tags } = this.state; 
    if(this.state.buttonShow) {
        let inputHtml = <TextField autoFocus required id="message" fullWidth margin="normal" helperText="更新事件進度及期望街坊如何參與" value={this.state.text} onChange={event => this.setState({ text: event.target.value })}/>;
        if(this.state.commentSelection != constant.commentOptions[0]) { //"發表回應"
            switch(this.state.commentSelection) {
              case constant.commentOptions[1]: //"要求更改地點"
                inputHtml = <LocationButton autoFocus ref={(locationButton) => {this.locationButton = locationButton;}}/>;
                break;              
              case constant.commentOptions[2]: // "要求更改現況"
                inputHtml = <SelectedMenu autoFocus label="" options={constant.statusOptions} changeSelection={(selectedValue) => this.setState({changeStatus: selectedValue})} ref={(statusSelection) => {this.statusSelection = statusSelection}}/>;
                break;
              case constant.commentOptions[3]: //"要求更改外部連結"
                inputHtml = <TextField autoFocus id="link" className={classes.textField} value={this.state.link} onChange={event => this.setState({ link: event.target.value })}/>;
                break;
              case constant.commentOptions[4]: //"要求更改分類"
               /* inputHtml = 
                  <IntegrationReactSelect value={tags}
                  label={constant.tagLabel}
                  placeholder={constant.tagPlaceholder}
                  suggestions={this.props.suggestions.tag}
                  onChange={(value) => this.handleTagChange(value)}
                />*/
              inputHtml = <CustomTags tags={tags}
                  inline={false}
                  placeholder="新增分類"
                  handleDelete={this.handleDelete}
                  handleAddition={this.handleAddition}
                  handleDrag={this.handleDrag} /> ;
                break;
              }
        }
      return (
        <div className="cta-report-wrapper">
            <Button className="cta-report"  variant="contained" color="primary"  raised={true} onClick={(evt) => this.handleRequestOpen(evt)}>
              <AddIcon />參與
            </Button>
            <Dialog
                fullScreen
                open={this.state.popoverOpen}
                onClose={() => this.handleClose()}
                transition={Transition}
                aria-labelledby="form-dialog-title"
                unmountOnExit>
                <DialogTitle id="form-dialog-title">更新參與進度</DialogTitle>
                <AppBar className={classes.dialogTitle}>
                  <Toolbar>
                    <IconButton color="contrast" onClick={() => this.handleClose()} aria-label="Close">
                      <CloseIcon />
                    </IconButton>
                    <Typography variant="title" color="inherit" className={classes.flex}>  </Typography>
                    <Button variant="raised" color="primary" onClick={() => this.onSubmit()}>更新參與進度</Button>
                  </Toolbar>
                </AppBar>
                <DialogContent>
                    <DialogContentText>選擇更新範圍</DialogContentText>
                    <SelectedMenu label="" options={constant.commentOptions} changeSelection={(selectedValue) => this.commentOptionSelection(selectedValue)} ref={(commentSelection) => {this.commentSelection = commentSelection}}/>
                    {inputHtml}
                </DialogContent>  
            </Dialog>     
        </div>
      )
    } else {
      return (
        <div className="cta-report-wrapper">
          <SignInButton label="請先登入方可參與該活動"/>
        </div>
      );
    }
  }
};

const mapStateToProps = (state, ownProps) => {
  return {
    user          :   state.user,
    suggestions:  state.suggestions,
  };
}

const mapDispatchToProps = (dispatch) => {
  return {
      checkAuthState:
          () => 
              dispatch(checkAuthState()),   
  }
};


export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withStyles(styles, { withTheme: true })(PostCommentView));
