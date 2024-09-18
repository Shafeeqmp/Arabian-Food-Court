const User = require('../../models/userModel'); 
const nodemailer = require('nodemailer'); 
const env=require('dotenv').config(); 
const bcrypt = require('bcrypt'); 



const loadIndexPage = (req, res) => {
    if(req.session.email){
        res.redirect("/menuPage")
    }else if(req.session.isAdmin){
        res.redirect('/admin/admin_dashboard')
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
            return res.render('user/menuPage');
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
            return res.render("user/signupPage", { message: 'Passwords do not match' });
        }
        const findUser = await User.findOne({ email:email });
        if (findUser) {
           return res.render("user/signupPage", { message: "Email already exists" });
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

const resendOtp=async(req,res)=>{
    try {
        const {email}=req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"email not found in session"})
        }
        const otp =generateOtp();
        req.session.userOtp=otp
        const emailSent=await sendVerificationEmail(email.otp);
        if(emailSent){
            console.log("Resend OTP",otp);
            res.status(200).json({success:true,message:"OTP Resend Successfuly"})
            
        }else{
            res.status(500).json({success:false,message:"Failed to resend OTP, Please try"})
        }
    } catch (error) {
     console.error("Error responding OTP",error);
     res.status(500).json({success:false,message:"Internal Server Error.Please try again"})
        
    }
}

const loadUserHomePage=(req,res)=>{
    res.render('user/menuPage')
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



module.exports = {
    loadIndexPage,
    loadLogin,
    login,
    loadSignup,
    signup,
    verifyOTP,
    resendOtp,
    loadUserHomePage,
    logout
};
