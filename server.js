var express = require('express');
var bodyParser = require('body-parser');
const Purchase = require('./purchases');
const request = require('request');
var ObjectId = require('mongoose').Types.ObjectId;

var BASE_API_PATH = "/api/v1";

var app = express();
app.use(bodyParser.json());

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
app.get(BASE_API_PATH + "/purchase", (req, res) => {
    console.log(Date() + " - GET /purchase/");

    // We define ordering and limiting parameters obtained from the URI
    let limitatt = ("limit" in req.query && !isNaN(req.query["limit"])) ? req.query["limit"] : 0;
    let offset = ("offset" in req.query && !isNaN(req.query["offset"])) ? req.query["offset"] : 0;
    let sortatt = ("sort" in req.query) ? req.query["sort"] : null;
    let order = ("order" in req.query) ? req.query["order"] : 1;

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
            return res.status(400).json("Invalid buyer.")
    }

    if ("seller" in req.query) {
        let seller = req.query["seller"];
        if (OjectId.isValid(seller))
            filters["seller"] = seller;
        else
            return res.status(400).json("Invalid seller.")
    }

    if ("amountGte" in req.query) {
        let amountGte = req.query["amountGte"];
        if (!isNaN(amountGte))
            filters["amount"] = { "$gte": amountGte };
        else
            return res.status(400).json("Invalid 'amountGte' argument. It must be a number.")
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
        }
        else if (purchases && purchases.length < 1) {
            console.log(Date() + "- There are no purchases to show");
            return res.status(404).json("There are no purchases to show");
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
app.get(BASE_API_PATH + "/purchase/:id", (req, res) => {
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
app.post(BASE_API_PATH + "/purchase/", (req, res) => {
    console.log(Date() + " - POST /purchase/");

    if (req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null)
        return res.status(400).json({ 'status': 'missing-captcha' });
    else {
        let verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + process.env.RECAPTCHA_SECRET_KEY + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.socket.remoteAddress;

        // Hitting GET request to the URL, Google will respond with success or error scenario.
        request(verificationUrl, { json: true }, (error, response, body) => {
            // Success will be true or false depending upon captcha validation.
            if (body.success !== undefined && !body.success)
                return res.status(400).json({ 'status': 'invalid-captcha' });
            else {
                // https://www.geeksforgeeks.org/node-js-crud-operations-using-mongoose-and-mongodb-atlas/
                // https://mongoosejs.com/docs/models.html
                let amount = 0; // TODO: obtener precio del asset
                let sellerId = "61bf7d53888df2955682a7ea"; // TODO: obtener id del seller del asset
                let purchase = new Purchase({
                    buyerId: req.body.buyerId,
                    sellerId: sellerId,
                    assetId: req.body.assetId,
                    amount: amount,
                    state: 'Pending',
                });

                let validationErrors = purchase.validateSync();
                if (validationErrors)
                    return res.status(400).json(validationErrors.message);
                else
                    purchase.save((err) => {
                        if (err)
                            return res.status(400).json({ 'status': 'invalid-purchase' });
                        else {
                            console.log(Date() + " - Purchase created");
                            return res.status(201).json(purchase.cleanedPurchase());
                        }
                    });
            }
        });
    }
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
            return res.status(200).json(purchase.cleanedPurchase());
        } else {
            console.log(Date() + "- Purchase not found");
            return res.status(404).json("Purchase not found");
        }
    });

    // TODO: communication with other APIs
});


// DELETE a specific purchase API method
app.delete(BASE_API_PATH + "/purchase/:id", (req, res) => {
    console.log(Date() + " - DELETE /purchase/" + req.params.id);

    // Check whether the purchase id has a correct format
    if (ObjectId.isValid(req.params.id))
        Purchase.deleteOne({ _id: req.params.id }, (err, result) => {
            if (err)
                return res.status(500).json("Internal server error");
            else if (result.deletedCount > 0)
                return res.status(200).json("Deleted successfully");
            else
                return res.status(404).json("Purchase not found");
        });
    else
        return res.status(400).json("Invalid purchase id");
});


module.exports = app;