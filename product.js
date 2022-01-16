const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    assetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    price: {
        type: Number,
        min: 0,
        required: true
    }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;