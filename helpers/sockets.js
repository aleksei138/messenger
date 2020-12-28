const config = require('config.json');
const jwt = require('jsonwebtoken');

module.exports = {
    authentificate
};

function authentificate(socket, next){
    const { secret } = config;
    if (socket.handshake.query && socket.handshake.query.token){
        jwt.verify(socket.handshake.query.token, secret, function(err, decoded) {
          if (err) return next(new Error('Authentication error'));
          socket.decoded = decoded;
          next();
        });
    }
    else {
        next(new Error('Authentication error'));
    } 
}