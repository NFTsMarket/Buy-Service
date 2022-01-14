const app = require("../server.js");
const request = require("supertest");
const Purchase = require('../purchases.js');
const jwt = require("jsonwebtoken");
const pubsubs = require("../pubsub");

var BASE_API_PATH = "/api/v1";

describe("Buy service API", () => {

    let jwtToken;
    let purchases;

    beforeAll(() => {
        process.env["SECRET_KEY"] = 'secret_key';
        // RECAPTCHA_SECRET_KEY: '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe',

        jwtToken = jwt.sign({ "id": "61e146528daf121153272257", "email": "juaaloval@gmail.com", "role": "client" }, process.env.SECRET_KEY);

        require("dotenv").config();

        purchases = [
            new Purchase({
                buyerId: "61bf5695b57c6e0471c7147b",
                sellerId: "61e012758daf12115327224d",
                productId: "61e048908daf12115327224e",
                amount: 37,
                state: "Pending"
            }),
            new Purchase({
                buyerId: "61e048998daf12115327224f",
                sellerId: "61e048a38daf121153272250",
                productId: "61e048aa8daf121153272251",
                amount: 25,
                state: "Pending"
            }),
            new Purchase({
                buyerId: "61e048b08daf121153272252",
                sellerId: "61e048ba8daf121153272253",
                productId: "61e048e08daf121153272254",
                amount: 30,
                state: "Accepted"
            })
        ];
    });

    describe("GET /", () => {
        it("should redirect", () => {
            return request(app).get("/").then((response) => {
                expect(response.status).toBe(302);
                expect(response.headers).toHaveProperty('location');
            })
        });
    });

    describe("GET " + BASE_API_PATH + "/healthz", () => {
        it("should return 200 OK", () => {
            return request(app).get(BASE_API_PATH + "/healthz").then((response) => {
                expect(response.status).toBe(200);
            })
        });
    });

    describe("GET " + BASE_API_PATH + "/", () => {
        it("should redirect", () => {
            return request(app).get(BASE_API_PATH + "/").then((response) => {
                expect(response.status).toBe(302);
                expect(response.headers).toHaveProperty('location');
            })
        });
    });

    // ---------------------------------------------------------------------------------------------------------------------------------
    // ---------------------------------------------------------------------------------------------------------------------------------

    describe("GET " + BASE_API_PATH + "/purchase/", () => {
        beforeAll(() => {
            dbFind = jest.spyOn(Purchase, "find");
        });

        it("should return list of purchases in DB", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get(BASE_API_PATH + "/purchase/").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.body).toHaveLength(3);
            })
        });

        it("should return 400 error invalid 'before' argument", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get(BASE_API_PATH + "/purchase?before=invalid_value").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(400);
                expect(response.body).toBe("Invalid 'before' argument. It must be in UTC format.");
            })
        });

        it("should return purchases with valid 'before' argument", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get(BASE_API_PATH + "/purchase?before=2024-03-21").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.body).toHaveLength(3);
            })
        });

        it("should return 400 error invalid 'after' argument", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get(BASE_API_PATH + "/purchase?after=invalid_value").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(400);
                expect(response.body).toBe("Invalid 'after' argument. It must be in UTC format.");
            })
        });

        it("should return purchases with valid 'after' argument", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get(BASE_API_PATH + "/purchase?after=1990-03-21").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.body).toHaveLength(3);
            })
        });

        it("should return 400 error invalid buyer", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get(BASE_API_PATH + "/purchase?buyer=invalid_id").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(400);
                expect(response.body).toBe("Invalid buyer.");
            })
        });

        it("should return purchases with valid buyer", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get(BASE_API_PATH + "/purchase?buyer=61e012398daf12115327224b").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.body).toHaveLength(3);
            })
        });

        it("should return 400 error invalid seller", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get(BASE_API_PATH + "/purchase?seller=invalid_id").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(400);
                expect(response.body).toBe("Invalid seller.");
            })
        });

        it("should return purchases with valid seller", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get(BASE_API_PATH + "/purchase?seller=61e012398daf12115327224b").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.body).toHaveLength(3);
            })
        });

        it("should return 400 error invalid 'amountGte' argument", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get(BASE_API_PATH + "/purchase?amountGte=NaN").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(400);
                expect(response.body).toBe("Invalid 'amountGte' argument. It must be a number.");
            })
        });

        it("should return purchases with valid 'amountGte' argument", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get(BASE_API_PATH + "/purchase?amountGte=10").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.body).toHaveLength(3);
            })
        });

        it("should return 400 error invalid 'amountLte' argument", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get(BASE_API_PATH + "/purchase?amountLte=NaN").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(400);
                expect(response.body).toBe("Invalid 'amountLte' argument. It must be a number.");
            })
        });

        it("should return purchases with valid 'amountLte' argument", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get(BASE_API_PATH + "/purchase?amountLte=50").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.body).toHaveLength(3);
            })
        });

        it("should return 200 no purchases", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, []);
            });

            return request(app).get(BASE_API_PATH + "/purchase/").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.body).toHaveLength(0);


            })
        });

        it("should return 500 error", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(true, null);
            });

            return request(app).get(BASE_API_PATH + "/purchase/").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(500);
                expect(response.body).toBe("Internal server error");

            })
        });
    });

    // ---------------------------------------------------------------------------------------------------------------------------------
    // ---------------------------------------------------------------------------------------------------------------------------------

    describe("GET " + BASE_API_PATH + "/purchase/:id", () => {
        beforeAll(() => {
            dbFind = jest.spyOn(Purchase, "findOne");
        });

        it("should return a purchase in DB", () => {
            dbFind.mockImplementation((query, callback) => {
                callback(null, purchases[0]);
            });

            return request(app).get(BASE_API_PATH + "/purchase/61e012398daf12115327224b").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.body["buyerId"]).toEqual("61bf5695b57c6e0471c7147b");
                expect(Object.keys(response.body).length).toEqual(6);
            })
        });

        it("should return 400 error: invalid id", () => {
            dbFind.mockImplementation((query, callback) => {
                callback(null, null);
            });

            return request(app).get(BASE_API_PATH + "/purchase/invalid_id").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(400);
                expect(response.body).toBe("Invalid purchase id");
            })
        });

        it("should return 404 error", () => {
            dbFind.mockImplementation((query, callback) => {
                callback(null, null);
            });

            return request(app).get(BASE_API_PATH + "/purchase/61e012398daf12115327224b").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(404);
                expect(response.body).toBe("Purchase not found");

            })
        });

        it("should return 500 error", () => {
            dbFind.mockImplementation((query, callback) => {
                callback(true, null);
            });

            return request(app).get(BASE_API_PATH + "/purchase/61e012398daf12115327224b").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(500);
                expect(response.body).toBe("Internal server error");

            })
        });
    });

    // ---------------------------------------------------------------------------------------------------------------------------------
    // ---------------------------------------------------------------------------------------------------------------------------------

    // JWT tests, works the same for every endpoint (they use the same function) so we just test it on one of them
    describe("JWT authentication tests", () => {
        beforeAll(() => {
            dbFind = jest.spyOn(Purchase, "find");
        });

        it("should return 401 error: token not provided", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get(BASE_API_PATH + "/purchase/").then((response) => {
                expect(response.statusCode).toBe(401);
                expect(response.body["msg"]).toBe("Token is not provided");
            })
        });

        it("should return 401 error: malformed JWT token", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get(BASE_API_PATH + "/purchase/").set("Authorization", "invalid_token").then((response) => {
                expect(response.statusCode).toBe(401);
                expect(response.body["msg"]).toBe("The provided JWT is malformed");
            })
        });
    });

    // ---------------------------------------------------------------------------------------------------------------------------------
    // ---------------------------------------------------------------------------------------------------------------------------------

    describe("POST " + BASE_API_PATH + "/purchase/", () => {
        
        beforeAll(() => {
            dbFindOne = jest.spyOn(Purchase, "findOne");
            dbSave = jest.spyOn(Purchase.prototype, "save");

            const addMock = jest.spyOn(pubsubs, "publishMessage");
            addMock.mockImplementation( (query)=>{
                return true;
            });
            
        });

        it("should return 500 internal server error", () => {
            dbFindOne.mockImplementation((query, callback) => {
                callback(true, null);
            });

            return request(app).post(BASE_API_PATH + "/purchase/").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(500);
                expect(response.body).toBe("Internal server error");
            })
        });

        it("should return 403 error: purchase already exist", () => {
            dbFindOne.mockImplementation((query, callback) => {
                callback(null, []);
            });

            return request(app).post(BASE_API_PATH + "/purchase/").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(403);
                expect(response.body).toBe("There is already a pending purchase for this product");
            })
        });

        it("should return 400 error: missing captcha", () => {
            dbFindOne.mockImplementation((query, callback) => {
                callback(null, null);
            });

            return request(app).post(BASE_API_PATH + "/purchase/").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(400);
                expect(response.body["status"]).toBe('missing-captcha');
            })
        });

        // --------------------------------------------------------------------------
        // This test is commented in order to not exceed our reCAPTCHA free use limit
        // --------------------------------------------------------------------------
        // it("should return 400 error: invalid captcha", () => {
        //     dbFindOne.mockImplementation((query, callback) => {
        //         callback(null, null);
        //     });

        //     return request(app).post(BASE_API_PATH + "/purchase/").set("Authorization", jwtToken).send({"g-recaptcha-response": "invalid_captcha"})
        //     .then((response) => {
        //         expect(response.statusCode).toBe(400);
        //         expect(response.body["status"]).toBe('invalid-captcha');
        //     })
        // });

        it("should insert purchase in DB", () => {
            dbSave.mockImplementation((callback) => {
                callback(null);
            });

            process.env['RECAPTCHA_SECRET_KEY'] = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

            let messageBody = {
                "g-recaptcha-response": "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
                "productId": "61e146528daf121153272256"
            };

            return request(app).post(BASE_API_PATH + "/purchase/").set("Authorization", jwtToken).send(messageBody)
            .then((response) => {
                expect(response.statusCode).toBe(201);
                expect(response.body["productId"]).toEqual("61e146528daf121153272256");
                expect(Object.keys(response.body).length).toEqual(6);
            })
        });

        it("should return 500 error inserting in DB", () => {
            dbSave.mockImplementation((callback) => {
                callback(true);
            });

            let messageBody = {
                "g-recaptcha-response": "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
                "productId": "61e146528daf121153272256"
            };

            return request(app).post(BASE_API_PATH + "/purchase/").set("Authorization", jwtToken).send(messageBody)
            .then((response) => {
                expect(response.statusCode).toBe(500);
                expect(response.body).toEqual("Internal server error inserting purchase in DB");
            })
        });

        it("should return 400 error: invalid productId", () => {
            dbSave.mockImplementation((callback) => {
                callback(null);
            });

            let messageBody = {
                "g-recaptcha-response": "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
                "productId": "invalid_productId"
            };

            return request(app).post(BASE_API_PATH + "/purchase/").set("Authorization", jwtToken).send(messageBody)
            .then((response) => {
                console.log(response.body);
                expect(response.statusCode).toBe(400);
                expect(response.body.split('"')[0]).toBe("Purchase validation failed: productId: Cast to ObjectId failed for value ");
            })
        });
        
        it("should return 400 error: missing productId", () => {
            dbSave.mockImplementation((callback) => {
                callback(null);
            });

            let messageBody = {
                "g-recaptcha-response": "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
            };

            return request(app).post(BASE_API_PATH + "/purchase/").set("Authorization", jwtToken).send(messageBody)
            .then((response) => {
                console.log(response.body);
                expect(response.statusCode).toBe(400);
                expect(response.body).toBe("Purchase validation failed: productId: The purchase must have a product to be purchased");
            })
        });

        it("should return 400 error: invalid buyerId", () => {
            dbSave.mockImplementation((callback) => {
                callback(null);
            });

            let badjwtToken = jwt.sign({ "id": "invalid_id", "email": "juaaloval@gmail.com", "role": "client" }, process.env.SECRET_KEY);

            let messageBody = {
                "g-recaptcha-response": "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
                "productId": "61e146528daf121153272256"
            };

            return request(app).post(BASE_API_PATH + "/purchase/").set("Authorization", badjwtToken).send(messageBody)
            .then((response) => {
                console.log(response.body);
                expect(response.statusCode).toBe(400);
                expect(response.body).toBe('Purchase validation failed: buyerId: Cast to ObjectId failed for value \"invalid_id\" (type string) at path \"buyerId\"');
            })
        });
    });

    // ---------------------------------------------------------------------------------------------------------------------------------
    // ---------------------------------------------------------------------------------------------------------------------------------

    describe("PUT " + BASE_API_PATH + "/purchase/:id", () => {

        beforeAll(() => {
            dbFindOne = jest.spyOn(Purchase, "findOne");
            dbSave = jest.spyOn(Purchase.prototype, "save");

            const addMock = jest.spyOn(pubsubs, "publishMessage");
            addMock.mockImplementation( (query)=>{
                return true;
            });
            
        });

        it("should return 400 error: invalid purchase id", () => {

            return request(app).put(BASE_API_PATH + "/purchase/invalid_purchase_id").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(400);
                expect(response.body).toBe("Invalid purchase id");
            })
        });

        it("should return 500 error", () => {
            dbFindOne.mockImplementation((query, callback) => {
                callback(true, null);
            });

            return request(app).put(BASE_API_PATH + "/purchase/61e012398daf12115327224b").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(500);
                expect(response.body).toBe("Internal server error");

            })
        });

        
        it("should return 400 error: purchased already accepted", () => {
            dbFindOne.mockImplementation((query, callback) => {
                callback(null, 
                    {
                        id: '61e012398daf12115327224b',
                        buyerId: '61bf7d53888df2955682a7ea',
                        sellerId: '61e146528daf121153272257',
                        productId: '61e146528daf121153272256',
                        amount: 0,
                        state: 'Accepted'
                      }
                  );
            });

            return request(app).put(BASE_API_PATH + "/purchase/61e012398daf12115327224b").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(400);
                expect(response.body).toBe("The purchase is already accepted");

            })
        });

        it("should return 403 error: unauthorised", () => {
            dbFindOne.mockImplementation((query, callback) => {
                callback(null, 
                    {
                        id: '61e012398daf12115327224b',
                        buyerId: '61bf7d53888df2955682a7ea',
                        sellerId: '61e146528daf121153272257',
                        productId: '61e146528daf121153272256',
                        amount: 0,
                        state: 'Pending'
                      }
                  );
            });

            let badjwtToken = jwt.sign({ "id": "61bf7d53888df2955682a7ea", "email": "juaaloval@gmail.com", "role": "client" }, process.env.SECRET_KEY);

            return request(app).put(BASE_API_PATH + "/purchase/61e012398daf12115327224b").set("Authorization", badjwtToken).then((response) => {
                expect(response.statusCode).toBe(403);
                expect(response.body).toBe("Unauthorized");

            })
        });

        it("should return 404 error: purchase does not exist", () => {
            dbFindOne.mockImplementation((query, callback) => {
                callback(null, null);
            });

            return request(app).put(BASE_API_PATH + "/purchase/61e012398daf12115327224b").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(404);
                expect(response.body).toBe("The purchase does not exist");

            })
        });

        it("should return 500 error updating the purchase in DB", () => {

            dbFindOne.mockImplementation((query, callback) => {
                callback(null, 
                    new Purchase({
                        id: '61e012398daf12115327224b',
                        buyerId: '61bf7d53888df2955682a7ea',
                        sellerId: '61e146528daf121153272257',
                        productId: '61e146528daf121153272256',
                        amount: 0,
                        state: 'Pending'
                      })
                  );
            });

            dbSave.mockImplementation((callback) => {
                callback(true);
            });

            return request(app).put(BASE_API_PATH + "/purchase/61e012398daf12115327224b").set("Authorization", jwtToken).then((response) => {
                console.log(response.body);
                expect(response.statusCode).toBe(500);
                expect(response.body).toBe("Internal server error saving data to DB");

            })
        });

        it("should update the purchase in DB", () => {

            dbFindOne.mockImplementation((query, callback) => {
                callback(null, 
                    new Purchase({
                        id: '61e012398daf12115327224b',
                        buyerId: '61bf7d53888df2955682a7ea',
                        sellerId: '61e146528daf121153272257',
                        productId: '61e146528daf121153272256',
                        amount: 0,
                        state: 'Pending'
                      })
                  );
            });

            dbSave.mockImplementation((callback) => {
                callback(null);
            });

            return request(app).put(BASE_API_PATH + "/purchase/61e012398daf12115327224b").set("Authorization", jwtToken).then((response) => {
                console.log(response.body);
                expect(response.statusCode).toBe(200);
                expect(response.body["productId"]).toEqual("61e146528daf121153272256");
                expect(Object.keys(response.body).length).toEqual(6);
            })
        });
    });

    // ---------------------------------------------------------------------------------------------------------------------------------
    // ---------------------------------------------------------------------------------------------------------------------------------

    describe("DELETE " + BASE_API_PATH + "/purchase/:id", () => {

        beforeAll(() => {
            dbFindOne = jest.spyOn(Purchase, "findOne");
            dbRemove = jest.spyOn(Purchase.prototype, "remove");

            const addMock = jest.spyOn(pubsubs, "publishMessage");
            addMock.mockImplementation( (query)=>{
                return true;
            });
            
        });

        it("should return 400 error: invalid purchase id", () => {

            return request(app).delete(BASE_API_PATH + "/purchase/invalid_purchase_id").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(400);
                expect(response.body).toBe("Invalid purchase id");
            })
        });

        it("should return 500 error", () => {
            dbFindOne.mockImplementation((query, callback) => {
                callback(true, null);
            });

            return request(app).delete(BASE_API_PATH + "/purchase/61e012398daf12115327224b").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(500);
                expect(response.body).toBe("Internal server error");

            })
        });

        
        it("should return 400 error: purchased already accepted", () => {
            dbFindOne.mockImplementation((query, callback) => {
                callback(null, 
                    {
                        id: '61e012398daf12115327224b',
                        buyerId: '61bf7d53888df2955682a7ea',
                        sellerId: '61e146528daf121153272257',
                        productId: '61e146528daf121153272256',
                        amount: 0,
                        state: 'Accepted'
                      }
                  );
            });

            return request(app).delete(BASE_API_PATH + "/purchase/61e012398daf12115327224b").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(400);
                expect(response.body).toBe("The purchase is already accepted");

            })
        });

        it("should return 403 error: unauthorised", () => {
            dbFindOne.mockImplementation((query, callback) => {
                callback(null, 
                    {
                        id: '61e012398daf12115327224b',
                        buyerId: '61bf7d53888df2955682a7ea',
                        sellerId: '61e146528daf121153272257',
                        productId: '61e146528daf121153272256',
                        amount: 0,
                        state: 'Pending'
                      }
                  );
            });

            let badjwtToken = jwt.sign({ "id": "61bf7d53888df2955682a7ea", "email": "juaaloval@gmail.com", "role": "client" }, process.env.SECRET_KEY);

            return request(app).delete(BASE_API_PATH + "/purchase/61e012398daf12115327224b").set("Authorization", badjwtToken).then((response) => {
                expect(response.statusCode).toBe(403);
                expect(response.body).toBe("Unauthorized");

            })
        });

        it("should return 404 error: purchase does not exist", () => {
            dbFindOne.mockImplementation((query, callback) => {
                callback(null, null);
            });

            return request(app).delete(BASE_API_PATH + "/purchase/61e012398daf12115327224b").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(404);
                expect(response.body).toBe("The purchase does not exist");

            })
        });

        it("should return 500 error deleting the purchase in DB", () => {

            dbFindOne.mockImplementation((query, callback) => {
                callback(null, 
                    new Purchase({
                        id: '61e012398daf12115327224b',
                        buyerId: '61bf7d53888df2955682a7ea',
                        sellerId: '61e146528daf121153272257',
                        productId: '61e146528daf121153272256',
                        amount: 0,
                        state: 'Pending'
                      })
                  );
            });

            dbRemove.mockImplementation((callback) => {
                callback(true);
            });

            return request(app).delete(BASE_API_PATH + "/purchase/61e012398daf12115327224b").set("Authorization", jwtToken).then((response) => {
                console.log(response.body);
                expect(response.statusCode).toBe(500);
                expect(response.body).toBe("Internal server error saving data to DB");

            })
        });

        it("should delete the purchase in DB", () => {

            dbFindOne.mockImplementation((query, callback) => {
                callback(null, 
                    new Purchase({
                        id: '61e012398daf12115327224b',
                        buyerId: '61bf7d53888df2955682a7ea',
                        sellerId: '61e146528daf121153272257',
                        productId: '61e146528daf121153272256',
                        amount: 0,
                        state: 'Pending'
                      })
                  );
            });

            dbRemove.mockImplementation((callback) => {
                callback(null);
            });

            return request(app).delete(BASE_API_PATH + "/purchase/61e012398daf12115327224b").set("Authorization", jwtToken).then((response) => {
                console.log(response.body);
                expect(response.statusCode).toBe(200);
                expect(response.body).toEqual("Purchase removed");
            })
        });
    });


})            