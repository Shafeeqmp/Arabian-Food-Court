const admin =require("../../routes/admin/adminRoutes")
const category=require("../../models/categoryModel")



//Load Category Page Section
const load_CategoryPage=async(req,res)=>{
    try {
       if(req.session.isAdmin){
        const catData = await category.find();
           res.render('admin/categoryPage',{catData})
       } else{
        res.redirect('/admin')
       }
    } catch (error) {
        console.error(error);
        res.status(500).json({ err: "something went wrong while adding new category" });
    }
}

// Add Category Section
const add_Category=async(req,res)=>{
    try {
        const categoryName=req.body.name;
        const upperCaseName = categoryName.toUpperCase();
        const existCat = await category.findOne({ category_name: upperCaseName });
        const catData=await category.find()
        if(existCat){
            return res.render('admin/categoryPage',{
              existCat:"This category is already exist",
                catData
            })
        }
        const newcategory =new category({
            category_name:upperCaseName
        });
            await newcategory.save()
            res.redirect('/admin/categoryPage')
        
    } catch (error) {
        console.log("error");
        res.status(500).json({ err: "something went wrong while adding new category" });
    }
}

//Edit Category Section
const edit_Category = async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const upperCaseName = name.toUpperCase();
      const cateData = await category.findById(id);
      if (!cateData) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      const existCat = await category.findOne({ category_name: upperCaseName });
      // Check if a category with the new name already exists
      if (existCat && existCat._id.toString() !== id) {
        return res.status(400).json({ success: false, message: 'Category name already exists' });
      }
      cateData.category_name = upperCaseName;
      console.log(cateData);
      
      await cateData.save();
  
      res.status(200).json({ success: true, message: 'Category updated successfully' });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ success: false, message: 'Failed to update category' });
    }
  };
  

//Delete Category Section
const delete_Category=async (req, res) => {
  try {
      const { id } = req.params;
      const Category = await category.findById(id);
      if (!Category) {
          return res.status(404).json({ success: false, message: 'Category not found' });
      }
      Category.isDeleted = true;
      await Category.save();
      res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
};


//Restore Category Setion
  const restore_Category=async (req, res) => {
    try {
        const { id } = req.params;
        const Category = await category.findById(id);
        if (!Category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        if (!Category.isDeleted) {
            return res.status(400).json({ success: false, message: 'Category is not deleted' });
        }
        Category.isDeleted = false;
        await Category.save();
        res.status(200).json({ success: true, message: 'Category restored successfully' });
    } catch (error) {
        console.error('Error restoring category:', error);
        res.status(500).json({ success: false, message: 'Failed to restore category' });
    }
};

  
  



module.exports={
    load_CategoryPage,
    add_Category,
    delete_Category,
    edit_Category,
    restore_Category
}