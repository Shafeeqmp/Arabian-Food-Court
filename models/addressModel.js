const mongoose=require('mongoose');

const addressSchema =mongoose.Schema({
    
    fullName: {
        type: String,
        required: true
    },
    streetAddress: {
        type: String,
        required: true
    },
    zipCode: {
        type: Number,
        required: true
    },
    phone: {
        type: Number,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'user'
    }
}, { timestamps: true });

const address=mongoose.model("address",addressSchema);
module.exports=address