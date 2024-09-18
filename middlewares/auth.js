const User=require('../models/userModel')

const userAuth=async(req,res,next)=>{
    try {
        if (req.session.user) {
            const userData = await user.find({ email: req.session.user });
            if (userData[0].is_block) {
              req.session.destroy();
             
              res.redirect("/");
            } else {
              next();
            }
          } else {
            res.redirect("/login");
          }
        } catch (error) {
          console.log(error);
        }
      };




module.exports={
    userAuth
}