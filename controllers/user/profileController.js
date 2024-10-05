const category=require('../../models/categoryModel');
const product=require('../../models/productModel');
const User = require('../../models/userModel'); 
const Address=require('../../models/addressModel')
const cart=require('../../models/cartModel')


exports. profile_Page=async(req,res)=>{
    try {
        const address = await Address.find({userId:req.session.userId}).populate('userId')
        console.log(address);
        
        res.render('user/profilePage',{address})
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).send('Internal Server Error'); 
    }
}






