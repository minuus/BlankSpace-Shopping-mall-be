const User = require("../models/User");
const bcrypt = require("bcryptjs");

const userController = {};

userController.createUser = async (req, res) => {
  try {
    let { email, password, name, level } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      throw new Error("User already exist");
    }
    const salt = await bcrypt.genSaltSync(10);
    password = await bcrypt.hash(password, salt);
    const newUser = new User({
      email,
      password,
      name,
      level: level ? level : "customer",
    });
    await newUser.save();
    return res.status(200).json({ status: "success" });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};
// TODO: 기존 getUser 컨트롤러. 비밀번호까지 넘겨버림
// userController.getUser = async (req, res) => {
//   try {
//     const { userId } = req;
//     const user = await User.findById(userId);
//     if (user) {
//       return res.status(200).json({ status: "success", user });
//     }
//     throw new Error("Invalid token");
//   } catch (error) {
//     res.status(400).json({ status: "error", error: error.message });
//   }
// };


// TODO: 수정된 getUser 컨트롤러. 비밀번호를 제외하고 넘겨줌. 보안 문제 해결
userController.getUser = async (req, res) => {
  try {
    const { userId } = req; // auth 미들웨어에서 설정된 userId
    const user = await User.findById(userId).select("-password"); // 비밀번호 제외

    if (!user) {
      return res.status(404).json({ status: "fail", error: "User not found" });
    }

    return res.status(200).json({ status: "success", user });
  } catch (error) {
    return res.status(500).json({ status: "error", error: error.message });
  }
};


userController.getUsers = async (req, res) => {
  try {
    const users = await User.find(); // 모든 사용자를 가져옵니다.
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ status: "error", error: error.message });
  }
};



userController.deleteUser = async (req, res) => {
  try {
    const { userId } = req;
    const { currentPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: "fail", error: "User not found" });
    }

    // 비밀번호 검증
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: "fail", error: "Incorrect password" });
    }

    // 사용자 삭제
    await User.findByIdAndDelete(userId);

    return res.status(200).json({ status: "success", message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ status: "error", error: error.message });
  }
};


userController.updateUserInfo = async (req, res) => {
  try {
    const { userId } = req; // auth 미들웨어에서 추가된 userId
    const { name, newPassword, currentPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: "fail", error: "User not found" });
    }

    // 현재 비밀번호 확인
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: "fail", error: "Incorrect current password" });
    }

    // 사용자 정보 업데이트
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    if (name) {
      user.name = name;
    }

    await user.save();

    return res.status(200).json({ status: "success", user });
  } catch (error) {
    return res.status(500).json({ status: "error", error: error.message });
  }
};





module.exports = userController;

