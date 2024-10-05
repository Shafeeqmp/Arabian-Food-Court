const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel');
const User = require('../../models/userModel'); 
const Address = require('../../models/addressModel');
const Cart = require('../../models/cartModel');
const Order = require('../../models/orderModel');

exports.loard_OrderMng = async (req, res) => {
    try {
        const orders = await Order.find().populate('user', 'name email').populate('items.product').populate('address').sort({ createdAt: -1 });
        res.render('admin/orderMng', { orders });
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

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { orderStatus: status },
            { new: true, runValidators: true }
        );
        
        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, message: 'Order status updated successfully', order: updatedOrder });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
};