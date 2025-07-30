const Product = require("../models/Product");
const Order = require("../models/Order");

let PAGE_SIZE = 16;
const productController = {};
const filterByCategory = (category) => {
  if (category) {
    return { category: { $in: [category] } }; // 카테고리 배열에서 검색
  }
  return {};
};

productController.createProduct = async (req, res) => {
  try {
    const {
      sku,
      name,
      size,
      image,
      category,
      description,
      price,
      stock,
      status,
      height,
      weight,
      washMethods,
      aiExtractedInfo,
      aiAnalysis,
      clipFeatures
    } = req.body;
    
    console.log('📥 받은 요청 데이터:', {
      sku, name, category, price, height, weight,
      stock: stock ? Object.keys(stock) : '없음',
      aiExtractedInfo: aiExtractedInfo ? '있음' : '없음',
      aiAnalysis: aiAnalysis ? '있음' : '없음',
      clipFeatures: clipFeatures ? {
        imageVectorsCount: clipFeatures.imageVectors ? clipFeatures.imageVectors.length : 0,
        averageVectorLength: clipFeatures.averageVector ? clipFeatures.averageVector.length : 0,
        vectorDimension: clipFeatures.vectorDimension
      } : '없음'
    });
    
    // 재고 데이터 검증
    if (!stock || typeof stock !== 'object' || Object.keys(stock).length === 0) {
      return res.status(400).json({ 
        status: "fail", 
        error: "유효한 재고 정보가 필요합니다." 
      });
    }
    
    const product = new Product({
      sku,
      name,
      size,
      image,
      category,
      description,
      price,
      stock,
      status,
      height,
      weight,
      washMethods,
      aiExtractedInfo,
      aiAnalysis,
      clipFeatures
    });
    
    console.log('💾 저장할 상품 데이터:', {
      stock: Object.keys(product.stock),
      aiExtractedInfo: product.aiExtractedInfo ? '있음' : '없음',
      aiAnalysis: product.aiAnalysis ? '있음' : '없음',
      clipFeatures: product.clipFeatures ? {
        imageVectorsCount: product.clipFeatures.imageVectors ? product.clipFeatures.imageVectors.length : 0,
        averageVectorLength: product.clipFeatures.averageVector ? product.clipFeatures.averageVector.length : 0,
        vectorDimension: product.clipFeatures.vectorDimension
      } : '없음'
    });
    
    await product.save();
    res.status(200).json({ status: "success", product });
  } catch (error) {
    console.error('❌ 상품 생성 오류:', error);
    res.status(400).json({ status: "fail", error: error.message });
  }
};

// productController.getProducts = async (req, res) => {
//   try {
//     const { page = 1, name , category, admin=0 } = req.query; // 기본 페이지 값 설정
//     if (admin == 1) {
//       PAGE_SIZE = 5;
//     } else {
//       PAGE_SIZE = 16;
//     }

//     let response = { status: "success" };

//     // 검색 조건 설정
//     const cond = name
//       ? { name: { $regex: name, $options: "i" }, isDeleted: false }
//       : { isDeleted: false };

//     // 쿼리 생성
//     let query = Product.find(cond);
//     let queryShop = Product.find({});

//     // 페이지네이션 적용
//     if (page) {
//       query = query.skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE);
//       const totalItemNum = await Product.find(cond).countDocuments();
//       const totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);
//       response.totalPageNum = totalPageNum;
//     }

//     // 이름 검색 조건 추가 (이름이 입력된 경우)
//     if (name) {
//       cond = {
//         ...cond,
//         name: { $regex: name, $options: "i" }, // 대소문자 구분 없이 이름 검색
//       };
//     }

//     // 카테고리 필터 추가 (카테고리가 입력된 경우)
//     if (category) {
//       cond = {
//         ...cond,
//         category: category, // 선택된 카테고리로 필터링
//       };
//     }
//     // 쿼리 실행
//     const productList = await query.exec();
//     const productShopList = await queryShop.exec();
//     response.data = productList;

//     // 성공 응답
//     res.status(200).json(response);
//   } catch (error) {
//     // 오류 응답
//     return res.status(400).json({ status: "fail", error: error.message });
//   }
// };


