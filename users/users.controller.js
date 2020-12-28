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

function authenticate(req, res, next) {
    userService.authenticate(req.body)
        .then(user => res.json(user))
        .catch(next);
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
    else{
        res.json({ success: false});
    }
}

async function createUser(req, res, next) {
    const info = req.body;
    if (!info ||
        !info.username.trim() ||
        !info.password.trim() ||
        !info.firstName.trim() ||
        !info.lastName.trim()
        ) {
            res.status(400).send({ message: 'Empty fields'});
            return;
        }
    const existing = await userService.findUser(info.username);
    if (existing) {
        res.status(400).send({ message: 'User already exists'});
        return;
    }
    // check first and last names contain only letters
    if (/[^a-zA-Z]/.test(info.firstName) || /[^a-zA-Z]/.test(info.lastName)) {
        res.status(400).send({ message: 'First and last names shall contain letters only'});
        return;
    }
    if (info.password.trim().length < 3) {
        res.status(400).send({ message: 'Password is too short'});
        return;
    }

    if (info.password.trim() !== info.password) {
        res.status(400).send({ message: 'Password shall not begin or end with space'});
        return;
    }        

    const id = await userService.createUser(info);
    if (id) {
        userService.authenticate({username: info.username, password: info.password})
        .then(user => res.json(user))
        .catch(next);
    }
    else {
        res.status(400).send({ message: 'Something went wrong'});
    }
}

async function getLastSeen(req, res, next) {
    const lastSeen = await userService.getLastSeen(req.query.userId);
    res.json(lastSeen);
}

async function loadContacts(req, res, next) {
    const contacts = await userService.loadContacts(req.user.sub);
    res.json(contacts);
  }



