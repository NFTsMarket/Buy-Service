const app = require('./server.js');
const dbConnect = require('./db');
const { initializePubSub } = require('./pubsub');

require("dotenv").config();

var port = (process.env.PORT || 3000);

console.log("Starting API server at " + port);

dbConnect().then(
    async () => {
        await initializePubSub();
        app.listen(port);
        console.log("Server ready!");
    },
    err => {
        console.log("Connection error: " + err);
    }
)