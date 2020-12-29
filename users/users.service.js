const config = require('config.json');
const jwt = require('jsonwebtoken');
const {MongoClient} = require('mongodb');
const DATABASE_NAME = "messenger";

module.exports = {
    authenticate,
    createUser,
    setLastSeen,
    getLastSeen,
    loadContacts,
    findUser
};

function newGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  }

async function findUser(username) {
    const uri = config.connectionString;
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const collection = database.collection("users");
        const query = { username: username };
        const result = await collection.findOne(query);
        if (result && result.id)
            return result;
        else
            return null;
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function setLastSeen(userId, online) {
    const uri = config.connectionString;
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const users = database.collection("users");
        await users.updateOne(
            {
                id: userId
            },
            {
                $set: { lastSeen: new Date(),  online }
            }
        );
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function getLastSeen(userId) {
    const uri = config.connectionString;
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const collection = database.collection("users");
        const query = { id: userId };
        const option = { projection: { lastSeen: 1, online: 1}};
        const result = await collection.findOne(query, option);
        return { lastSeen: result.lastSeen, online: result.online };
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

async function createUser(user) {
    const uri = config.connectionString;
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
    try {
        await client.connect();
        const database = client.db(DATABASE_NAME);
        const collection = database.collection("users");
        const id = newGuid();
        const result = await collection.insertOne({
            id: id,
            username: user.username.trim(),
            password: user.password,
            firstName: capitalizeFirstLetter(user.firstName),
            lastName: capitalizeFirstLetter(user.lastName),
            lastSeen: new Date(),
            online: false
        });
        if (result.insertedCount > 0)
            return id;
        else
            return null;
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function loadContacts(userId) {
    const uri = config.connectionString;
    const client = new MongoClient(uri, { useUnifiedTopology: true } );
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
        const result = await collection.find(query, options).sort({"firstName": 1, "lastName": 1}).toArray();
        return result;
    }
    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function authenticate({ username, password }) {

    const user = await findUser(username);

    if (!user) throw 'Username is incorrect'; 
    
    // TODO: hash and salt
    if (user.password !== password) throw 'Password is incorrect';

    // create a jwt token for one year
    const token = jwt.sign({ sub: user.id }, config.secret, { expiresIn: '1y' });

    return {
        token: token,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}` 
    };
}




