const express = require('express');
const router = express.Router();
const userService = require('./users.service');
const jwt = require('jsonwebtoken');
const config = require('config.json');

// routes
router.post('/api/authenticate', authenticate);
router.post('/api/createuser', createUser);

router.get('/api/verify', verify)
router.get('/api/getLastSeen', getLastSeen)


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
    const id = await userService.createUser(req.body);
    if (id) {
        userService.authenticate({username: req.body.username, password: req.body.password})
        .then(user => res.json(user))
        .catch(next);
    }
    else {
        res.status(400).send('something went wrong');
    }
}

async function getLastSeen(req, res, next) {
    const lastSeen = await userService.getLastSeen(req.query.userId);
    res.json(lastSeen);
}



