const {MongoClient} = require('mongodb');
const config = require('config.json');

const DATABASE_NAME = "messenger";


module.exports = {
    loadChatHeaders,
    loadMessages,
    saveMessage,
    setIsRead,
    dropUnreadForChat,
    setUnreadForChat,
    findChat,
    loadContacts,
    findChatParticipants,
    deleteChat
};

const groupBy = (xs, key) => {
    return xs.reduce(function(rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  };


async function loadChatHeaders(userId) {
    const uri = config.connectionString;
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
           
        // fetch all chats for user
        const queryForUser = { userId: userId };
        const userChats = database.collection("userChats");
        const cursorForUser = await userChats.find(queryForUser, { projection: { chatId: 1 } });
        var resultForUser = [];
        await cursorForUser.forEach(chat => resultForUser.push(chat.chatId));

        
        // load chats
        const chats = database.collection("chats");
        const query = { "id" : {$in : resultForUser }};
        const cursor= await chats.find(query).sort({'lastMessage.time': -1});
        var result = [];
        await cursor.forEach(chat => result.push(chat));


        // fetch counters of unread messages
        const queryForChats = {"chatId": { $in: resultForUser }}
        const cursorForChats = await userChats.find(queryForChats);
        var resultForChats = [];
        await cursorForChats.forEach(chat => resultForChats.push(chat));

        // fetch user names for display
        const queryForNames = {"id" : { $in: resultForChats.map(x => x.userId)}};
        const optionsForNames = { projection: { id: 1, firstName: 1, lastName: 1} };
        const users = database.collection("users");
        const userCursor = await users.find(queryForNames, optionsForNames);
        var userResults = [];
        await userCursor.forEach(u => userResults.push({id: u.id, name: u.firstName + ' ' + u.lastName}));

        const grouped = Object.entries(groupBy(resultForChats, 'chatId'));
        const chatsParticipants = [];
        for (const [key, value] of grouped) {
            let chat = {};
            chat.chatId = key;
            chat.participants = value.map(x => ({ id: x.userId, name: userResults.find(u => u.id === x.userId).name}));
            chatsParticipants.push(chat);
        }
        
        var finalResult = [];

        result.forEach(x => {
            let res = x;
            res.unread = resultForChats.find(chat => chat.chatId === x.id && chat.userId === userId).unread;
            if (x.type === 'private') {
                res.hasBeenRead = resultForChats.find(chat => chat.chatId === x.id && chat.userId !== userId).unread === 0;
            }     
            res.participants = chatsParticipants.find(p => p.chatId === x.id).participants;
            finalResult.push(res);    
        });

        return finalResult;
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function findChat(chatId) {
    const uri = config.connectionString;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const collection = database.collection("chats");
        const query = { id: chatId };
        const result = await collection.findOne(query);
        return result;
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function findChatParticipants(chatId) {
    const uri = config.connectionString;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const userChats = database.collection("userChats");
        const queryForUser = { chatId: chatId };
        const cursorForUser = await userChats.find(queryForUser);
        var resultForUser = [];
        await cursorForUser.forEach(chat => resultForUser.push(chat.userId));
        return resultForUser;
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function loadMessages(userId, chatId) {
    const participants = await findChatParticipants(chatId);
    if (participants) {
        const user = participants.find(p => p === userId);
        if (!user)
            return [];
    }
    else
        return [];
    const uri = config.connectionString;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const collection = database.collection("messages");
        const query = { chatId: chatId };
        const cursor = await collection.find(query);
        var result = [];
        await cursor.forEach(chat => result.push(chat));
        return result;
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function updateChat(chatId, message) {
    const uri = config.connectionString;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const collection = database.collection("chats");
        await collection.updateOne(
            {id: chatId},
            {
                $set: {
                    'lastMessage.from': message.sender,
                    'lastMessage.text': message.text,
                    'lastMessage.time': message.time
                }
            }
        );
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function setIsRead(messageId) { // not in service yet
    const uri = config.connectionString;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const collection = database.collection("messages");        
        await collection.updateOne(
            {id: messageId},
            {
                $set: { isRead: 1 }
            }
        );

        
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function dropUnreadForChat(userId, chatId) {
    const uri = config.connectionString;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
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
    } finally {
        await client.close();
    }
}

async function setUnreadForChat(userId, chatId) {
    const uri = config.connectionString;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
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
    } finally {
        await client.close();
    }
}

async function createNewPrivateChat(userId, chatId, participants, lastMessage) {
    const uri = config.connectionString;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const chats = database.collection("chats");
        await chats.insertOne({
            id: chatId,
            type: 'private', 
            title: '',
            lastMessage,
            createdBy: userId,
            createdDate: new Date()
        });

        const userChats = database.collection("userChats");        
        participants.forEach( async (p) => {
            await userChats.insertOne({
                userId: p.id,
                chatId,
                unread: 0
            });
        });
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}


async function saveMessage(message) {
    const uri = config.connectionString;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const collection = database.collection("messages");
        if (message.isNewChat && message.to.length === 2){
            await createNewPrivateChat(
                message.sender, 
                message.chatId, 
                message.to, 
                {
                    from: message.sender,
                    text: message.text,
                    time: message.time
                });
        }
        // save message
        await collection.insertOne({
            id: message.id,
            type: "full",
            chatId: message.chatId,
            sender: message.sender,
            text: message.text,
            time: message.time
        });
        // update chat header
        await updateChat(message.chatId, message);
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}


async function loadContacts(userId) {
    const uri = config.connectionString;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const collection = database.collection("users");
        const query = { id: {$ne: userId} };
        const options = {
            projection: {
                id: 1,
                firstName: 1,
                lastName: 1,
                lastSeen: 1,
                online: 1
            }
        }
        const cursor = await collection.find(query, options);
        var result = [];
        await cursor.forEach(contact => result.push(contact));
        return result;
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}


async function deleteChat(chatId) {
    const uri = config.connectionString;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
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
    } finally {
        await client.close();
    }
}


