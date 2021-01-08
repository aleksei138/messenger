const { DBConnection } = require('../helpers/DBConnection.js');
const { WSConnection } = require('../helpers/WSConnection.js');

const NEW_CHAT_MESSAGE_EVENT = "newChatMessage";
const UPDATE_EVENT = "update";

module.exports = {
    loadChatHeaders,
    loadMessages,
    saveMessage,
    dropUnreadForChat,
    setUnreadForChat,
    findChatParticipants,
    deleteChat,
    leaveGroupChat,
    setRead,
    createNewGroupChat,
    getChatInfo,
    getShortChatInfo,
    sendMessage,
    deleteOrLeaveChat
};

const groupBy = (xs, key) => {
    return xs.reduce(function(rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  };

  function newGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  }


async function loadChatHeaders(userId) {
    try {
        const database = DBConnection.database;
           
        // fetch all chats for user (subquery)
        const queryForUser = { userId: userId };
        const userChats = database.collection("userChats");
        const cursorForUser = userChats.find(queryForUser, { projection: { chatId: 1 } });
        var chatsForUser = [];
        await cursorForUser.forEach(chat => chatsForUser.push(chat.chatId));

        // private chats

        // join
        const aggregatedPrivateChats = await userChats.aggregate([
            {
                $lookup: {
                    from: "chats",
                    localField: "chatId",
                    foreignField: "id",
                    as: "chats"
                }
            },
            {
                $unwind: "$chats"
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "id",
                    as: "users"
                }
            },
            {
                $unwind: "$users"
            },
            {
                $lookup: {
                    from: "messages",
                    localField: "chats.lastMessageId",
                    foreignField: "id",
                    as: "messages"
                }
            },
            {
                $unwind: "$messages"
            },
            {
                $match: {
                    $and: [{"chats.id" : {$in: chatsForUser}}, {"chats.type": "private"}]
                }
            },
            {
                $project: {
                    id: "$chats.id",
                    title: "$chats.title",
                    type: "$chats.type",
                    unread: 1,
                    firstName: "$users.firstName",
                    lastName: "$users.lastName",
                    text: "$messages.text",
                    time: "$messages.time",
                    userId: "$users.id",
                    from: "$messages.sender"
                }
            }            
        ]).toArray();

        var grouped = Object.entries(groupBy(aggregatedPrivateChats, 'id'));
        var resultForPrivateChats = [];
        for (const [chatId, value] of grouped) {
            let chat = {};
            chat.id = chatId;
            chat.type = value[0].type;
            let user = value.find(x => x.userId !== userId);
            chat.title = user.firstName + ' ' + user.lastName;
            chat.lastMessage = {
                from: value[0].from,
                text: value[0].text,
                time: value[0].time,
            };
            if (chat.type === 'private')
                chat.hasBeenRead = value.find(x => x.userId !== userId).unread === 0;
            else
                chat.hasBeenRead = true;

            chat.unread = value.find(x => x.userId === userId).unread;
            chat.participants = value.map(x => ({ id: x.userId, name: x.firstName + ' ' + x.lastName}));
            resultForPrivateChats.push(chat);
        }

        // group chats
        const chats = database.collection("chats");
        const aggregatedGroupChats = await chats.aggregate([
            {
                $lookup: {
                    from: "userChats",
                    localField: "id",
                    foreignField: "chatId",
                    as: "userChats"
                }
            },
            {
                $unwind: "$userChats"
            },
            {
                $lookup: {
                    from: "messages",
                    localField: "lastMessageId",
                    foreignField: "id",
                    as: "messages"
                }
            },
            {
                $unwind: "$messages"
            },
            {
                $match: {

                        $and: [
                            {"userChats.userId" : userId},
                            {type: "group"}
                        ]                    
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "messages.sender",
                    foreignField: "id",
                    as: "users"
                }
            },
            {
                $unwind: {path: "$users", preserveNullAndEmptyArrays: true}
            },
            {
                $match: {
                    $or: [
                        {"users.0": { "$exists": false }},
                        {"messages.0": { "$exists": false }},
                        {"users.0": { "$exists": true }},
                        {"messages.0": { "$exists": true }},
                    ]
                }
            },
            {
                $project: {
                    id: 1,
                    title: 1,
                    type: 1,
                    createdDate: 1,
                    createdBy: 1,
                    unread: "$userChats.unread",                    
                    text: "$messages.text",
                    time: "$messages.time",
                    name: "$users.firstName",
                    from: "$messages.sender"
                }
            } 

        ]).toArray();

        var resultForGroupChats = [];

        aggregatedGroupChats.forEach(chat => {
            let header = {};
            header.id = chat.id;
            header.type = chat.type;
            header.title = chat.title;
            header.hasBeenRead = true;
            header.unread = chat.unread;
            header.lastMessage = {
                from: chat.from,
                text: chat.text,
                time: chat.time ? chat.time : chat.createdDate,
                senderName: chat.name
            };
            header.admin = chat.createdBy;          
            header.participants = [];
            resultForGroupChats.push(header);
        }); 

        var result = resultForPrivateChats.concat(resultForGroupChats);

        result.sort((a, b) => {
            return new Date(b.lastMessage.time) - new Date(a.lastMessage.time);
        });

        return result;
    }
    catch (e) {
        console.error(e);
    }
}


