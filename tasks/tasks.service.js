const { DBConnection } = require('../helpers/DBConnection.js');

module.exports = {
    saveImage,
    getImageData,
    getImageList
}

function newGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  }


// img: {name, data}
async function saveImage(img) {
    const database = DBConnection.connection.db('tasks');
    const images = database.collection('images');
    const id = newGuid();
    await images.insertOne({
        id, 
        name: img.name,
        data: img.data.split(",")[1],
        createdDate: new Date()
    });
    return {id, name: img.name};
}

async function getImageData(id) {
    const database = DBConnection.connection.db('tasks');
    const images = database.collection('images');
    const res = await images.findOne({id});
    if (res)
        return res.data;
    else
        throw Error('File not found');
}

async function getImageList(id) {
    const database = DBConnection.connection.db('tasks');
    const images = database.collection('images');
    const res = await images.find({}, { projection: { id: 1, name: 1 } }).sort({createdDate: -1}).toArray();
    return res;
}