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
  try {
    if (req.session.isAdmin) {
      const Product = await product.find({isDelete:false}).populate('category_id')
      console.log(Product);
      
      res.render("admin/productMng",{Product});
    } else {
      res.redirect("/admin/loadAdminDash");
    }
  } catch (error) {
    console.error(error);
        res.status(500).json({ err: "something went wrong while adding new category" });
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
const loadEditProductPage = async (req, res) => {
  try {
    const productId = req.params.id; 
    const Product = await product.findById(productId).populate('category_id')
    const Category=await category.find({isDeleted:false})
    if (!Product) {
      return res.status(404).send('Product not found');
    }
    res.render('admin/editProduct', { Product,Category});
  } catch (error) {
    console.error('Error loading edit page:', error);
    res.status(500).send('Error loading product edit page');
  }
};




//Edit Product post Section
const editProduct = async (req, res) => {
  try {   
    const productId = req.params.id;
    const { productName, Category_id,price,stock,description} = req.body;
    const images = req.files;
    const existingProduct = await product.findById(productId);
    if (!existingProduct) {
      return res.status(404).send('Product not found');
    }
    existingProduct.productname = productName;
    existingProduct.category_id = Category_id;
    existingProduct.description = description;
    existingProduct.stock = stock;
    existingProduct.price = price;
    if (images && images.length > 0) {
      let updatedImages = [];
      images.forEach(image => {
        const relativePath = image.path.replace(/^.*[\\\/]public[\\\/]uploads[\\\/]/, '/uploads/');
        updatedImages.push(relativePath);
      });
      existingProduct.images = updatedImages;
    }
    await existingProduct.save();
    res.redirect('/admin/loadProuctPage');
    console.log("Product updated successfully");

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).send('Error updating product');
  }
};

const delete_Product=async(req,res)=>{
  if (req.session.isAdmin) {
    try {
      const { proId } = req.body;
      await product.findByIdAndUpdate(proId, { isDelete: true });
      res.status(200).json({ message: "product deleted successfully" });
    } catch (err) {
      console.log("something went wrong while deleting the product");
      res.status(500).json({ err: "something went wrong while deleting the product" });
    }
  } else {
    res.redirect("/admin/login");
  }
}


const restore_Product=async(req,res)=>{
  if (req.session.isAdmin) {
    try {
      const { proId } = req.body;
      const Product = await product.findById(proId).populate('category_id')
console.log(Product);

      const Category = await category.findById(product.Category_id._id)
      if(category.isDeleted){
        return res.status(400).json({ message: 'category of this product is deleted' });
      }else{
        await Product.findByIdAndUpdate(proId, { isDelete: false });
      }


      res.status(200).json({ message: "product restored successfully" });
    } catch (err) {
      res
        .status(500)
        .json({ err: "something went wrong while restoring the product" });
    }
  } else {
    res.redirect("/admin/login");
  }
}












module.exports={
    load_ProuctPage,
    addProuct_Page,
    add_Product,
    loadEditProductPage,
    editProduct,
    delete_Product,
    restore_Product
}