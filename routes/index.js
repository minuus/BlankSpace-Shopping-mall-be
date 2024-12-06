const express = require("express");
const router = express.Router();
const userApi = require("./user.api");
const authApi = require("./auth.api");
const productApi = require("./product.api");
const cartApi = require("./cart.api");
const orderApi = require("./order.api");
const collectionApi = require("./collection.api");
//const shopApi = require("./shop.api");
const noticeApi = require("./notice.api");
const qnaApi = require("./qna.api");
const userRouter = require("./user.api"); // user 라우터 가져오기(추가)
const reviewApi = require("./review.api");


// 라우터 연결
router.use("/users", userRouter); // '/api/users' 경로로 userRouter 연(추가)
router.use("/user", userApi);
router.use("/auth", authApi);
router.use("/product", productApi);
router.use("/cart", cartApi);
router.use("/order", orderApi);
router.use("/collection", collectionApi);
router.use("/notices", noticeApi);
router.use("/qna", qnaApi);
router.use("/reviews", reviewApi);
//router.use("/shop", shopApi);

module.exports = router;
