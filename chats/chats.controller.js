const express = require('express');
const router = express.Router();
const chatService = require('./chats.service');

router.get('/api/chats/loadchatlist', loadChatList);
router.get('/api/chats/loadchat', loadChat);
router.post('/api/chats/createNewGroupChat', createNewGroupChat);
router.get('/api/chats/getChatInfo', getChatInfo);
router.get('/api/chats/findChatParticipants', findChatParticipants);
router.post('/api/chats/sendMessage', sendMessage);
router.get('/api/chats/deleteOrLeaveChat', deleteOrLeaveChat);



module.exports = router;


async function loadChatList(req, res, next){
    const chats = await chatService.loadChatHeaders(req.user.sub);
    res.json(chats);
}

async function loadChat(req, res, next){
  const messages = await chatService.loadMessages(req.user.sub, req.query.chatId)
  res.json(messages);   
}

async function createNewGroupChat(req, res, next) {
  const body = req.body;
  const result = await chatService.createNewGroupChat(req.user.sub, body.participants, body.title);
  res.json(result);
}

async function getChatInfo(req, res, next) {
  const result = await chatService.getChatInfo(req.user.sub, req.query.chatId);
  res.json(result);
}

async function findChatParticipants(req, res, next) {
  const result = await chatService.findChatParticipants(req.query.chatId, true);
  res.json(result);
}

async function sendMessage(req, res, next) {
  const result = await chatService.sendMessage(req.body, req.user.sub);
  res.json(result);
}

async function deleteOrLeaveChat(req, res, next) {
  const result = await chatService.deleteOrLeaveChat(req.query.chatId, req.user.sub);
  res.json(result);
}