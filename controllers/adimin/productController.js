const admin =require('../../routes/admin/adminRoutes');
const product=require('../../models/productModel');
const category=require('../../models/categoryModel')
const user=require('../../models/userModel')
const upload=require('../../config/multer')
const fs=require('fs')
const path=require('path')
const sharp=require('sharp')


//Load Product Page Section
const load_ProuctPage = async (req, res) => {
    if (req.session.isAdmin) {
      const Product = await product.find().populate('category_id')
      
      res.render("admin/productMng",{Product});
    } else {
      res.redirect("/admin/loadAdminDash");
    }
  };
  
//Add Product Page Section
const addProuct_Page=async (req, res) => {
    if (req.session.isAdmin) {
      const Category = await category.find({isDeleted:false});
      res.render("admin/addProduct", { Category});
    } else {
      res.redirect("/admin/addProuctPage");
    }
  };

//Add Product Section
const add_Product = async (req, res) => {
  try {
    const { productName, Category_id, description, stock, price } = req.body;
    const images = req.files;
    const existProduct = await product.findOne({ productname: productName });
    const Category = await category.find({ isDeleted: false });

    if (existProduct) {
      return res.render('admin/addProduct', { Category, exist: "Product already exists" });
    }

    let Images = [];
    if (images) {
      images.forEach(image => {
        // Extract the relative path for storage in the database
        const relativePath = image.path.replace(/^.*[\\\/]public[\\\/]uploads[\\\/]/, '/uploads/');
        Images.push(relativePath);
      });
    }

    const newProduct = new product({
      productname: productName,
      category_id: Category_id,
      description,
      stock,
      price,
      images: Images
    });

    await newProduct.save();
    res.redirect('/admin/loadProuctPage');
        console.log("Product added successfully");

  } catch (error) {
    console.error('Error adding product:', error);
    res.status(400).send('Error adding product');
  }
};

//Edit Product Page Loading Section
const edit_ProuctPage=async(req,res)=>{
  if (req.session.isAdmin) {
    const Category = await category.find({isDeleted:false});
    res.render("admin/addProduct", { Category});
  } else {
    res.redirect("/admin/editProuctPage");
  }
}










module.exports={
    load_ProuctPage,
    addProuct_Page,
    add_Product,
    edit_ProuctPage
}