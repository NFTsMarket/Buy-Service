var express = require('express');
var bodyParser = require('body-parser');
const Purchase = require('./purchases');
const request = require('request');
var ObjectId = require('mongoose').Types.ObjectId;
const { publishMessage } = require("./pubsub");
const jwt = require('jsonwebtoken');
var BASE_API_PATH = "/api/v1";

const {
    authorizedAdmin,
    authorizedClient,
} = require("./middlewares/authorized-roles");

var app = express();
app.use(bodyParser.json());
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});

app.get(BASE_API_PATH + "/healthz", (req, res) => {
    res.sendStatus(200);
});

app.get("/", (req, res) => {
    res.redirect("https://app.swaggerhub.com/apis-docs/sersanleo/Buy-service/1.0.0");
});

app.get(BASE_API_PATH + "/", (req, res) => {
    res.redirect("https://app.swaggerhub.com/apis-docs/sersanleo/Buy-service/1.0.0");
});


// GET purchases API method
app.get(BASE_API_PATH + "/purchase/", authorizedClient, (req, res) => {
    console.log(Date() + " - GET /purchase/");

    // We define ordering and limiting parameters obtained from the URI
    let limitatt = ("limit" in req.query && !isNaN(req.query["limit"])) ? req.query["limit"] : 0;
    let offset = ("offset" in req.query && !isNaN(req.query["offset"]) && req.query["offset"] >= 0) ? req.query["offset"] : 0;
    let sortatt = ("sort" in req.query) ? req.query["sort"] : null;
    let order = ("order" in req.query && req.query["order"] in [-1, 1]) ? req.query["order"] : 1;

    // Process the filters from the URI, that is, the properties from schema to filter
    let filters = {};
    if ("before" in req.query) {
        let date = new Date(req.query["before"]);
        if (!isNaN(date))
            filters["createdAt"] = { "$lte": date };
        else
            return res.status(400).json("Invalid 'before' argument. It must be in UTC format.")
    }

    if ("after" in req.query) {
        let date = new Date(req.query["after"]);
        if (!isNaN(date)) {
            let createdAt;
            if ("createdAt" in filters)
                createdAt = filters["createdAt"];
            else
                filters["createdAt"] = (createdAt = {});
            filters["createdAt"]["$gte"] = date;
        } else
            return res.status(400).json("Invalid 'after' argument. It must be in UTC format.")
    }

    // TODO: En estos dos, cuando haya autenticación, tal vez habría que devolver error 403
    if ("buyer" in req.query) {
        let buyer = req.query["buyer"];
        if (OjectId.isValid(buyer))
            filters["buyer"] = buyer;
        else
            return res.status(400).json("Invalid buyer.");
    }

    if ("seller" in req.query) {
        let seller = req.query["seller"];
        if (OjectId.isValid(seller))
            filters["seller"] = seller;
        else
            return res.status(400).json("Invalid seller.");
    }

    if ("amountGte" in req.query) {
        let amountGte = req.query["amountGte"];
        if (!isNaN(amountGte))
            filters["amount"] = { "$gte": amountGte };
        else
            return res.status(400).json("Invalid 'amountGte' argument. It must be a number.");
    }

    if ("amountLte" in req.query) {
        let amountLte = req.query["amountLte"];
        if (!isNaN(amountLte)) {
            let amount;
            if ("amount" in filters)
                amount = filters["amount"];
            else
                filters["amount"] = (amount = {});
            amount["$lte"] = amountLte;
        } else
            return res.status(400).json("Invalid 'amountLte' argument. It must be a number.")
    }

    if ("state" in req.query)
        filters["state"] = req.query["state"];

    Purchase.find(filters, null, { sort: { [sortatt]: order }, limit: parseInt(limitatt), skip: parseInt(offset) }, (err, purchases) => {
        if (err) {
            console.log(Date() + "-" + err);
            return res.status(500).json("Internal server error");
        } else if (purchases && purchases.length < 1) {
            console.log(Date() + "- There are no purchases to show");
            return res.status(404).json("There are no purchases to show");
        } else
            return res.status(200).json(purchases.map((purchase) => {
                return purchase.cleanedPurchase();
            }));
    });
});

