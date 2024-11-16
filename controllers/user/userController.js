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
const PDFDocument = require('pdfkit');
const fs = require('fs');
const Order = require('../../models/orderModel');
const path = require('path');
const InvoiceCounter = require('../../models/invoiceCounterModel');
const Rating =require('../../models/ratingModel')
const Wallet =require('../../models/walletModel')

async function generateInvoiceNumber() {
    try {
        const currentYear = new Date().getFullYear();
        let counter = await InvoiceCounter.findOne({ year: currentYear }).exec();
        
        if (!counter) {
            counter = new InvoiceCounter({ 
                year: currentYear,
                sequence: 0 
            });
        }
        
        counter.sequence += 1;
        await counter.save();
        
        // Format: AFC-YYYY-XXXXX (e.g., AFC-2024-00001)
        const invoiceNumber = `AFC-${currentYear}-${counter.sequence.toString().padStart(5, '0')}`;
        return invoiceNumber;
    } catch (error) {
        console.error('Error generating invoice number:', error);
        throw error;
    }
}

exports.loadUserHomePage = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
  
    try {
        const item = await Rating.find();
        const Category = await category.find({ isDeleted: false }).lean();
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
      
      res.render('user/menuPage', {
        user: user, 
        Category: Category,
        products: products,
        currentPage: page,
        totalPages: totalPages,
        cartCount,
        wishlistCount,
        offer,
        item
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

// Referal Code Generatr
function generateReferralCode() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    let letterPart = "";
    for (let i = 0; i < 3; i++) {
      letterPart += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    let numberPart = "";
    for (let i = 0; i < 4; i++) {
      numberPart += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    return letterPart + numberPart;
  }

exports. signup = async (req, res) => {
    try {
        const { name, email, password } = req.body; 
        const referalCode = req.body.referalCode;
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.status(400).json({ error: "Email already exists" });
        }
        if(referalCode){
            const user = await User.findOne({ referalCode: referalCode });
          
            if (!user) {
              return res.json({ success: false, message: "Invalid user name" });
            }
            let wallet = await Wallet.findOne({ user: user._id });
          if (!wallet) {
            wallet = new Wallet({
              user: user._id,
              balance: 0,
              wallet_history: [],
            });
            await wallet.save();
          }
          req.session.referalCode = referalCode;
          }
        
          
        

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json({ error: 'email-error' });
        }
        req.session.userOtp = otp;
        req.session.userData = { name, email, password,referalCode: generateReferralCode() };
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
    
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ error: 'No user with that email found.' });
    }

    // Generate and set reset token
    const token = crypto.randomBytes(20).toString('hex');
    

    // Set cookie for additional security (optional)
    res.cookie('resetToken', token, {
        httpOnly: true,
        maxAge: 2 * 60 * 1000, 
        secure: false 
    });
    res.cookie('resetEmail', email, {
        httpOnly: true,
        maxAge: 2 * 60 * 1000, 
        secure: false 
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
            referalCode:user.referalCode
        })
        const referalCode = req.session.referalCode;
        if(referalCode){
          const user = await User.findOne({ referalCode: referalCode });
          if (!user) {
            return res.json({ success: false, message: "Invalid referal code" });
          }
          let wallet = await Wallet.findOne({ user: user._id });
          console.log(wallet);
          
          if (wallet) {
            wallet.balanceAmount += 200;
            wallet.wallet_history.push({
              amount: 200,
              description: "Referral Reward",
              transactionType: "credited",
            });
            await wallet.save();
          }
        }
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
      const user = await User.findById(req.session.userId).lean();
      const cart = await Cart.findOne({ user: user._id }).populate("items.product");
      const wishlist =await Wishlist.findOne({user:req.session.userId}).populate('items.product')

      let cartCount = 0;
        if (cart && cart.items && cart.items.length > 0) {
           cart.items.forEach(item => {
           cartCount += item.quantity; 
        });
    }

    let wishlistCount=0
    if(wishlist){
        wishlistCount=wishlist.items.length
    }

      res.render('user/single-product', { Product,Category,cartCount,wishlistCount,user});
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
  

exports.generateInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId)
            .populate('user')
            .populate('items.product')
            .populate('address');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Generate invoice number if it doesn't exist
        if (!order.invoiceNumber) {
            order.invoiceNumber = await generateInvoiceNumber();
            await order.save();
        }

        // Create directory if not exists
        const invoiceDir = path.join(__dirname, '../../public/invoices');
        if (!fs.existsSync(invoiceDir)){
            fs.mkdirSync(invoiceDir, { recursive: true });
        }

        // Create PDF document
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            bufferPages: true // Enable buffer pages
        });

        const fileName = `invoice-${order.invoiceNumber}.pdf`;
        const filePath = path.join(invoiceDir, fileName);

        // Create a Promise to handle PDF generation
        const pdfPromise = new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(filePath);
            
            writeStream.on('error', reject);
            writeStream.on('finish', () => resolve(filePath));
            
            doc.pipe(writeStream);

            // Add header function with better alignment
            const addHeader = () => {
                doc.image(path.join(__dirname, '../../public/images/logo.png'), 50, 45, { width: 50 })
                   .fillColor('#444444')
                   .fontSize(24)
                   .text('Arabian Food Court', 110, 57)
                   .fontSize(10)
                   .text('Food Street', 450, 50, { align: 'right' })
                   .text('Kerala, India, 673001', 450, 65, { align: 'right' })
                   .text('Phone: +91 9895089017', 450, 80, { align: 'right' })
                   .moveDown();

                // Thicker line separator
                doc.fillColor('#3498db')
                   .rect(50, 120, doc.page.width - 100, 3)
                   .fill();

                // Invoice title
                doc.fillColor('#444444')
                   .fontSize(20)
                   .text('INVOICE', 50, 140, { align: 'center' });
            };

            addHeader();

            const customerInformationTop = 180;

            // Left column - Bill To section
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text('BILL TO:', 50, customerInformationTop)
               .fontSize(10)
               .font('Helvetica')
               .text(order.user.name, 50, customerInformationTop + 20)
               .text(order.user.email, 50, customerInformationTop + 35);

            // Right column - Invoice Details
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .text('Invoice Number:', 350, customerInformationTop)
               .font('Helvetica')
               .text(order.invoiceNumber, 450, customerInformationTop)
               .font('Helvetica-Bold')
               .text('Order ID:', 350, customerInformationTop + 20)
               .font('Helvetica')
               .text(order.orderId, 450, customerInformationTop + 20)
               .font('Helvetica-Bold')
               .text('Date:', 350, customerInformationTop + 40)
               .font('Helvetica')
               .text(formatDate(order.createdAt), 450, customerInformationTop + 40)
               .font('Helvetica-Bold')
               .text('Payment Method:', 350, customerInformationTop + 60)
               .font('Helvetica')
               .text(order.paymentMethod, 450, customerInformationTop + 60);

            // Shipping Address with better formatting
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text('SHIPPING ADDRESS:', 50, customerInformationTop + 80)
               .fontSize(10)
               .font('Helvetica')
               .text(order.address[0].fullName, 50, customerInformationTop + 100)
               .text(order.address[0].streetAddress, 50, customerInformationTop + 115)
               .text(`${order.address[0].city}, ${order.address[0].state}`, 50, customerInformationTop + 130)
               .text(`PIN: ${order.address[0].zipCode}`, 50, customerInformationTop + 145)
               .text(`Phone: ${order.address[0].phone}`, 50, customerInformationTop + 160);

            // Items table with improved layout
            const tableTop = 380;
            let position = tableTop;

            // Table header with better column widths
            function generateTableRow(doc, y, item, quantity, unitPrice, total) {
                doc.fontSize(10)
                   .text(item, 50, y, { width: 250 })
                   .text(quantity, 300, y, { width: 90, align: 'center' })
                   .text(unitPrice, 390, y, { width: 90, align: 'right' })
                   .text(total, 480, y, { width: 70, align: 'right' });
            }

            // Add table header with bold font
            doc.font('Helvetica-Bold')
               .fillColor('#444444');
            generateTableRow(
                doc,
                position,
                'Item Description',
                'Quantity',
                'Unit Price',
                'Amount'
            );

            // Add thick line below header
            doc.strokeColor('#3498db')
               .lineWidth(2)
               .moveTo(50, position + 20)
               .lineTo(550, position + 20)
               .stroke();

            // Reset for items
            doc.font('Helvetica')
               .strokeColor('#aaaaaa')
               .lineWidth(1);

            position += 30;
            let total = 0;

            // Process items with consistent spacing
            if (order.items.length > 10) {
                // First page items (1-10)
                for (let i = 0; i < 10; i++) {
                    const item = order.items[i];
                    const itemTotal = item.price;
                    total += itemTotal;

                    generateTableRow(
                        doc,
                        position,
                        item.product.productname,
                        item.quantity,
                        `${item.price}`,
                        `${itemTotal}`
                    );
                    generateHr(doc, position + 20);
                    position += 30;
                }

                // Add new page for remaining items
                doc.addPage();
                addHeader();
                position = 150; // Reset position for new page

                // Table header for new page
                doc.font('Helvetica-Bold');
                generateTableRow(
                    doc,
                    position,
                    'Item',
                    'Quantity',
                    'Unit Price',
                    'Total'
                );
                generateHr(doc, position + 20);
                doc.font('Helvetica');
                position += 30;

                // Remaining items
                for (let i = 10; i < order.items.length; i++) {
                    const item = order.items[i];
                    const itemTotal = item.price;
                    total += itemTotal;

                    generateTableRow(
                        doc,
                        position,
                        item.product.productname,
                        item.quantity,
                        `${item.price/item.quantity}`,
                        `${itemTotal}`
                    );
                    generateHr(doc, position + 20);
                    position += 30;
                }
            } else {
                // Single page for 10 or fewer items
                order.items.forEach(item => {
                    const itemTotal = item.price;
                    total += itemTotal;

                    generateTableRow(
                        doc,
                        position,
                        item.product.productname,
                        item.quantity,
                        `${item.price/item.quantity}`,
                        `${itemTotal}`
                    );
                    generateHr(doc, position + 20);
                    position += 30;
                });
            }

            // Totals section with right alignment and better spacing
            const subtotalPosition = position + 30;
            
            // Add totals with better formatting
            doc.font('Helvetica-Bold');
            
            // Right-aligned totals
            doc.text('Subtotal:', 350, subtotalPosition)
               .text(`${total.toFixed(2)}`, 480, subtotalPosition, { align: 'right' });

            if (order.discountAmount) {
                doc.text('Coupon Discount:', 350, subtotalPosition + 20)
                   .text(`-${order.discountAmount.toFixed(2)}`, 480, subtotalPosition + 20, { align: 'right' });
            }

            // Add line above grand total
            generateHr(doc, subtotalPosition + 40);

            doc.fontSize(12)
               .text('Grand Total:', 350, subtotalPosition + 50)
               .text(`${order.totalAmount.toFixed(2)}`, 480, subtotalPosition + 50, { align: 'right' });

            // Footer with better styling
            doc.font('Helvetica')
               .fontSize(10)
               .fillColor('#666666')
               .text(
                   'We appreciate your trust in us. Looking forward to serving you again!',
                   50,
                   doc.page.height - 70,
                   { align: 'center', width: 500 }
               )
            doc.end();
        });

        // Wait for PDF to be generated then send it
        pdfPromise
            .then((filePath) => {
                // Set response headers
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

                // Stream the file to response
                const fileStream = fs.createReadStream(filePath);
                fileStream.pipe(res);

                // Delete file after streaming
                fileStream.on('end', () => {
                    fs.unlink(filePath, (err) => {
                        if (err) console.error('Error deleting file:', err);
                    });
                });
            })
            .catch((error) => {
                console.error('Error generating PDF:', error);
                res.status(500).send('Error generating invoice');
            });

    } catch (error) {
        console.error('Error in invoice generation:', error);
        res.status(500).send('Error generating invoice');
    }
};

// Helper functions
function generateHr(doc, y) {
    doc.strokeColor('#aaaaaa')
       .lineWidth(1)
       .moveTo(50, y)
       .lineTo(550, y)
       .stroke();
}

function formatDate(date) {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function generateTableRow(doc, y, item, quantity, unitPrice, total) {
    doc.fontSize(10)
       .text(item, 50, y)
       .text(quantity, 280, y, { width: 90, align: 'center' })
       .text(unitPrice, 370, y, { width: 90, align: 'right' })
       .text(total, 0, y, { align: 'right' });
}

exports.about_Page = async (req, res) => {
    try {
        res.status(200).render('user/about');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

exports.contact_Page=async(req,res)=>{
    try {
        res.status(200).render('user/contact')
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}




