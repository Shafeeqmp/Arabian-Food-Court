const nodemailer = require('nodemailer'); 
const crypto=require('crypto')
const env=require('dotenv').config(); 
const bcrypt = require('bcrypt'); 
const moment = require('moment-timezone');
const validator = require('validator');
const User = require('../../models/userModel'); 
const category=require('../../models/categoryModel')
const product=require('../../models/productModel');
const OTP=require('../../models/otpModel')
const { name } = require('ejs');
const Cart=require('../../models/cartModel')
const Wishlist=require('../../models/wishlistModel')
const Offer=require('../../models/offerModel')

exports.loadUserHomePage = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
  
    try {
        const  offer= await Offer.find({isDelete: false,offerStartDate: { $lte: new Date() }});
      const totalProducts = await product.countDocuments({ isDelete: false });
      const totalPages = Math.ceil(totalProducts / limit);

      const user = await User.findById(req.session.userId).lean();
    
      const cart = await Cart.findOne({ user: user._id }).populate("items.product");
      const wishlist =await Wishlist.findOne({user:req.session.userId}).populate('items.product')
      
      const products = await product.find({ isDelete: false }).populate('offer')
        .skip(skip)
        .limit(limit)
        .lean();
       
        
  
        let cartCount = 0;
        if (cart && cart.items && cart.items.length > 0) {
           cart.items.forEach(item => {
           cartCount += item.quantity; 
        });
    } 
    
    let wishlistCount=0;
      if(wishlist){
        wishlistCount  = wishlist.items.length;
      }  
      const Category = await category.find({ isDeleted: false }).lean();
  
      res.render('user/menuPage', {
        user: user, 
        Category: Category,
        products: products,
        currentPage: page,
        totalPages: totalPages,
        cartCount,
        wishlistCount,
        offer
      });
    } catch (error) {
      console.error('Error loading user home page:', error);
      res.status(500).send('An error occurred while loading the page');
    }
  };
  

exports. loadIndexPage = async(req, res) => {
    try {
        if(req.session.email){
            res.redirect("/userHomePage")
        }else{
            const Category = await category.find({ isDeleted: false });
            const Product = await product.find({ isDelete: false });
            res.render('user/index',{Category,Product})
        }
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });  
    }
    
};

exports. loadLogin = (req, res) => {
    if(req.session.email){
        res.redirect("/userHomePage")
    }else {
        res.render('user/loginPage');
    }
};

exports. login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ email: email });

        if (!findUser) {
            return res.status(400).json({ error: "Incorrect username and password" });
        }
        if (findUser.isBlocked) {
            return res.status(400).json({ error: "User is blocked" });
        }
        const isPasswordValid = await bcrypt.compare(password, findUser.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: "Incorrect username and password" });
        }
        req.session.userId = findUser._id;
        req.session.email = findUser.email;
        if (findUser.isAdmin) {
            req.session.isAdmin = true;
            return res.status(200).json({ success: true, redirect: '/adminDashboard' });
        } else {
            req.session.isAdmin = false;
            const Category = await category.find({ isDeleted: false });
            const Product = await product.find({ isDelete: false });
            return res.status(200).json({ success: true, redirect: '/userHomePage' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};




exports. loadSignup = async (req, res) => {
    try {
        return res.render('user/signupPage');
    } catch (error) {
        console.log('Signup page not loading', error);
        res.status(500).send('Server Error');
    }
};

function generateOtp() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP:', otp);
    return otp;
}

async function sendVerificationEmail(email, otp) {
    try {
        console.log('Sending email to:', email);
        console.log('OTP:', otp);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b> Your OTP: ${otp} </b>`,
        });

        
        console.log('Email info:', info);
        return info.accepted.length > 0;
    } catch (error) {
        console.error('Error sending email', error);
        return false;
    }
}

exports. signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.status(400).json({ error: "Email already exists" });
        }
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json({ error: 'email-error' });
        }
        req.session.userOtp = otp;
        req.session.userData = { name, email, password };
        console.log('Stored OTP in session:', req.session.userOtp);
        res.json({ success: true });
        console.log("OTP sent:", otp);

    } catch (error) {
        console.error('Error during signup:', error);
        res.redirect("/error");
    }
};



const securePassword=async(password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash;
    } catch (error) {
        
    }
}

//Get OTP Page 
exports. otpPage=async(req,res)=>{
    res.render("user/otpForm")
}

//Forgot Pass Gmail acc
exports.post_ResetPage = async (req, res) => {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ error: 'No user with that email found.' });
    }

    // Generate and set reset token
    const token = crypto.randomBytes(20).toString('hex');
    

    // Set cookie for additional security (optional)
    res.cookie('resetToken', token, {
        httpOnly: true,
        maxAge: 2 * 60 * 1000, // Match token expiration
        secure: false // Change to true if using HTTPS
    });
    res.cookie('resetEmail', email, {
        httpOnly: true,
        maxAge: 2 * 60 * 1000, // Match token expiration
        secure: false // Change to true if using HTTPS
    });

    // Set up email transporter
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PASSWORD
        }
    });

    // Email options
    const mailOptions = {
        to: user.email,
        from: process.env.NODEMAILER_EMAIL,
        subject: 'Password Reset',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
        Please click on the following link, or paste this into your browser to complete the process:\n\n
        http://localhost:3000/getRestPassword/${token}\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`
    };

    // Send email
    transporter.sendMail(mailOptions, (err) => {
        if (err) {
            console.error('Error sending email:', err);
            return res.status(500).json({ error: 'There was an error sending the email. Please try again.' });
        }
        return res.status(200).json({ success: true, message: 'Password reset email sent.' });
    });
};



exports.get_RestPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const resetToken = req.cookies.resetToken;
        if (resetToken !== token) {
            return res.render('user/error'); 
        }
        
        res.render('user/changepwd');
    } catch (error) {
        console.error('Error in get_RestPassword:', error);
        res.status(500).send('An error occurred while processing your request.');
    }
};


