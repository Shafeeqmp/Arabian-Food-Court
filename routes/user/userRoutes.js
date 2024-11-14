const express=require('express');
const userRouter=express.Router();
const user= require('../../models/userModel');
const userController=require('../../controllers/user/userController');
const profileController=require('../../controllers/user/profileController')
const cartController=require('../../controllers/user/cartController')
const userAuth=require('../../middlewares/userAuth')
const isBlockAuth=require('../../middlewares/isBlockAuth')
const orderController=require('../../controllers/user/orderController')
const couponController=require('../../controllers/user/couponController')
const wishlistController=require('../../controllers/user/wishlistController');
const walletController=require('../../controllers/user/walletController')
const { whitelist } = require('validator');
const ratingController=require('../../controllers/user/ratingController')


userRouter.use(isBlockAuth)


//Index Page Loading
userRouter.get('/',userController.loadIndexPage);
userRouter.get('/login',userController.loadLogin);

//User Loging && Signup pages
userRouter.post('/login',userController.login);
userRouter.get('/signup',userController.loadSignup);
userRouter.post('/signup',userController.signup);

//OTP Section
userRouter.get('/otpPage',userController.otpPage);
userRouter.post('/verify-OTP',userController.verifyOTP)
userRouter.post('/resend-OTP', userController.resendOtp);

//Forgot OTP Section
userRouter.post('/postResetPage',userController.post_ResetPage);
userRouter.get('/getRestPassword/:token',userController.get_RestPassword)
userRouter.post('/reset-password', userController.postResetPassword);

//User Home Page && Logout
userRouter.get('/userHomePage',userAuth,userController.loadUserHomePage)
userRouter.get('/logout',userController.logout)
userRouter.get('/search',userAuth,userController.search);

//Single ProductView Page
userRouter.get('/user/singleProductView/:id',userAuth,userController.single_ProductView);

//User Profile Page
userRouter.get('/profilePage',userAuth,profileController.profile_Page);
userRouter.get('/forgotPassword',userAuth,profileController.forgot_Password)
userRouter.post('/changepassword',userAuth,profileController.change_Password)
userRouter.post('/editProfile',userAuth,profileController.edit_Profile)

//Cart Controller Section
userRouter.get('/getCartPage',isBlockAuth,userAuth,cartController.getCart_Page)
userRouter.post('/postCartPage',isBlockAuth,userAuth,cartController.postCart_Page)
userRouter.post('/remove-cart-item',userAuth,cartController.removeCartItem);
userRouter.post('/update-cart-quantity',cartController.updateCartItemQuantity);
userRouter.get('/checkOutPage',userAuth,cartController.checkOutPage)
userRouter.post('/addAddress',userAuth,cartController.add_Address);
userRouter.post('/editAddress',userAuth,cartController.edit_Address);
userRouter.delete('/deleteAddress/:id',userAuth,cartController.delete_Address)
userRouter.post('/placeOrder',userAuth,orderController.place_Order);
userRouter.get('/orderHistory',userAuth,orderController.getOrderHistory);
userRouter.post('/orders/:orderId',userAuth,orderController.cancelOrder);
userRouter.get('/order-status/:orderId',userAuth,orderController.getOrderStatus);
userRouter.get('/loadCheckoutPage',userAuth,cartController.load_CheckoutPage)


//Coupon section
userRouter.post('/apply-coupon', couponController.applyCoupon);
userRouter.post('/remove-coupon', couponController.removeCoupon);

//Razor Pay Section
userRouter.post('/razor-Pay-OrderCreate',userAuth,orderController.razor_PayOrderCreate)
userRouter.post('/razor-Pay-Payment',userAuth,orderController.razorPay_payment)
userRouter.post('/repaymentRazorpay',orderController.repayment_Razorpay)
userRouter.post('/verifyRepayment',orderController.verify_Repayment)

//Wish List Section
userRouter.get('/wishlist',userAuth,wishlistController.loadWishlist)
userRouter.post('/addWishlist',userAuth,wishlistController.add_Wishlist)
userRouter.post('/remove-Wishlist-Item',userAuth,wishlistController.remove_WishlistItem)

//Wallet section
userRouter.get('/loadWalletPage',userAuth,walletController.load_walletPage)
userRouter.post('/addFund',userAuth,walletController.addFund)
userRouter.post('/verifyPayment',userAuth,walletController.verifyPayment)
userRouter.post('/orderWallet',userAuth,walletController.Order_Wallet)


//sales invoice
userRouter.get('/invoice/:orderId', userAuth, userController.generateInvoice);

//Rating Star Router
userRouter.post('/submit-rating',userAuth,ratingController.submitRating)
userRouter.get('/get-product-rating',userAuth,ratingController.getProductRating)




module.exports=userRouter;