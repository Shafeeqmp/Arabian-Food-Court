const Offer=require('../../models/offerModel')
const Category=require('../../models/categoryModel')
const Product=require('../../models/productModel')
const User=require('../../models/userModel')
const Order=require('../../models/orderModel')


exports.offer=async(req,res)=>{
    try {
        
        const offer = await Offer.find({isDelete: false,offerStartDate: { $lte: new Date() }});

        const product = await Product.find({ isDelete: false }).populate("offer");

        const category = await Category.find({ isDeleted: false }).populate("offer");

          res.render('admin/offerProductPage',{title:'Offer Product Management',offer,category,product})
    } catch (error) {
        console.error('Error fetching offer, category, or product data:', error);
        res.status(500).render('errorPage', { message: 'Error retrieving data', error });
    }
}

exports.addOffer_Product=async(req,res)=>{
    try {
        const nameRegex = /^[a-zA-Z\s\-]+$/;
        const { offerName, offerPercentage, offerStartDate } =
          req.body;
        const currentDate = new Date();
  
        if (!offerName) {
          return res.json({ success: false, error: "offer name is empty" });
        }
  
        if (offerName.length < 2) {
          return res.json({
            success: false,
            error: "Name must need minimum 2 characters.",
          });
        }
  
        if (!nameRegex.test(offerName)) {
          return res.json({
            success: false,
            error: "Name should not contain numbers or special characters.",
          });
        }
  
        if (!offerPercentage) {
          return res.json({ success: false, error: "offerPercentage is empty" });
        }
  
        if (isNaN(offerPercentage)) {
          return res.json({
            success: false,
            error: "Percentage must be a number.",
          });
        }
  
        if (offerPercentage < 1 || offerPercentage > 100) {
          return res.json({
            success: false,
            error: "Percentage not more than 100 and less than 0",
          });
        }
  
        if (offerPercentage !== Math.floor(offerPercentage)) {
          return res.json({
            success: false,
            error: "Percentage must be a whole number.",
          });
        }
  
        if (!offerStartDate) {
          return res.json({ success: false, error: "offerStartDate is empty" });
        }
        if (offerStartDate < currentDate) {
          return res.json({
            success: false,
            error: "Start date cannot be in the past.",
          });
        }
        const newOffer = new Offer({
          offerName: offerName,
          offerPercentage: offerPercentage,
          offerStartDate: new Date(offerStartDate),
         
        });
  
        await newOffer.save();
        res.json({ success: true, message: "new offer addedd successfully" });
      
    } catch (error) {
      console.error("Error occurred while adding new offer:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
