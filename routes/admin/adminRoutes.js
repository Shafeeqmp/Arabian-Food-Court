const express=require('express');
const nodemailer = require('nodemailer'); 
const env=require('dotenv').config(); 
const adminRouter=express.Router();
const adminController=require('../../controllers/adimin/adminController')
const categoryController=require('../../controllers/adimin/categoryController')
const productController=require('../../controllers/adimin/productController')
const upload=require('../../config/multer')

//Admin DashBoard
adminRouter.get('/',adminController.load_AdminPage);
adminRouter.get('/loadAdminDash',adminController.load_AdminDash);
adminRouter.post('/adminPage',adminController.admin_Dashboard);
adminRouter.get('/loaduserMng',adminController.load_userMng);
adminRouter.get('/logout',adminController.logout);
adminRouter.get('/block-user/:id',adminController.block_user);
adminRouter.get('/unblock-user/:id',adminController.unblock_user);

//Category Management
adminRouter.get('/categoryPage',categoryController.load_CategoryPage);
adminRouter.post('/addCategory',categoryController.add_Category);
adminRouter.put('/editCategory/:id',categoryController.edit_Category);
adminRouter.put('/deleteCategory/:id',categoryController.delete_Category);
adminRouter.put('/restoreCategory/:id',categoryController.restore_Category);

//Product Management
adminRouter.get('/loadProuctPage',productController.load_ProuctPage);
adminRouter.get('/addProuctPage',productController.addProuct_Page);
adminRouter.post('/addProduct',upload.any(),productController.add_Product);
adminRouter.get('/editProductPage/:id',productController.loadEditProductPage);
adminRouter.put('/editPrdouct/:id',productController.editProduct);








module.exports=adminRouter;