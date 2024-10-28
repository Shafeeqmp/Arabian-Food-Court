const Offer=require('../../models/offerModel')
const Category=require('../../models/categoryModel')
const Product=require('../../models/productModel')
const User=require('../../models/userModel')
const Order=require('../../models/orderModel')


exports.offer=async(req,res)=>{
    try {
        
        const offer=await Offer.find()
        const selectoffer = await Offer.find({isDelete: false,offerStartDate: { $lte: new Date() }});

        const product = await Product.find({ isDelete: false }).populate("offer");

        const category = await Category.find({ isDeleted: false }).populate("offer");

          res.render('admin/offerProductPage',{title:'Offer Product Management',offer,category,product,selectoffer})
    } catch (error) {
        console.error('Error fetching offer, category, or product data:', error);
        res.status(500).render('errorPage', { message: 'Error retrieving data', error });
    }
}

exports.addOffer_Product=async(req,res)=>{
    try {
        const nameRegex = /^[a-zA-Z\s\-]+$/;
        const { offerName, offerPercentage, offerStartDate } =req.body;
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

  exports.edit_Offer=async(req,res)=>{
    try {
      const { editOfferId, editOfferName, editOfferPercentage, editOfferStartDate }=req.body
      if(!editOfferName){
        return res.status(200).json({success:false,message:"Offer name is empty"})
      }
      if(!editOfferPercentage){
        return res.json({success:false,error:'offer discount is empty'})
    }
    let discountValue = parseInt(editOfferPercentage);
    if (isNaN(discountValue)) {      
        return res.json({success:false,error:'discount must be a number.'})
    }
    if (discountValue < 1 || discountValue > 100) {
      return res.json({success:false,error:'discount not more than 100 and less than 0'})
  }
  if (discountValue !== Math.floor(discountValue)) {
      return res.json({ success: false, error: 'Discount must be a whole number.' });
  }
  const currentDate = new Date()

        if (editOfferStartDate < currentDate) {
            return res.json({success:false,error:'Start date cannot be in the past'})
        }
        await Offer.findByIdAndUpdate(editOfferId,{
            
          offerName:editOfferName,
          offerPercentage:discountValue,
          offerStartDate:new Date(editOfferStartDate),
       })
      res.json({success:true,message:'Offer edited successfully'})
    } catch (error) {
      console.error("Error occurred while adding new offer:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }



  exports. delete_Offer=async (req, res) => {
    try {
        const { id } = req.params;
        const offer = await Offer.findById(id);
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }
        offer.isDelete=true
        await offer.save();
        res.status(200).json({ success: true, message: 'Offer deleted successfully' });
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.status(500).json({ success: false, message: 'Failed to delete offer' });
    }
  };

exports. restore_Offer=async (req, res) => {
  try {
      const { id } = req.params;
      const offer = await Offer.findById(id);
      if (!offer) {
          return res.status(404).json({ success: false, message: 'Offer not found' });
      }
      if (!offer.isDelete) {
          return res.status(400).json({ success: false, message: 'Offer is not deleted' });
      }
      offer.isDelete = false;
      await offer.save();
      res.status(200).json({ success: true, message: 'Offer restored successfully' });
  } catch (error) {
      console.error('Error restoring offer:', error);
      res.status(500).json({ success: false, message: 'Failed to restore offer' });
  }
};

exports. update_ProductOffer = async (req, res) => {
  try {
    const { productId, offerId} = req.body;
    const product = await Product.findOne({_id: productId});
    const offer = await Offer.findById(offerId);
    if (!product) {
      return res.json({ success: false, error: "product not found" });
    }
    
    if (!offer) {
      return res.json({ success: false, error: "offer not found" });
    }
    const discountPrice = Math.floor(
      product.price - (product.price * offer.offerPercentage) / 100
    );
    product.discount_price = discountPrice;
    product.offer = offerId;
    await product.save();
    res.json({ success: true, messgae: "product offer successfully updated" });
  } catch (error) {
    console.log("Error occurred while updating offer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



exports.update_CategoryOffer = async (req, res) => {
  try {
    const { categoryId, offerId } = req.body;
    const category = await Category.findOne({ _id: categoryId });
    const offer = await Offer.findById(offerId);
    if (!category) {
      return res.json({ success: false, error: "category not found" });
    }
    if (!offer) {
      return res.json({ success: false, error: "offer not found" });
    }
    const product = await Product.find({ category_id: categoryId }).populate(
      "variants.offer"
    );

    if (product.length === 0) {
      return res.json({ success: false, error: "product not found" });
    }
    for (let products of product) {
      let productChanged = false;
      for (let variant of products.variants) {
        let bestOffer;
        if (offer && !offer.isDelete) {
          bestOffer = {
            percentage: offer.offerPercentage,
            type: "category",
          };
        }

        //checking product offer which is already applied

        if (variant.offer) {
          const productOffer = variant.offer;
          if (
            !productOffer.isDelete &&
            productOffer.offerPercentage >
              (bestOffer ? bestOffer.percentage : 0)
          ) {
            bestOffer = {
              percentage: productOffer.offerPercentage,
              type: "product",
            };
          }
        }

        if (bestOffer) {
          const discountPrice = Math.floor(
            variant.price - (variant.price * bestOffer.percentage) / 100
          );
          if (
            variant.discount_price !== discountPrice ||
            variant.offer !==
              (bestOffer.type === "category" ? offer._id : variant.offer)
          ) {
            variant.discount_price = discountPrice;
            variant.offer =
              bestOffer.type === "category" ? offer._id : variant.offer;

            productChanged = true;
          }
        } else {
          variant.offer = null;
          variant.discount_price = 0;
        }
      }
      if (productChanged) {
        await products.save();
      }
    }
    category.offer = offerId;
    await category.save();
    res.json({ success: true, messgae: "category offer successfully updated" });
  } catch (error) {
    console.log("Error occurred while updating offer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
