const expressJwt = require('express-jwt');
const config = require('config.json');

module.exports = jwt;

function jwt() {
    const { secret } = config;
    return expressJwt({ 
        secret, 
        algorithms: ['HS256'],
        getToken: function fromCookies(req) {
            if (req.cookies && req.cookies['authentication']){
                return req.cookies['authentication'];
            }                
            else {
                return null;
            }          

        }
     }).unless({
        path: [
            // public routes that don't require authentication
            '/api/authenticate',
            '/api/createuser',
            '/api/verify'
        ]
    });
}