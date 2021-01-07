const tasksService = require('./tasks.service');
const express = require('express');
const router = express.Router();

router.post('/api/tasks/saveImage', saveImage);
router.get('/api/tasks/image/:id', getImage);
router.get('/api/tasks/getImageList', getImageList);

module.exports = router;

async function saveImage(req, res, next) {
    const result = await tasksService.saveImage(req.body);
    res.json(result);
}

async function getImage(req, res, next) {
    const data = await tasksService.getImageData(req.params.id);
    const image = Buffer.from(data, 'base64');

    res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': image.length
     });
     
     res.end(image);
}

async function getImageList(req, res, next) {
    const result = await tasksService.getImageList();
    res.json(result);
}