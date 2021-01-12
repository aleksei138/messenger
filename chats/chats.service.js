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
    deleteChat,
    leaveGroupChat,
    setRead,
    createNewGroupChat,
    getChatInfo,
    getShortChatInfo,
    sendMessage,
    deleteOrLeaveChat
};


function newGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
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
        const unreadsForUser = await userChats.find(queryForUser, { projection: { chatId: 1, unread: 1 } }).toArray();
        var chatsForUser = [];
        unreadsForUser.forEach(x => {
            chatsForUser.push(x.chatId);
        });

        // private chats
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
                $match: {
                    $and: [{ userId: {$ne: userId} }]
                } 
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
                    $and: [{ "chats.id": { $in: chatsForUser } }, { "chats.type": "private" }]
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
                    color: "$users.color",
                    avatar: "$users.avatar",
                    text: "$messages.text",
                    time: "$messages.time",
                    userId: "$users.id",
                    from: "$messages.sender"
                }
            }
        ]).toArray();

        var resultForPrivateChats = [];
        aggregatedPrivateChats.forEach(chat => {
            let header = {};
            header.id = chat.id;
            header.type = chat.type;
            header.title = chat.firstName + ' ' + chat.lastName;
            header.lastMessage = {
                from: chat.from,
                text: chat.text,
                time: chat.time,
            };
            header.hasBeenRead = chat.unread === 0;
            header.unread = unreadsForUser.find(x => x.chatId === chat.id).unread;

            // for participants array
            let interlocutor = {};
            interlocutor.id = chat.userId;
            interlocutor.color = chat.color;
            interlocutor.avatar = chat.avatar;
            interlocutor.avatarLetters = chat.firstName[0] + chat.lastName[0];
            interlocutor.fullName = chat.fullName;

            header.participants = [interlocutor];

            resultForPrivateChats.push(header);
        });

        // group chats
        const chats = database.collection("chats");
        const aggregatedGroupChats = await chats.aggregate([
            {
                $match: {
                    $and: [{ id: { $in: chatsForUser } }, { type: "group" }]
                }
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
                    from: "users",
                    localField: "userChats.userId",
                    foreignField: "id",
                    as: "users"
                }
            },
            {
                $unwind: "$users"
            },
            {
                $project: {
                    id: 1,
                    title: 1,
                    type: 1,
                    createdDate: 1,
                    createdBy: 1,
                    text: "$messages.text",
                    time: "$messages.time",
                    from: "$messages.sender",
                    userId: "$userChats.userId",
                    firstName: "$users.firstName",
                    lastName: "$users.lastName",
                    color: "$users.color",
                    avatar: "$users.avatar",
                }
            },
            {
                $group: {
                    _id: {
                        id: "$id",
                        title: "$title",
                        type: "$type",
                        createdDate: "$createdDate",
                        createdBy: "$createdBy",
                        text: "$text",
                        time: "$time",
                        from: "$from"

                    },
                    "participants": {
                        $push: {
                            id: "$userId",
                            firstName: "$firstName",
                            lastName: "$lastName",
                            color: "$color",
                            avatar: "$avatar"
                        }
                    }
                }
            }

        ]).toArray();

        var resultForGroupChats = [];

        aggregatedGroupChats.forEach(chat => {
            let header = {};
            header.id = chat._id.id;
            header.type = chat._id.type;
            header.title = chat._id.title;
            header.hasBeenRead = true;
            header.unread = unreadsForUser.find(x => x.chatId === chat._id.id).unread;
            header.lastMessage = {
                from: chat._id.from,
                text: chat._id.text,
                time: chat._id.time
            };
            header.admin = chat._id.createdBy;
            header.participants = chat.participants.map(x => ({
                id: x.id,
                fullName: x.firstName + ' ' + x.lastName,
                avatarLetters: x.firstName[0] + x.lastName[0],
                color: x.color,
                avatar: x.avatar
            }));
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
                        $and: [{ "chatId": chatId }]
                    }
                },
                {
                    $project: {
                        id: "$users.id",
                        firstName: "$users.firstName",
                        lastName: "$users.lastName",
                        color: "$users.color",
                        avatar: "$users.avatar"
                    }
                }

            ]).toArray();

            const result = aggregated.map(x => ({
                id: x.id,
                fullName: x.firstName + ' ' + x.lastName,
                avatarLetters: x.firstName[0] + x.lastName[0],
                color: x.color,
                avatar: x.avatar
            }));

            return result;
        } else {
            const cursor = userChats.find({ chatId }, { userId: 1 });
            var result = [];
            await cursor.forEach(x => result.push({ id: x.userId }));
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
                $unwind: { path: "$ticks", preserveNullAndEmptyArrays: true }
            },
            {
                $match: {
                    $or: [
                        {
                            $and: [
                                { "ticks.0": { "$exists": false } },
                                { "chatId": chatId }
                            ]
                        },
                        {
                            $and: [
                                { "chatId": chatId }
                            ]
                        }
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
                    "ticks": {
                        $push: {
                            readBy: "$readBy",
                            readAt: "$readAt"
                        }
                    }
                }
            }
        ]).sort({ "_id.time": 1 }).toArray();

        const result = aggregated.map(m => ({
            id: m._id.id,
            type: m._id.type,
            chatId: m._id.chatId,
            sender: m._id.sender,
            text: m._id.text,
            time: m._id.time,
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
            { id: chatId },
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

async function createNewPrivateChat(userId, chatId, interlocutor, messageId) {
    try {

        const database = DBConnection.database;
        const userChats = database.collection("userChats");

        const toInsert = [
            {
                userId: interlocutor,
                chatId,
                unread: 0
            },
            {
                userId,
                chatId,
                unread: 0
            }
        ];

        let inserted = await userChats.insertMany(toInsert);

        if (inserted.insertedCount === 0) throw Error('Cannot insert into "userChats"')

        const chats = database.collection("chats");

        inserted = await chats.insertOne({
            id: chatId,
            type: 'private',
            title: '',
            lastMessageId: messageId,
            createdBy: userId,
            createdDate: new Date()
        });

        if (inserted.insertedCount === 0) throw Error('Cannot insert into "chats"')

        return { id: chatId };

    }
    catch (e) {
        console.error(e);
        
    }
}


async function saveMessage(message) {
    try {

        //throw Error('Have a nice day')

        const database = DBConnection.database;
        const collection = database.collection("messages");

        // create new chat if needed
        if (message.isNewPrivateChat) {
            let res = await createNewPrivateChat(
                message.sender,
                message.chatId,
                message.to[0].id,
                message.id
            );
            if (!res) throw Error('Cannot create new chat');
        }

        // save message
        let inserted = await collection.insertOne({
            id: message.id,
            type: message.type,
            chatId: message.chatId,
            sender: message.sender,
            text: message.text,
            time: message.time
        }).insertedCount;

        if (inserted === 0) throw Error('Cannot insert into "messages"');

        // update chat header
        await updateChat(message.chatId, message);

        return { id: message.id };

    }
    catch (e) {
        console.error(e);
        
    }
}


async function deleteChat(chatId) {
    try {

        const database = DBConnection.database;
        const chats = database.collection("chats");
        const userChats = database.collection('userChats');
        const messages = database.collection('messages');
        await Promise.all([
            chats.deleteOne({ id: chatId }),
            userChats.deleteMany({ chatId: chatId }),
            messages.deleteMany({ chatId: chatId })
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
        await userChats.deleteOne({ chatId, userId });
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

        const toInsert = participants.map(p => ({ userId: p.id, chatId: id, unread: 0 }));

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
        
    }
}

async function getChatInfo(userId, chatId) {

    var participants = await findChatParticipants(chatId, true);
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
                $match: { $and: [{ "userChats.userId": userId }, { "userChats.chatId": chatId }] }
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
                $project: {
                    id: 1,
                    title: 1,
                    type: 1,
                    createdBy: 1,
                    unread: "$userChats.unread",
                    text: "$messages.text",
                    time: "$messages.time",
                    from: "$messages.sender"
                }
            }
        ]).toArray();

        var title = aggregated[0].title;

        var result = {
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

        if (!aggregated[0]) throw Error('Chat not found')

        if (aggregated[0].type === 'private') {
            var user = participants.find(x => x.id !== userId);
            if (user) {
                result.title = user.fullName;
                result.participants = [user];
            }
        } else {
            result.admin = aggregated[0].createdBy;
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
        var result = await chats.findOne({ id: chatId });
        return result;
    }
    catch (e) {
        console.error(e);
    }
}

// only for full messages or notifications
async function sendMessage(msg, sender) {
    const io = WSConnection.io;

    let saved = await saveMessage(msg);

    if (!saved) throw Error('Cannot save message')

    var participants = [];
    if (msg.chatType === 'private' && msg.to && msg.to.length === 1)
        participants = msg.to;
    else
        participants = await findChatParticipants(msg.chatId, false); // grop chats participants are subjects to chenge

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

    } else {
        throw Error('Cannot find chat participants')
    }

    return { success: true };
}

async function deleteOrLeaveChat(chatId, userId) {
    try {
        const chat = await getShortChatInfo(chatId); // find out about chat
        var participants = await findChatParticipants(chatId, true);

        if (!participants || !participants[0]) throw Error('Cannot find chat participants')
        const user = participants.find(x => x.id === userId);
        if (!user) throw Error('User does not have right to delete this message')

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
                name = participants[index].fullName;
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
    }

}