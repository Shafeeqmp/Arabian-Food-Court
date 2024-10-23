
module.exports = async (req, res, next) => {
    try {
        if (req.session && req.session.isAdmin) {
            return next();  
        } else {
            return res.redirect('/admin');
        }
    } catch (error) {
        console.error('Error in isAdmin middleware:', error);
        return res.status(500).send('Internal server error');
    }
};
