const mongoose = require('mongoose');

const server = 'localhost:27017';
const database = 'buyService';  

const DB_URL = (process.env.MONGO_URL || `mongodb://${server}/${database}`);

const dbConnect = function() {
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error: '));
    return mongoose.connect(DB_URL, { useNewUrlParser: true });
}

module.exports = dbConnect; 