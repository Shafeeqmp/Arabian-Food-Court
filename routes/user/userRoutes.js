const express=require('express');
const userRouter=express.Router();
const user= require('../../models/userModel');
const userController=require('../../controllers/user/userController');
const addressController=require('../../controllers/user/addressController')
const{userAuth}=require("../../middlewares/auth")


//Index Loading Pages
userRouter.get('/',userController.loadIndexPage);
userRouter.get('/login',userController.loadLogin);

//User Loging && Signup pages
userRouter.post('/login',userController.login);
userRouter.get('/signup',userController.loadSignup);
userRouter.post('/signup',userController.signup);

//OTP Pages
userRouter.get('/otpPage',userController.otpPage);
userRouter.post('/verify-OTP',userController.verifyOTP)
userRouter.post('/resend-OTP', userController.resendOtp);

//User Home Page && Logout
userRouter.get('/userHomePage',userController.loadUserHomePage)
userRouter.get('/logout',userController.logout)

//Single ProductView Page
userRouter.get('/user/singleProductView/:id',userController.single_ProductView);

//Add Address Page
userRouter.get('/getAddressPage',addressController.getAddress_Page);









module.exports=userRouter;