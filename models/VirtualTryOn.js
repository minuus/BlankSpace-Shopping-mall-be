// routes/virtualTryOn.api.js
const express = require("express");
const router = express.Router();
const { tryOn } = require("../controllers/virtualTryOn.controller");

router.post("/", tryOn);

module.exports = router;
