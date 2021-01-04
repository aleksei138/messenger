const MongoClient = require('mongodb').MongoClient;
const config = require('config.json');

class Connection {
    static async connect() {
        if (this.db) 
            return this.db
        const connection = await MongoClient.connect(this.url, this.options);
        this.db = connection.db(config.databaseName);
        return this.db
    }
}

Connection.db = null
Connection.url = config.connectionString
Connection.options = {
    useUnifiedTopology: true,
}

module.exports = { Connection }