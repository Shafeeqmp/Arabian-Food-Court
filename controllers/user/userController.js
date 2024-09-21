const User = require('../../models/userModel'); 
const nodemailer = require('nodemailer'); 
const env=require('dotenv').config(); 
const bcrypt = require('bcrypt'); 
const category=require('../../models/categoryModel')
const product=require('../../models/productModel')



const loadIndexPage = (req, res) => {
    if(req.session.email){
        res.redirect("/menuPage")
    }else if(req.session.isAdmin){
        res.redirect('/')
    }
    res.render('user/index');
};

const loadLogin = (req, res) => {
    res.render('user/loginPage');
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ email:email });
        if (!findUser) {
            return res.render('user/loginPage', { pmessage: 'Incorrect User_name' });
        }
        const blockUser=await User.findOne({isBlocked:true})
        if(blockUser){
            return res.render('user/loginPage', { pmessage: 'User is Blocked' });
        }
        const isPasswordValid = await bcrypt.compare(password, findUser.password);
        if (!isPasswordValid) {
            req.session.email=findUser.email;
            
            return res.render('user/loginPage', { pmessage: 'Incorrect UserName or password' });
        }
        req.session.userId = findUser._id;
        if (findUser.isAdmin) {
            req.session.email=false;
            req.session.isAdmin=true;
            return res.render('user/error')
        } else {
            return res.redirect('/userHomePage');
        }
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).render('user/login', { message: 'Something went wrong. Please try again.' });
    }
};


const loadSignup = async (req, res) => {
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

const signup = async (req, res) => {
    try {
        const { name,email, password, cPassword } = req.body;
        if (password !== cPassword) {
            return res.redirect("/signup", { message: 'Passwords do not match' });
        }
        const findUser = await User.findOne({ email:email });
        if (findUser) {
           return res.redirect("/signup", { message: "Email already exists" });
        }
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json('email-error');
        }
        req.session.userOtp = otp;
        req.session.userData = {name, email, password};
        console.log('Stored OTP in session:', req.session.userOtp)
        res.render("user/otpForm");
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

const verifyOTP=async(req,res)=>{       
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

const resendOtp = async (req, res) => {
    console.log("Resend OTP route hit");  // Debugging log

    try {
        // Ensure session is available
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



const loadUserHomePage=async(req,res)=>{
    const Category = await category.find({isDeleted:false});
    const Product=await product.find()
    res.render('user/menuPage',{Category,Product})
}

const logout = (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/");
      }
    });
  };


  const single_ProductView=async(req,res)=>{
    try {
      const { id } = req.params; 
      const Product = await product.findById(id);
      res.render('user/single-product', { Product });
    } catch (err) {
      console.error(err);
      res.redirect('/userHomePage');
    }
  }
  



module.exports = {
    loadIndexPage,
    loadLogin,
    login,
    loadSignup,
    signup,
    verifyOTP,
    resendOtp,
    loadUserHomePage,
    logout,
    single_ProductView
};
