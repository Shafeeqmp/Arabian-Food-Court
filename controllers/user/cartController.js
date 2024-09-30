const Category=require('../../models/categoryModel');
const Product=require('../../models/productModel');
const User = require('../../models/userModel'); 
const Address=require('../../models/addressModel')
const Cart=require('../../models/cartModel')

//Get Cart Page
const getCart_Page=async(req,res)=>{
    try {
        const cart =await Cart.findOne({user:req.session.userId}).populate('items.product')
        res.render('user/cartPage',{cart})
    } catch (error) {
        console.error('Error fetching cart:', error); 
    res.status(500).send('Something went wrong!');
    }
}

//Post Add Cart Page
const postCart_Page = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    // const user = await User.findOne({ email: req.session.email });
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    let cart = await Cart.findOne({ user: user._id });
    if (!cart) {
      cart = new Cart({ user: user._id, items: [], total_price: 0 });
    }
    const existingItemIndex = cart.items.findIndex((item) => item.product.equals(productId));
    
    if (existingItemIndex > -1) {
      const existingItem = cart.items[existingItemIndex];
      if (existingItem.quantity + quantity > product.stock) {
        return res.status(400).json({ success: false, message: "Not enough stock available" });
      }
      if (existingItem.quantity >= 5) {
        return res.status(400).json({ success: false, message: "Maximum quantity reached" });
      }
      const newQuantity = existingItem.quantity + quantity;
      existingItem.quantity = newQuantity;
      existingItem.price = product.price * newQuantity;
    } else {
      cart.items.push({
        product: productId,
        quantity: quantity,
        price: product.price * quantity,
      });
    }
    cart.total_price = cart.items.reduce((total, item) => total + item.price, 0);
    await cart.save();
    res.status(200).json({ success: true, message: "Product added to cart" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};


  














module.exports={
    getCart_Page,
    postCart_Page
}