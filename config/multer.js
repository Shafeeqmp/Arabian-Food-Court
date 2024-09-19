const multer = require('multer')
const path = require('path')

//configuration of multer

const storage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,"uploads/")
    },
    filename:function(req,file,cb){
        cb(null,file.fieldname+'-'+Date.now()+path.extname(file.originalname)); // unique filename
    }
})

const uploads = multer ({storage:storage})

module.exports=uploads;