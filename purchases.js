const mongoose = require('mongoose');
const Product = require('./product.js');

// We define the entity "Purchase" schema
const purchaseSchema = new mongoose.Schema({
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "The purchase must have a buyer who created it"]
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "The purchase must have a seller who owns the asset"]
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "The purchase must have a product to be purchased"]
    },
    amount: {
        type: Number,
        min: [0, 'The purchase amount must be positive, got {VALUE}'],
        required: [true, "The purchase must have an asset to be purchased"]
    },
    state: {
        type: String,
        // In mongoose, enums are defined as strings and have a validator which checks if the
        // value is between one of the defined: https://stackoverflow.com/questions/29299477/how-to-create-and-use-enum-in-mongoose
        enum: {
            values: ['Pending', 'Accepted'],
            message: '{VALUE} is not a value in (Pending, Accepted)'
        },
        required: [true, "The purchase must have a state"]
    },
},
    {
        // This option assigns "createdAt" and "updatedAt" to the schema: 
        // https://stackoverflow.com/questions/12669615/add-created-at-and-updated-at-fields-to-mongoose-schemas
        timestamps: true
    });

// This function gives the information returned in GET methods, deleting atributes as
// id or updatedAt which are not relevant for the user
purchaseSchema.methods.cleanedPurchase = async function () {
    let assetId = null;
    try {
        assetId = (await Product.findOne({ _id: this.productId })).assetId;
    } catch (error) {
        assetId = null;
    }
    return {
        id: this._id,
        buyerId: this.buyerId,
        sellerId: this.sellerId,
        productId: this.productId,
        assetId: assetId,
        amount: this.amount,
        state: this.state,
        createdAt: this.createdAt
    };
}

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = Purchase;