const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel');
const User = require('../../models/userModel'); 
const Address = require('../../models/addressModel');
const Cart = require('../../models/cartModel');
const Order = require('../../models/orderModel');
const Wallet=require('../../models/walletModel');
const { setDefaultHighWaterMark } = require('nodemailer/lib/xoauth2');

exports.loard_OrderMng = async (req, res) => {
    try {
        const orders = await Order.find().populate('user', 'name email').populate('items.product').populate('address').sort({ createdAt: -1 });
        res.render('admin/orderMng', { orders,title:'Order Management' });
    } catch (error) {
        console.error('Error loading orders:', error);
        res.status(500).render('admin/error', { error: 'Failed to load orders' });
    }
};

exports.getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId)
            .populate('user', 'name email')
            .populate('items.product')
            .populate('address')
        
        if (!order) {
            return res.status(404).render('admin/error', { error: 'Order not found' });
        }
        
        res.render('admin/orderDetails', { order });
    } catch (error) {
        console.error('Error getting order details:', error);
        res.status(500).render('admin/error', { error: 'Failed to load order details' });
    }
};

exports.updateOrderStatus = async (req, res) => { 
    try {
        const { orderId, status } = req.body;
        const order = await Order.findById(orderId).populate('items.product');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (status === 'Cancelled' && order.orderStatus !== 'Cancelled') {
            for (const item of order.items) {
                await Product.findByIdAndUpdate(
                    item.product._id,
                    { $inc: { stock: item.quantity } }
                );
            }
        }
        if(status === 'Delivered'){
            order.paymentStatus = 'Paid';
            for (const item of order.items) {
                await Product.findByIdAndUpdate(
                    item.product._id,
                    { $inc: { saleCount: item.quantity } }
                );
                await Category.findByIdAndUpdate(
                    item.product.category_id,
                    { $inc: { saleCount: item.quantity } }
                );
                
            }

        }
        if(status === 'Cancelled'){
                if (order.paymentStatus === "Paid") {
                    const refund = order.totalAmount;
                    let wallet = await Wallet.findOne({ user: order.user });
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
                      description: `Refund for cancelled item (Order ID: ${order.orderId})`,
                      transactionType: "credited",
                    });
                    await wallet.save();
            }
        }
        order.orderStatus = status;
        const updatedOrder = await order.save();
        
        res.json({ success: true, message: 'Order status updated successfully', order: updatedOrder });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
};
