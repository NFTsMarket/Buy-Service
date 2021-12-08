var express = require('express');
var bodyParser = require('body-parser');
const Purchase = require('./purchases');

var BASE_API_PATH = "/api/v1";

var app = express();
app.use(bodyParser.json());


// TO-DO: This get to the root should return the documentation of the API
app.get("/", (req, res) => {
    res.send("<html><body><h1>Buy Service Home Page</h1></body></html>");
});


// GET all purchases API method
app.get(BASE_API_PATH + "/purchase", (req, res) => {
    console.log(Date() + " - GET /purchases");

    // We define ordering and limiting parameters obtained from the URI
    let limitatt = (req.query["limit"] != null && Number.isInteger(req.query["limit"]) ) ? req.query["limit"] : 0;
    let offset = (req.query["offset"] != null && Number.isInteger(req.query["offset"]) ) ? req.query["offset"] : 0;
    let sortatt = (req.query["sort"] != null) ? req.query["sort"] : null;
    let order = (req.query["order"] != null) ? req.query["order"] : 1;

    // Process the filters from the URI, that is, the properties from schema to filter
    let filters = req.query;
    Object.keys(filters).forEach(x => {
        if (x == "sort" || x == "order" || x == "limit" || x == "offset") {
            delete filters[x];
        }
    });

    Purchase.find(filters, null, { sort: { [sortatt]: order }, limit: parseInt(limitatt), skip: parseInt(offset) }, (err, purchases) => {
        if (purchases.length < 1) {
            console.log(Date() + "- There are no purchases to show");
            return res.status(404).json("There are no purchases to show");
        }
        else if (err) {
            console.log(Date() + "-" + err);
            return res.status(500).json("Internal server error");
        }
        else {
            let reponse = {
                'count': purchases.length,
                'purchases': purchases.map((purchase) => {
                    return purchase.cleanedPurchase();
                })
            };
            return res.status(200).json(reponse);
        }
    });
});

// GET a specific purchase API method
// ----------- TO-DO -------------


// POST a new purchase API method
// ----------- TO-DO -------------
// Use validation predefined in the schema with mongoose: https://mongoosejs.com/docs/validation.html
// You can use, for example, 'let error = badPurchase.validateSync();' wich executes the validation
// defined in the model in 'purchases.js'
// app.post(BASE_API_PATH + "/contacts", (req, res) => {
//     console.log(Date() + " - POST /contacts");
//     var contact = req.body;
//     Contact.create(contact, (err) => {
//         if (err) {
//             console.log(Date() + " - " + err);
//             res.sendStatus(500);
//         } else {
//             res.sendStatus(201);
//         }
//     });
// });


// PUT a specific purchase to change its state API method
// ----------- TO-DO -------------


// DELETE a specific purchase API method
// ----------- TO-DO -------------


// GET pending purchases of an user API method
// ----------- TO-DO -------------


// GET the history of an user purchases API method
// ----------- TO-DO -------------

module.exports = app;