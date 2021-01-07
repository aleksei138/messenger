const MongoClient = require('mongodb').MongoClient;
const config = require('config.json');

class DBConnection {
    static async connect() {
        if (this.database) 
            return this.database
        const connection = await MongoClient.connect(this.url, this.options);
        this.connection = connection;
        this.database = connection.db(config.databaseName);
        return this.database
    }
}

DBConnection.database = null
DBConnection.connection = null
DBConnection.url = config.connectionString
DBConnection.options = {
    useUnifiedTopology: true,
}

module.exports = { DBConnection }