const express=require('express');
const userRouter=express.Router();
const user= require('../../models/userModel');
const userController=require('../../controllers/user/userController');
const profileController=require('../../controllers/user/profileController')
const cartController=require('../../controllers/user/cartController')
const userAuth=require('../../middlewares/userAuth')
const orderController=require('../../controllers/user/orderController')



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
//Wish List
// userRouter.get('/wishlist',userAuth,cartController.loadWishlist)

//User Profile Page
userRouter.get('/profilePage',userAuth,profileController.profile_Page);
userRouter.get('/forgotPassword',profileController.forgot_Password)
userRouter.post('/changepassword',userAuth,profileController.change_Password)
userRouter.post('/editProfile',userAuth,profileController.edit_Profile)

//Cart Controller Section
userRouter.get('/getCartPage',userAuth,cartController.getCart_Page)
userRouter.post('/postCartPage',cartController.postCart_Page)
userRouter.post('/remove-cart-item', cartController.removeCartItem);
userRouter.post('/update-cart-quantity', cartController.updateCartItemQuantity);
userRouter.get('/checkOutPage',userAuth,cartController.checkOutPage)
userRouter.post('/addAddress',userAuth,cartController.add_Address);
userRouter.post('/editAddress',userAuth,cartController.edit_Address);
userRouter.delete('/deleteAddress/:id',userAuth,cartController.delete_Address)
userRouter.post('/placeOrder',orderController.place_Order);
userRouter.get('/orderHistory',userAuth,orderController.getOrderHistory);
userRouter.post('/orders/:orderId',userAuth,orderController.cancelOrder);
userRouter.get('/order-status/:orderId', orderController.getOrderStatus);










module.exports=userRouter;