exports.postResetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const resetEmail = req.cookies.resetEmail;
        
        const user = await User.findOne({email:resetEmail});
        if (!user) {
            return res.json({success:false})
        }
    
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
    
        
        await user.save();
    res.json({success:true})
    } catch (error) {
       console.log(error) 
    }
    
};

//Verify OTP
exports. verifyOTP=async(req,res)=>{       
    try {
       const {otp}=req.body;
       console.log('Received OTP from form:', otp);
       console.log('Session OTP:', req.session.userOtp);
       if(otp===req.session.userOtp){
        const user=req.session.userData
        const passwordHash=await securePassword(user.password)
        const saveUserData= new User({
            name:user.name,
            email:user.email,
            password:passwordHash,
        })
        await saveUserData.save()
        req.session.user=saveUserData._id;
        res.json({success:true,redirectUrl:"/login"})
       }else{
        res.status(400).json({success:false,message:"Invalid OTP,please try again"})
       }
    } catch (error) {
        console.error("Error Verify OTP",error);
        res.status(500).json({success:false,message:"An error occured"})
        
    }
}

//Resend OTP
exports. resendOtp = async (req, res) => {
    console.log("Resend OTP route hit"); 

    try {
        if (!req.session || !req.session.userData) {
            return res.status(400).json({ success: false, message: "No user session data" });
        }

        const { email } = req.session.userData;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" });
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP", otp);
            return res.status(200).json({ success: true, message: "OTP Resent Successfully" });
        } else {
            return res.status(500).json({ success: false, message: "Failed to resend OTP" });
        }
    } catch (error) {
        console.error("Error resending OTP", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

//Single Product View Page
  exports. single_ProductView=async(req,res)=>{
    try {
      const { id } = req.params; 
      const Product = await product.findById(id).populate('category_id').populate('offer') 
      const Category=await product.find({category_id:Product.category_id._id}).populate('offer')
      res.render('user/single-product', { Product,Category});
    } catch (err) {
      console.error(err);
      res.redirect('/userHomePage');
    }
  }

  //Logout Page
  exports. logout = (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/");
      }
    });
  };


  //Search & Filter Section
  exports.search = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const minPrice = req.query.min_price ? parseFloat(req.query.min_price) : 0;
        const maxPrice = req.query.max_price ? parseFloat(req.query.max_price) : Infinity;
        const sort = req.query.sort || 'newest';

        let query = { 
          productname: { $regex: search, $options: 'i' },
          price: { $gte: minPrice, $lte: maxPrice }
        };

        let sortObj = {};
        switch(sort) {
          case 'name_asc':
            sortObj = { productname: 1 };
            break;
          case 'name_desc':
            sortObj = { productname: -1 };
            break;
          case 'price_asc':
            sortObj = { price: 1 };
            break;
          case 'price_desc':
            sortObj = { price: -1 };
            break;
          case 'newest':
          default:
            sortObj = { createdAt: -1 };
        }

        const products = await product.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(limit);
        const totalProducts = await product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);
        const Category = await category.find();
        const user = await User.findById(req.session.userId)
        const cart = await Cart.findOne({ user: user._id }).populate("items.product"); 
        let cartCount = 0;
        if (cart && cart.items) {
          cartCount = cart.items.length;
        }
        const wishlist =await Wishlist.findOne({user:req.session.userId}).populate('items.product')
        let wishlistCount=0;
        if(wishlist){
          wishlistCount  = wishlist.items.length;
        }  
        res.render('user/menuPage', {
        user:user,
        products:products,
        currentPage: page,
        totalPages,
        Category: Category,
        cartCount:cartCount,
        wishlistCount:wishlistCount,
        
        searchParams: {
        search,
        minPrice,
        maxPrice,
        sort,
          }
        });
      } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred');
      }
  };
  


