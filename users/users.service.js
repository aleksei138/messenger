const config = require('config.json');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { DBConnection } = require('../helpers/DBConnection.js')

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
    try {        
        const database = DBConnection.database;
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
    } 
}

async function setLastSeen(userId, online) {
    try {        
        const database = DBConnection.database;
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
    } 
}

async function getLastSeen(userId) {
    try {        
        const database = DBConnection.database;
        const collection = database.collection("users");
        const query = { id: userId };
        const option = { projection: { lastSeen: 1, online: 1}};
        const result = await collection.findOne(query, option);
        return { lastSeen: result.lastSeen, online: result.online };
    }
    catch (e) {
        console.error(e);
    } 
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

async function createUser(user) {
    try {        
        const database = DBConnection.database;
        const collection = database.collection("users");
        const id = newGuid();
        const salt = crypto.randomBytes(48).toString('hex');
        const hash = crypto.createHash("sha256").update(user.password + salt).digest('hex');
        const result = await collection.insertOne({
            id,
            username: user.username.trim(),
            hash,
            salt,
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
    } 
}

async function loadContacts(userId) {
    try {        
        const database = DBConnection.database;
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
    } 
}

async function authenticate({ username, password }) {
    const user = await findUser(username);
    if (!user) 
        throw 'Username is incorrect'; 

    if (user.hash) {
        const computed = crypto.createHash("sha256").update(password + user.salt).digest('hex');
        if (computed !== user.hash) 
            throw 'Password is incorrect';
    }
    else {
        // deprecated
        if (user.password !== password) 
            throw 'Password is incorrect';
    }

    // create a jwt token for one year
    const token = jwt.sign({ sub: user.id }, config.secret, { expiresIn: 60 * 60 * 24 * 365 });

    return {
        token: token,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}` 
    };
}