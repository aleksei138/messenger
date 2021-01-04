require('rootpath')();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
const jwt = require('helpers/jwt');
const errorHandler = require('helpers/error-handler');
const sockets = require('helpers/sockets')
const { Connection } = require('helpers/DBConnection.js')


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// use JWT auth
app.use(jwt());

// api routes
app.use('/', require('./users/users.controller'));
app.use('/', require('./chats/chats.controller'));

// global error handler
app.use(errorHandler);



// connect to DB
Connection.connect().then(db => {
    
    console.log('Connected to DB');

    // start server
    const port = process.env.NODE_ENV === 'production' ? 80 : 8080;
    const server = app.listen(port, function () {
        console.log('Server listening on port ' + port);
    });

    const io = require('socket.io')(server);

    // sockets authentification
    io.use(sockets.authentificate);

    // init sockets
    sockets.initialize(io);
    
}).catch(err => {
    console.error('Failed to connect to DB. Reason:');
    console.error(err);
});