async function findChatParticipants(chatId, loadNames) {
    try {
        
        const database = DBConnection.database;
        const userChats = database.collection("userChats");
        if (loadNames) {
            // join
            const aggregated = await userChats.aggregate([
                {
                    $lookup: {
                        from: "users",
                        localField: "userId",
                        foreignField: "id",
                        as: "users"
                    }
                },
                {
                    $unwind: "$users"
                },
                {
                    $match: {
                        $and: [{"chatId":  chatId}]
                    }
                },
                {
                    $project: {
                        id: "$users.id",
                        firstName: "$users.firstName",
                        lastName: "$users.lastName",
                    }
                }
                
                ]).toArray();

            const result = aggregated.map(x => ({id: x.id, name: x.firstName + ' ' + x.lastName}));

            return result;
        } else {
            const cursor = userChats.find({ chatId }, { userId: 1 });
            var result = [];
            await cursor.forEach(x => result.push({id: x.userId}));
            return result;
        }

        
    }
    catch (e) {
        console.error(e);
    } 
}

async function loadMessages(userId, chatId) {
    const participants = await findChatParticipants(chatId, false);
    if (participants) {
        const user = participants.find(p => p.id === userId);
        if (!user)
            return [];
    }
    else
        return [];
    try {        
        const database = DBConnection.database;
        const messages = database.collection("messages");

        const aggregated = await messages.aggregate([
            {
                $lookup: {
                    from: "ticks",
                    localField: "id",
                    foreignField: "messageId",
                    as: "ticks"
                }
            },
            {
                $unwind: {path: "$ticks", preserveNullAndEmptyArrays: true}
            },
            {
                $match:  {
                    $or: [
                        {$and: [
                            {"ticks.0": { "$exists": false }}, 
                            {"chatId": chatId}
                        ]},
                        {$and: [
                            {"chatId": chatId}
                        ]}
                    ]
                }
            },           
            {
                $project: {
                    id: 1,
                    type: 1,
                    chatId: 1,
                    sender: 1,                    
                    text: 1,
                    time: 1,
                    readBy: "$ticks.readBy",
                    readAt: "$ticks.readAt"
                   
                }
            }, 
            {
                $group: {
                    _id: { 
                        id: "$id",
                        type: "$type",
                        chatId: "$chatId",
                        sender: "$sender",
                        text: "$text",
                        time: "$time"
                    },
                    "ticks" : {
                        $push: {
                            readBy: "$readBy",
                            readAt: "$readAt"
                        }
                    }
                }
            }
        ]).sort({"_id.time": 1}).toArray();

        const result = aggregated.map(m => ({
            id:  m._id.id,
            type:  m._id.type,
            chatId:  m._id.chatId,
            sender:  m._id.sender,
            text:  m._id.text,
            time:  m._id.time,
            ticks: m.ticks[0].readAt && m._id.sender === userId ? m.ticks : []
        }));

        return result;
    }
    catch (e) {
        console.error(e);
    } 
}

async function updateChat(chatId, message) {
    try {
        
        const database = DBConnection.database;
        const collection = database.collection("chats");
        await collection.updateOne(
            {id: chatId},
            {
                $set: {
                    lastMessageId: message.id
                }
            }
        );
    }
    catch (e) {
        console.error(e);
    } 
}


async function dropUnreadForChat(userId, chatId) {
    try {
        
        const database = DBConnection.database;
        const userChats = database.collection("userChats");
        await userChats.updateOne(
            { chatId: chatId, userId: userId },
            {
                $set: { unread: 0 }
            }
        );        
    }
    catch (e) {
        console.error(e);
    } 
}

