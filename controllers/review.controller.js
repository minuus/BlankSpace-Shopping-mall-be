// review.controller.js

const Review = require('../models/Review');
const Order = require("../models/Order"); // Order 모델 가져오기


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
    // console.log("Received data:", req.body);

    const { productId, rating, text, name, orderId } = req.body;

    // 유효성 검사
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // 리뷰 생성
    const newReview = new Review({
      productId,
      rating: parsedRating,
      text,
      name,
    });
    await newReview.save();

    // console.log("Review saved:", newReview);

    // 해당 주문의 isReviewed 업데이트
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    order.isReviewed = true;
    await order.save();


    res.status(201).json(newReview);
  } catch (error) {
    console.error("Error while saving review:", error);
    res.status(500).json({ message: error.message });
  }
};



