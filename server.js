require('rootpath')();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
const jwt = require('helpers/jwt');
const errorHandler = require('helpers/error-handler');
const sockets = require('helpers/sockets')
const chatService = require('chats/chats.service');
const userService = require('users/users.service');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// use JWT auth
app.use(jwt());

// api routes
app.use('/', require('./users/users.controller'));
app.use('/', require('./chats/chats.controller'));

// global error handler
app.use(errorHandler);

// start server
const port = process.env.NODE_ENV === 'production' ? 80 : 8080;
const server = app.listen(port, function () {
    console.log('Server listening on port ' + port);
});

const io = require('socket.io')(server);

// sockets authentification
io.use(sockets.authentificate);

const NEW_CHAT_MESSAGE_EVENT = "newChatMessage";
const RECEIPT_EVENT = "receipt";
const UPDATE_EVENT = "update";
const LASTSEEN_EVENT = "lastSeen";

io.on('connection', (socket) => {

    // create for a user a room with his id as room name to easily send messages to him
    if (socket.handshake.query.type === 'chat') {
      var connected = io.sockets.adapter.rooms[socket.decoded.sub];
      if (!connected){ // !!! to prevent double connection
        socket.join(socket.decoded.sub);
      }      
    }

    //console.log(`user with id '${socket.decoded.sub}' connected for ${socket.handshake.query.type}`);


    // handle disconnect
    socket.on('disconnect', () => {
      //console.log(`user with id '${socket.decoded.sub}' disconnected for ${socket.handshake.query.type}`);

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
        if (rec.userId) {
          io.to(rec.userId).emit(RECEIPT_EVENT, {chatId: rec.chatId, messageId: rec.messageId, type: 'seen'});
        } 
        chatService.setSeen(rec.messageId);      
    });


    // ==================================================================
    // ================= delete or edit chat or message =================
    // ==================================================================
    socket.on(UPDATE_EVENT, async (update) => {        
        if (update.action === 'delete') {
          if (update.target === 'chat') {
            const participants = await chatService.findChatParticipants(update.targetId);
            participants.forEach(async (x) => {
              if (x !== socket.decoded.sub) { 
                io.to(x).emit(UPDATE_EVENT, update);
                await chatService.deleteChat(update.targetId);
              }
            })
          }
      }
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


    // =================================================================
    // ================= processing messages from user =================
    // =================================================================
    socket.on(NEW_CHAT_MESSAGE_EVENT, async (msg) => {

        if (msg.type === 'full') {
          let saved = await chatService.saveMessage(msg);
          if (saved)
            io.to(msg.sender).emit(RECEIPT_EVENT, {chatId: msg.chatId, messageId: msg.id, type: 'sent'});
        }
        
        
        
        if (!msg.to) {
          msg.to = 'TODO: find users whom to send'
        }          
        else {
          msg.to.forEach(to => {
            if (to.id == socket.decoded.sub)
              return;
            
            let message = null;

            if (msg.isNewChat && msg.senderName) { // only for new private chats (add senderName)
              message = {
                id: msg.id,
                type: msg.type,
                sender: socket.decoded.sub,
                senderName: msg.senderName,
                to: to.id,
                chatId: msg.chatId,
                text: msg.text,
                time: msg.time,
                seen: false
              }
            }
            else {
              message = {
                id: msg.id,
                type: msg.type,
                sender: socket.decoded.sub,
                to: to.id,
                chatId: msg.chatId,
                text: msg.text,
                time: msg.time,
                seen: false
              }
            }

            // sending message to room (to user)
            io.to(message.to).emit(NEW_CHAT_MESSAGE_EVENT, message); 

            // mark it unread
            if (message.type === 'full')
              chatService.setUnreadForChat(message.to, message.chatId);
          });
        } 

      });
  });

