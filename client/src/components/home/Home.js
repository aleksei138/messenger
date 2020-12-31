import React, { useState, useEffect, useRef } from 'react'
import Container from '@material-ui/core/Container';
import CssBaseline from '@material-ui/core/CssBaseline';
import IconButton from '@material-ui/core/IconButton';
import GroupIcon from '@material-ui/icons/Group';
import Grid from '@material-ui/core/Grid';
import { TextField, Switch, Button, FormControlLabel, Tooltip } from '@material-ui/core';
import './Home.css';
import useChat from "./useChat";
import useLastSeen from "./useLastSeen";
import { Dot } from 'react-animated-dots';
import $ from 'jquery'
import SendIcon from '@material-ui/icons/Send';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import ChatIcon from '@material-ui/icons/Chat';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import moment from 'moment'
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContentText from '@material-ui/core/DialogContentText';
import Dialog from '@material-ui/core/Dialog';
import Avatar from '@material-ui/core/Avatar';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import DeleteIcon from '@material-ui/icons/Delete';
import {sent, seen, sending} from './ticks'


const currentUserId = localStorage.getItem('userId');




export function ChatListElement(props) {

    var title = props.item.title;
    if (!title) {
        if (props.item.type === 'private') {
            title = props.item.participants[0].id === currentUserId ? props.item.participants[1].name : props.item.participants[0].name;            
        }            
        else {
            title = props.item.participants.map(p => p.name).join(', ');
        }            
    }

    var avatarLetters = '';
    if (props.item.type === 'private' && title) {
        const splited = title.split(' ');
        avatarLetters = splited.length > 1 ? splited[0][0] + splited[1][0] : title[0];
    }
       

    function formatDate(date) {
        const dt = moment(date);
        if (dt.isSame(moment(), 'day')) { // if today, only time
            return dt.format("hh:mm A");
        } else if (dt.isSame(moment().subtract(1, 'days'), 'day')) {
            return 'yesterday';
        } else {
            return dt.format('D-MMM-YY');
        }
    }

    function selectChat(){
        props.onSelect({id: props.item.id, title: title, participants: props.item.participants, type: props.item.type});
    }

    return (
        <div className={`chat-list-element ${props.item.selected && "chat-list-selected"}`} onClick={selectChat}>
            <div className='chat-list-content'>
                <div className='chat-list-icon'>
                    {props.item.type === 'private' ?
                        <Avatar style={{marginTop: 'auto', marginBottom: 'auto'}}>{avatarLetters}</Avatar>
                        : <GroupIcon/>
                    }
                </div>
                <div className='chat-list-description'>
                    <div className="chat-list-header">
                        <div className="chat-list-title">{title}</div>
                        {props.item.unread > 0 && 
                            <div className="chat-list-unread-wrapper">
                                <div className="chat-list-unread-count">{props.item.unread}</div>
                            </div>
                        }      
                        {!props.item.hasBeenRead &&
                            <div className="chat-list-hasNotBeenRead"></div>
                        }          
                        {props.item.lastMessage.from && 
                                <div className="chat-list-time">{formatDate(props.item.lastMessage.time)}</div>
                        }
                    </div>
                    {props.item.lastMessage.from && 
                        
                        <div style={{display: 'flex'}}>
                            { props.item.lastMessage.from === currentUserId &&
                                <span className={props.item.selected ? "you-label-selected" : "you-label"}>You:</span>
                            }
                            <span className="chat-list-message">{props.item.lastMessage.text}</span>
                        </div>
                    }
                </div>
            </div>          
        </div>
        );
}


