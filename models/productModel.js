const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
  productname: {
    type: String,
    required: true,
    trim: true
  },
  isDelete: {
    type: Boolean,
    default: false
},
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref:"categoryModel",
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    type: String,
    required: true
  }
}, { timestamps: true });
const Product = mongoose.model('Product', productSchema);

module.exports = Product;
