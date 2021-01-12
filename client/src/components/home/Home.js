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
import InfoIcon from '@material-ui/icons/Info';
import * as Ticks from './ticks'
import AddCircleIcon from '@material-ui/icons/AddCircle';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import { Alert, AlertTitle } from '@material-ui/lab';
import { UserMap } from "./UserMap";


const currentUser = JSON.parse(localStorage.getItem('user'));


function ChatListElement(props) {

    // without time if not today
    function formateDate(date) {
        var dt;
        if (date)
            dt = moment(date);
        else
            dt = moment();
        var time = dt.format("hh:mm A");
        if (dt.isSame(moment(), 'day')) { // if today, only time
            return time;
        } else if (dt.isSame(moment().subtract(1, 'days'), 'day')) { // if yesterday
            return 'yesterday';
        } else if (dt.isSame(moment(), 'year')) { // if this year
            return dt.format('D MMM');
        } else {
            return dt.format('D-MMM-YY'); // if not this year
        }
    }

    var fromStr = '';
    if (props.item.type === 'group'
        && props.item.lastMessage.from
        && props.item.lastMessage.from !== '00000000-0000-0000-0000-000000000000' // if not a notification
    ) {

        let participant = UserMap.get(props.item.lastMessage.from);

        if (participant)
            fromStr = participant.firstName + ':';
    }

    var interlocutor = null;

    if (props.item.type === 'private') {
        interlocutor = props.item.participants[0];
    }

    return (
        <div className={`chat-list-element ${props.item.selected ? "chat-list-selected" : ""}`} onClick={() => props.onSelect(props.item)}>
            <div className='chat-list-content'>
                <div style={{ display: 'flex', paddingRight: '0.5em' }}>
                    {props.item.type === 'private'
                        ? <Avatar style={{ backgroundColor: interlocutor.color, marginTop: 'auto', marginBottom: 'auto', width: '50px', height: '50px' }}>
                            {interlocutor.avatarLetters}
                        </Avatar>
                        : <GroupIcon style={{ marginLeft: '0.4em', marginRight: '0.3em', marginTop: 'auto', marginBottom: 'auto' }} />
                    }
                </div>
                <div className='chat-list-description'>
                    <div className="chat-list-header">
                        <div className="chat-list-title">
                            {props.item.title}
                        </div>
                        <div style={{ display: 'flex', marginLeft: 'auto' }}>
                            {props.item.unread > 0 &&
                                <div className="chat-list-unread-wrapper">
                                    <div className="chat-list-unread-count">{props.item.unread}</div>
                                </div>
                            }
                            {!props.item.hasBeenRead && props.item.type === 'private' &&
                                <div className={props.item.selected ? "chat-list-unread-selected" : "chat-list-unread"}></div>
                            }
                            <div className="chat-list-time">
                                {formateDate(props.item.lastMessage.time)}
                            </div>
                        </div>
                    </div>
                    {props.item.lastMessage.from &&
                        <div style={{ display: 'flex', width: '100%' }}>
                            {props.item.lastMessage.from === currentUser.id &&
                                <span className={props.item.selected ? "you-label-selected" : "you-label"}>You:</span>
                            }
                            {props.item.type === 'group' && props.item.lastMessage.from !== currentUser.id && fromStr &&
                                <span className="chat-list-sender">{fromStr}</span>
                            }
                            <span className="chat-list-message">{props.item.lastMessage.text}</span>
                        </div>
                    }
                </div>
            </div>
        </div>
    );
}


