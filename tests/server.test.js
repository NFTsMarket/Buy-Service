const app = require("../server.js");
const request = require("supertest");
const Purchase = require('../purchases.js');
const jwt = require("jsonwebtoken");

describe("Buy service API", () => {
    let jwtToken;
    beforeAll(() => {
        process.env = {
            RECAPTCHA_SECRET_KEY: '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe',
            SECRET_KEY: 'secret_key'
        };

        jwtToken = jwt.sign({ "id": "12345", "email": "juaaloval@gmail.com", "role": "client" }, process.env.SECRET_KEY);
    });

    describe("GET /", () => {
        it("should redirect", () => {
            return request(app).get("/").then((response) => {
                expect(response.status).toBe(302);
                expect(response.headers).toHaveProperty('location');
            })
        });
    });

    describe("GET /api/v1/", () => {
        it("should redirect", () => {
            return request(app).get("/api/v1/").then((response) => {
                expect(response.status).toBe(302);
                expect(response.headers).toHaveProperty('location');
            })
        });
    });

    describe("GET /api/v1/purchase/", () => {
        const purchases = [
            new Purchase({
                buyerId: "61bf5695b57c6e0471c7147b",
                sellerId: "61bf7d53888df2955682a7ea",
                productId: "61bf5695b57c6e0471c7147b",
                amount: 37,
                state: "Pending"
            }),
            new Purchase({
                buyerId: "61bf5695b57c6e0471c7147b",
                sellerId: "61bf7d53888df2955682a7ea",
                productId: "61bf5695b57c6e0471c7147b",
                amount: 37,
                state: "Pending"
            }),
            new Purchase({
                buyerId: "61bf5695b57c6e0471c7147b",
                sellerId: "61bf7d53888df2955682a7ea",
                productId: "61bf5695b57c6e0471c7147b",
                amount: 37,
                state: "Pending"
            })
        ];
        beforeAll(() => {
            dbFind = jest.spyOn(Purchase, "find");
        });

        it("should return list of purchases in DB", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, purchases);
            });

            return request(app).get("/api/v1/purchase/").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.body).toHaveLength(3);
            })
        });

        it("should return 404 error", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(null, []);
            });

            return request(app).get("/api/v1/purchase/").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(404);
            })
        });

        it("should return 500 error", () => {
            dbFind.mockImplementation((query, na, no, callback) => {
                callback(true, null);
            });

            return request(app).get("/api/v1/purchase/").set("Authorization", jwtToken).then((response) => {
                expect(response.statusCode).toBe(500);
            })
        });

        // Añadir tests de es admin o no etc..
    });
})