export function Message(props)  {

    var from = '';
    if (props.chat.type !== 'private' && props.message.sender !== currentUserId){
        let participant = props.chat.participants.find(p => p.id === props.message.sender);
        if (participant)
            from = participant.name;
    }

    function formatDate(date) {
        const dt = moment(date);
        var time = dt.format("hh:mm A");
        if (dt.isSame(moment(), 'day')) { // if today, only time
            return time;
        } else if (dt.isSame(moment().subtract(1, 'days'), 'day')) { // if yesterday
            return 'yesterday ' + time;
        } else if (dt.isSame(moment(), 'year')) { // if this year
            return `${dt.format('D MMM')} ${time}`;
        } else {
            return `${dt.format('D-MMM-YY')} ${time}`; // if not this year
        }
    }         

    return (
        <div>
            { props.message.firstUnseen === true &&
                <div class="unread-messages-wrapper"><div class="unread-messages">New messages</div></div>
            }
            <div className="message-wrapper">
                {currentUserId !== props.message.sender &&
                    <div className="others-message-triangle"></div>
                }                
                <div className={`message-body ${currentUserId === props.message.sender ? "my-message" : "others-message"}`}>
                    <div style={{display: 'flex'}}>
                        {from && 
                            <div className="message-from">{`${from}:`}</div>
                        }
                    <div className="message-text">{props.message.text}</div>
                    </div>
                        {props.message.type === 'full' 
                            ? <div style={{display: 'flex'}}><div className="message-time">{formatDate(props.message.time)}</div>
                                { props.message.sent === false && props.message.sender === currentUserId &&
                                    <div className="message-tick">{sending}</div>
                                }
                                { props.message.seen === true && props.message.sender === currentUserId &&
                                    <div className="message-tick">{seen}</div>                        
                                }
                                { props.message.seen === false && (props.message.sent === true || props.message.sent == null) && props.message.sender === currentUserId &&
                                    <div className="message-tick">{sent}</div>   
                                }
                            
                            </div>
                            : <div style={{ fontSize: '11px'}}>typing<Dot>.</Dot><Dot>.</Dot><Dot>.</Dot></div>                        
                        }
                    
                </div>
                {currentUserId === props.message.sender &&
                    <div className="my-message-triangle"></div>
                } 
            </div>
        </div>
        );    
}

