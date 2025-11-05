const { Client } = require('square'); 
const { randomUUID } = require('crypto');

// Initialize the Square client
const squareClient = new Client({
  environment: 'sandbox', 
  accessToken: process.env.SQUARE_ACCESS_TOKEN, // <-- This is the corrected line
});

// @desc    Process a payment
// @route   POST /api/payment/process
const processPayment = async (req, res) => {
  const { sourceId, amount } = req.body;
  const { paymentsApi } = squareClient;

  try {
    const response = await paymentsApi.createPayment({
      sourceId: sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: amount, 
        currency: 'USD',
      },
      locationId: process.env.SQUARE_LOCATION_ID,
    });

    const payment = response.result.payment;

    res.status(201).json({
      success: true,
      // We create a new 'payment' object that matches what the client expects
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amountMoney.amount.toString(), // Convert BigInt to a string
        currency: payment.amountMoney.currency
      }
    });
    
  } catch (error) { // Fixed all syntax
    console.error('Payment Error:', error);
    res.status(500).json({ message: 'Payment failed' });
  }
};

module.exports = { processPayment };