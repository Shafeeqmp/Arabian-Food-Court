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
      const Category = await category.find({isDeleted:false});
      res.render("admin/addProduct", { Category});
    } else {
      res.redirect("/admin/login");
    }
  };

//Add Product Section
const add_Product=async(req,res)=>{
    try {
      const Products=req.body;
      const ProductExist=await product.findOne({
        productname:Products.productname,
      })
      if(!ProductExist){
        const images=[]
        if(req.files && req.files.length>0){
          for(let i=0;i<req.files.length;i++){
            const originalImagePath=req.files[1].path;
            const resizedImagePath=path.join('public','uploads','product-images',req.files[1].filename);
            await sharp (originalImagePath).resize({width:450,height:450}).toFile(resizedImagePath);
            
          }
        }

        const categoryid =await category.findOne({name:Products.category});
        if(!categoryid){
          return res.status(400).json('invalid category name')
        }
        const newProduct=new product({
          productname:Products.productname,
          description:Products.description,
          category:categoryid._id,
          price:Products.price,
          createdOn:new Date(),
          stock:Products.stock,
          image:Products.image

        })
        await newProduct.save();
        return res.redirect('/admin/addProduct');

      }else{
        return res.status(400).json("Product already exist")
      }
    } catch (error) {
      console.error("error saving product",error);
      return res.redirect('/admin/addProuctPage')
    }
}

//Edit Product Page Loading Section
const edit_ProuctPage=async(req,res)=>{
    res.render('admin/editProuct')
}











module.exports={
    load_ProuctPage,
    addProuct_Page,
    add_Product,
    edit_ProuctPage
}