function Message(props) {

    const [open, setOpen] = useState(false); // for message info dialog

    var fromStr = '';
    // in groups chat UserMap is user, bacause participant list is subject to change
    if (props.chat.type !== 'private' && props.message.sender !== currentUser.id) {
        let participant = UserMap.get(props.message.sender);
        if (participant)
            fromStr = participant.fullName;
    }

    // with time
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

    // for notifications
    if (props.message.type === 'notification') {
        return (
            <div className="notification-wrapper">
                <div className="notification-text">
                    <span>{props.message.text}</span>
                </div>
            </div>
        );
    }
    const isMine = props.message.sender === currentUser.id;

    var tick = null;
    if (isMine) {
        if (props.message.failed)
            tick = Ticks.failed;
        else if (props.message.sent === false)
            tick = Ticks.sending;
        else if (props.message.ticks && props.message.ticks[0])
            tick = Ticks.read;
        else if ((props.message.sent || props.message.sent == null) && (!props.message.ticks || !props.message.ticks[0]))
            tick = Ticks.sent;
    }

    return (
        <div>
            { props.message.firstUnread === true && // "New messages" divider
                <div className="unread-messages-wrapper"><div className="unread-messages">New messages</div></div>
            }
            <div className="message-wrapper">
                {!isMine &&
                    <div className="others-message-triangle"></div>
                }
                <div className={`message-body ${isMine ? "my-message" : "others-message"} ${props.clickable && isMine ? 'clickable' : ''}`}
                    onClick={props.clickable && isMine ? () => setOpen(true) : () => {}}
                > 
                    <div>
                        {fromStr &&
                            <div className="message-from">{`${fromStr}:`}</div>
                        }
                        <div className="message-text">{props.message.text}</div>
                    </div>
                    {props.message.type === 'full'
                        ? <div style={{ display: 'flex', width: 'fit-content', marginLeft: 'auto' }}>
                            <div className="message-time">{formatDate(props.message.time)}</div>
                            {tick &&
                                <div style={{ marginLeft: '0.5em', marginTop: 'auto' }}>{tick}</div>
                            }
                        </div>
                        : <div style={{ fontSize: '11px' }}>typing<Dot>.</Dot><Dot>.</Dot><Dot>.</Dot></div>
                    }
                </div>
                {isMine &&
                    <div className="my-message-triangle"></div>
                }
            </div>
            { props.clickable && isMine &&
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

function MessageInfo(props) {
    const { onClose } = props;

    var list = [];
    if (props.message.ticks && props.message.ticks.length > 0) {
        list = props.message.ticks.map(x => Object.assign(x, UserMap.get(x.readBy)));
    }

    var remaining = props.chat.participants.length - 1;

    for (var i = 0; i < props.message.ticks.length; ++i) {
        if (props.chat.participants.find(x => x.id === props.message.ticks[i].readBy))
            --remaining;
    }


    // with "at"
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
    if (props.chat.type === 'private' && props.message.ticks.length === 1) {
        readAt = formatDate(props.message.ticks[0].readAt);
    }

    return (
        <Dialog
            maxWidth="xs"
            open={props.open}
        >
            <DialogTitle>Message Info</DialogTitle>
            <DialogContent dividers>
                <div style={{ minWidth: '300px', backgroundColor: '#8ab3ff' }}>
                    <Message chat={props.chat} message={props.message} key={props.message.id} clickable={false} />
                </div>
                {props.chat.type === 'private'
                    ? <div style={{ paddingTop: '0.5em', paddingBottom: '0.5em', fontSize: '18px' }}>
                        <span>{`Read: ${readAt}`}</span>
                    </div>
                    : <div>
                        <div style={{ paddingTop: '0.5em', paddingBottom: '0.5em', fontSize: '18px' }}>
                            <span style={{ marginRight: '0.5em' }}>Read by:</span><span style={{ marginLeft: 'auto' }}>{remaining > 0 && `(${remaining} remaining)`}</span>
                        </div>
                        <div>
                            {list.map(read => (
                                <div>
                                    <div style={{ display: 'flex', paddingTop: '0.5em', paddingBottom: '0.5em' }}>
                                        <Avatar style={{ backgroundColor: read.color, marginTop: 'auto', marginBottom: 'auto' }}>{read.avatarLetters}</Avatar>
                                        <div style={{ marginLeft: '0.5em' }}>
                                            <div style={{ paddingLeft: '0.5em', fontSize: '18px' }}>{read.fullName}</div>
                                            <div style={{ paddingLeft: '0.5em', fontSize: '13px' }}>{formatDate(read.readAt)}</div>
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

function Contact(props) {

    const lastSeen = { lastSeen: props.contact.lastSeen, online: props.contact.online };
    const [selected, setSelected] = useState(false);

    return (
        <div className={selected ? "contact-wrapper-selected" : "contact-wrapper"} onClick={props.hasButton ? () => { } : () => props.selectContact(props.contact)} >
            <div className="contact-content">
                <Avatar style={{ backgroundColor: props.contact.color, marginTop: 'auto', marginBottom: 'auto',width: '50px', height: '50px' }}>
                    {props.contact.avatarLetters}
                </Avatar>
                <div style={{ marginLeft: '0.5em' }}>
                    <div style={{ paddingLeft: '0.5em', fontSize: '18px' }}>{props.contact.fullName}</div>
                    <div style={{ paddingLeft: '0.6em', paddingTop: '0.3em' }}>
                        <LastSeen info={lastSeen} />
                    </div>
                </div>
                {props.hasButton &&
                    <div style={{ marginLeft: 'auto', paddingLeft: '2em' }}>
                        <IconButton onClick={() => {
                            setSelected(!selected);
                            props.buttonHandler({ contact: props.contact, add: !selected });
                        }}>
                            {selected
                                ? <HighlightOffIcon />
                                : <AddCircleIcon />
                            }
                        </IconButton>
                    </div>
                }
            </div>
        </div>
    );
}

function NewChatDialog(props) {
    const { onClose } = props;

    const source = useRef([])

    const [contacts, setContacts] = useState([]);

    function handleEntering() {
        fetch('api/chats/loadContacts').then((response) => {
            if (!response.ok)
                throw new Error();
            return response.json();
        }).then((data) => {
            setContacts([...data]);
            source.current = data;
        }).catch((error) => {
            console.error(error);
        });
    };

    function filterList(pattern) {
        setContacts(source.current.filter(x => x.fullName.toLowerCase().includes(pattern.toLowerCase())));
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
            <DialogTitle>
                Select contact
                <TextField
                        id="text-area"
                        fullWidth
                        placeholder="Search..."
                        autoFocus
                        autoComplete="off"
                        style={{marginTop: '1em'}}
                        onChange={event => {
                            const { value } = event.target;
                            filterList(value);
                        }}
                    />
            </DialogTitle>
            <DialogContent dividers>
                <div style={{ minWidth: '400px', height: '60vh' }}>
                    
                    <div>
                        {contacts.map(contact => (
                            <Contact
                                selectContact={(contact) => onClose(contact)}
                                contact={contact}
                                key={contact.id}
                            />
                        ))}
                    </div>
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

function NewGroupChatDialog(props) {
    const { onClose } = props;

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
            <DialogTitle>Select contacts</DialogTitle>
            <DialogContent dividers>
                <div style={{ minWidth: '400px', height: '60vh' }}>
                    <div>
                        {contacts.map(contact => (
                            <Contact
                                key={contact.id}
                                contact={contact}
                                hasButton={true}
                                buttonHandler={addOrRemoveContact}
                            />
                        ))}
                    </div>
                    {alert &&
                        <Alert severity="error">
                            <AlertTitle>Error</AlertTitle>
                            Please select at least two contacts
                        </Alert>
                    }
                </div>
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

function GroupNameDialog(props) {
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
                        style={{ minWidth: '400px' }}
                        onChange={event => {
                            const { value } = event.target;
                            title.current = value;
                        }}
                    />
                    {alert &&
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

function LastSeen(props) {

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
                <span style={{ color: '#56b4fc' }}>online</span>
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

function ChatInfo(props) {

    const [open, setOpen] = useState(false);


    var participantsList = '';
    if (props.chat.type === 'group') {
        participantsList = props.chat.participants.map(x => x.fullName.split(' ')[0]).join(', ');
    }

    var interlocutor = null;

    if (props.chat.type === 'private') {
        interlocutor = props.chat.participants[0];
    }

    return (
        <div>
            <div id="chat-info" className="clickable" onClick={props.chat.type === 'private' ? () => { } : () => setOpen(true)}>
                {
                    props.chat.type === 'private'
                        ? <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                            <Avatar style={{ backgroundColor: interlocutor.color, marginTop: 'auto', marginBottom: 'auto', marginRight: '0.7em' }}>
                                {interlocutor.avatarLetters}
                            </Avatar>
                        </div>
                        : <GroupIcon style={{ marginTop: 'auto', marginBottom: 'auto', marginRight: '0.7em' }} />

                }
                <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                    <div id="chat-info-title">
                        <span>{props.chat.title}</span>
                    </div>
                    {props.chat.type === 'private'
                        ? <div id="chat-info-lastSeen">
                            <LastSeen info={props.lastSeen} />
                        </div>
                        : <div>{participantsList}</div>
                    }
                </div>
            </div>
            <ChatInfoDialog chat={props.chat} open={open} participants={props.chat.participants} onClose={() => setOpen(false)} />
        </div>
    );
}

function ChatInfoDialog(props) {
    const { onClose } = props;

    const list = props.participants;
    const index = list.findIndex(x => x.id === currentUser.id);
    if (index > -1) {
        const me = list[index];
        me.fullName = 'You';
        list.splice(index, 1);
        list.unshift(me);
    }

    return (
        <Dialog
            maxWidth="xs"
            open={props.open}
        >
            <DialogTitle>{`Participants (${props.participants.length})`}</DialogTitle>
            <DialogContent dividers>
                <div>
                    { list.map(p => (
                        <div className="chat-participants">
                            <div style={{ display: 'flex', paddingTop: '0.5em', paddingBottom: '0.5em' }}>
                                <Avatar style={{ backgroundColor: p.color, marginTop: 'auto', marginBottom: 'auto' }}>{p.avatarLetters}</Avatar>
                                <div style={{ marginTop: 'auto', marginBottom: 'auto', paddingLeft: '0.5em', fontSize: '18px' }}>{p.fullName}</div>
                                {props.chat.admin === p.id &&
                                    <span style={{ marginTop: 'auto', marginBottom: 'auto', paddingLeft: '0.5em', fontSize: '13px', color: '#0ee607' }}>admin</span>
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

function AlertDialog(props) {
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

    // message that is being typed
    const currMessage = useRef({ id: newGuid(), text: '' });

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

    const [interlocutor, setInterlocutor] = useState(); // for last seen of the current interlocutor
    const { lastSeen, setLastSeen, reportOnline, reportOffline } = useLastSeen(interlocutor); // last seen manager

    // on page load
    useEffect(() => {
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
            const user = currChat.participants.find(x => x.id !== currentUser.id);
            if (user) {
                setInterlocutor(user.id);
            }
            // get last seen
            fetch('api/getLastSeen?' + new URLSearchParams({ userId: user.id }).toString()).then((response) => {
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
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
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
            sender: currentUser.id,
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
            sender: currentUser.id,
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
            sender: currentUser.id,
            to: currChat.type === 'private' ? currChat.participants : null,
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

    function createNewPrivateChat(contact) {
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
            newGroupChat({
                title,
                participants: [currentUser].concat(contactsForGroupChat.current)
            }).then((chat) => {
                setTimeout(() => {
                    setCurrChat(chat);
                }, 200);
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


    return (
        <React.Fragment>
            <CssBaseline />
            <Container maxWidth="lg" style={{ paddingLeft: '0px', paddingRight: '0px', boxShadow: 'rgb(136, 136, 136) 0px 0px 20px 5px', minWidth: '640px' }}>
                <Grid container direction="row">
                    <Grid id="left" container item xs={4} wrap="nowrap" style={{ height: '100vh', minWidth: '320px', display: 'flex', flexDirection: 'column' }}>
                        <header id="user-info" style={{ minHeight: '70px', display: 'flex', width: '100%' }}>
                            <div style={{ height: '100%', flexGrow: 1, width: '40%' }}>
                                <div style={{ display: 'flex', height: '100%' }}>
                                    <Avatar style={{ backgroundColor: currentUser.color, marginTop: 'auto', marginBottom: 'auto', marginLeft: '0.7em' }}>{currentUser.avatarLetters}</Avatar>
                                    <span id="current-user-name">{currentUser.fullName}</span>
                                </div>
                            </div>
                            <div id="top-icons">                                

                                <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                                    <Tooltip title="New private chat">
                                        <IconButton onClick={event => { setOpenDialog(true) }}><ChatIcon /></IconButton>
                                    </Tooltip>
                                    <NewChatDialog
                                        open={openDialog}
                                        onClose={createNewPrivateChat}
                                    />
                                </div>

                                <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                                    <Tooltip title="New group chat">
                                        <IconButton onClick={event => { setOpenGroupDialog(true) }}><GroupAddIcon /></IconButton>
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
                                    <GroupNameDialog open={openGroupNameDialog} onClose={createGroupChat} />
                                </div>

                                <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                                    <IconButton onClick={event => setUserMenuState(event.currentTarget)} ><MoreVertIcon /></IconButton>
                                    <Menu
                                        id="user-menu"
                                        anchorEl={userMenuState}
                                        keepMounted
                                        open={Boolean(userMenuState)}
                                        onClose={() => setUserMenuState(null)}
                                    >
                                        <MenuItem onClick={logout}><ExitToAppIcon /><div style={{ marginLeft: '0.5em' }}>Log out</div></MenuItem>
                                    </Menu>
                                </div>


                            </div>
                        </header>
                        <Grid id="chat-list" style={{ height: '93vh', overflow: 'auto' }}>
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
                    <Grid id="right" container item xs style={{ backgroundColor: '#8ab3ff', height: '100vh', minWidth: '320px' }}>
                        <Grid container direction="column" style={{ position: 'relative' }}>
                            {currChat.id ?
                                <div style={{ display: 'flex', height: '100%', position: 'absolute', flexDirection: 'column', width: '100%' }}>
                                    <header id="chat-header" style={{ backgroundColor: 'white', display: 'flex', minHeight: '70px' }}>
                                        <ChatInfo chat={currChat} lastSeen={lastSeen} />
                                        <div id="chat-options">
                                            <div style={{ marginTop: '0.5em', marginRight: '0.5em' }}>

                                                <IconButton onClick={event => setChatMenuState(event.currentTarget)} ><MoreVertIcon /></IconButton>
                                                <Menu
                                                    id="chat-menu"
                                                    anchorEl={chatMenuState}
                                                    open={Boolean(chatMenuState)}
                                                    onClose={() => setChatMenuState(null)}
                                                >
                                                    {currChat.type === 'group' && currChat.admin !== currentUser.id &&
                                                        <MenuItem onClick={() => setOpenAlert(true)}><ExitToAppIcon /><div style={{ marginLeft: '0.5em' }}>Leave chat</div></MenuItem>
                                                    }
                                                    {(currChat.type === 'private' || currChat.type === 'group' && currChat.admin === currentUser.id) &&
                                                        <MenuItem onClick={() => setOpenAlert(true)}><DeleteIcon /><div style={{ marginLeft: '0.5em' }}>Delete chat</div></MenuItem>
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
                                    </header>
                                    <Grid id="chat" container style={{ overflow: 'auto', paddingBottom: '2em' }}>
                                        {messages &&
                                            <div style={{ width: '100%' }}>
                                                <div style={{ width: '100%' }}>
                                                    {messages.map(item =>
                                                        <Message chat={currChat} message={item} key={item.id} clickable={true} />
                                                    )}
                                                    {partial && partial.text && partial.chatId === currChat.id &&
                                                        <Message chat={currChat} message={partial} key={partial.id} />
                                                    }
                                                </div>
                                            </div>
                                        }
                                    </Grid>
                                    <footer style={{ minHeight: '70px', backgroundColor: 'white', width: '100%', marginTop: 'auto' }}>
                                        <form style={{ width: '100%' }} onSubmit={sendFullMessage} noValidate>
                                            <div id="sending-form">
                                                {currChat.type === 'private' &&
                                                    <div style={{ marginTop: '10px' }}>
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
                                                <div style={{ flexGrow: 1, marginTop: '10px', marginLeft: '20px' }}>
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
                                                        }} />
                                                </div>
                                                <div style={{ marginTop: '10px', marginRight: '10px', marginLeft: '10px' }}>
                                                    <IconButton type="submit"><SendIcon /></IconButton>
                                                </div>
                                            </div>
                                        </form>
                                    </footer>
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