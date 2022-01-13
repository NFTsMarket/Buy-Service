const Purchase = require("../../purchases.js");
const mongoose = require("mongoose");
const dbConnect = require("../../db");

describe("Purchases DB connection", () => {
    // Connect to the database
    beforeAll(() => {
        return dbConnect();
    });

    //
    beforeEach((done) => {
        Purchase.deleteMany({}, (err) => {
            done();
        });
    });

    it("Writes a purchase in the DB", (done) => {
        const purchase = new Purchase({
            buyerId: "61bf5695b57c6e0471c7147b",
            sellerId: "61bf7d53888df2955682a7ea",
            productId: "61bf5695b57c6e0471c7147b",
            amount: 37,
            state: "Pending"
        });
        purchase.save((err, purchase) => {
            expect(err).toBeNull();
            Purchase.find({}, (err, purchases) => {
                expect(purchases).toHaveLength(1);
                done();
            });
        });
    });

    afterAll((done) => {
        mongoose.connection.db.dropDatabase(() => {
            mongoose.connection.close(done);
        });
    });
});
