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
import GroupAddIcon from '@material-ui/icons/GroupAdd';
import DeleteIcon from '@material-ui/icons/Delete';
import {sent, read, sending} from './ticks'
import AddCircleIcon from '@material-ui/icons/AddCircle';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import { Alert, AlertTitle } from '@material-ui/lab';
import { UserMap } from "./UserMap";


const currentUserId = localStorage.getItem('userId');




export function ChatListElement(props) {

    var title = props.item.title;

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

    var from = '';
    if (props.item.type === 'group' && props.item.lastMessage.senderName) {
        from = props.item.lastMessage.senderName + ':';
    }
    else if (props.item.type === 'group' 
        && !props.item.lastMessage.senderName 
        && props.item.lastMessage.from 
        && props.item.lastMessage.from !== '00000000-0000-0000-0000-000000000000'
        ) {

        let participant = UserMap.get(props.item.lastMessage.from);
        
        if (participant)
            from = participant.firstName + ':';;
    }

    function selectChat(){
        props.onSelect(props.item);
    }

    return (
        <div className={`chat-list-element ${props.item.selected ? "chat-list-selected" : ""}`} onClick={selectChat}>
            <div className='chat-list-content'>
                <div className='chat-list-icon'>
                    {props.item.type === 'private' ?
                        <Avatar style={{marginTop: 'auto', marginBottom: 'auto'}}>{avatarLetters}</Avatar>
                        : <GroupIcon style={{marginLeft: '0.4em', marginRight: '0.3em', marginTop: 'auto', marginBottom: 'auto'}}/>
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
                            <div className={props.item.selected ? "chat-list-unread-selected" : "chat-list-unread"}></div>
                        }          
                        {props.item.lastMessage.time && 
                                <div className="chat-list-time">{formatDate(props.item.lastMessage.time)}</div>
                        }
                    </div>
                    {props.item.lastMessage.from && 
                        
                        <div style={{display: 'flex'}}>
                            { props.item.lastMessage.from === currentUserId &&
                                <span className={props.item.selected ? "you-label-selected" : "you-label"}>You:</span>
                            }
                            { props.item.type === 'group' && props.item.lastMessage.from !== currentUserId &&
                                <span className="chat-list-sender">{from}</span>                            
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

    const [open, setOpen] = useState(false); // for message info dialog

    var from = '';
    // in groups chat use UserMap, bacause participants are subjects to change
    if (props.chat.type !== 'private' && props.message.sender !== currentUserId){
        let participant = UserMap.get(props.message.sender);
        if (participant)
            from = participant.fullName;
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
    
    if (props.message.type === 'notification') {
        return(
            <div className="notification-wrapper">
                <div className="notification-text">
                    <span>{props.message.text}</span>
                </div>
            </div>
        );
    }

    return (
        <div>
            { props.message.firstUnread === true &&
                <div className="unread-messages-wrapper"><div className="unread-messages">New messages</div></div>
            }
            <div className="message-wrapper">
                {currentUserId !== props.message.sender &&
                    <div className="others-message-triangle"></div>
                }                
                <div className={`message-body ${currentUserId === props.message.sender ? "my-message" : "others-message"} 
                    ${props.clickable && currentUserId === props.message.sender ? 'clickable' : ''}`} 
                    onClick={props.clickable && props.message.sender === currentUserId ? () => setOpen(true) : () => {}}>
                    <div>
                        {from && 
                            <div className="message-from">{`${from}:`}</div>
                        }
                    <div className="message-text">{props.message.text}</div>
                    </div>
                        {props.message.type === 'full' 
                            ? <div style={{display: 'flex', width: 'fit-content', marginLeft: 'auto'}}>
                                <div className="message-time">{formatDate(props.message.time)}</div>
                                { props.message.sent === false && props.message.sender === currentUserId &&
                                    <div className="message-tick">{sending}</div>
                                }
                                { props.message.ticks && props.message.ticks.length > 0 && props.message.sender === currentUserId &&
                                    <div className="message-tick">{read}</div>                        
                                }
                                { (props.message.sent || props.message.sent == null) 
                                    && (!props.message.ticks || props.message.ticks.length <= 0) 
                                    && props.message.sender === currentUserId &&
                                    
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
            { props.clickable && props.message.sender === currentUserId &&
                <MessageInfo 
                    onClose={() => setOpen(false)}
                    open={open}
                    chat={props.chat}
                    message={props.message}
                />
            }
            
        </div>
        );    
}

export function MessageInfo(props) {
    const {onClose} = props;

    // array to render (like SQL join)
    var readList = [];
    if (props.message.ticks && props.message.ticks.length > 0) {
        readList = props.message.ticks.map(x => Object.assign(x, props.chat.participants.find(y => y.id === x.readBy)));
    }

    readList = readList.filter(x => x.name);
        

    readList.forEach(element => {
        let splited = element.name.split(' ');
        let avatarLetters = splited.length > 1 ? splited[0][0] + splited[1][0] : props.chat.title[0];
        element.avatarLetters = avatarLetters;
    });

    const remaining = props.chat.participants.length - props.message.ticks.length - 1;

    function formatDate(date) {
        const dt = moment(date);
        var time = dt.format("hh:mm A");
        if (dt.isSame(moment(), 'day')) { // if today
            return 'today at ' + time;
        } else if (dt.isSame(moment().subtract(1, 'days'), 'day')) { // if yesterday
            return 'yesterday at ' + time;
        } else if (dt.isSame(moment(), 'year')) { // if this year
            return `${dt.format('D MMM')} at ${time}`;
        } else {
            return `${dt.format('D-MMM-YY')} at ${time}`; // if not this year
        }
    }
    var readAt = '-';
    if (props.chat.type === 'private' && props.message.ticks.length === 1){
        readAt = formatDate(props.message.ticks[0].readAt);
    }

    return(
        <Dialog
          maxWidth="xs"
          open={props.open}
        >
          <DialogTitle>Message Info</DialogTitle>
          <DialogContent dividers>
              <div style={{minWidth: '300px', backgroundColor: '#8ab3ff'}}>
                <Message chat={props.chat} message={props.message} key={props.message.id} clickable={false}/>
              </div>
              { props.chat.type === 'private'
                ? <div style={{paddingTop: '0.5em', paddingBottom: '0.5em', fontSize: '18px'}}>
                    <span>{`Read: ${readAt}`}</span>
                </div>
                : <div>
                    <div style={{paddingTop: '0.5em', paddingBottom: '0.5em', fontSize: '18px'}}>
                        <span style={{ marginRight: '0.5em'}}>Read by:</span><span style={{ marginLeft: 'auto'}}>{remaining > 0 && `(${remaining} remaining)`}</span>
                    </div>                
                    <div>
                        {readList.map(read => (
                                <div>
                                    <div style={{display: 'flex', paddingTop: '0.5em', paddingBottom: '0.5em'}}>
                                        <Avatar style={{marginTop: 'auto', marginBottom: 'auto'}}>{read.avatarLetters}</Avatar>
                                        <div style={{ marginLeft: '0.5em' }}>
                                            <div style={{paddingLeft: '0.5em', fontSize: '18px'}}>{read.name}</div>
                                            <div style={{paddingLeft: '0.5em', fontSize: '13px'}}>{formatDate(read.readAt)}</div>
                                        </div>
                                    </div>
                                </div>                      
                        ))}
                    </div>
                </div>                 
              }
              
          </DialogContent>
          <DialogActions>
            <Button onClick={() => onClose(null)} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
    );

}

export function Contact(props) {

    const avatarLetters = props.firstName[0] + props.lastName[0];
    const lastSeen = { lastSeen: props.lastSeen, online: props.online };
    const [selected, setSelected] = useState(false);

    function selectChat() {
        props.selectChat({
            id: props.id, 
            fullName: `${props.firstName} ${props.lastName}`
        });
    }

    return(
        <div className={selected ? "contact-wrapper-selected" : "contact-wrapper"} onClick={props.addButton ? () => {} : selectChat } >
            <div className="contact-content">
                <Avatar style={{marginTop: 'auto', marginBottom: 'auto'}}>{avatarLetters}</Avatar>
                <div style={{ marginLeft: '0.5em' }}>
                    <div style={{paddingLeft: '0.5em', fontSize: '18px'}}>{`${props.firstName} ${props.lastName}`}</div>
                    <div style={{paddingLeft: '0.6em', paddingTop: '0.3em'}}>
                        <LastSeen info={lastSeen}/>
                    </div>
                </div>
                { props.addButton &&
                    <div style={{marginLeft: 'auto', paddingLeft: '2em'}}>
                        <IconButton onClick={() => {
                            setSelected(!selected);
                            props.addHandler({contact: {id: props.id, name: `${props.firstName} ${props.lastName}`}, add: !selected});
                            } }>
                         { selected 
                             ? <HighlightOffIcon/>
                             : <AddCircleIcon/>
                         }
                        </IconButton>
                    </div>
                }
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

export function NewGroupChatDialog(props) {
    const {onClose} = props;
    
    const [contacts, setContacts] = useState([]);
    const [alert, setAlert] = useState(false);
    const selected = useRef([]);

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

    function addOrRemoveContact(args) {
        if (args.add) {
            selected.current.push(args.contact);
        }
        else {
            let index = selected.current.findIndex(x => x === args.contact.id);
            if (index > -1) {
                selected.current.splice(index, 1);
            }
        }
    }

    return (
        <Dialog
          disableBackdropClick
          disableEscapeKeyDown
          maxWidth="xs"
          onEntering={handleEntering}
          aria-labelledby="new-chat-dialog-title"
          open={props.open}
        >
          <DialogTitle id="new-chat-dialog-title">Select contacts</DialogTitle>
          <DialogContent id="new-chat-dialog-content" dividers>
              <div>
                {contacts.map(contact => (
                        <Contact
                            id={contact.id}
                            key={contact.id}
                            firstName={contact.firstName}
                            lastName={contact.lastName}
                            lastSeen={contact.lastSeen}
                            addButton={true}
                            addHandler={addOrRemoveContact}
                        />                        
                ))}
            </div>
            { alert &&
                <Alert severity="error">
                    <AlertTitle>Error</AlertTitle>
                    Please select at least two contacts
              </Alert>
            }
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
                selected.current = [];
                onClose(null);
            }} color="secondary">
              Cancel
            </Button>
            <Button onClick={() => {
                if (selected.current.length < 2) {
                    setAlert(true);
                    setTimeout(() => {
                        setAlert(false);
                    }, 3000);
                } else {
                    onClose(selected.current);
                    selected.current = [];
                }                
                }} color="primary">
              Next
            </Button>
          </DialogActions>
        </Dialog>
      );
}

export function GroupNameDialog(props) {
    const title = useRef();
    const [alert, setAlert] = useState(false);
    
    return (
      <div>
        <Dialog open={props.open} aria-labelledby="form-dialog-title">
          <DialogTitle id="form-dialog-title">Title</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Enter group chat title
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="title"
              label="Title"
              type="text"
              fullWidth
              onChange={event => {
                const { value } = event.target;
                title.current = value;
            }}
            />
            { alert &&
                <Alert severity="error">
                    <AlertTitle>Error</AlertTitle>
                    Please enter title
              </Alert>
            }
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
                title.current = '';
                props.onClose(null);
            }} color="secondary">
              Cancel
            </Button>
            <Button onClick={() => {
                if (!title.current || !title.current.trim()) {
                    setAlert(true);
                    setTimeout(() => {
                        setAlert(false);
                    }, 3000);
                } else {
                    props.onClose(title.current);
                    title.current = '';
                }                
                }} color="primary">
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </div>
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

    const [open, setOpen] = useState(false); 

    var avatarLetters = '';
    
    // set avatars letters
    if (props.chat.type === 'private' && props.chat.title) {
        const splited = props.chat.title.split(' ');
        avatarLetters = splited.length > 1 ? splited[0][0] + splited[1][0] : props.chat.title[0];
    }
    
    var participants = '';
    if (props.chat.type === 'group') {
        participants = props.chat.participants.map(x => x.name.split(' ')[0]).join(', ');
    }

    return(
        <div>
            <div id="chat-info" className="clickable" onClick={() => setOpen(true)}>
                {
                    props.chat.type === 'private'
                    ? <div style={{marginTop: 'auto', marginBottom: 'auto'}}>
                        <Avatar style={{marginTop: 'auto', marginBottom: 'auto', marginRight: '0.7em'}}>{avatarLetters}</Avatar>
                    </div>
                    : <GroupIcon style={{marginTop: 'auto', marginBottom: 'auto', marginRight: '0.7em'}}/>

                }            
                <div style={{marginTop: 'auto', marginBottom: 'auto'}}>
                    <div id="chat-info-title">
                        <span>{props.chat.title}</span>
                    </div>
                    { props.chat.type === 'private'  
                        ? <div id="chat-info-lastSeen">
                            <LastSeen info={props.lastSeen}/>
                        </div>
                        : <div>{participants}</div>
                    }                
                </div>
            </div>
            <ChatInfoDialog chat={props.chat} open={open} participants={props.chat.participants} onClose={() => setOpen(false)}/>
        </div>
    );
}

export function ChatInfoDialog(props) {
    const {onClose} = props;

    var participants = props.participants;
    
    // set avatars letters
    participants.forEach(element => {
        let splited = element.name.split(' ');
        let avatarLetters = splited.length > 1 ? splited[0][0] + splited[1][0] : props.chat.title[0];
        element.avatarLetters = avatarLetters;
    });

    return(
        <Dialog
          maxWidth="xs"
          open={props.open}
        >
          <DialogTitle>Participants</DialogTitle>
          <DialogContent dividers>
            <div>
                {participants.map(p => (
                    <div className="chat-participants">
                        <div style={{display: 'flex', paddingTop: '0.5em', paddingBottom: '0.5em'}}>
                            <Avatar style={{marginTop: 'auto', marginBottom: 'auto'}}>{p.avatarLetters}</Avatar>
                            <div style={{marginTop: 'auto', marginBottom: 'auto', paddingLeft: '0.5em', fontSize: '18px'}}>{p.name}</div>
                            { props.chat.admin === p.id &&
                                <span style={{marginTop: 'auto', marginBottom: 'auto', paddingLeft: '0.5em', fontSize: '13px', color: '#0ee607'}}>admin</span>
                            }
                        </div>
                    </div>                      
                ))}
            </div>
              
          </DialogContent>
          <DialogActions>
            <Button onClick={() => onClose()} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
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

    // message that is being typed
    const currMessage = useRef({id: newGuid(), text: ''});

    // selected chat
    const [currChat, setCurrChat] = useState({});

    const [userMenuState, setUserMenuState] = useState(null); // for user menu
    const [chatMenuState, setChatMenuState] = useState(null); // for chat menu
    const [openDialog, setOpenDialog] = useState(false); // for contact dialog
    const [openGroupDialog, setOpenGroupDialog] = useState(false); // for new grop chat dialog
    const [openGroupNameDialog, setOpenGroupNameDialog] = useState(false); // for new grop chat dialog
    const [openAlert, setOpenAlert] = useState(false);

    // enables/disables live messaging
    var isLiveStored = true;
    if (localStorage.getItem('isLive') === 'false')
        isLiveStored = false;
    const isLive = useRef(isLiveStored);
    const [switchState, setSwitchState] = useState(isLiveStored); // for 'live' switch

    const { messages, partial, chats, sendMessage, newPrivateChat, newGroupChat, deleteOrLeaveChat } = useChat(currChat.id); // chat manager

    const [ interlocutor, setInterlocutor ] = useState(); // for last seen of the current interlocutor
    const { lastSeen, setLastSeen, reportOnline, reportOffline } = useLastSeen(interlocutor); // last seen manager

    // on page load
    useEffect(()=>{
        UserMap.init();
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

    useEffect(() => {
        scrollToBottom();
    }, [partial]);

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
            setCurrChat(chat);
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
            chatType: currChat.type,
            sender: currentUserId,
            to: currChat.participants,
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
        deleteOrLeaveChat(currChat.id);
        setCurrChat({});
        setChatMenuState(null);
    }       

    function handleDialogClose(contact) {
        setOpenDialog(false);
        if (contact) {
            // start new chat
            const chat = newPrivateChat(contact);
            setCurrChat(chat)
        }
    }

    const contactsForGroupChat = useRef([]);
    function createGroupChat(title) {
        setOpenGroupNameDialog(false);
        if (title) {
            // start new chat
            newGroupChat( {
                title, 
                participants: [{id: currentUserId, name: userName}].concat(contactsForGroupChat.current)            
            })            
            .then((chat) => {
                setCurrChat(chat);
            }).catch((error) => {
                console.error(error);
            })            
        }
        contactsForGroupChat.current = [];
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
                <Grid id="left" container item xs={4} wrap="nowrap" style={{ height: '100vh', minWidth: '320px' }}>
                    <Grid container direction="column">
                        <Grid id="user-info" style={{  height: '7vh', display: 'inline-flex' }}>
                            <div style={{ height: '100%', float: 'left'}}>
                                <div style={{ display: 'flex', height: '100%'}}>
                                    <Avatar style={{marginTop: 'auto', marginBottom: 'auto', marginLeft: '0.7em'}}>{avatarLetters}</Avatar>
                                    <span style={{marginTop: 'auto', marginBottom: 'auto', marginLeft: '0.7em', fontSize: '18px'}}>{userName}</span>
                                </div>
                            </div>
                            <div id="top-icons">
                                <div style={{marginTop: 'auto', marginBottom: 'auto'}}>
                                    <Tooltip title="New group chat">
                                        <IconButton onClick={event => {setOpenGroupDialog(true)} }><GroupAddIcon/></IconButton>
                                    </Tooltip>
                                    <NewGroupChatDialog
                                        open={openGroupDialog}
                                        onClose={(contacts) => {
                                            setOpenGroupDialog(false);
                                            if (contacts && contacts.length > 0) {
                                                contactsForGroupChat.current = contacts;
                                                setOpenGroupNameDialog(true);
                                            }                                            
                                        }}
                                    />
                                    <GroupNameDialog open={openGroupNameDialog} onClose={createGroupChat}/>
                                </div>

                                <div style={{marginTop: 'auto', marginBottom: 'auto'}}>
                                    <Tooltip title="New private chat">
                                        <IconButton onClick={event => {setOpenDialog(true)} }><ChatIcon/></IconButton>
                                    </Tooltip>
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
                                    <ChatInfo chat={currChat} lastSeen={lastSeen} />
                                    <div id="chat-options">
                                        <div style={{marginTop: '0.5em', marginRight: '0.5em'}}>
                                            
                                            <IconButton onClick={event => setChatMenuState(event.currentTarget)} ><MoreVertIcon/></IconButton>
                                            <Menu
                                                id="chat-menu"
                                                anchorEl={chatMenuState}
                                                open={Boolean(chatMenuState)}
                                                onClose={() => setChatMenuState(null)}
                                                >
                                                { currChat.type === 'group' && currChat.admin !== currentUserId &&
                                                    <MenuItem onClick={() => setOpenAlert(true)}><ExitToAppIcon/><div style={{marginLeft: '0.5em'}}>Leave chat</div></MenuItem>                                                    
                                                }
                                                { (currChat.type === 'private' || currChat.type === 'group' && currChat.admin === currentUserId)  &&
                                                    <MenuItem onClick={() => setOpenAlert(true)}><DeleteIcon/><div style={{marginLeft: '0.5em'}}>Delete chat</div></MenuItem>
                                                }                                                
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
                                                        <Message chat={currChat} message={item} key={item.id} clickable={true}/>
                                                    )}
                                                    { partial && partial.text && partial.chatId === currChat.id &&
                                                        <Message chat={currChat} message={partial} key={partial.id} />                                                   
                                                    }
                                                </div>
                                            </div>
                                        }                                        
                                    </Grid>
                                    <Grid container style={{ minHeight: '8vh', backgroundColor: 'white'}}>
                                        <form style={{ width: '100%'}} onSubmit={sendFullMessage} noValidate>
                                            <div id="sending-form">
                                                { currChat.type === 'private' &&
                                                    <div style={{marginTop: '10px'}}>
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
                                                }
                                                <div style={{ flexGrow: 1, marginTop: '10px',  marginLeft: '20px'}}>
                                                    <TextField
                                                        id="text-area"
                                                        fullWidth                                                    
                                                        placeholder="Write a message"
                                                        autoFocus
                                                        autoComplete="off"
                                                        onChange={event => {
                                                            const { value } = event.target;
                                                            currMessage.current.text = value;
                                                            if (isLive.current && currChat.type === 'private')
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