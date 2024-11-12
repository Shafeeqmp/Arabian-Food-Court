const Category=require('../../models/categoryModel');
const Product=require('../../models/productModel');
const User = require('../../models/userModel'); 
const Address=require('../../models/addressModel')
const Cart=require('../../models/cartModel')
const Order = require('../../models/orderModel');
const Coupon=require('../../models/couponModel')
const Razorpay=require('../../config/razorPay')
const crypto = require('crypto');
const Wishlist=require('../../models/wishlistModel')
const Wallet=require('../../models/walletModel')
const InvoiceCounter = require('../../models/invoiceCounterModel');
const Offer=require('../../models/offerModel')


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


exports.place_Order = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { addressId, couponCode } = req.body;
    let { paymentMethod } = req.body;
    const address = await Address.findById(addressId);

  
    paymentMethod = paymentMethod === 'cod' ? 'Cash on Delivery' : 'Bank Transfer';

   
    const cart = await Cart.findOne({ user: req.session.userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    
    for (const item of cart.items) {
      const product = item.product;
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success:false,
          message: `Insufficient stock for ${product.product_name}. Only ${product.stock} left in stock.`,
        });
      }
    }

  
    let totalAmount = cart.total_price;
    let discountAmount = 0;

    if (couponCode) {
      const coupon = await Coupon.findOne({ coupon_code: couponCode, isDeleted: false });

      if (coupon) {
        discountAmount = (totalAmount * coupon.discount) / 100;
        totalAmount -= discountAmount;
      }
    }
   

      const product=await Product.findOne({isDelete:false}).populate('offer') 
      if(product){
        offerAmount=(product.price * product.offer.offerPercentage)/100
      }

   
    if(totalAmount > 1000){
      return res.json({success:false,message:'above 1000 is not allowed cash of delivery'})
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
};

// Helper function to generate a new order ID
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


exports.getOrderHistory = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const wishlist =await Wishlist.findOne({user:req.session.userId}).populate('items.product')
      let wishlistCount=0;
      if(wishlist){
        wishlistCount  = wishlist.items.length;
      }  
        const user = await User.findOne({ _id: req.session.userId }); 
        const cart = await Cart.findOne({ user: user._id }).populate("items.product");
        const orders = await Order.find({ user: userId })
            .populate('items.product')
            .sort({ createdAt: -1 });

            let cartCount = 0;
        if (cart && cart.items && cart.items.length > 0) {
           cart.items.forEach(item => {
           cartCount += item.quantity; 
        });
    }   
        res.render('user/orderHistory', { orders,user, cartCount,wishlistCount });
    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


exports.cancelOrder = async (req, res) => {
  try {
      const { orderId } = req.params;
      const userId = req.session.userId;

      if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
      }

      const order = await Order.findOne({ orderId, user: userId });
      if (!order) {
          return res.status(404).json({ message: "Order not found" });
      }

      if (order.orderStatus === 'Cancelled') {
          return res.status(400).json({ message: "Order is already cancelled" });
      }

      if (['Shipped', 'Delivered'].includes(order.orderStatus)) {
          return res.status(400).json({ message: "Cannot cancel order at this stage" });
      }

      order.orderStatus = 'Cancelled';
      order.orderStatusTimestamps.cancelled = new Date();
      for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, {
              $inc: { stock: item.quantity }
          });
      }
      if (order.paymentStatus === "Paid") {
          let refund = order.totalAmount;
          let wallet = await Wallet.findOne({ user: userId });
          if (!wallet) {
              wallet = new Wallet({
                  user: order.user,
                  balanceAmount: 0,
                  wallet_history: [],
              });
          }
          wallet.balanceAmount += refund;
          wallet.wallet_history.push({
              date: new Date(),
              amount: refund,
              description: `Refund for cancelled order (Order ID: ${order.orderId})`,
              transactionType: "credited",
          });
          await wallet.save();
      }

      await order.save();

      res.status(200).json({ message: "Order cancelled successfully" });
  } catch (error) {
      console.error("Error cancelling order:", error);
      res.status(500).json({ message: "Internal Server Error" });
  }
};