async function setUnreadForChat(userId, chatId) {
    try {
        
        const database = DBConnection.database;
        const userChats = database.collection("userChats");
        await userChats.updateOne(
            { chatId: chatId, userId: userId },
            {
                $inc: { unread: 1 }
            }
        );        
    }
    catch (e) {
        console.error(e);
    } 
}

async function createNewPrivateChat(userId, chatId, participants, messageId) {
    try {
        
        const database = DBConnection.database;

        const userChats = database.collection("userChats");        

        const toInsert = participants.map(p => ({userId: p.id, chatId, unread: 0}));

        let inserted = await userChats.insertMany(toInsert);

        if (inserted.insertedCount === 0)
                throw Error('Cannot insert into "userChats"')

        const chats = database.collection("chats");
        inserted = await chats.insertOne({
            id: chatId,
            type: 'private', 
            title: '',
            lastMessageId: messageId,
            createdBy: userId,
            createdDate: new Date()
        });

        if (inserted.insertedCount === 0)
            throw Error('Cannot insert into "chats"')

        return {id: chatId};
        
    }
    catch (e) {
        console.error(e);
        return null;
    } 
}


async function saveMessage(message) {
    try {
        
        const database = DBConnection.database;
        const collection = database.collection("messages");

        if (message.isNewChat && message.to.length === 2){
            let res = await createNewPrivateChat(
                message.sender, 
                message.chatId,
                message.to,
                message.id
                );
            if (!res)
                throw Error('Cannot create new chat');
        }
        
        // save message
        let result = await collection.insertOne({
            id: message.id,
            type: message.type,
            chatId: message.chatId,
            sender: message.sender,
            text: message.text,
            time: message.time
        }).insertedCount;

        if (result == 0)
            throw Error('Cannot insert into "messages"')
        
        
        
        // update chat header
        await updateChat(message.chatId, message);

        return {id: message.id};
        
    }
    catch (e) {
        console.error(e);
        return null;
    } 
}


async function deleteChat(chatId) {
    try {
        
        const database = DBConnection.database;
        const chats = database.collection("chats");
        const userChats = database.collection('userChats');
        const messages = database.collection('messages');
        await Promise.all([
            chats.deleteOne({id: chatId}),
            userChats.deleteMany({chatId: chatId}),
            messages.deleteMany({chatId: chatId})
        ]);        
    }
    catch (e) {
        console.error(e);
    } 
}

async function leaveGroupChat(chatId, userId) {
    try {
        
        const database = DBConnection.database;
        const userChats = database.collection('userChats');
        await userChats.deleteOne({chatId, userId});        
    }
    catch (e) {
        console.error(e);
    } 
}

async function setRead(messageId, userId, readAt) {
    try {
        
        const database = DBConnection.database;
        const collection = database.collection("ticks");
        await collection.updateOne(
            {
                messageId: messageId,
                readBy: userId

            },
            {
                $set: {
                    readAt: readAt                    
                }

            },
            { 
                upsert: true 
            }
        ); 
    }
    catch (e) {
        console.error(e);
    } 
}

async function createNewGroupChat(userId, participants, title) {
    try {
        
        const database = DBConnection.database;
        const chats = database.collection("chats");
        const id = newGuid();
        let inserted = await chats.insertOne({
            id,
            type: 'group', 
            title,
            lastMessageId: null,
            createdBy: userId,
            createdDate: new Date()
        });

        if (inserted.insertedCount === 0)
            throw Error('Cannot insert into "chats"');

        const userChats = database.collection('userChats');

        const toInsert = participants.map(p => ({userId: p.id, chatId: id, unread: 0}));

        await userChats.insertMany(toInsert);

        const notification = {
            id: newGuid(),
            type: 'notification',
            chatId: id,
            sender: userId,
            text: `Chat "${title}" has been created`,
            time: new Date().toISOString()
        }

        await sendMessage(notification, userId);

        const result = {
            id,
            type: 'group',
            title,
            participants: participants,
            unread: 0,
            hasBeenRead: true,
            selected: false,
            lastMessage: {
                from: userId,
                text: `Chat "${title}" has been created`,
                time: new Date()
            },
            admin: userId
        }

        return result;
        
    }
    catch (e) {
        console.error(e);
        return null;
    } 
}

