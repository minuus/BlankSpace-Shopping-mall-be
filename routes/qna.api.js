const express = require("express");
const authController = require("../controllers/auth.controller");
const qnaController = require("../controllers/qna.controller");
const router = express.Router();

// Q&A 생성
router.post(
  "/",
  authController.authenticate,
  qnaController.createQnA
);

// Q&A 목록 조회
router.get("/", qnaController.getQnAs);
router.get('/:id',qnaController.getQnAById)

// Q&A 수정
router.put(
  "/:id",
  authController.authenticate,
  authController.checkAdminPermission,
  qnaController.updateQnA
);

// // Q&A 삭제
// router.delete(
//   "/:id",
//   authController.authenticate,
//   authController.checkAdminPermission,
//   qnaController.deleteQnA
// );


module.exports = router;