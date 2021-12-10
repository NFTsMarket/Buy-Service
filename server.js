var express = require('express');
var bodyParser = require('body-parser');
const Purchase = require('./purchases');
var ObjectId = require('mongoose').Types.ObjectId;

var BASE_API_PATH = "/api/v1";

var app = express();
app.use(bodyParser.json());


// TO-DO: This get to the root should return the documentation of the API
app.get("/", (req, res) => {
    res.send("<html><body><h1>Buy Service Home Page</h1></body></html>");
});


// GET all purchases API method
app.get(BASE_API_PATH + "/purchase", (req, res) => {
    console.log(Date() + " - GET /purchase/");

    // We define ordering and limiting parameters obtained from the URI
    let limitatt = (req.query["limit"] != null && !isNaN(req.query["limit"])) ? req.query["limit"] : 0;
    let offset = (req.query["offset"] != null && !isNaN(req.query["offset"])) ? req.query["offset"] : 0;
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
app.post(BASE_API_PATH + "/purchase/", (req, res) => {
    console.log(Date() + " - POST /purchase/");

    // https://www.geeksforgeeks.org/node-js-crud-operations-using-mongoose-and-mongodb-atlas/
    // https://mongoosejs.com/docs/models.html
    let amount = 0; // TODO: obtener precio del asset
    Purchase.create({
        buyerId: req.body.buyerId,
        sellerId: req.body.sellerId,
        assetId: req.body.assetId,
        amount: amount,
        state: 'Pending',
    }, function (err, purchase) {
        if (err)
            return res.status(400).json('Bad request');
        else if (purchase) {
            console.log(Date() + "- Purchase created");
            return res.status(201).json(purchase._doc);
        } else
            return res.status(500).json("Internal server error");
    });
});


// PUT a specific purchase to change its state API method
// ----------- TO-DO -------------
app.put(BASE_API_PATH + "/purchase/:id", async (req, res) => {
    console.log(Date() + " - PUT /purchase/" + req.params.id);

    // Check whether the purchase id has a correct format
    if (!ObjectId.isValid(req.params.id)) {
        console.log(Date() + "- Invalid purchase id");
        return res.status(400).json("Invalid purchase id");
    }

    // Validate purchase features values according to the schema restrictions defined
    let validationErrors = new Purchase(req.body).validateSync();
    if (validationErrors) {
        console.log(Date() + "- Invalid purchase data");
        return res.status(400).json(validationErrors.message);
    }

    // When retreaving and updating a purchase, we need to add {new: true} if we want to get the
    // updated version of the purchase as response so we can send it to the client
    // https://stackoverflow.com/questions/32811510/mongoose-findoneandupdate-doesnt-return-updated-document
    Purchase.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true }, function (err, purchase) {
        console.log(purchase);
        if (err) {
            console.log(Date() + "-" + err);
            return res.status(500).json("Internal server error");
        } else if (purchase) {
            console.log(Date() + "- Purchase updated");
            return res.status(200).json(purchase._doc);
        } else {
            console.log(Date() + "- Purchase not found");
            return res.status(404).json("Purchase not found");
        }
    });

    // TODO: communication with other APIs
});


// DELETE a specific purchase API method
// ----------- TO-DO -------------


module.exports = app;