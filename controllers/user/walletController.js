const category=require('../../models/categoryModel');
const Product=require('../../models/productModel');
const Address=require('../../models/addressModel')
const User = require('../../models/userModel'); 
const Cart=require('../../models/cartModel')
const Wishlist=require('../../models/wishlistModel')
const Wallet =require('../../models/walletModel')
const Razorpay=require('../../config/razorPay')
const crypto = require('crypto');
const Coupon=require('../../models/couponModel')
const Order=require('../../models/orderModel')
const InvoiceCounter = require('../../models/invoiceCounterModel');
const Offer=require('../../models/offerModel')


let orderCounter = 1;
const generateOrderId = async () => {
  const prefix = "ORD";
  const latestOrder = await Order.findOne()
    .sort({ orderId: -1 })
    .select("orderId");
  const latestId = latestOrder
    ? parseInt(latestOrder.orderId.replace(prefix, ""))
    : 0;
  const newId = latestId + 1;
  return `${prefix}${newId.toString().padStart(5, "0")}`;
};


async function generateInvoiceNumber() {
  try {
      const currentYear = new Date().getFullYear();
      let counter = await InvoiceCounter.findOne({ year: currentYear }).exec();
      
      if (!counter) {
          counter = new InvoiceCounter({ 
              year: currentYear,
              sequence: 0 
          });
      }
      
      counter.sequence += 1;
      await counter.save();
      
      // Format: AFC-YYYY-XXXXX (e.g., AFC-2024-00001)
      const invoiceNumber = `AFC-${currentYear}-${counter.sequence.toString().padStart(5, '0')}`;
      return invoiceNumber;
  } catch (error) {
      console.error('Error generating invoice number:', error);
      throw error;
  }
}

