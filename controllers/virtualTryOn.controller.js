// controllers/virtualTryOn.controller.js
require("dotenv").config();
const axios = require("axios");

exports.tryOn = async (req, res) => {
  try {
    const { person_image_url, garment_image_url } = req.body;

    // Pixelcut Try-On API 호출
    const apiRes = await axios.post(
      "https://api.developer.pixelcut.ai/v1/try-on",
      { person_image_url, garment_image_url },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-API-KEY": process.env.PIXELCUT_API_KEY,
        },
        maxRedirects: 20,
      }
    );

    return res.json(apiRes.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const error =
      err.response?.data || err.message || "Unknown error in Try-On";
    return res.status(status).json({ error });
  }
};
