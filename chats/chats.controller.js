const express = require('express');
const router = express.Router();
const chatService = require('./chats.service');

router.get('/api/chats/loadchatlist', loadChatList);
router.get('/api/chats/loadchat', loadChat);
router.post('/api/chats/createNewGroupChat', createNewGroupChat);
router.get('/api/chats/getChatInfo', getChatInfo);
router.post('/api/chats/sendMessage', sendMessage);
router.get('/api/chats/deleteOrLeaveChat', deleteOrLeaveChat);

module.exports = router;

async function loadChatList(req, res, next) {
  try {
    const chats = await chatService.loadChatHeaders(req.user.sub);
    if (!chats) throw Error('Cannot get chats')
    res.json(chats);
  }
  catch (err) {
    next(err)
  }  
}

async function loadChat(req, res, next) {
  try {
    const messages = await chatService.loadMessages(req.user.sub, req.query.chatId)
    if (!messages) throw Error('Cannot get messages')
    res.json(messages);
  }
  catch (err) {
    next(err)
  }
  
}

async function createNewGroupChat(req, res, next) {
  try {
    const body = req.body;
    const result = await chatService.createNewGroupChat(req.user.sub, body.participants, body.title);
    if (!result) throw Error('Cannot create new group chat')
    res.json(result);
  }
  catch (err) {
    next(err)
  }
  
}

async function getChatInfo(req, res, next) {
  try {
    const result = await chatService.getChatInfo(req.user.sub, req.query.chatId);
    if (!result) throw Error('Cannot get chat info')
    res.json(result);
  }
  catch (err) {
    next(err)
  }
  
}

async function sendMessage(req, res, next) {
  try {
    const result = await chatService.sendMessage(req.body, req.user.sub);
    res.json(result);
  }
  catch (err) {
    console.error(err);
    next(err);
  }
}

async function deleteOrLeaveChat(req, res, next) {
  try {
    const result = await chatService.deleteOrLeaveChat(req.query.chatId, req.user.sub);
    if (!result) throw Error('Cannot delete or leave chat')
    res.json(result);
  }
  catch (err) {
    next(err)
  }  
}
