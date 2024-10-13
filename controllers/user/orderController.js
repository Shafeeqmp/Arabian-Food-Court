const Category=require('../../models/categoryModel');
const Product=require('../../models/productModel');
const User = require('../../models/userModel'); 
const Address=require('../../models/addressModel')
const Cart=require('../../models/cartModel')
const Order = require('../../models/orderModel');




exports.place_Order = async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized"})
      }
      const { addressId } = req.body;
      let { paymentMethod } = req.body;
      if(paymentMethod ==='cod'){
         paymentMethod ='Cash on Delivery'
      }else{
        paymentMethod ='Bank Transfer'
      }
      const cart = await Cart.findOne({ user: req.session.userId }).populate('items.product');
  
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: "Cart is empty" })
      }
  
      for (const item of cart.items) {
        const product = item.product;
        if (product.stock < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${product.product_name}. Only ${product.stock} left in stock.`
          });
        }
      }
  
      const newOrderId = generateOrderId();
  
      const newOrder = new Order({
        orderId: newOrderId,
        user: req.session.userId,
        address: addressId,
        items: cart.items.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.price
        })),
        paymentMethod: paymentMethod,
        totalAmount: cart.total_price,
        orderStatus: 'Pending',
        orderStatusTimestamps: {
          pending: new Date()
        }
      });
  
      await newOrder.save();

      for (const item of cart.items) {
        const product = item.product;
        product.stock -= item.quantity;
        await product.save();
      }
      await Cart.deleteOne({ user: req.session.userId });
      res.status(201).json({ message: "Order placed successfully", order: newOrder });
    } catch (error) {
      console.error("Error placing order:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };
  
let orderCounter = 1;
function generateOrderId() {
    const paddedOrderId = String(orderCounter).padStart(5, '0'); 
    orderCounter++; 
    return `ORD${paddedOrderId}`;
}


exports.getOrderHistory = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = await User.findOne({ _id: req.session.userId }); 
        const cart = await Cart.findOne({ user: user._id }).populate("items.product");
        const orders = await Order.find({ user: userId })
            .populate('items.product')
            .populate('address')
            .sort({ createdAt: -1 });

            let cartCount = 0;
        if (cart && cart.items && cart.items.length > 0) {
           cart.items.forEach(item => {
           cartCount += item.quantity; 
        });
    }   
        res.render('user/orderHistory', { orders,user, cartCount });
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