// GET a specific purchase API method
app.get(BASE_API_PATH + "/purchase/:id", authorizedClient, (req, res) => {
    console.log(Date() + " - GET /purchase/" + req.params.id);

    // Check whether the purchase id has a correct format
    if (ObjectId.isValid(req.params.id))
        Purchase.findOne({ _id: req.params.id }, (err, purchase) => {
            if (err)
                return res.status(500).json("Internal server error");
            else if (purchase)
                return res.status(200).json(purchase.cleanedPurchase());
            else
                return res.status(404).json("Purchase not found");
        });
    else
        return res.status(400).json("Invalid purchase id");
});


// POST a new purchase API method
app.post(BASE_API_PATH + "/purchase/", authorizedClient, (req, res) => {
    console.log(Date() + " - POST /purchase/");

    // Comprobar que no existe compra pendiente
    Purchase.findOne({ productId: req.params.productId, state: 'Pending' }, (err, purchase) => {
        if (err)
            return res.status(500).json("Internal server error");
        else if (purchase)
            return res.status(403).json("There is already a pending purchase for this product");

        if (req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null)
            return res.status(400).json({ 'status': 'missing-captcha' });
        else {
            let verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + process.env.RECAPTCHA_SECRET_KEY + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.socket.remoteAddress;

            request(verificationUrl, { json: true }, (error, response, body) => {
                // Success will be true or false depending upon captcha validation.
                if (body.success !== undefined && !body.success)
                    return res.status(400).json({ 'status': 'invalid-captcha' });
                else {

                    let buyerId = "61bf7d53888df2955682a7ea"; // TODO: cogerlo del token
                    let sellerId = "61bf7d53888df2955682a7ea"; // TODO: llamar a la API de product, si existe el product, traerlo y coger el seller. Sino existe, lanzar 404
                    let amount = 0; // TODO: llamar api de product
                    let purchase = new Purchase({
                        buyerId: buyerId,
                        sellerId: sellerId,
                        productId: req.body.productId,
                        amount: amount,
                        state: 'Pending',
                    });

                    let validationErrors = purchase.validateSync();
                    if (validationErrors)
                        return res.status(400).json(validationErrors.message);
                    else
                        purchase.save((err) => {
                            if (err)
                                return res.status(500).json("Internal server error");
                            else {
                                console.log(Date() + " - Purchase created");
                                publishMessage('created-purchase', purchase);
                                return res.status(201).json(purchase.cleanedPurchase());
                            }
                        });
                }
            });
        }
    });
});


// PUT a specific purchase to change its state API method
app.put(BASE_API_PATH + "/purchase/:id", authorizedClient, async (req, res) => {
    console.log(Date() + " - PUT /purchase/" + req.params.id);

    // Check whether the purchase id has a correct format
    if (!ObjectId.isValid(req.params.id)) {
        console.log(Date() + " - Invalid purchase id");
        return res.status(400).json("Invalid purchase id");
    }

    Purchase.findOne({ _id: req.params.purchaseId }, (err, purchase) => {
        if (err)
            return res.status(500).json("Internal server error");
        else if (purchase == null)
            return res.status(404).json("The purchase does not exist");
        else if (purchase.state != 'Pending')
            return res.status(400).json("The purchase is already accepted");

        // TODO: comprobar que eres el seller
        if (true) {
            purchase.state = 'Accepted';
            purchase.save((err) => {
                if (err)
                    return res.status(500).json("Internal server error");
                else {
                    console.log(Date() + " - Purchase accepted");
                    publishMessage('updated-purchase', purchase);
                    return res.status(200).json(purchase.cleanedPurchase());
                }
            });
        }
    });
});


// DELETE a specific purchase API method
app.delete(BASE_API_PATH + "/purchase/:id", authorizedClient, (req, res) => {
    console.log(Date() + " - DELETE /purchase/" + req.params.id);

    // Check whether the purchase id has a correct format
    if (!ObjectId.isValid(req.params.id)) {
        console.log(Date() + " - Invalid purchase id");
        return res.status(400).json("Invalid purchase id");
    }

    Purchase.findOne({ _id: req.params.purchaseId }, (err, purchase) => {
        if (err)
            return res.status(500).json("Internal server error");
        else if (purchase == null)
            return res.status(404).json("The purchase does not exist");
        else if (purchase.state != 'Pending')
            return res.status(400).json("The purchase is already accepted");

        // TODO: comprobar que eres el seller
        if (true) {
            purchase.remove((err) => {
                if (err)
                    return res.status(500).json("Internal server error");
                else {
                    console.log(Date() + " - Purchase deleted");
                    publishMessage('deleted-purchase', purchase);
                    return res.status(200).json("Purchase removed");
                }
            });
        }
    });
});


module.exports = app;