export function Contact(props) {

    const avatarLetters = props.firstName[0] + props.lastName[0];
    const lastSeen = { lastSeen: props.lastSeen, online: props.online };

    function selectChat() {
        props.selectChat({
            id: props.id, 
            fullName: `${props.firstName} ${props.lastName}`
        });
    }

    return(
        <div className="contact-wrapper" onClick={selectChat}>
            <div className="contact-content">
                <Avatar style={{marginTop: 'auto', marginBottom: 'auto'}}>{avatarLetters}</Avatar>
                <div  style={{ marginLeft: '0.5em' }}>
                    <div style={{paddingLeft: '0.5em', fontSize: '18px'}}>{`${props.firstName} ${props.lastName}`}</div>
                    <div style={{paddingLeft: '0.6em', paddingTop: '0.3em'}}>
                        <LastSeen info={lastSeen}/>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function NewChatDialog(props) {
    const {onClose} = props;
    
    const [contacts, setContacts] = useState([]);

    function handleEntering() {
        fetch('api/chats/loadContacts').then((response) => {
            if (!response.ok)
                throw new Error();
            return response.json();
        }).then((data) => {
            setContacts([...data]);
        }).catch((error) => {
            console.error(error);
        });
      };


    return (
        <Dialog
          disableBackdropClick
          disableEscapeKeyDown
          maxWidth="xs"
          onEntering={handleEntering}
          aria-labelledby="new-chat-dialog-title"
          open={props.open}
        >
          <DialogTitle id="new-chat-dialog-title">Select contact</DialogTitle>
          <DialogContent id="new-chat-dialog-content" dividers>
              <div>
                {contacts.map(contact => (
                        <Contact
                            selectChat={(chatId) => onClose(chatId)}
                            id={contact.id}
                            key={contact.id}
                            firstName={contact.firstName}
                            lastName={contact.lastName}
                            lastSeen={contact.lastSeen}
                        />                        
                ))}
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => onClose(null)} color="primary">
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      );
}

export function LastSeen(props) {

    function formatDate(date) {
        const dt = moment(date);
        var time = dt.format("hh:mm A");
        if (dt.isSame(moment(), 'day')) { // if today, only time
            return 'at ' + time;
        } else if (dt.isSame(moment().subtract(1, 'days'), 'day')) { // if yesterday
            return 'yesterday at ' + time;
        } else if (dt.isSame(moment(), 'year')) { // if this year
            return `${dt.format('D MMM')} at ${time}`;
        } else {
            return `${dt.format('D-MMM-YY')} at ${time}`; // if not this year
        }
    }

    if (props.info.lastSeen) { // if object is not empty
        if (props.info.online) {
            return (
                <span style={{color: '#56b4fc'}}>online</span>
            );
        } else {
            return (
                <span >{'last seen ' + formatDate(props.info.lastSeen)}</span>
            );
        }
    }
    else {
        return (
            <span >last seen recently</span>
        );
    } 
}

export function ChatInfo(props){
    var avatarLetters = '';
    if (props.type === 'private' && props.title) {
        const splited = props.title.split(' ');
        avatarLetters = splited.length > 1 ? splited[0][0] + splited[1][0] : props.title[0];
    }
    return(
        <div id="chat-info">
            <div style={{marginTop: 'auto', marginBottom: 'auto'}}>
                <Avatar style={{marginTop: 'auto', marginBottom: 'auto', marginRight: '0.7em'}}>{avatarLetters}</Avatar>
            </div>
            <div style={{marginTop: 'auto', marginBottom: 'auto'}}>
                <div id="chat-info-title">
                    <span>{props.title}</span>
                </div>
                <div id="chat-info-lastSeen">
                    <LastSeen info={props.lastSeen}/>
                </div>
            </div>
        </div>
    );
}

export function AlertDialog(props) {
    return (
      <div>
        <Dialog
          open={props.open}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">{"Do you really want to delete this chat?"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
                This action cannot be undone
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={props.onCancel} color="primary" autoFocus>
              Cancel
            </Button>
            <Button onClick={props.onDelete} color="secondary" startIcon={<DeleteIcon />} >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );

}



export default function Home() {
    const userName = localStorage.getItem('userName');

    // message is being typed
    const currMessage = useRef({id: newGuid(), text: ''});

    // selected chat
    const [currChat, setCurrChat] = useState({});

    const [userMenuState, setUserMenuState] = useState(null); // for user menu
    const [chatMenuState, setChatMenuState] = useState(null); // for chat menu
    const [openDialog, setOpenDialog] = useState(false); // for contact dialog
    const [openAlert, setOpenAlert] = useState(false);

    // enables/disables live messaging
    var isLiveStored = true;
    if (localStorage.getItem('isLive') === 'false')
        isLiveStored = false;
    const isLive = useRef(isLiveStored);
    const [switchState, setSwitchState] = useState(isLiveStored); // for 'live' switch

    const { messages, chats, sendMessage, newChat, updateObject } = useChat(currChat.id); // chat manager

    const [ interlocutor, setInterlocutor ] = useState(); // for last seen of the current interlocutor
    const { lastSeen, setLastSeen, reportOnline, reportOffline } = useLastSeen(interlocutor); // last seen manager

    // on page load
    useEffect(()=>{
        reportOnline();
        // do display lastSeens
        $(window).on("focus", () => {
            reportOnline();
        });
        
        $(window).on("blur", () => {
            reportOffline();
        });

    }, []);

    // when messages rerender scroll to bottom
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // when chat is selected
    useEffect(() => {
        if (currChat.participants && currChat.type === 'private') {
            const user = currChat.participants.find(x => x.id !== currentUserId);
            if (user) {
                setInterlocutor(user.id);
            }
            // get last seen
            fetch('api/getLastSeen?' + new URLSearchParams({userId: user.id}).toString()).then((response) => {
                if (!response.ok)
                    throw new Error();
                return response.json();
            }).then((data) => {
                setLastSeen(data);
            }).catch((error) => {
                console.error(error);
            });
        }
        

    }, [currChat]);
    
    useEffect(() => {
        const chat = chats.find(x => x.id === currChat.id);
        if (chat) {
            scrollToBottom();
        }
        else {
            setCurrChat({}); // if the chat has been deleted, drop current chat
        }       
        
    }, [chats]);


    // must have
    function newGuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16).toUpperCase();
        });
      }    

    // for live messaging
    function sendPartialMessage() {
        sendMessage({ 
            id: currMessage.current.id, 
            type: 'partial', 
            chatId: currChat.id, 
            to: currChat.participants,  
            sender: currentUserId,
            text: currMessage.current.text,
            time: new Date()
        });
    }

    // to remove a partial message if live messaging is cancelled
    function sendEmptyMessage() {
        sendMessage({ 
            id: currMessage.current.id, 
            type: 'partial', 
            chatId: currChat.id, 
            to: currChat.participants,  
            sender: currentUserId,
            text: '',
            time: new Date()
        });
    }
        
    function sendFullMessage(event) {
        event.preventDefault();

        // prevent sending empty messages
        if (!currMessage.current.text || !currMessage.current.text.trim())
            return;

        sendMessage({ 
            id: currMessage.current.id, 
            type: 'full', 
            chatId: currChat.id, 
            to: currChat.participants,
            sender: currentUserId,
            text: currMessage.current.text, 
            time: new Date()
        });
        currMessage.current.id = newGuid();
        currMessage.current.text = '';
        $("#text-area").val('');
    }

    function logout() {
        localStorage.clear();
        window.location.href = '/login';
    }

    function deleteChat() {
        updateObject({
            action: 'delete',
            target: 'chat',
            targetId: currChat.id
        });
        setCurrChat({});
        setChatMenuState(null);
    }       

    function handleDialogClose(contact) {
        setOpenDialog(false);
        if (contact) {
            // start new chat
            const chat = newChat(contact);
            setCurrChat(chat)
        }
    }

    function scrollToBottom() {
        var element = document.getElementById("chat");
        if (element) {
            element.scrollTop = element.scrollHeight;
        }            
    }

    var avatarLetters = '';
    const splited = userName.split(' ');
    avatarLetters = splited.length > 1 ? splited[0][0] + splited[1][0] : userName[0];
    

    return (
      <React.Fragment>
        <CssBaseline />
        <Container maxWidth="lg" style={{paddingLeft: '0px', paddingRight: '0px', boxShadow: 'rgb(136, 136, 136) 0px 0px 20px 5px', minWidth: '620px'}}>
            <Grid container direction="row">
                <Grid id="left" container item xs={4} wrap="nowrap" style={{ height: '100vh', minWidth: '300px' }}>
                    <Grid container direction="column">
                        <Grid id="user-info" style={{  height: '7vh' }}>
                            <div style={{ height: '100%', float: 'left'}}>
                                <div style={{ display: 'flex', height: '100%'}}>
                                    <Avatar style={{marginTop: 'auto', marginBottom: 'auto', marginLeft: '0.7em'}}>{avatarLetters}</Avatar>
                                    <span style={{marginTop: 'auto', marginBottom: 'auto', marginLeft: '0.7em', fontSize: '18px'}}>{userName}</span>
                                </div>
                            </div>
                            <div id="top-icons">
                                <div style={{marginTop: 'auto', marginBottom: 'auto'}}>
                                    <IconButton onClick={event => {setOpenDialog(true)} }><ChatIcon/></IconButton>
                                    <NewChatDialog
                                        open={openDialog}
                                        onClose={handleDialogClose}
                                    />
                                </div>
                                
                                <div style={{marginTop: 'auto', marginBottom: 'auto'}}>
                                    <IconButton onClick={event => setUserMenuState(event.currentTarget)} ><MoreVertIcon/></IconButton>
                                    <Menu
                                        id="user-menu"
                                        anchorEl={userMenuState}
                                        keepMounted
                                        open={Boolean(userMenuState)}
                                        onClose={() => setUserMenuState(null)}
                                        >
                                        <MenuItem onClick={logout}><ExitToAppIcon/><div style={{marginLeft: '0.5em'}}>Log out</div></MenuItem>
                                    </Menu>
                                </div>
                                
                                                              
                            </div>
                        </Grid>
                        <Grid id="chat-list" style={{ height: '93vh', overflow: 'auto'}}>
                            <div id="chat-list" >
                                {chats.map(item =>
                                    <ChatListElement 
                                        onSelect={args => setCurrChat(args)}
                                        key={item.id}
                                        item={item}
                                        />
                                    )}
                            </div>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid id="right" container item xs style={{ backgroundColor: '#8ab3ff', height: '100vh', minWidth: '320px' }}>
                    <Grid container direction="column">
                        { currChat.id ?
                            <div>
                                <Grid id="chat-header" style={{ backgroundColor: 'white', display: 'flex', minHeight: '7vh' }}>
                                    <ChatInfo type={currChat.type} title={currChat.title} lastSeen={lastSeen} />
                                    <div id="chat-options">
                                        <div style={{marginTop: '0.5em', marginRight: '0.5em'}}>
                                            
                                            <IconButton onClick={event => setChatMenuState(event.currentTarget)} ><MoreVertIcon/></IconButton>
                                            <Menu
                                                id="chat-menu"
                                                anchorEl={chatMenuState}
                                                open={Boolean(chatMenuState)}
                                                onClose={() => setChatMenuState(null)}
                                                >
                                                <MenuItem onClick={() => setOpenAlert(true)}><DeleteIcon/><div style={{marginLeft: '0.5em'}}>Delete chat</div></MenuItem>
                                                <AlertDialog
                                                    open={openAlert}
                                                    onCancel={() => {
                                                        setOpenAlert(false);
                                                        setChatMenuState(null)
                                                    }}
                                                    onDelete={() => {
                                                        deleteChat();
                                                        setOpenAlert(false);
                                                        setChatMenuState(null)
                                                    }}
                                                />
                                            </Menu>
                                        </div>
                                    </div>                              
                                </Grid>                            
                                <Grid id="chat-area" container>
                                    <Grid id="chat" container style={{ height: '85vh', overflow: 'auto', paddingBottom: '2em'}}>
                                        {messages && 
                                            <div style={{ width: '100%'}}>
                                                <div style={{ width: '100%'}}>
                                                    {messages.map(item =>
                                                        <Message chat={currChat} message={item} key={item.id} />
                                                    )}
                                                </div>
                                            </div>
                                        }                                        
                                    </Grid>
                                    <Grid container style={{ minHeight: '8vh', backgroundColor: 'white'}}>
                                        <form style={{ width: '100%'}} onSubmit={sendFullMessage} noValidate>
                                            <div id="sending-form">
                                                <div style={{ marginRight: '20px', marginTop: '10px'}}>
                                                <Tooltip title="Send your message as you type" placement="top">
                                                    <FormControlLabel
                                                        control={
                                                            <Switch
                                                                color="primary"
                                                                checked={switchState}
                                                                onChange={event => {

                                                                    isLive.current = event.target.checked;
                                                                    if (!event.target.checked && currMessage.current.text)
                                                                        sendEmptyMessage();
                                                                    setSwitchState(event.target.checked);
                                                                    localStorage.setItem("isLive", event.target.checked);
                                                                }}
                                                        />
                                                        }
                                                        label="Live"
                                                        labelPlacement="start"
                                                        />
                                                </Tooltip>
                                                    
                                                </div>
                                                <div style={{ flexGrow: 1, marginTop: '10px'}}>
                                                    <TextField
                                                        id="text-area"
                                                        fullWidth                                                    
                                                        placeholder="Write a message"
                                                        autoFocus
                                                        autoComplete="off"
                                                        onChange={event => {
                                                            const { value } = event.target;
                                                            currMessage.current.text = value;
                                                            if (isLive.current)
                                                                sendPartialMessage();
                                                        }}/>
                                                </div>
                                                <div style={{  marginTop: '10px', marginRight: '10px', marginLeft: '10px'}}>
                                                    <IconButton type="submit"><SendIcon/></IconButton>
                                                </div>
                                            </div>  
                                        </form>
                                    </Grid>
                                </Grid>
                            </div>
                            : <div id="init-message">Select a chat to start messaging</div>
                        }
                    </Grid>
                </Grid>
            </Grid>          
        </Container>
      </React.Fragment>
    );
  }