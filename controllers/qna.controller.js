const QnA = require("../models/QnA");
const qnaController = {};
const PAGE_SIZE = 10;

const mongoose = require("mongoose");

qnaController.createQnA = async (req, res) => {
  try {
    const {
      user,
      product,
      category,
      isSecret,
      password,
      QueryTitle,
      QueryContent,
      AnswerTitle,
      AnswerContent,
      isAnswered,
      isDeleted,
    } = req.body;

    // user와 product가 유효한 ObjectId인지 확인
    if (
      !mongoose.Types.ObjectId.isValid(user) ||
      !mongoose.Types.ObjectId.isValid(product)
    ) {
      throw new Error("Invalid user or product ID");
    }

    const qna = new QnA({
      user: new mongoose.Types.ObjectId(user),
      product: new mongoose.Types.ObjectId(product),
      category,
      isSecret,
      password,
      QueryTitle,
      QueryContent,
      AnswerTitle,
      AnswerContent,
      isAnswered,
      isDeleted,
    });

    await qna.save();

    const savedQnA = await QnA.findById(qna._id)
      .populate("user", "name")
      .populate("product");

    res.status(201).json({ status: "success", data: savedQnA });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

qnaController.getQnAs = async (req, res) => {
  try {
    const { page = 1, limit = 10, title } = req.query;  // 기본 limit 10으로 설정
    let response = { status: "success" };

    // 검색 조건 설정
    const cond = title ? { title: { $regex: title, $options: "i" } } : {};

    // 총 항목 수 계산
    const totalItemNum = await QnA.countDocuments(cond); 
    const totalPageNum = Math.ceil(totalItemNum / limit); // 전체 페이지 수 계산

    // 페이지네이션 적용
    const qnaList = await QnA.find(cond)
      .populate("user", "name") // user의 name 필드만 가져오기
      .populate("product") // product 정보도 가져오기
      .skip((page - 1) * limit) // 페이지네이션 적용
      .limit(Number(limit)) // limit 적용
      .sort({ _id: -1 })
      .exec();

    const adminQnaList = await QnA.find({})
      .exec();

    // 응답 생성
    response.data = qnaList;           // 데이터 배열
    response.adminData = adminQnaList;           // 데이터 배열
    response.totalPageNum = totalPageNum; // 전체 페이지 수
    response.currentPage = Number(page);  // 현재 페이지
    response.totalItemNum = totalItemNum; // 총 항목 수

    // 전체 항목 수, 페이지 수 등을 클라이언트에 전달
    res.status(200).json(response);  // 200 OK 응답 전송
  } catch (error) {
    res.status(500).json({ status: "fail", error: error.message });  // 에러 처리
  }
};

qnaController.getQnAById = async (req, res) => {
  try {
    const qnaId = req.params.id;
    const qna = await QnA.findById(qnaId)
      .populate("user", "name") // user의 name 필드만 가져오기
      .populate("product"); // product 정보도 가져오기
    if (!qna) throw new Error("No QnA found with this ID");
    res.status(200).json({ status: "success", data: qna });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

// Q&A 수정 - 답변 추가 및 isAnswered 업데이트
qnaController.updateQnA = async (req, res) => {
  try {
    const { AnswerContent, AnswerTitle } = req.body;

    // QnA 업데이트 - 답변 추가 및 상태 변경
    const updatedQnA = await QnA.findByIdAndUpdate(
      req.params.id,
      {
        AnswerContent: AnswerContent || undefined, // 답변 내용 업데이트
        AnswerTitle: AnswerTitle || undefined, // 답변 제목 (선택사항)
        isAnswered: true, // 답변이 달렸으므로 isAnswered를 true로 설정
      },
      { new: true } // 업데이트된 문서를 반환
    );

    if (!updatedQnA) {
      return res.status(404).json({ error: "Q&A not found" });
    }

    res.status(200).json({ status: "success", data: updatedQnA });
  } catch (error) {
    console.error("Error updating QnA:", error);
    res.status(500).json({ error: "Failed to update QnA" });
  }
};


qnaController.getQnAsByUser = async (req, res) => {
  try {
    const { userId } = req.params; // URL에서 userId 가져오기
    const { page = 1, limit = 10 } = req.query;

    // userId 기반으로 필터링
    const cond = { user: userId };
    const totalItemNum = await QnA.countDocuments(cond); // 조건에 맞는 문서 수
    const totalPageNum = Math.ceil(totalItemNum / limit); // 전체 페이지 수 계산

    // 조건에 맞는 데이터 가져오기
    const userQnAs = await QnA.find(cond)
      .populate("product", "name") // 제품 정보 가져오기
      .populate("user", "name")   // 사용자 이름 가져오기
      .skip((page - 1) * limit)  // 페이지네이션
      .limit(Number(limit))      // 제한된 항목 수
      .sort({ createdAt: -1 });  // 최신순 정렬

    res.status(200).json({
      status: "success",
      data: userQnAs,
      totalItemNum,
      totalPageNum,
      currentPage: Number(page),
    });
  } catch (error) {
    res.status(500).json({ status: "fail", error: error.message });
  }
};


module.exports = qnaController;