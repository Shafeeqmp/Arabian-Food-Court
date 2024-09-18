const admin =require('../../routes/admin/adminRoutes');
const product=require('../../models/productModel');
const category=require('../../models/categoryModel')
const user=require('../../models/userModel')
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
      const Category = await category.find();
      res.render("admin/addProduct", { Category});
    } else {
      res.redirect("/admin/login");
    }
  };

//Add Product Section
const add_Prouct=async(req,res)=>{
    res.render('admin/addProduct')
}

//Edit Product Page Loading Section
const edit_ProuctPage=async(req,res)=>{
    res.render('admin/editProuct')
}











module.exports={
    load_ProuctPage,
    addProuct_Page,
    add_Prouct,
    edit_ProuctPage
}