async function getChatInfo(userId, chatId) {
    
    const participants = await findChatParticipants(chatId, true);
    if (participants) {
        const user = participants.find(p => p.id === userId);
        if (!user)
            return null;  
    } else {
        return null; 
    }
    try {
        
        const database = DBConnection.database;
        const chats = database.collection("chats");
        
        var aggregated = await chats.aggregate([
            {
                $lookup: {
                    from: "userChats",
                    localField: "id",
                    foreignField: "chatId",
                    as: "userChats"
                }
            },
            {
                $unwind: "$userChats"
            },
            {
                $match: {$and: [{"userChats.userId": userId}, {"userChats.chatId": chatId}]}
            },
            {
                $lookup: {
                    from: "messages",
                    localField: "lastMessageId",
                    foreignField: "id",
                    as: "messages"
                }
            },
            {
                $unwind: {path: "$messages", preserveNullAndEmptyArrays: true}
            },
            {
                $match: {
                    $or: [
                        {"messages.0": { "$exists": false }},
                        {"messages.0": { "$exists": true }}
                    ]
                }
            },
            {
                $project: {
                    id: 1,
                    title: 1,
                    type: 1,
                    unread: "$userChats.unread",                    
                    text: "$messages.text",
                    time: "$messages.time",
                    from: "$messages.sender"
                }
            } 
        ]).toArray();

        var title = aggregated[0].title;
        if (aggregated[0].type === 'private') {
            title = participants.find(x => x.id !== userId).name;
        }

        const result = {
            id: aggregated[0].id,
            title,
            type: aggregated[0].type,
            unread: aggregated[0].unread,
            participants: participants,
            hasBeenRead: true,
            lastMessage: {
                from: aggregated[0].from,
                time: aggregated[0].time,
                text: aggregated[0].text
            }
        }

        return result;
    }
    catch (e) {
        console.error(e);
    } 
}

async function getShortChatInfo(chatId) {
    try {
        const database = DBConnection.database;
        const chats = database.collection("chats");        
        var result = await chats.findOne({id: chatId});
        return result;
    }
    catch (e) {
        console.error(e);
    } 
}

// only for full messages or notifications
async function sendMessage(msg, sender){
    try {
        const io = WSConnection.io;
        
        await saveMessage(msg);

          
        var participants = [];
        if (msg.chatType === 'private' && msg.to && msg.to.length === 2) 
            participants = msg.to;
        else
            participants = await findChatParticipants(msg.chatId, false); // grop chats participants are subject to chenge
            
  
        if (participants && participants.length > 0) {

            for (var i = 0; i < participants.length; ++i) {

                const to = participants[i];

                if (to.id == sender)
                    continue;

                const message = {
                    id: msg.id,
                    type: msg.type,
                    sender,
                    to: to.id,
                    chatId: msg.chatId,
                    text: msg.text,
                    time: msg.time,
                    ticks: []
                }

                // Send message to room (to user)
                io.to(message.to).emit(NEW_CHAT_MESSAGE_EVENT, message); 

                // mark as unread for recipient unless notification
                if (sender !== '00000000-0000-0000-0000-000000000000')
                    await setUnreadForChat(message.to, message.chatId);
            }
        }
        return { success: true };
    }
    catch (e) {
        console.error(e);
        return { success: false };
    } 
}

async function deleteOrLeaveChat(chatId, userId) {
    try {
        const chat = await getShortChatInfo(chatId); // find out about chat
        var participants = await findChatParticipants(chatId, true);
        const io = WSConnection.io;

        // if admin of group chat invoked it, or it's for a private chat, delete for everyone
        if (chat.type === 'group' && chat.createdBy === userId || chat.type === 'private') {

            const update = {
                action: 'delete',
                target: 'chat',
                targetId: chatId
            }

            // delete from DB
            await deleteChat(chatId);

            // notify participants
            participants.forEach(x => {
                if (x.id !== userId) { 
                    io.to(x.id).emit(UPDATE_EVENT, update);                  
                }
            });

        } else { // leave group chat and notify others

            await leaveGroupChat(chatId, userId);

            let index = participants.findIndex(x => x.id === userId);
            let name = '';
            if (index > -1) {
                name = participants[index].name;
                participants.splice(index, 1);
            }

            const update = {
                action: 'update',
                target: 'chat',
                targetId: chatId,
                object: 'participants',
                value: participants
            }

            participants.forEach(x => {
                if (x.id !== userId) { 
                    io.to(x.id).emit(UPDATE_EVENT, update);
                }
            });

            const notification = {
                id: newGuid(),
                type: 'notification',
                sender: '00000000-0000-0000-0000-000000000000',
                text: `${name} left`,
                chatId,
                time: new Date().toISOString()
            }

            await sendMessage(notification, notification.sender);
        }

        return { success: true };
        
    } catch (e) {
        console.error(e);
        return { success: false };
    } 
    
}




