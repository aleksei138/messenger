const express = require('express');
const router = express.Router();
const userService = require('./users.service');
const jwt = require('jsonwebtoken');
const config = require('config.json');

// routes
router.post('/api/authenticate', authenticate);
router.post('/api/createuser', createUser);

router.get('/api/verify', verify);
router.get('/api/getLastSeen', getLastSeen);
router.get('/api/chats/loadContacts', loadContacts);


module.exports = router;

async function authenticate(req, res, next) {
    try {
        const authInfo = await userService.authenticate(req.body);
        res.json(authInfo);
    }
    catch (err) {
        next(err);
    }
}

// verify JWT
function verify(req, res){
    if (req.cookies && req.cookies['authorization']){
        const { secret } = config;
        var decoded = jwt.verify(req.cookies['authorization'], secret);
        var result = {
            userId: null,
            isValid: false
        };
        if (decoded && decoded.sub && decoded.exp){
            var date = new Date(decoded.exp * 1000);
            var now = new Date();
            if (date > now)
                result.isValid = true;
            result.userId = decoded.sub;
        }
        res.json(result);
    }
    else {
        res.json({ success: false});
    }
}

async function createUser(req, res, next) {
    try {
        const info = req.body;
        if (!info ||
            !info.username.trim() ||
            !info.password.trim() ||
            !info.firstName.trim() ||
            !info.lastName.trim()
            ) {
                throw new Error('Empty fields');
            }
        const existing = await userService.findUser(info.username);

        if (existing) throw new Error('User already exists');

        // check first and last names contain only letters
        if (/[^a-zA-Z]/.test(info.firstName) || /[^a-zA-Z]/.test(info.lastName)) throw new Error('First and last names shall contain letters only');

        if (info.password.trim().length < 3) throw new Error('Password is too short');

        if (info.password.trim() !== info.password) throw new Error('Password must not begin or end with space');  

        const user = await userService.createUser(info);
        if (!user) throw Error('Something went wrong');

        const authInfo = await userService.authenticate({username: info.username, password: info.password});
        res.json(authInfo);
    }
    catch (err) {
        next(err);
    }
    
}

async function getLastSeen(req, res, next) {
    try {
        const lastSeen = await userService.getLastSeen(req.query.userId);
        if (!lastSeen) throw Error('Cannot get lastSeen')
        res.json(lastSeen);
    }
    catch (err) {
        next(err);
    }    
}

async function loadContacts(req, res, next) {
    try {
        const contacts = await userService.loadContacts(req.user.sub);
        if (!contacts) throw Error('Cannot get contacts')
        res.json(contacts);
    }
    catch (err) {
        next(err);
    }
    
}



