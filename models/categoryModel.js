const mongoose=require('mongoose')

const categorySchema=mongoose.Schema({
    category_name:{
        type:String,
        required:true
    },
    offer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Offer'
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
},{
      timestamps:true
});
    


const category=mongoose.model("category",categorySchema)
module.exports=category