exports.getOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, status: order.orderStatus });
    } catch (error) {
        console.error('Error fetching order status:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch order status' });
    }
};

// Create Razorpay Order
exports.razor_PayOrderCreate = async (req, res) => {
  
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { addressId, couponCode, paymentMethod } = req.body;
    const cart = await Cart.findOne({ user: req.session.userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }
    for (const item of cart.items) {
      const product = item.product;
      if (product.stock < item.quantity) {

        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.product_name}. Only ${product.stock} left in stock.`,
        });
      }
    }
    let totalAmount = cart.total_price;
    let discountAmount = 0;

    if (couponCode) {
      const coupon = await Coupon.findOne({ coupon_code: couponCode, isDeleted: false });
      if (coupon) {
        discountAmount = (totalAmount * coupon.discount) / 100;
        totalAmount -= discountAmount;
      }
    }
    const options = {
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
      receipt: `receipt#${totalAmount+'shafeeq'}`,
      payment_capture: 1,
    };

    const razorpayOrder = await Razorpay.orders.create(options);
    return res.json({
      success: true,
      razorpayOrder,
      totalAmount,
      discountAmount,
      payableAmount: totalAmount*100,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return res.status(500).json({ success: false, message: 'Razorpay order creation failed' });
  }
};

// Razorpay Payment Verification
exports.razorPay_payment = async (req, res) => {
  try {
    const { payment_id, order_id, signature, addressId, couponCode, paymentMethod } = req.body;
    const address = await Address.findById(addressId);
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }


    const cart = await Cart.findOne({ user: req.session.userId }).populate('items.product');


    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

  
    let totalAmount = cart.total_price;
    let discountAmount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ coupon_code: couponCode, isDeleted: false });
      if (coupon) {
        discountAmount = (totalAmount * coupon.discount) / 100;
        totalAmount -= discountAmount;
      }
    }

    const product=await Product.findOne({isDelete:false}).populate('offer') 
      if(product){
        offerAmount=(product.price * product.offer.offerPercentage)/100
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


    const body = `${order_id}|${payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZOR_PAY_KEY_SECRET)
      .update(body)
      .digest('hex');
  

   
    const paymentVerified = expectedSignature === signature;

    
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
      paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : 'Bank Transfer',
      totalAmount: totalAmount,
      offerAmount:offerAmount,
      discountAmount: discountAmount,
      paymentStatus: paymentVerified ? 'Paid' : 'Failed',
      orderStatusTimestamps: {
        pending: new Date(),
      },
    });
    
 
    for (const item of cart.items) {
      const product = item.product;
      product.stock -= item.quantity;
      await product.save();
    }
    await newOrder.save();

    await Cart.deleteOne({ user: req.session.userId });
  
    if (paymentVerified) {
      return res.json({
        success: true,
        message: 'Payment verified and order created successfully',
        order: newOrder,
      });
    } else {
      return res.json({
        success: false,
        message: 'Payment verification failed. Order created but payment failed',
        order: newOrder,
      });
    }
  } catch (error) {
    console.error('Error in Razorpay payment:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};



exports.repayment_Razorpay = async (req,res)=>{
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ _id: orderId });

    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }
   

    const payment_capture = 1; 
    const amount = order.totalAmount * 100; 
    const currency = 'INR';

    const options = {
        amount,
        currency,
        receipt: `receipt_${orderId}`,
        payment_capture
    };

    const response = await Razorpay.orders.create(options);
    
    res.status(200).json({
        success: true,
        orderId: response.id,
        amount: response.amount,
        currency: response.currency,
        key: process.env.RAZOR_PAY_KEY_ID,
        name: 'Arabian foood court', 
        description: 'Repayment for Order',
        orderReceipt: orderId 
    });
} catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error occurred' });
}

}


exports.verify_Repayment = async (req,res)=>{
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZOR_PAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        const order = await Order.findById(orderId);
        order.paymentStatus = 'Paid';
        order.paymentMethod = 'Bank Transfer';
        order.razorpayOrderId = razorpay_order_id;
        await order.save();
        res.status(200).json({ success: true, message: 'Payment successful' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid signature' });
    }
} catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
}
}