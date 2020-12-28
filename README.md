# messenger
Simple messenger

## Getting started

This project has two parts: nodejs server and react frontend. For convenient debugging they run independently, So, it is possible to debug server side in an IDE with the frontend running separately. 

To get the server running:

- Go to the main folder of the repo
- `npm install` to install all required dependencies
- `npm start` to start the local server

Server will use port 8080.

To get the frontend running:

- Go to `\client` folder of the repo
- `npm install` and `npm start`

Frontend will use port 3000.

React proxies requests from port 3000 to port 8080.

In file `config.json` set your own JWT secret string and Mongo DB connection string. Database 'messenger' will be created automatically. Go to http://localhost:3000/signup to add a new user. Then open another copy of that page in a private tab and create another user. Now you can start a chat by clicking the chat icon above. That's it, enjoy messaging!


