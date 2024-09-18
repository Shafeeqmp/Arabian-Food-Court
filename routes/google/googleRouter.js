const express=require('express')
const googleRouter=express.Router()
const passport=require("../../config/passport")



googleRouter.get("/google",passport.authenticate("google", {scope: ["profile", "email"],prompt: "select_account" }));
googleRouter.get("/google/callback",passport.authenticate("google", { failureRedirect: "/signup", failureFlash: true }),
  (req, res) => {
    if (req.isAuthenticated()) {
      res.redirect("/userHomePage"); 
    }else{
      res.redirect('/')
    }
  }
);


module.exports=googleRouter;