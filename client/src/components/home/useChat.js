import { useEffect, useRef, useState } from "react";
import socketIOClient from "socket.io-client";
import $ from 'jquery'

const NEW_CHAT_MESSAGE_EVENT = "newChatMessage";
const RECEIPT_EVENT = "receipt";
const UPDATE_EVENT = "update";
const PARTIAL_MESSAGES_LIFESPAN = 10 * 1000;

const token = localStorage.getItem('authentication');
const currentUserId = localStorage.getItem('userId');
const userName = localStorage.getItem('userName');

const newGuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  };


// ============================================================================================
//  ==== Chat manager. Manages sending, reiceving, loading and deleting chats and messages ====
// ============================================================================================
const useChat = (chatId) => {

  // for rendering
  const [messages, setMessages] = useState([]); // current chat
  const [chats, setChats] = useState([]); // chat headers  
  const [partial, setPartial] = useState({}); // last partial message
  
  // To store data between rerenders
  const socket = useRef(); // WS connection
  const currChatId = useRef(chatId); // current chat
  const currentChats = useRef([]); // copy of 'chats' from state
  const currentMessages = useRef([]); // copy of 'messages' from state

  // "history" to optimize loading : if we've loaded the chat before, don't load again, just fetch from history
  const history = useRef({});

  const isOnline = useRef(true); // if current user is online (window is focused)
  const queuedReceipts = useRef([]); // if current user is offline, receipts to send when he goes

  // self-destruct timer for partial messsages
  const timer = useRef();

  // send 'read' receipts when window is focused
  const sendQueuedReceipts = () => {   
    if (queuedReceipts.current.length > 0) {

        // drop unread for curr chat
        let index = currentChats.current.findIndex(x => x.id === currChatId.current);
        currentChats.current[index].unread = 0;
        setChats(currentChats.current);         
        
        queuedReceipts.current.forEach(x => {
            socket.current.emit(RECEIPT_EVENT, x);
        });

        queuedReceipts.current = [];
    }    
  };


  // update header on new message
  const updateChatHeaders = (message, increaseUnread, setUnsen) => {
    const index = currentChats.current.findIndex(x => x.id === message.chatId);
    if (index > -1) { // for an existing chat
        if (increaseUnread)
            currentChats.current[index].unread = currentChats.current[index].unread + 1;
            
        currentChats.current[index].lastMessage.text = message.text;
        currentChats.current[index].lastMessage.from = message.sender;
        currentChats.current[index].lastMessage.time = message.time;

        if (setUnsen) {
            currentChats.current[index].hasBeenRead = false;
        }

        currentChats.current.sort((a, b) => {
            return new Date(b.lastMessage.time) - new Date(a.lastMessage.time);
        });
        // To rerender
        setChats([...currentChats.current]); 
    }
    else { // for new chat

        // get chat info
        fetch('api/chats/getChatInfo?' + new URLSearchParams({chatId: message.chatId}).toString())
        .then(response => {
            response.json().then(header => {
                if (!response.ok) {            
                    throw new Error(header.message);
                }
                currentChats.current = [header].concat(currentChats.current);
                setChats([...currentChats.current]);
            }).catch(error => {
                console.error(error);
            });
        });        
    }       
  };

  // update header
  const setReadForChat = (chatId) => {
      const index = currentChats.current.findIndex(x => x.id === chatId);
      if (index > -1) {
        if (!currentChats.current[index].hasBeenRead) {
            currentChats.current[index].hasBeenRead = true;
            setChats([...currentChats.current]);
        }        
      }      
  };

  // delete or edit chat or message
  const processUpdate = (update) => {

    if (update.action === 'delete') {
        if (update.target === 'chat') {
            const index = currentChats.current.findIndex(x => x.id === update.targetId);
            if (index > -1) {
                currentChats.current.splice(index, 1);
                setChats(currentChats.current);

                if (history.current[update.targetId])
                    delete history.current[update.targetId];

                if (update.targetId === currChatId.current)
                    setMessages([...[]]);
            }
        }
    } 
    else if (update.action === 'update') {
        if (update.target === 'chat' && update.object === 'participants')  {
            const index = currentChats.current.findIndex(x => x.id === update.targetId);
            if (index > -1) {
                currentChats.current[index].participants = update.value;
                setChats(currentChats.current);
            }
        }
    }
  };

  const processReceipt = (receipt) => {
    if (receipt.type === 'read') {
        setReadForChat(receipt.chatId); // update header
        if (receipt.chatId === currChatId.current) { // update message if for the current chat
            let index = currentMessages.current.findIndex(x => x.id === receipt.messageId);
            if (index > -1) {
                currentMessages.current[index].ticks.push(receipt);
                setMessages([...currentMessages.current]);
            }
        }
        else if (history.current[receipt.chatId]) { // update message if for the other chat
            let index = history.current[receipt.chatId].findIndex(x => x.id === receipt.messageId);
            if (index > -1) {
                history.current[receipt.chatId][index].ticks.push(receipt);
            }
        }
    }              

    if (receipt.type === 'sent') {
        if (receipt.chatId === currChatId.current) { // update message if for the current chat
            let index = currentMessages.current.findIndex(x => x.id === receipt.messageId);
            if (index > -1) {
                currentMessages.current[index].sent = true;
                setMessages([...currentMessages.current]);
            }
        }
        else if (history.current[receipt.chatId]) { // update message if for the other chat
            let index = history.current[receipt.chatId].findIndex(x => x.id === receipt.messageId);
            if (index > -1) {
                history.current[receipt.chatId][index].sent = true;
            }
        }
    }
  };

  const processNewMessage = (message) => {
    if (message.type === 'full') { // for full messages
            
        // if for the current chat, process                 
        if (message.chatId === currChatId.current) {  
            
            var increaseUnread = false;
            // if user is online suggest he has red the message
            if (isOnline.current) {
                socket.current.emit(RECEIPT_EVENT, {chatId: message.chatId, messageId: message.id, userId: message.sender});                        
            }
            else { // otherwise wait till he goes online
                queuedReceipts.current.push({chatId: message.chatId, messageId: message.id, userId: message.sender});                    
                increaseUnread = true;
            }
            
            // put new message to header
            updateChatHeaders(message, increaseUnread, false);

            // remove last partial message
            setPartial({});

            currentMessages.current.push(message);

            // display 'New messages' separator                
            if (!isOnline.current) { 
                updateLabel();
            }

            setMessages([...currentMessages.current]); // rerender messages                 
        }                
        else { // otherwise, increase unread counter and update headers
            updateChatHeaders(message, true, false);

            if (history.current[message.chatId]) // add to history
                history.current[message.chatId].push(message);
        }
    } else if (message.type === 'partial') { 
        // for partial messages
        if (message.chatId === currChatId.current) {

            // if message is empty, remove
            if (!message.text || !message.text.trim()) {
                setPartial({});
            } else {
                setPartial(message);
            }                

            // self-destruct timer 
            if (timer.current)
                window.clearTimeout(timer.current);
            
            timer.current = window.setTimeout(() => setPartial({}), PARTIAL_MESSAGES_LIFESPAN);
        }  
    } else if (message.type === 'notification') {
        updateChatHeaders(message, true, false);
    }
  };


  // Only first time, no need to establish WS connection and load chat headers mutiple times
  useEffect(() => {

    // WS connection
    socket.current = socketIOClient({
        query: { 
            token, 
            type: 'chat' 
        }
    });

    // Processing receipts 
    socket.current.on(RECEIPT_EVENT, receipt => {
        processReceipt(receipt);        
    });

    // Deleting or editing chat or message
    socket.current.on(UPDATE_EVENT, update => {
        processUpdate(update);
    });
    
    // Listen for incoming messages
    socket.current.on(NEW_CHAT_MESSAGE_EVENT, (message) => {
        processNewMessage(message);        
    }); 

    // Load chat headers
    fetch('api/chats/loadchatlist').then((response) => {
        if (!response.ok)
            throw new Error();
        return response.json();
    }).then((data) => {
        setChats(data);
        currentChats.current = data;
    }).catch((error) => {
        console.error(error);
    });

    // set user online/offline
    $(window).on("focus", () => {
        isOnline.current = true;
        sendQueuedReceipts();
    });
    
    $(window).on("blur", () => {
        isOnline.current = false;
    });

  }, []);


  // triggers when new chat is selected
  useEffect(() => {
    if (!chatId)
        return;
    
    setMessages([...[]]); // to hide messages from previous chat until new messages are loaded   
    setPartial({}); // hide partial message

    
    // mark last message as read
    if (currentMessages.current.length > 0 
        && currentMessages.current[currentMessages.current.length - 1].sender !== currentUserId
        && currentMessages.current[currentMessages.current.length - 1].read === false       
    ) {
        currentMessages.current[currentMessages.current.length - 1].read = true;
    }

    history.current[currChatId.current] = currentMessages.current; // save messages from old chat

    currChatId.current = chatId;

    // load messages, if we don't have them
    if (!history.current[currChatId.current]) {
        // Load messages
        fetch('api/chats/loadchat?' + new URLSearchParams({chatId: chatId}).toString()).then((response) => {
            if (!response.ok)
                throw new Error();
            return response.json();
        }).then((data) => {
            currentMessages.current = data;
            history.current[chatId] = data;
            if (data.length > 0) {
                updateLabel();
                dropUnreadAndSendRecepts();
            }
              
            // select in header
            currentChats.current.forEach(x => x.selected = false);
            let index = currentChats.current.findIndex(x => x.id === chatId);
            if (index > -1) {
                currentChats.current[index].selected = true;
                // load participants for group chats
                if (currentChats.current[index].participants.length === 0) {
                    // instead of await
                    findCurrentChatParticipants().then(participants => {
                        currentChats.current[index].participants = participants;
                        setChats([...currentChats.current]);
                    });
                    
                }
                else {
                    setChats([...currentChats.current]);
                }
            }            
            setMessages([...data]);
        }).catch((error) => {
            console.error(error);
        });
    }
    else { // if we have, fetch from history
        currentMessages.current = history.current[currChatId.current];
        if (currentMessages.current.length > 0) {
            updateLabel();
            dropUnreadAndSendRecepts();  
        }         
        // select in header
        currentChats.current.forEach(x => x.selected = false);
        let index = currentChats.current.findIndex(x => x.id === chatId);
        if (index > -1) {
            currentChats.current[index].selected = true;
        }     
        setMessages([...currentMessages.current]);        
    }
    
  }, [chatId]);

  const findCurrentChatParticipants = async () => {
    const response = await fetch('api/chats/findChatParticipants?' + new URLSearchParams({chatId}).toString());
    const participants = await response.json();
    if (response.ok) {
        return participants;
    }
    else {
        return [];
    }
  };

  // update "New messages" label
  const updateLabel = () => {

    // drop "New message" label
    currentMessages.current.forEach(x => x.firstUnread = false);

    // find in headers
    const index = currentChats.current.findIndex(x => x.id === currChatId.current);

    if (index > -1) {
        const unread = currentChats.current[index].unread;
        const length = currentMessages.current.length;

        if (unread > 0 && length > 0 && length - unread >= 0) {
            currentMessages.current[length - unread].firstUnread = true;
        }
    }
  };


  // when chat is selected consider messages as read
  const dropUnreadAndSendRecepts = () => {
        // find in headers
        const index = currentChats.current.findIndex(x => x.id === currChatId.current);
        if (index > -1) {
            const wasUnread = currentChats.current[index].unread;
            
            // drop unred for current chat 
            currentChats.current[index].unread = 0; 
            // rerender       
            setChats([...currentChats.current]);

            const length = currentMessages.current.length;

            // send receipts
            if (wasUnread > 0 && length > 0) {
                for (var i = length - 1; i >= length - wasUnread && i >= 0; --i) {
                    socket.current.emit(RECEIPT_EVENT, { 
                        chatId, 
                        userId: currentMessages.current[i].sender, 
                        messageId: currentMessages.current[i].id
                    });
                }
            }
        }
  };


  // =================================================
  // ========= function for revoking from UI =========
  // =================================================


  // Sends a message to the server
  const sendMessage = (message) => {
    let msg = message;
    msg.isNewChat = currentMessages.current.length === 0;
    msg.senderName = userName;
    msg.sent = false;
    msg.ticks = [];

    if (message.type === 'full') {
        // add to own messages and rerender
        setMessages((messages) => [...messages, msg]);
        currentMessages.current.push(message);
        updateLabel();
        updateChatHeaders(message, false, true);
    }
    
    socket.current.emit(NEW_CHAT_MESSAGE_EVENT, msg);
  };

  // delete or alter chat or message
  const updateObject = (update) => {
    processUpdate(update);
    socket.current.emit(UPDATE_EVENT, update);
  }

  // start a new private chat
  const newPrivateChat = (contact) => {

    // first, find out if it is an existing chat
    let found = currentChats.current.find(x => {
        let f = x.participants.find(p => p.id === contact.id);
        return f && x.type === 'private' ? true : false;
    });

    if (found) {
        found.title = contact.fullName;
        return found;
    }

    const newHeader = {
        id: newGuid(),
        type: 'private',
        participants: [
            {
                id: currentUserId,
                name: userName
            },
            {
                id: contact.id,
                name: contact.fullName
            }
        ],
        unread: 0,
        hasBeenRead: true,
        selected: true,
        title: contact.fullName,
        lastMessage: {
            from: '',
            text: '',
            time: ''
        }
    };
    currentChats.current.forEach(x => x.selected = false);
    currentChats.current = [newHeader].concat(currentChats.current);
    setChats(currentChats.current);

    return newHeader;
  };

  // start a new group chat
  const newGroupChat = async (args) => { 
    const params = {
        participants: args.participants,
        title: args.title
    }

    const response = await fetch('api/chats/createNewGroupChat', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        body:  JSON.stringify(params)
    });  

    const header = await response.json();      

    if (response.ok && header.id) {
        currentChats.current.forEach(x => x.selected = false);
        currentChats.current = [header].concat(currentChats.current);
        setChats(currentChats.current);

        return header;
    } else {
        throw Error(header.message);
    }
  };

  return { messages, partial, chats, sendMessage, newPrivateChat, newGroupChat, updateObject };

};

export default useChat;