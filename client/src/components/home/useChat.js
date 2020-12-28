import { useEffect, useRef, useState } from "react";
import socketIOClient from "socket.io-client";
import $ from 'jquery'

const NEW_CHAT_MESSAGE_EVENT = "newChatMessage";
const RECEIPT_EVENT = "receipt";
const UPDATE_EVENT = "update";

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
  
  // To store data between rerenders
  const socket = useRef(); // WS connection
  const currChatId = useRef(chatId); // current chat
  const chatHeaders = useRef([]); // copy of 'chats' from state
  const currentMessages = useRef([]); // copy of 'messages' from state

  // "history" to optimize loading : if we've loaded the chat before, don't load again, just fetch from history
  const allChats = useRef({});

  const isOnline = useRef(true); // if current user is online
  const schediledReceipt = useRef(); // if current user is offline, receipt to send when he goes

  const  sendSchediledReceipt = () => {   
    if (schediledReceipt.current) {
        // drop unread for curr chat
        let chatsCopy = chatHeaders.current;
        let index = chatsCopy.findIndex(x => x.id === schediledReceipt.current.chatId);
        chatsCopy[index].unread = 0;  

        setChats(chatsCopy);        

        socket.current.emit(RECEIPT_EVENT, schediledReceipt.current);
    }
    schediledReceipt.current = null;
  };


  // update headerd on new message
  const updateChatHeaders = (message, increaseUnread, setUnsen) => {
    const index = chatHeaders.current.findIndex(x => x.id === message.chatId);
    if (index > -1) { // for old chat
        if (increaseUnread)
            chatHeaders.current[index].unread = chatHeaders.current[index].unread + 1;
            
        chatHeaders.current[index].lastMessage.text = message.text;
        chatHeaders.current[index].lastMessage.from = message.sender;
        chatHeaders.current[index].lastMessage.time = message.time;

        if (setUnsen) {
            chatHeaders.current[index].hasBeenRead = false;
        }

        chatHeaders.current.sort((a, b) => {
            return new Date(b.lastMessage.time) - new Date(a.lastMessage.time);
        });
        // To rerender
        setChats([...chatHeaders.current]); 
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
        chatHeaders.current = [newHeader].concat(chatHeaders.current);
        setChats([...chatHeaders.current]);
    }       
  };

  const setSeen = (chatId, seen) => {
      const index = chatHeaders.current.findIndex(x => x.id === chatId);
      if (index > -1) {
        chatHeaders.current[index].hasBeenRead = seen;
      }
      setChats([...chatHeaders.current]);
  };

  const processUpdate = (update) => {
    if (update.action === 'delete') {
        if (update.target === 'chat') {
            const index = chatHeaders.current.findIndex(x => x.id === update.targetId);
            if (index > -1) {
                chatHeaders.current.splice(index, 1);
                setChats(chatHeaders.current);
                if (allChats.current[update.targetId])
                    delete allChats.current[update.targetId];
                if (update.targetId === currChatId.current)
                    setMessages([...[]]);
            }
        }
    }
  };

  // triggers when new chat is selected
  useEffect(() => {

    // Only first time, no need to establish WS connection mutiple times. One socket for all chats
    if (!socket.current) {
        // WS connection
        socket.current = socketIOClient({
            query: { token, type: 'chat' }
        });

        socket.current.on(RECEIPT_EVENT, receipt => {
            setSeen(receipt.chatId, true);
        });

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
                        socket.current.emit(RECEIPT_EVENT, {chatId: message.chatId, userId: message.sender});
                        
                    }
                    else { // otherwise wait till he goes online
                        schediledReceipt.current = {chatId: message.chatId, userId: message.sender};
                        increaseUnread = true;
                    }
                    
                    updateChatHeaders(message, increaseUnread, false);

                    // remove last partial message if full message with the same id came
                    if (currentMessages.current.length > 0 && currentMessages.current[currentMessages.current.length - 1].id === message.id)
                        currentMessages.current.pop();

                    currentMessages.current.push(message);
                    setMessages([...currentMessages.current]); // rerender messages                 
                }                
                else { // otherwise, increase unread counter and update headers
                    updateChatHeaders(message, true, false);
                    if (allChats.current[message.chatId]) // add to history
                        allChats.current[message.chatId].push(message);
                }
            }
            else { // for partial messages
                if (message.chatId === currChatId.current) {
                    
                    // if not the first in the chat
                    if (currentMessages.current.length > 0) { 
                        
                        // if previous version of this message exists, update it
                        if (currentMessages.current[currentMessages.current.length - 1].id === message.id) { 
                            if (!message.text || !message.text.trim()) // if message is empty, remove
                                currentMessages.current.pop();
                            else
                                currentMessages.current[currentMessages.current.length - 1].text = message.text; // update
                        }                            
                        else
                            currentMessages.current.push(message)

                        setMessages([...currentMessages.current]); // finaly rerender
                    }
                    else { // message is fist in the chat, just push and rerender
                        currentMessages.current.push(message);
                        setMessages([...currentMessages.current]);
                    }              
                }  
            }
            
        }); 
    
        // load all chats
        fetch('api/chats/loadchatlist').then((response) => {
            if (!response.ok)
                throw new Error();
            return response.json();
        }).then((data) => {
            setChats(data);
            chatHeaders.current = data;
        }).catch((error) => {
            console.error(error);
        });

        $(window).on("focus", () => {
            isOnline.current = true;
            sendSchediledReceipt();            
        });
        
        $(window).on("blur", () => {
            isOnline.current = false;
        });
    }
    
    // chat is selected
    if (chatId) {
        setMessages([...[]]); // to hide messages from previous chat until new messages are loaded
        allChats.current[currChatId.current] = currentMessages.current; // save messages from old chat

        currChatId.current = chatId;

        // drop unred for selected chat 
        const index = chatHeaders.current.findIndex(x => x.id === chatId);
        chatHeaders.current[index].unread = 0;        
        setChats([...chatHeaders.current]);

        if (chatHeaders.current[index].type === 'private') {
            var interlocutor = chatHeaders.current[index].participants.find(x => x.id !== currentUserId);
            if (interlocutor) {
                socket.current.emit(RECEIPT_EVENT, { chatId, userId: interlocutor.id });
            }
            else {
                socket.current.emit(RECEIPT_EVENT, { chatId });
            }
        }
        else {
            socket.current.emit(RECEIPT_EVENT, { chatId });
        }

        // load messages, if we don't have them
        if (!allChats.current[currChatId.current]) {
            // Load old messages
            fetch('api/chats/loadchat?' + new URLSearchParams({chatId: chatId}).toString()).then((response) => {
                if (!response.ok)
                    throw new Error();
                return response.json();
            }).then((data) => {
                setMessages([...data]);
                currentMessages.current = data;
                allChats.current[chatId] = data;
            }).catch((error) => {
                console.error(error);
            });
        }
        else { // if we do, fetch from history
            currentMessages.current = allChats.current[currChatId.current];
            setMessages([...currentMessages.current]);
        }
    }
    
  }, [chatId]);

  // =================================================
  // ========= function for revoking from UI =========
  // =================================================


  // Sends a message to the server
  const sendMessage = (message) => {
    let msg = message;
    msg['isNewChat'] = currentMessages.current.length === 0;

    if (message.type === 'full') {
        // add to own messages and rerender
        setMessages((messages) => [...messages, message]);
        currentMessages.current.push(message);
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
    let found = chatHeaders.current.find(x => {
        let f = x.participants.find(p => p.id === contact.id);
        return f ? true : false;
    });

    if (found) {
        found['title'] = contact.fullName;
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
        title: contact.fullName,
        lastMessage: {
            from: '',
            text: '',
            time: ''
        }
    };
    chatHeaders.current = [newHeader].concat(chatHeaders.current);
    setChats(chatHeaders.current);
    return newHeader;
  };

  return { messages, chats, sendMessage, newChat, updateObject };

};

export default useChat;