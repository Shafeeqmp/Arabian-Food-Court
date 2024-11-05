const express=require('express');
const nodemailer = require('nodemailer'); 
const env=require('dotenv').config(); 
const adminRouter=express.Router();
const adminController=require('../../controllers/adimin/adminController')
const categoryController=require('../../controllers/adimin/categoryController')
const productController=require('../../controllers/adimin/productController')
const orderController=require('../../controllers/adimin/orderController')
const couponController=require('../../controllers/adimin/coponController')
const adminAuth=require('../../middlewares/adminAuth')
const upload=require('../../config/multer')
const salesController=require('../../controllers/adimin/salesController')
const offerController=require('../../controllers/adimin/offerController')

//Admin DashBoard
adminRouter.get('/',adminController.load_AdminPage);
adminRouter.get('/loadAdminDash',adminController.load_AdminDash);
adminRouter.post('/adminPage',adminController.admin_Dashboard);
adminRouter.get('/loaduserMng',adminAuth,adminController.load_userMng);
adminRouter.get('/logout',adminController.logout);
adminRouter.get('/block-user/:id',adminController.block_user);
adminRouter.get('/unblock-user/:id',adminController.unblock_user);

//Category Management
adminRouter.get('/categoryPage',adminAuth,categoryController.load_CategoryPage);
adminRouter.post('/addCategory',adminAuth,categoryController.add_Category);
adminRouter.put('/editCategory/:id',adminAuth,categoryController.edit_Category);
adminRouter.put('/deleteCategory/:id',adminAuth,categoryController.delete_Category);
adminRouter.put('/restoreCategory/:id',adminAuth,categoryController.restore_Category);

//Product Management
adminRouter.get('/loadProuctPage',adminAuth,productController.load_ProuctPage);
adminRouter.get('/addProuctPage',adminAuth,productController.addProuct_Page);
adminRouter.post('/addProduct',adminAuth,upload.any(),productController.add_Product);
adminRouter.get('/editProductPage/:id',adminAuth,productController.loadEditProductPage);
adminRouter.post('/editProduct/:id', adminAuth,upload.any(),productController.editProduct);
adminRouter.put('/deleteProduct/:productId',adminAuth,productController.delete_Product);
adminRouter.put('/restoreProduct/:productId',adminAuth,productController.restore_Product)

//Order Management
adminRouter.get('/loardOrderMng',adminAuth,orderController.loard_OrderMng)
adminRouter.get('/orders/:id', adminAuth,orderController.getOrderDetails);
adminRouter.post('/update-status',adminAuth,orderController.updateOrderStatus);

//Coupon Management
adminRouter.get('/loadCouponPage',adminAuth,couponController.load_CouponPage)
adminRouter.post('/addCoupon',adminAuth,couponController.add_Coupon)
adminRouter.post('/editCoupon',adminAuth,couponController.edit_Coupon)
adminRouter.post('/cancel-coupon', couponController.cancel_Coupon);



//Sales Report Section 
adminRouter.post('/generateSalesReport',adminAuth,salesController.generateSalesReport)
adminRouter.get('/salesChart',adminAuth,salesController.sales_Chart)

//Offer Section 
adminRouter.get('/offer',adminAuth,offerController.offer)
adminRouter.post('/addOfferProduct',adminAuth,offerController.addOffer_Product)
adminRouter.post('/editOffer',adminAuth,offerController.edit_Offer)
adminRouter.put('/deleteOffer/:id',adminAuth,offerController.delete_Offer);
adminRouter.put('/restoreOffer/:id',adminAuth,offerController.restore_Offer);
adminRouter.post('/updateProductOffer',adminAuth,offerController.update_ProductOffer)
adminRouter.post('/updateCategoryOffer',adminAuth,offerController.update_CategoryOffer)


module.exports=adminRouter;