exports.load_walletPage=async(req,res)=>{
    try {
      
        const user = await User.findById(req.session.userId).lean();
       const cart = await Cart.findOne({ user: user._id }).populate("items.product");
      const wishlist =await Wishlist.findOne({user:req.session.userId}).populate('items.product')
      let cartCount = 0;
      if (cart && cart.items && cart.items.length > 0) {
         cart.items.forEach(item => {
         cartCount += item.quantity; 
      });
  } 
  
  let wishlistCount=0;
    if(wishlist){
      wishlistCount  = wishlist.items.length;
    }  

    let wallet = await Wallet.findOne({user: user._id})
    if (wallet && wallet.wallet_history) {
      wallet.wallet_history.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
   
    if (!wallet) {
      wallet = new Wallet({
        user: user._id,
        balance: 0,
        wallet_history: [],
      });
      await wallet.save();
    }


        res.render('user/wallet',{user,cartCount,wishlistCount,wallet})
    } catch (error) {
        console.error('Error loading user home page:', error);
      res.status(500).send('An error occurred while loading the page');
    }
}


 exports.addFund = async (req, res) => {
  const amount = req.body.amount;
  if (!amount) {
    return res.json({ success: false, error: 'Amount is empty' });
  }
  if (isNaN(amount)) {
    return res.json({ success: false, error: 'Invalid amount. Please enter a number' });
  }
  if (parseFloat(amount) <= 0) {
    return res.json({ success: false, error: 'Amount must be greater than zero.' });
  }
  const maxAmount = 100000;
  if (parseFloat(amount) > maxAmount) {
    return res.json({ success: false, error: `Amount cannot exceed ${maxAmount}.` });
  }
  try {
    const options = {
      amount: parseInt(amount) * 100, 
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };
    const order = await Razorpay.orders.create(options);
    if (!order) {
      return res.json({ success: false, error: 'Failed to create Razorpay order.' });
    }
    return res.json({ success: true, id:order.id,currency:order.currency,amount:order.amount });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return res.json({ success: false, error: 'Failed to create Razorpay order.' });
  }
};


exports.verifyPayment = async (req, res) => {
  try {
    // First check if user is authenticated
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const userId = req.session.userId;
    const user = await User.findById(userId);
    
    // Check if user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZOR_PAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");
    if (expectedSignature === razorpay_signature) {
      try {
          const wallet = await Wallet.findOne({ user: user._id });

          if (wallet) {
          
              wallet.balanceAmount += parseFloat(amount) / 100;
              wallet.wallet_history.push({
                  date: new Date(),
                  amount: parseFloat(amount) / 100, 
                  description: "Funds added to wallet",
                  transactionType: "credited",
              });

              await wallet.save();
          }

          return res.json({
              success:true,
              message: "Payment verified successfully",
          });
      } catch (error) {
          console.error("Error updating wallet:", error);
          return res.status(500).json({
              message: "An error occurred while processing your payment. Please try again later."
          });
      }
  } else {
      return res.json({
          message: "Payment verification failed. Please check your payment details."
      });
  }

  } catch (error) {
    console.error('Full error details:', error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}


exports.Order_Wallet=async(req,res)=>{
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await User.findById(req.session.userId)
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const { addressId, couponCode } = req.body;
    let { paymentMethod } = req.body;
    const wallet=await Wallet.findOne({user:user._id})
    const address = await Address.findById(addressId);
  
    if(!address){
      return res
      .status(400)
      .json({ success: false, message: "Address not found" });
    }

    if (!wallet) {
      return res
        .status(400)
        .json({ success: false, message: "no wallet for this user" });
    }
   
    const cart = await Cart.findOne({ user: req.session.userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Cart is empty" });
    }
  
    for (const item of cart.items) {
      const product = item.product;
      if(product.isDelete){
  
        return res.json({
          success:false,
          message: `product is unavailable`,
        });
        
      }
    
      if (product.stock < item.quantity) {
       
        return res.json({
          success:false,
          message: 'Insufficient stock' ,
        });
      }
    }
   
    let totalAmount = cart.total_price;
    let discountAmount = 0;
    let offerAmount=0

    if (couponCode) {
      const coupon = await Coupon.findOne({ coupon_code: couponCode, isDeleted: false });

      if (coupon) {
        discountAmount = (totalAmount * coupon.discount) / 100;
        totalAmount -= discountAmount;
      }
    }
    
      const product=await Product.findOne({isDelete:false}).populate('offer')
      if(product.offer){
        offerAmount=product.price * (product.offer.offerPercentage)/100
      }

      const walletBalance = wallet.balanceAmount;
      if(walletBalance < totalAmount){
        
        return res.json({ success: false, message: "not enough money in your wallet" });
      }
    
    const addressOrder = [
      {
        fullName: address.fullName,
        streetAddress: address.streetAddress,
        zipCode: address.zipCode,
        phone: address.phone,
        city: address.city,
        state: address.state,
        country: address.country,
      },
    ];
    
    

    
    const newOrderId = await generateOrderId();
    const invoiceNumber = await generateInvoiceNumber();
  
    const newOrder = new Order({
      orderId: newOrderId,
      invoiceNumber:invoiceNumber,
      user: req.session.userId,
      address: addressOrder,
      items: cart.items.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.price,
      })),
      paymentMethod: paymentMethod,
      totalAmount: totalAmount,
      discountAmount: discountAmount,
      offerAmount:offerAmount,
      paymentStatus : 'Paid',
      orderStatus: 'Pending',
      orderStatusTimestamps: {
        pending: new Date(),
      },
    });
    
    await newOrder.save();

    // Update product stock
    for (const item of cart.items) {
      const product = item.product;
      product.stock -= item.quantity;
      await product.save();
    }
    
    // Clear the user's cart after placing the order
    await Cart.deleteOne({ user: req.session.userId });

    wallet.balanceAmount -= totalAmount;
    wallet.wallet_history.push({
      data:new Date(),
      amount:totalAmount,
      description:"Order payment from wallet",
      transactionType:'debited'
    });
    await wallet.save();




    // Send the response
    res.status(201).json({
      success:true,
      message: "Order placed successfully",
      order: newOrder,
      discountAmount: discountAmount > 0 ? `Discount Applied: ₹${discountAmount}` : "No Discount",
    });
    
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}