productController.getProducts = async (req, res) => {
  try {
    const { page = 1, name, category, admin = 0, sortBy = "createdAt", sortOrder = "desc" } = req.query; // 정렬 기준 추가
    PAGE_SIZE = admin == 1 ? 5 : 16;

    let response = { status: "success" };

    // 검색 조건 설정
    let cond = { isDeleted: false };

    if (name) {
      cond = {
        ...cond,
        name: { $regex: name, $options: "i" }, // 대소문자 구분 없이 이름 검색
      };
    }

    if (category) {
      cond = {
        ...cond,
        category: category, // 선택된 카테고리로 필터링
      };
    }

    // 정렬 기준 설정
    const sortOptions = {
      createdAt: { createdAt: sortOrder === "asc" ? 1 : -1 },
      price: { price: sortOrder === "asc" ? 1 : -1 }
    };

    // 쿼리 생성 및 페이지네이션 적용
    let query = Product.find(cond)
      .sort(sortOptions[sortBy] || sortOptions.createdAt)
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);
    const totalItemNum = await Product.countDocuments(cond);
    const totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);
    response.totalPageNum = totalPageNum;

    // 쿼리 실행
    const productList = await query.exec();
    response.data = productList;

    // 성공 응답
    res.status(200).json(response);
  } catch (error) {
    // 오류 응답
    return res.status(400).json({ status: "fail", error: error.message });
  }
};



productController.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findByIdAndUpdate(
      { _id: productId },
      { isDeleted: true }
    );
    if (!product) throw new Error("No item found");
    res.status(200).json({ status: "success" });
  } catch (error) {
    return res.status(400).json({ status: "fail", error: error.message });
  }
};

productController.editProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { sku, name, size, image, price, description, category, stock, status, height, weight, washMethods, aiExtractedInfo, aiAnalysis, clipFeatures } = req.body;
    const product = await Product.findByIdAndUpdate(
      { _id: productId },
      { sku, name, size, image, price, description, category, stock, status, height, weight, washMethods, aiExtractedInfo, aiAnalysis, clipFeatures },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Error updating product", error: error.message });
  }
};

productController.getProductDetail = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) throw new Error("No item found");
    res.status(200).json({ status: "success",data: {
      ...product.toJSON(),
      washMethods: product.washMethods, // 이미지 URL 포함
    },
  });
  } catch (error) {
    return res.status(400).json({ status: "fail", error: error.message });
  }
};

productController.checkStock = async (item) => {
  // 고객이 사려는 아이템 재고 정보 들고오기
  const product = await Product.findById(item.productId);
  // 고객이 사려는 아이템 qty, 재고 비교
  if (product.stock[item.size] < item.qty) {
    // 재고가 불충분하면 불충분 메세지와함께 데이터 반환
    return {
      isVerify: false,
      message: `${product.name}의 ${item.size}재고가 부족합니다.`,
    };
  }
  const newStock = { ...product.stock };
  newStock[item.size] -= item.qty;
  product.stock = newStock;

  await product.save();
  // 충분하다면, 재고에서 -qty 성공
  return { isVerify: true };
};

productController.checkItemListStock = async (itemList) => {
  const insufficientStockItems = []; // 재고가 불충분한 아이템을 저장할 예정
  // 재고 확인 로직
  await Promise.all(
    itemList.map(async (item) => {
      const stockCheck = await productController.checkStock(item);
      if (!stockCheck.isVerify) {
        insufficientStockItems.push({ item, message: stockCheck.message });
      }
      return stockCheck;
    })
  );
  return insufficientStockItems;
};

productController.getProductsByIds = async (productIds) => {
  try {
    const products = await Product.find({ _id: { $in: productIds } });
    return products;
  } catch (error) {
    console.error("제품을 가져오는 중 오류 발생:", error.message);
    throw new Error("Error fetching products by IDs");
  }
};

productController.getProductsSortedBySales = async (req, res) => {
  try {
    const { category } = req.query;
    
    // 모든 상품 가져오기
    const allProducts = await Product.find({ isDeleted: false });
    
    // 주문 데이터에서 상품별 판매량 집계
    const orderAggregation = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSales: { $sum: "$items.qty" }
        }
      }
    ]);

    // 판매량 데이터를 Map으로 변환
    const salesMap = new Map(
      orderAggregation.map(item => [item._id.toString(), item.totalSales])
    );

    // 모든 상품에 판매량 정보 추가
    const productsWithSales = allProducts.map(product => {
      const productObj = product.toObject();
      return {
        ...productObj,
        sales: salesMap.get(product._id.toString()) || 0
      };
    });

    // 카테고리 필터링
    let filteredProducts = productsWithSales;
    if (category && category !== "all") {
      filteredProducts = productsWithSales.filter(product => 
        product.category.includes(category.toLowerCase())
      );
    }

    // 판매량 기준으로 정렬
    filteredProducts.sort((a, b) => b.sales - a.sales);

    // 응답 데이터 구성
    const response = {
      status: "success",
      data: filteredProducts
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

module.exports = productController;
