const app = require('./server.js');
const Subscriptions = require("./subscriptions");
const subscriptions = new Subscriptions();
const dbConnect = require('./db');

require("dotenv").config();

var port = (process.env.PORT || 3000);

console.log("Starting API server at " + port);

dbConnect().then(
    () => {
        subscriptions.initialize();
        subscriptions.execute();
        app.listen(port);
        console.log("Server ready!");
    },
    err => {
        console.log("Connection error: " + err);
    }
)