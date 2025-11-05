const express = require('express');
const router = express.Router();
const { processPayment } = require('../controllers/paymentController');

// POST /api/payment/process
router.post('/process', processPayment);

module.exports = router;