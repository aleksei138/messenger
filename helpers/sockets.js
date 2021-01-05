const config = require('config.json');
const jwt = require('jsonwebtoken');
const chatService = require('../chats/chats.service');
const userService = require('../users/users.service');

module.exports = {
    authentificate,
    initialize
};

const NEW_CHAT_MESSAGE_EVENT = "newChatMessage";
const RECEIPT_EVENT = "receipt";
const UPDATE_EVENT = "update";
const LASTSEEN_EVENT = "lastSeen";

function authentificate(socket, next){
    const { secret } = config;
    if (socket.handshake.query && socket.handshake.query.token){
        jwt.verify(socket.handshake.query.token, secret, function(err, decoded) {
          if (err) return next(new Error('Authentication error'));
          socket.decoded = decoded;
          next();
        });
    }
    else {
        next(new Error('Authentication error'));
    } 
}

function initialize(io) {
    io.on('connection', (socket) => {

        // create for a user a room with his id as room name to easily send messages to him
        if (socket.handshake.query.type === 'chat') {
          var connected = io.sockets.adapter.rooms.get(socket.decoded.sub);
          if (!connected){ // !!! to prevent double connection
            socket.join(socket.decoded.sub);
          }      
        }
    
        // handle disconnect
        socket.on('disconnect', () => {
    
          // report that user has gone offline
          if (socket.handshake.query.type === 'lastSeen') {
            userService.setLastSeen(socket.decoded.sub, false);
            io.to('LASTSEEN:' + socket.decoded.sub).emit('lastSeen', {userId: socket.decoded.sub, lastSeen: new Date(), online: false});
          }
          if (socket.handshake.query.type === 'chat') {
            socket.leave(socket.decoded.sub); // !!! to prevent double connection
          }
        });
    
    
        // ==============================================
        // ================= Receipts ===================
        // ==============================================
    
        socket.on(RECEIPT_EVENT, (rec) => {
            //chatService.setIsRead(rec.messageId);
            chatService.dropUnreadForChat(socket.decoded.sub, rec.chatId);
            const readAt = new Date();
            if (rec.userId) {
              io.to(rec.userId).emit(RECEIPT_EVENT, {
                chatId: rec.chatId, 
                messageId: rec.messageId, 
                readBy: socket.decoded.sub, 
                readAt, type: 'read'
              });
            } 
            chatService.setRead(rec.messageId, socket.decoded.sub, readAt);      
        });
    
    
        // ==============================================
        // ================= last seens =================
        // ==============================================
    
        
    
        socket.on(LASTSEEN_EVENT, async (rst) => {
          // types : subscribe, unsubscribe, reportOnline, reportOffline
          if (rst.type === 'subscribe') {
            socket.join('LASTSEEN:' + rst.userId); // in that room all who subscribed to {rst.userId}'s lastSeens
    
          } else if (rst.type === 'unsubscribe') {
            socket.leave('LASTSEEN:' + rst.userId);
    
          } else if (rst.type === 'reportOnline') {
    
            io.to('LASTSEEN:' + socket.decoded.sub).emit(LASTSEEN_EVENT, {userId: socket.decoded.sub, lastSeen: new Date(), online: true});
            userService.setLastSeen(socket.decoded.sub, true);
    
          } else if (rst.type === 'reportOffline') {
    
            io.to('LASTSEEN:' + socket.decoded.sub).emit(LASTSEEN_EVENT, {userId: socket.decoded.sub, lastSeen: new Date(), online: false});
            userService.setLastSeen(socket.decoded.sub, false);
          }
        });
    
    
        // =========================================================================
        // ================= processing partial messages from user =================
        // ==========================================================================
        socket.on(NEW_CHAT_MESSAGE_EVENT, (msg) => {               
            
            const participants = msg.to;              
    
            if (participants && participants.length > 0 && msg.type === 'partial') {

              const recipient = participants.find(x => x.id !== socket.decoded.sub);

              if (recipient) {

                let message = {
                  id: msg.id,
                  type: msg.type,
                  sender: socket.decoded.sub,
                  to: recipient.id,
                  chatId: msg.chatId,
                  text: msg.text,
                  time: msg.time,
                  ticks: []
                }
                // Send message to room (to user)
                io.to(message.to).emit(NEW_CHAT_MESSAGE_EVENT, message); 
              }
            }
    
          });
      });
}