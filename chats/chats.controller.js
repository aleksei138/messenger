const express = require('express');
const router = express.Router();
const chatService = require('./chats.service');

router.get('/api/chats/loadchatlist', loadChatList);
router.get('/api/chats/loadchat', loadChat);
router.get('/api/chats/loadContacts', loadContacts);

module.exports = router;


async function loadChatList(req, res, next){
    const chats = await chatService.loadChatHeaders(req.user.sub);
    res.json(chats);
}

async function loadChat(req, res, next){
  const messages = await chatService.loadMessages(req.user.sub, req.query.chatId)
  res.json(messages);   
}

async function loadContacts(req, res, next) {
  const contacts = await chatService.loadContacts(req.user.sub);
  res.json(contacts);
}

