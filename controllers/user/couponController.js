const Coupon = require('../../models/couponModel');
const Cart = require('../../models/cartModel');
const Order=require('../../models/orderModel')

exports.applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.userId;
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart) {
            return res.json({ success: false, message: 'Cart not found' });
        }
        // Calculate cart total
        const cartTotal = cart.items.reduce((total, item) => {
            return total + (item.product.price * item.quantity);
        }, 0);
        // Find the coupon
        const coupon = await Coupon.findOne({ 
            coupon_code: couponCode,
            start_date: { $lte: new Date() },
            expiry_date: { $gte: new Date() },
            isDeleted: false
        });
        if (!coupon) {
            return res.json({ success: false, message: 'Invalid or expired coupon' });
        }

        const userCouponUsage = coupon.users.find(user => user.userId.toString() === userId.toString());

        if (userCouponUsage && userCouponUsage.isBought) {
            return res.json({ success: false, message: 'You have already used this coupon' });
        }

        if (cartTotal < coupon.min_purchase_amount) {
            return res.json({ 
                success: false, 
                message: `Minimum purchase amount of ${coupon.min_purchase_amount} required for this coupon`
            });
        }
        
        if (cartTotal > coupon.max_coupon_amount) {
            return res.json({ 
                success: false, 
                message: `Maximum purchase amount of ${coupon.max_coupon_amount} allowed for this coupon`
            });
        }

        // Calculate discount
        let discountAmount = (cartTotal * coupon.discount) / 100;

        // Apply max discount limit if applicable
        if (discountAmount > coupon.max_coupon_amount) {
            discountAmount = coupon.max_coupon_amount;
        }

        // Calculate final amount
        const finalAmount = cartTotal - discountAmount;

        // Mark the coupon as used for this user
        if (userCouponUsage) {
            userCouponUsage.isBought = true; 
        } else {
            coupon.users.push({ userId, isBought: true });
        }

        await coupon.save();

        // Update the cart with the applied coupon
        cart.appliedCoupon = coupon._id;
        cart.discountAmount = discountAmount;
        await cart.save();
        res.json({
            success: true,
            message: 'Coupon applied successfully',
            cartTotal,
            discountAmount,
            finalAmount,
            couponCode,
        });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'An error occurred while applying the coupon' });
    }
};


exports.removeCoupon = async (req, res) => {
    try {
        const {couponCode}=req.body;
        const userId = req.session.userId;
        const coupon = await Coupon.findOne({coupon_code:couponCode})
        console.log(coupon)
        const removeCoupon = coupon.users.find(user => user.userId.toString() === userId.toString());
        console.log(removeCoupon)

        await Coupon.updateOne(
            { coupon_code: couponCode, 'users.userId': userId },
            { $set: { 'users.$.isBought': false } }
        );

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.json({ success: false, message: 'Cart not found' });
        }

        // Remove the applied coupon
        cart.appliedCoupon = undefined;
        cart.discountAmount = 0;
        await cart.save();

        res.json({
            success: true,
            message: 'Coupon removed successfully'
        });

    } catch (error) {
        console.error('Error removing coupon:', error);
        res.status(500).json({ success: false, message: 'An error occurred while removing the coupon' });
    }
};
