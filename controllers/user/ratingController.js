const Rating = require('../../models/ratingModel');

exports.submitRating = async (req, res) => {
  try {
    const { productId, rating } = req.body;
    const userId = req.session.user_id;

    if (!productId || !rating || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Check if user has already rated this product
    let existingRating = await Rating.findOne({ userId, productId });

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      await existingRating.save();
    } else {
      // Create new rating
      await Rating.create({
        userId,
        productId,
        rating
      });
    }

    // Calculate average rating
    const ratings = await Rating.find({ productId });
    const averageRating = ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length;

    res.json({ 
      success: true, 
      message: 'Rating submitted successfully',
      averageRating: averageRating.toFixed(1)
    });

  } catch (error) {
    console.error('Rating submission error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error submitting rating' 
    });
  }
};

exports.getProductRating = async (req, res) => {
  try {
    const { productId } = req.query;
    const userId = req.session.user_id;

    const userRating = await Rating.findOne({ userId, productId });
    const allRatings = await Rating.find({ productId });
    const averageRating = allRatings.length > 0 
      ? (allRatings.reduce((acc, curr) => acc + curr.rating, 0) / allRatings.length).toFixed(1)
      : 0;

    res.json({
      success: true,
      userRating: userRating ? userRating.rating : 0,
      averageRating,
      totalRatings: allRatings.length
    });

  } catch (error) {
    console.error('Get rating error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting rating' 
    });
  }
};
