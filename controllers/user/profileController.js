const category=require('../../models/categoryModel');
const product=require('../../models/productModel');
const User = require('../../models/userModel'); 
const address=require('../../models/addressModel')
const cart=require('../../models/cartModel')


const profile_Page=(req,res)=>{
    res.render('user/profilePage')
}






module.exports={
    profile_Page
}