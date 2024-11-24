const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User"); // User 모델 가져오기
const router = express.Router();
const userController = require("../controllers/user.controller");
const authController = require("../controllers/auth.controller");

//회원가입

router.post("/", userController.createUser);
router.get("/me", authController.authenticate, userController.getUser); // 토큰이 valid한 토큰인지, 이 token 가지고 유저를 찾아서 리턴 (미들웨어,체인)
router.get("/",userController.getUsers);
router.delete("/delete", authController.authenticate, userController.deleteUser);
router.put("/update", authController.authenticate, userController.updateUserInfo);

router.put("/:id", async (req, res) => {
    console.log("요청 받은 ID:", req.params.id);
    console.log("요청 받은 데이터:", req.body);
    try {
      const { id } = req.params; // 요청 경로에서 ID 추출
      const { level } = req.body; // 요청 본문에서 level 추출
  
      if (!level) {
        return res.status(400).json({ message: "Level 필드가 없습니다." });
      }
  
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { level }, // level 업데이트
        { new: true } // 업데이트 후 데이터를 반환하도록 설정
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }
  
      res.status(200).json({ user: updatedUser });
    } catch (error) {
      console.error("업데이트 실패:", error.message);
      res.status(500).json({ message: "서버 오류 발생", error: error.message });
    }
  });
  
  
module.exports = router;


