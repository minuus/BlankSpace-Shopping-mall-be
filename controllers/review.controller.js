

// review.controller.js
const Review = require('../models/Review');

//createReview로 리뷰생성해줌(저장)
exports.createReview = async (req, res) => {
  try {
    const { productId, rating, text } = req.body; //리뷰데이터 3가지
    const image = req.file ? req.file.path : null; //이미지 업로드

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const newReview = new Review({
      productId,
      rating,
      text,
      image,
    });

    await newReview.save();
    res.status(201).json(newReview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//리뷰조회기능임
exports.getReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ productId });
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//리뷰 삭제기능추가
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    await Review.findByIdAndDelete(reviewId);
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//에러 점검코드 추가함.
exports.createReview = async (req, res) => {
  try {
    console.log('Received data:', req.body);
    console.log('Received file:', req.file);

    const { productId, rating, text } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    // 데이터 형식 점검: rating을 숫자로 변환
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const newReview = new Review({
      productId,
      rating: parsedRating,
      text,
      image,
    });

    await newReview.save();
    console.log('Review saved:', newReview); // 데이터베이스에 저장된 리뷰 로그 추가
    res.status(201).json(newReview);
  } catch (error) {
    console.error('Error while saving review:', error); // 추가된 에러 로그
    res.status(500).json({ message: error.message });
  }
};


