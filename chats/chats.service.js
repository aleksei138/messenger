const {MongoClient} = require('mongodb');
const config = require('config.json');

const DATABASE_NAME = "messenger";

module.exports = {
    loadChatHeaders,
    loadMessages,
    saveMessage,
    dropUnreadForChat,
    setUnreadForChat,
    findChat,
    findChatParticipants,
    deleteChat,
    setSeen
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
           
        // fetch all chats for user (subquery)
        const queryForUser = { userId: userId };
        const userChats = database.collection("userChats");
        const cursorForUser = userChats.find(queryForUser, { projection: { chatId: 1 } });
        var resultForUser = [];
        await cursorForUser.forEach(chat => resultForUser.push(chat.chatId));

        // join
        const aggregated = await userChats.aggregate([
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
                    $and: [{"chats.id" : {$in: resultForUser}}]
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

        var grouped = Object.entries(groupBy(aggregated, 'id'));
        var result = [];
        for (const [chatId, value] of grouped) {
            let chat = {};
            chat.id = chatId;
            chat.type = value[0].type;
            chat.title = value[0].title;
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
            result.push(chat);
        }
        result.sort((a, b) => {
            return new Date(b.lastMessage.time) - new Date(a.lastMessage.time);
        });

        return result;
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function findChat(chatId) {
    const uri = config.connectionString;
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
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
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const userChats = database.collection("userChats");
        const query = { chatId };
        const cursor = userChats.find(query);
        var result = [];
        await cursor.forEach(chat => result.push(chat.userId));
        return result;
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
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const collection = database.collection("messages");
        const query = { chatId };
        const result = await collection.find(query).sort({time: 1}).toArray();
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
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
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
    } finally {
        await client.close();
    }
}


async function dropUnreadForChat(userId, chatId) {
    const uri = config.connectionString;
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
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
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
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

async function createNewPrivateChat(userId, chatId, participants, messageId) {
    const uri = config.connectionString;
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);

        const userChats = database.collection("userChats");        
        participants.forEach( async (p) => {
            let inserted = await userChats.insertOne({
                userId: p.id,
                chatId,
                unread: 0
            }).insertedCount;
            if (inserted === 0)
                throw Error('Cannot insert into "userChats"')
        });

        const chats = database.collection("chats");
        let inserted = await chats.insertOne({
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
    } finally {
        await client.close();
    }
}


async function saveMessage(message) {
    const uri = config.connectionString;
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
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
            type: "full",
            chatId: message.chatId,
            sender: message.sender,
            text: message.text,
            time: message.time,
            seen: false,
            seenAt: null
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
    } finally {
        await client.close();
    }
}


async function deleteChat(chatId) {
    const uri = config.connectionString;
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
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

async function setSeen(messageId) {
    const uri = config.connectionString;
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const collection = database.collection("messages");        
        await collection.updateOne(
            {
                id: messageId
            },
            {
                $set: { 
                    seen: true, 
                    seenAt: new Date() 
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