const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const axios = require("axios");

// AI 백엔드 서버 URL
const aiApiUrl = process.env.AI_API_URL || "http://165.229.89.159:8080";

// 기존 라우트들
router.get("/", productController.getProducts);
router.post("/", productController.createProduct);
router.delete("/:id", productController.deleteProduct);
router.put("/:id", productController.editProduct);
router.get("/:id", productController.getProductDetail);
router.get("/sales/sorted", productController.getProductsSortedBySales);

// CLIP 모델을 사용한 상품 정보 자동 추출 API
router.post("/extract-info", async (req, res) => {
  try {
    const { imageUrls } = req.body;
    
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({
        error: "이미지 URL 배열이 필요합니다."
      });
    }

    console.log(`[Product Extract] 이미지 정보 추출 시작: ${imageUrls.length}개 이미지`);

    // AI 백엔드에 CLIP 기반 상품 정보 추출 요청
    const extractResponse = await axios.post(`${aiApiUrl}/extract-product-info`, {
      image_urls: imageUrls,
      categories: ["Outer", "Top", "Pants", "Shoes", "Acc"] // 현재 프로젝트의 카테고리
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 120초로 타임아웃 증가
    });

    // 핵심 수정: AI 서버 응답에서 올바른 데이터 추출
    const extractedInfo = extractResponse.data.data || extractResponse.data;
    
    console.log(`[Product Extract] 추출 완료:`, extractedInfo);

    res.json({
      success: true,
      data: extractedInfo
    });

  } catch (error) {
    console.error('[Product Extract] 오류:', error);
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      // 타임아웃 오류
      res.status(408).json({
        error: 'AI 분석 시간이 초과되었습니다. 다시 시도해주세요.',
        details: 'AI 서버가 응답하는데 시간이 오래 걸리고 있습니다.'
      });
    } else if (error.response) {
      // AI 백엔드에서 오류 응답
      res.status(error.response.status).json({
        error: 'AI 서버 오류',
        details: error.response.data
      });
    } else if (error.request) {
      // AI 백엔드 연결 실패
      res.status(503).json({
        error: 'AI 서버에 연결할 수 없습니다.',
        details: 'AI 백엔드 서버가 실행 중인지 확인해주세요.'
      });
    } else {
      // 기타 오류
      res.status(500).json({
        error: '상품 정보 추출 중 오류가 발생했습니다.',
        details: error.message
      });
    }
  }
});

module.exports = router;
