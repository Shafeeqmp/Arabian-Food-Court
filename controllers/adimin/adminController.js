const admin=require('../../routes/admin/adminRoutes')
const user=require('../../models/userModel')
const bcrypt=require('bcrypt')

//Admin Login Page Loading
const load_AdminPage=(req,res)=>{
    res.render("admin/adminLogin")
}

//Admin Dashboard Page Loading
const load_AdminDash=(req,res)=>{
    res.render('admin/admin_Dashboard')
}

//Admin Dashboard
const admin_Dashboard=async(req,res)=>{
    try {
        const {email,password}=req.body
        const findAdmin=await user.findOne({email:email});
        if(!findAdmin){
            res.render('admin/adminLogin')
        }
        const checkpass=await bcrypt.compare(
            req.body.password,
            findAdmin.password
        )
        if(checkpass){
            req.session.email=findAdmin;
            if(findAdmin.isAdmin){
                req.session.email=false;
                req.session.isAdmin=true;
                res.render('admin/admin_Dashboard')
            }else{
                res.render("adminLogin")
            }
        }
    } catch (error) {
        console.log("login error"+error);
        
    }
}

//User Manage Page Loading
const load_userMng=async(req,res)=>{
    try {
          const userdata = await user.find({ isAdmin: false });
          res.render("admin/userMng", { userdata, title: "userMng" });
       
      } catch (error) {
        console.log(error);
      }
} 

//User Block Sectioin
const block_user=async(req,res)=>{
    try {
        await user.findByIdAndUpdate(req.params.id,{isBlocked:false});
         res.redirect("/admin/loaduserMng")
    } catch (error) {
        console.error("Error blocking user:", error.message);
        res.status(500).send("An error occurred while blocking the user.");
    }
}

//User Unblock Section
const unblock_user=async(req,res)=>{
    try {
        await user.findByIdAndUpdate(req.params.id,{isBlocked:true});
         res.redirect("/admin/loaduserMng")
    } catch (error) {
        console.error("Error unblocking user:", error.message);
        res.status(500).send("An error occurred while blocking the user.");
    }
}

//Admin Logout Section
const logout = (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/admin");
      }
    });
  };

  



module.exports={
    load_AdminPage,
    load_AdminDash,
    admin_Dashboard,
    load_userMng,
    block_user,
    unblock_user,
    logout
}