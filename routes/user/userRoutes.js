const express=require('express');
const userRouter=express.Router();
const user= require('../../models/userModel');
const userController=require('../../controllers/user/userController');
const{userAuth}=require("../../middlewares/auth")


userRouter.get('/',userController.loadIndexPage);
userRouter.get('/login',userController.loadLogin);
userRouter.post('/login',userController.login);
userRouter.get('/signup',userController.loadSignup);
userRouter.post('/signup',userController.signup);
userRouter.get('/otpPage',userController.otpPage);
userRouter.post('/verify-OTP',userController.verifyOTP)
userRouter.post('/resend-OTP', userController.resendOtp);
userRouter.get('/userHomePage',userController.loadUserHomePage)
userRouter.post('/logout',userController.logout)
userRouter.get('/user/singleProductView/:id',userController.single_ProductView);








module.exports=userRouter;