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

  // exterminate partial message
  const exterminate = () => {
    setPartial({});
  };

  // send 'seen' recepts when window is focused
  const sendQueuedReceipts = () => {   
    if (queuedReceipts.current.length > 0) {

        // drop unread for curr chat
        let index = currentChats.current.findIndex(x => x.id === currChatId.current);
        currentChats.current[index].unread = 0;
        setChats(currentChats.current);

        // label messages as seen
        let i = currentMessages.current.length - 1;
        while (
            i >= 0 
            && !currentMessages.current[i].seen
            && currentMessages.current[i].sender !== currentUserId
            ) {
            currentMessages.current[i].seen = true;
            --i;
        }           
        
        queuedReceipts.current.forEach(x => {
            socket.current.emit(RECEIPT_EVENT, x);
        });
    }
    queuedReceipts.current = [];
  };


  // update header on new message
  const updateChatHeaders = (message, increaseUnread, setUnsen) => {
    const index = currentChats.current.findIndex(x => x.id === message.chatId);
    if (index > -1) { // for old chat
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
        const unread = increaseUnread ? 1 : 0;
        const newHeader = {
            id: message.chatId,
            type: 'private',
            participants: [
                {
                    id: message.sender,
                    name: userName
                },
                {
                    id: message.to,
                    name: message.senderName
                }
            ],
            unread: unread,
            title: message.senderName,
            hasBeenRead: true,
            lastMessage: {
                from: message.sender,
                text: message.text,
                time: message.time
            }
        };
        currentChats.current = [newHeader].concat(currentChats.current);
        setChats([...currentChats.current]);
    }       
  };

  // update header
  const setSeenForChat = (chatId) => {
      const index = currentChats.current.findIndex(x => x.id === chatId);
      if (index > -1) {
        currentChats.current[index].hasBeenRead = true;
        setChats([...currentChats.current]);
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

    // processing receipts 
    socket.current.on(RECEIPT_EVENT, receipt => {

        if (receipt.type === 'seen') {
            setSeenForChat(receipt.chatId); // update header
            if (receipt.chatId === currChatId.current) { // update message if for the current chat
                let index = currentMessages.current.findIndex(x => x.id === receipt.messageId);
                if (index > -1) {
                    currentMessages.current[index].seen = true;
                    setMessages([...currentMessages.current]);
                }
            }
            else if (history.current[receipt.chatId]) { // update message if for the other chat
                let index = history.current[receipt.chatId].findIndex(x => x.id === receipt.messageId);
                if (index > -1) {
                    history.current[receipt.chatId][index].seen = true;
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
    });


    // Deleting or editing chat or message
    socket.current.on(UPDATE_EVENT, update => {
        processUpdate(update);
    });
    
    // Listen for incoming messages
    socket.current.on(NEW_CHAT_MESSAGE_EVENT, (message) => {
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
                exterminate();

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
        }
        else { 
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
                
                timer.current = window.setTimeout(exterminate, PARTIAL_MESSAGES_LIFESPAN);
            }  
        }
        
    }); 

    // load chat headers
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

    
    // mark last message as seen
    if (currentMessages.current.length > 0 
        && currentMessages.current[currentMessages.current.length - 1].sender !== currentUserId
        && currentMessages.current[currentMessages.current.length - 1].seen === false       
    ) {
        currentMessages.current[currentMessages.current.length - 1].seen = true;
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
            updateLabel();
            dropUnreadAndSendRecepts();  
            // select in header
            currentChats.current.forEach(x => x.selected = false);
            let index = currentChats.current.findIndex(x => x.id === chatId);
            if (index > -1) {
                currentChats.current[index].selected = true;
            }
            setChats([...currentChats.current]);
            setMessages([...data]);
        }).catch((error) => {
            console.error(error);
        });
    }
    else { // if we do, fetch from history
        currentMessages.current = history.current[currChatId.current];
        updateLabel();
        dropUnreadAndSendRecepts();   
        // select in header
        currentChats.current.forEach(x => x.selected = false);
        let index = currentChats.current.findIndex(x => x.id === chatId);
        if (index > -1) {
            currentChats.current[index].selected = true;
        }     
        setMessages([...currentMessages.current]);        
    }
    
  }, [chatId]);

  // set "New messages" label
  const updateLabel = () => {
    // drop "New message" label
    currentMessages.current.forEach(x => x.firstUnseen = false);

    let last = currentMessages.current[currentMessages.current.length - 1];
    if (last.seen || last.sender === currentUserId) {
        return;
    }

    // and find message where to display new
    var firstUnseen = 0;
    for (var j = currentMessages.current.length - 2; j >= 0; --j) {
        if (currentMessages.current[j].seen || currentMessages.current[j].sender === currentUserId) {
            firstUnseen = j + 1;
            break;
        }
    }

    currentMessages.current[firstUnseen].firstUnseen = true;

  };


  // when chat is selected consider messages as read
  const dropUnreadAndSendRecepts = () => {
        // drop unred for current chat 
        const index = currentChats.current.findIndex(x => x.id === currChatId.current);
        if (index > -1) {
            const wasUnread = currentChats.current[index].unread;
            currentChats.current[index].unread = 0;        
            setChats([...currentChats.current]);
            
            // send receipts
            if (currentChats.current[index].type === 'private' && wasUnread > 0) {     
                // find recipient of recepts       
                var interlocutor = currentChats.current[index].participants.find(x => x.id !== currentUserId);
                if (interlocutor) {                    
                    for (var i = currentMessages.current.length - 1; i >= 0; --i) {
                        if (!currentMessages.current[i].seen && currentMessages.current[i].sender != currentUserId) {
                            currentMessages.current[i].seen = true;
                            socket.current.emit(RECEIPT_EVENT, { 
                                chatId, 
                                userId: interlocutor.id, 
                                messageId: currentMessages.current[i].id 
                            });
                        }
                        else {                            
                            break;
                        }                   
                    }
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
    msg.seen = false;

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

  // start a new chat
  const newChat = (contact) => {

    // first, find out if it is an existing chat
    let found = currentChats.current.find(x => {
        let f = x.participants.find(p => p.id === contact.id);
        return f ? true : false;
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

  return { messages, partial, chats, sendMessage, newChat, updateObject };

};

export default useChat;