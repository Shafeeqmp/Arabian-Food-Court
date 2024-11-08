const admin =require('../../routes/admin/adminRoutes');
const product=require('../../models/productModel');
const category=require('../../models/categoryModel')
const user=require('../../models/userModel')
const upload=require('../../config/multer')
const fs=require('fs')
const path=require('path')
const sharp=require('sharp');
const { title } = require('process');


//Load Product Page Section
exports.load_ProuctPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    const totalProducts = await product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);
    const Product = await product.find()
        .populate('category_id')
        .skip(skip)
        .limit(limit);
    res.render('admin/productMng', {
        title: 'Product Management',
        Product,
        currentPage: page,
        totalPages,
        totalProducts,
        limit
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server Error');
  }

};

  
//Add Product Loading Page Section
exports.addProuct_Page=async (req, res) => {
    if (req.session.isAdmin) {
      const Category = await category.find({isDeleted:false});
      res.render("admin/addProduct", { Category,title:'add product'});
    } else {
      res.redirect("/admin/addProuctPage");
    }
  };



//Add Product Section
exports. add_Product = async (req, res) => {
  try {
    const { productName, Category_id, description, stock, price } = req.body;
    const images = req.files || []; 
    const existProduct = await product.findOne({ productname: productName });
    const Category = await category.find({ isDeleted: false });

    if (existProduct) {
      return res.status(400).json({ error: "Product already exists" });
    }

    let Images = [];
    if (images.length > 0) {
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
    res.status(200).json({ success: true});
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Error adding product' });
  }
};


//Edit Product Page Loading Section
exports.loadEditProductPage = async (req, res) => {
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


//Edit Product Section
exports.editProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { productName, Category_id, price, stock, description } = req.body;
    const comingImages = req.files; 
    const existingProduct = await product.findById(productId);
    if (!existingProduct) {
      return res.status(404).send('Product not found');
    }

    // Update product fields
    existingProduct.productname = productName;
    existingProduct.category_id = Category_id;
    existingProduct.description = description;
    existingProduct.stock = stock;
    existingProduct.price = price;
    let updatedImages = existingProduct.images ? [...existingProduct.images] : [];
    if (comingImages && comingImages.length > 0) {
      comingImages.forEach(image => {
        const index = parseInt(image.fieldname.split('productImage')[1], 10) - 1;
        if (index >= 0 && index < updatedImages.length) {
          const relativePath = image.path.replace(/^.*[\\\/]public[\\\/]uploads[\\\/]/, '/uploads/');
          updatedImages[index] = relativePath;
        }
      });
    }
    existingProduct.images = updatedImages;
    await existingProduct.save();
    res.redirect('/admin/loadProuctPage');
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).send('Error updating product');
  }
};



//Delete Product sction
exports. delete_Product = async (req, res) => {
  if (req.session.isAdmin) {

    try {
      const { productId } = req.params;
      await product.findByIdAndUpdate(productId, { isDelete: true });
      res.status(200).json({ success: true, message: "Product deleted successfully" });
    } catch (err) {
      console.error("Something went wrong while deleting the product");
      res.status(500).json({ success: false, err: "Error deleting product" });
    }
  } else {
    res.redirect("/admin/login");
  }
};



//Restore Product Section
exports. restore_Product = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { productId } = req.params;
      const Product = await product.findById(productId).populate('category_id');
      
      if (Product.category_id.isDeleted) {
        return res.status(400).json({ success: false, message: 'Category of this product is deleted' });
      }
      
      await product.findByIdAndUpdate(productId, { isDelete: false });
      res.status(200).json({ success: true, message: "Product restored successfully" });
    } catch (err) {
      res.status(500).json({ success: false, err: "Error restoring product" });
    }
  } else {
    res.redirect("/admin/login");
  }
};
















