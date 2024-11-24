const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path"); // 경로 모듈 추가
const indexRouter = require("./routes/index");
const app = express();
const userRouter = require("./routes/user.api"); // user 라우터(추가)


require("dotenv").config();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // req.body가 객체로 인식이 됩니다
app.use("/api", indexRouter);
// 라우트 연결
app.use("/api/users", userRouter); // user 라우터 등록(ㅊㄱ)


// 정적 파일 서빙 설정
app.use(express.static(path.join(__dirname, 'public')));

const mongoURI = process.env.LOCAL_DB_ADDRESS;
mongoose
  .connect(mongoURI)
  .then(() => console.log("mongoose connected"))
  .catch((err) => console.log("DB connection fail", err));

app.listen(process.env.PORT || 5000, () => {
  console.log("server on");
});
