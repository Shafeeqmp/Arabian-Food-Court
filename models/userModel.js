const mongoose = require('mongoose')
const userSchema=mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    googleId:{
        type:String,
        unique:true

    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    deletedAt:{
        type:Date,
        default:null
    }
    
});
const user=mongoose.model("user",userSchema);
module.exports=user
