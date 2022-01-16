var express = require('express');
var bodyParser = require('body-parser');
const Purchase = require('./purchases');
const Product = require('./product');
const Wallet = require('./wallet');
const request = require('request');
var ObjectId = require('mongoose').Types.ObjectId;
const pubsub = require("./pubsub");
const jwt = require('jsonwebtoken');
var BASE_API_PATH = "/api/v1";

const {
    authorizedAdmin,
    authorizedClient,
} = require("./middlewares/authorized-roles");

var app = express();
app.use(bodyParser.json());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "PUT, DELETE, GET, POST")
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
        if (!(typeof buyer === "string") || ObjectId.isValid(buyer))
            filters["buyerId"] = buyer;
        else
            return res.status(400).json("Invalid buyer id.");
    }

    if ("seller" in req.query) {
        let seller = req.query["seller"];
        if (!(typeof seller === "string") || ObjectId.isValid(seller))
            filters["sellerId"] = seller;
        else
            return res.status(400).json("Invalid seller id.");
    }

    if ("amountGte" in req.query) {
        let amountGte = parseFloat(req.query["amountGte"]);
        if (!isNaN(amountGte))
            filters["amount"] = { "$gte": amountGte };
        else
            return res.status(400).json("Invalid 'amountGte' argument. It must be a number.");
    }

    if ("amountLte" in req.query) {
        let amountLte = parseFloat(req.query["amountLte"]);
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
        } else
            return res.status(200).json(purchases.map((purchase) => {
                return purchase.cleanedPurchase();
            }));
    });
});

// GET a specific purchase API method
app.get(BASE_API_PATH + "/purchase/:id", authorizedClient, (req, res) => {
    console.log(Date() + " - GET /purchase/" + req.params.id);

    const id = req.params.id;
    if (!(typeof id === "string") || !ObjectId.isValid(id))
        return res.status(400).json("Invalid purchase id");

    Purchase.findOne({ _id: id }, (err, purchase) => {
        if (err)
            return res.status(500).json("Internal server error");
        else if (purchase)
            if (purchase.buyerId == req.id || purchase.sellerId == req.id)
                return res.status(200).json(purchase.cleanedPurchase());
            else
                return res.status(401).json('Unauthorized.');
        else
            return res.status(404).json("Purchase not found");
    });
});


// POST a new purchase API method
app.post(BASE_API_PATH + "/purchase/", authorizedClient, async (req, res) => {
    console.log(Date() + " - POST /purchase/");

    const productId = req.body['productId'];
    if (!(typeof productId === "string") || !ObjectId.isValid(productId))
        return res.status(400).json("Invalid product id");

    try {
        const product = await Product.findOne({ _id: productId });
        if (!product)
            return res.status(404).json("Product not found");
        else if (req.id == product.ownerId)
            return res.status(403).json("You can not buy your own product");

        const wallet = await Wallet.findOne({ userId: req.id });
        if (!wallet || wallet.funds < product.price)
            return res.status(403).json("You don't have enough funds in your wallet");

        if (!await Purchase.exists({ productId: productId, state: 'Pending' })) {
            if (req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null)
                return res.status(400).json('Missing reCAPTCHA response.');
            else {
                let verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + process.env.RECAPTCHA_SECRET_KEY + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.socket.remoteAddress;

                request(verificationUrl, { json: true }, (error, response, body) => {
                    // Success will be true or false depending upon captcha validation.
                    if (body.success !== undefined && !body.success)
                        return res.status(401).json('Invalid reCAPTCHA response.');
                    else {
                        let purchase = new Purchase({
                            buyerId: req.id,
                            sellerId: product.ownerId,
                            productId: product._id,
                            amount: product.price,
                            state: 'Pending',
                        });

                        let validationErrors = purchase.validateSync();
                        if (validationErrors)
                            return res.status(400).json(validationErrors.message);
                        else
                            purchase.save(async (err) => {
                                if (err)
                                    return res.status(500).json("Internal server error inserting purchase in DB");
                                else {
                                    console.log(Date() + " - Purchase created");
                                    await pubsub.publishMessage('created-purchase', purchase);
                                    return res.status(201).json(purchase.cleanedPurchase());
                                }
                            });
                    }
                });
            }
        } else
            return res.status(403).json("There is already a pending purchase for this product");
    } catch (e) {
        console.error(e);
        return res.status(500).json("Internal server error.");
    }
});

// PUT a specific purchase to change its state API method
app.put(BASE_API_PATH + "/purchase/:id", authorizedClient, async (req, res) => {
    console.log(Date() + " - PUT /purchase/" + req.params.id);

    // Check whether the purchase id has a correct format
    if (!(typeof req.params.id === "string") || !ObjectId.isValid(req.params.id)) {
        console.log(Date() + " - Invalid purchase id");
        return res.status(400).json("Invalid purchase id");
    }

    Purchase.findOne({ _id: req.params.id }, async (err, purchase) => {
        if (err)
            return res.status(500).json("Internal server error");
        else if (purchase == null)
            return res.status(404).json("The purchase does not exist");
        else if (purchase.state != 'Pending')
            return res.status(400).json("The purchase is already accepted");
        else if (purchase.sellerId != req.id)
            return res.status(403).json("Unauthorized");

        purchase.state = 'Accepted';
        purchase.save(async (err) => {
            if (err)
                return res.status(500).json("Internal server error saving data to DB");
            else {
                console.log(Date() + " - Purchase accepted");
                await pubsub.publishMessage('updated-purchase', purchase);
                return res.status(200).json(purchase.cleanedPurchase());
            }
        });
    });
});


// DELETE a specific purchase API method
app.delete(BASE_API_PATH + "/purchase/:id", authorizedClient, async (req, res) => {
    console.log(Date() + " - DELETE /purchase/" + req.params.id);

    // Check whether the purchase id has a correct format
    if (!(typeof req.params.id === "string") || !ObjectId.isValid(req.params.id)) {
        console.log(Date() + " - Invalid purchase id");
        return res.status(400).json("Invalid purchase id");
    }

    Purchase.findOne({ _id: req.params.id }, async (err, purchase) => {
        if (err)
            return res.status(500).json("Internal server error");
        else if (purchase == null)
            return res.status(404).json("The purchase does not exist");
        else if (purchase.state != 'Pending')
            return res.status(400).json("The purchase is already accepted");
        else if (purchase.sellerId != req.id)
            return res.status(403).json("Unauthorized");


        purchase.remove(async (err) => {
            if (err)
                return res.status(500).json("Internal server error saving data to DB");
            else {
                console.log(Date() + " - Purchase deleted");
                await pubsub.publishMessage('deleted-purchase', purchase);
                return res.status(200).json("Purchase removed");
            }
        });
    });
});


module.exports = app;
