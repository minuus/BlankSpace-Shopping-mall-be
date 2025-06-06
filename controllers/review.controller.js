
// review.controller.js
const { response } = require('express');
const Review = require('../models/Review');
const Order = require('../models/Order'); // Order 모델 가져오기

exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
    .sort({ createAt: -1})
    .populate('productId', 'name');

    res.status(200).json(reviews);
  } catch(error) {
    res.status(500).json({ message: error.message});
  }
}

//리뷰조회기능임
exports.getReviews = async (req, res) => {
  try {
    const { productId } = req.params;
  
    const reviews = await Review.find( { productId })
    .sort( {createdAt: -1 });

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
//확인용
exports.createReview = async (req, res) => {
  try {
    console.log('Received data:', req.body);
    console.log('Received file:', req.file);

    const { productId, rating, text, name } = req.body;

    // 데이터 형식 점검: rating을 숫자로 변환
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const newReview = new Review({
      productId,
      rating: parsedRating,
      text,
      name
    });

    await newReview.save();
    console.log('Review saved:', newReview); // 데이터베이스에 저장된 리뷰 로그 추가
    res.status(201).json(newReview);
  } catch (error) {
    console.error('Error while saving review:', error); // 추가된 에러 로그
    res.status(500).json({ message: error.message });
  }
};

exports.createNewReview = async (req, res) => {
  try{
    const { productId, rating, text, name, orderId, image ,  imageUrls} = req.body;

    // 데이터 형식 점검: rating을 숫자로 변환
    const parsedRating = parseInt(rating, 10);
    const imageList = imageUrls || image || [];
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    if(!productId || !rating || !text || !name){
      return res.status(400).json({error: 'not exist info that must included'})
    }
    
    const newReview = new Review({
      productId,
      rating: parsedRating,
      text,
      name,
      imageUrls: Array.isArray(imageList) ? imageList : [imageList],
    });
    await newReview.save();

    const order = await Order.findById(orderId);
    const item = order.items.find(i => i.productId.toString() === productId);
    if (order) {
      order.isReviewed = true;
      await order.save();
    }
    return res.status(201).json({ message: 'Review created successfully', review: newReview });

  } catch (error) {
    console.error('Error while saving review:', error); // 추가된 에러 로그
    res.status(500).json({ message: error.message });
  }
}

exports.updateReview = async (req, res) => {
  try {
    const { reviewId, rating, text, name, image } = req.body;

    if(!reviewId){
      return res.status(400).json({ error: "reviewId is undefined"});
    }

    const updateReviewData = {};
    
    // 별점 수정 시
    if(rating !== undefined){
      const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
      updateReviewData.rating = parsedRating;
    }
    if(text !== undefined) updateReviewData.text = text;
    if(name !== undefined) updateReviewData.name = name;
    if(name !== image) updateReviewData.image = image;
    
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      { $set: updateReviewData },
      { new: true }
    )

    if(!updatedReview){
      return res.status(404).json({ message: 'review not found'})
    }
    res.status(200).json(updateReviewData);
  } catch(error) {
      console.error('Error while saving review:', error); // 추가된 에러 로그
      res.status(500).json({ message: error.message });
  }
}