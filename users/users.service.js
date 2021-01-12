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

const colors = [
    "#f44336",
    "#e91e63",
    "#9c27b0",
    "#673ab7",
    "#3f51b5",
    "#2196f3",
    "#03a9f4",
    "#00bcd4",
    "#009688",
    "#64dd17",
    "#fdd835",
    "#ffb300",
    "#fb8c00",
    "#f4511e"
]

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
        return null;        
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
        return null;
    } 
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

async function createUser(user) {
    const database = DBConnection.database;
    const collection = database.collection("users");
    const salt = crypto.randomBytes(48).toString('hex');
    const hash = crypto.createHash("sha256").update(user.password + salt).digest('hex');
    const toInsert = {
        id: newGuid(),
        username: user.username.trim(),
        hash,
        salt,
        firstName: capitalizeFirstLetter(user.firstName),
        lastName: capitalizeFirstLetter(user.lastName),
        lastSeen: new Date(),
        online: false,
        color: colors[Math.floor(Math.random() * colors.length)],
        avatar: '',
        createdDate: new Date()
    };

    const avatarLetters = toInsert.firstName[0] + toInsert.lastName[0];

    const inserted = await collection.insertOne(toInsert);

    if (inserted.insertedCount < 1) throw new Error("User has not been created");    
    
    return {
        id: toInsert.id,
        username: toInsert.username,
        fullName: toInsert.firstName + ' ' + toInsert.lastName,
        avatarLetters,
        color: toInsert.color,
        avatar: ''
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
                color: 1,
                avatar: 1,
                lastSeen: 1,
                online: 1
            }
        }
        const result = await collection.find(query, options).sort({"firstName": 1, "lastName": 1}).toArray();
        result.forEach(user => {
            user.fullName = `${user.firstName} ${user.lastName}`;
            user.avatarLetters = user.firstName[0] + user.lastName[0];
        })
        return result;
    }
    catch (e) {
        console.error(e);
        return null;
    } 
}

async function authenticate({ username, password }) {
    const user = await findUser(username);
    if (!user) 
        throw 'Username is incorrect'; 

    if (!user.salt || !user.hash)
        throw Error('Cannot find user');

    const computed = crypto.createHash("sha256").update(password + user.salt).digest('hex');
    if (computed !== user.hash) 
        throw 'Password is incorrect';

    const expiresIn = 60 * 60 * 24 * 365; // 1 year

    // create a jwt token for one year
    const token = jwt.sign({ sub: user.id }, config.secret, { expiresIn });

    return {
        authentication: {
            token: token,
            expiresIn
        },
        user: {
            id: user.id,
            fullName: `${user.firstName} ${user.lastName}`,
            avatarLetters: user.firstName[0] + user.lastName[0],
            color: user.color,
            avatar: user.avatar
        } 
    }
}