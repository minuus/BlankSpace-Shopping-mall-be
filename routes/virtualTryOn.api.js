// routes/virtualTryOn.api.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/virtualTryOn.controller");

router.post("/", ctrl.tryOn);

module.exports = router;
