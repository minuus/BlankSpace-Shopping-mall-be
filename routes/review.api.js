


// review.api.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const reviewController = require('../controllers/review.controller');


//npm install multer 패키지 설치. 파일 업로드 처리해주는 미들웨어임
//uploads 만듦.

//멀터 사용해서 이미지 업로드
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads')); // 파일 저장 경로 설정
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Routes
router.post('/', upload.single('image'), reviewController.createReview);
router.get('/:productId', reviewController.getReviews);
router.delete('/:reviewId', reviewController.deleteReview);

module.exports = router;