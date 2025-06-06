const orderController = {};
const Order = require("../models/Order");
const User = require("../models/User");
const productController = require("./product.controller");
const { randomStringGenerator } = require("../utils/randomStringGenerator");
const PAGE_SIZE = 5;

const membershipMileageRates = {
  bronze: 0.01, // 1%
  silver: 0.02, // 2%
  gold: 0.03, // 3$
  platinum: 0.04, // 4%
  diamond: 0.05, // 5%
};

orderController.createOrder = async (req, res) => {
  try {
    // 프론트앤드에서 데이터 보낸거 받아와서 userId,totalPrice,shipTo,contact,orderList
    const { userId } = req;
    const {
      shipTo,
      contact,
      totalPrice,
      useMileage,
      currentMileage,
      orderList,
    } = req.body;
    // 재고 확인 & 재고 업데이트
    const insufficientStockItems = await productController.checkItemListStock(
      orderList
    );
    // 재고가 충분하지 않은 아이템이 있었다 -> error
    if (insufficientStockItems.length > 0) {
      const errorMessage = insufficientStockItems.reduce(
        (total, item) => (total += item.message),
        ""
      );
      throw new Error(errorMessage);
    }

    const user = await User.findById(userId).select("membership mileage");
    if (!user) {
      throw new Error("User not found");
    }

    const { membership, mileage: userMileage } = user;

    const lastPrice = totalPrice - useMileage;
    // order를 만들기
    const newOrder = new Order({
      userId,
      totalPrice,
      useMileage,
      lastPrice,
      shipTo,
      contact,
      items: orderList,
      orderNum: randomStringGenerator(),
    });

    await newOrder.save();
    // 마일리지 적립
    if (useMileage == 0) {
      const mileageRate = membershipMileageRates[membership] || 0.01; // 기본값 bronze
      const mileageToAdd = Math.floor(totalPrice * mileageRate); // 소수점 제거
      await User.updateOne(
        { _id: userId },
        { $inc: { mileage: mileageToAdd } } // 마일리지 적립
      );
    } else if (useMileage != 0) {
      await User.updateOne(
        { _id: userId }, // 조건: 해당 유저 ID
        { $inc: { usedMileage: useMileage } } // mileage 필드에 적립금 추가
      );
    }

    // save 후에 카트를 비워주자
    res.status(200).json({ status: "success", orderNum: newOrder.orderNum });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

orderController.getOrder = async (req, res, next) => {
  try {
    const { userId } = req;
    const { dateFilter, statusFilter } = req.query; // statusFilter와 dateFilter 받아오기

    const now = new Date();
    let startDate = null;

    // 날짜 필터 처리
    switch (dateFilter) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0)); // 오늘 00:00
        break;
      case "1month":
        startDate = new Date(now.setMonth(now.getMonth() - 1)); // 1개월 전
        break;
      case "3months":
        startDate = new Date(now.setMonth(now.getMonth() - 3)); // 3개월 전
        break;
      case "6months":
        startDate = new Date(now.setMonth(now.getMonth() - 6)); // 6개월 전
        break;
      case "all":
      default:
        startDate = null; // 전체 기간
        break;
    }

    // 조건 객체 생성
    const filterConditions = { userId }; // 사용자 ID는 기본 조건

    // 상태 필터 처리
    if (statusFilter && statusFilter !== "all") {
      filterConditions.status = statusFilter; // 상태 필터 추가
    }

    // 날짜 필터 추가
    if (startDate) {
      filterConditions.createdAt = { $gte: startDate };
    }

    // 주문 목록 쿼리
    const orderList = await Order.find(filterConditions).populate({
      path: "items.productId",
      select: "image name",
    });
    console.log("🧪 orderList 확인:", JSON.stringify(orderList[0], null, 2));

    const totalItemNum = await Order.countDocuments(filterConditions);
    const totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);

    res.status(200).json({ status: "success", data: orderList, totalPageNum });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

// orderController.getOrderList = async (req, res, next) => {
//   try {
//     const { page, orderNum } = req.query;

//     let cond = {};
//     if (orderNum) {
//       cond = {
//         orderNum: { $regex: orderNum, $options: "i" },
//       };
//     }

//     const orderList = await Order.find(cond)
//       .populate("userId")
//       .populate({
//         path: "items",
//         populate: {
//           path: "productId",
//           model: "Product",
//           select: "image name",
//         },
//       })
//       .skip((page - 1) * PAGE_SIZE)
//       .limit(PAGE_SIZE);
//     const totalItemNum = await Order.countDocuments(cond);

//     const totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);
//     res.status(200).json({ status: "success", data: orderList, totalPageNum });
//   } catch (error) {
//     return res.status(400).json({ status: "fail", error: error.message });
//   }
// };

orderController.getOrderList = async (req, res, next) => {
  try {
    const { page, orderNum, all } = req.query;

    let cond = {};
    if (orderNum) {
      cond = {
        orderNum: { $regex: orderNum, $options: "i" },
      };
    }

    if (all === "true") {
      // 모든 데이터를 가져오는 경우
      const orderList = await Order.find(cond)
        .populate("userId")
        .populate({
          path: "items",
          populate: {
            path: "productId",
            model: "Product",
            select: "image name",
          },
        });

      return res.status(200).json({
        status: "success",
        data: orderList,
        totalPageNum: null, // 모든 데이터 요청 시 페이지 수는 null
      });
    }

    // 페이지네이션이 있는 경우
    const PAGE_SIZE = 5;
    const orderList = await Order.find(cond)
      .populate("userId")
      .populate({
        path: "items",
        populate: {
          path: "productId",
          model: "Product",
          select: "image name",
        },
      })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);

    const totalItemNum = await Order.countDocuments(cond);
    const totalPageNum = Math.ceil(totalItemNum / PAGE_SIZE);

    res.status(200).json({
      status: "success",
      data: orderList,
      totalPageNum,
    });
  } catch (error) {
    return res.status(400).json({ status: "fail", error: error.message });
  }
};

orderController.updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      id,
      { status: status },
      { new: true }
    );
    if (!order) throw new Error("Can't find order");

    res.status(200).json({ status: "success", data: order });
  } catch (error) {
    return res.status(400).json({ status: "fail", error: error.message });
  }
};

module.exports = orderController;
