const express = require('express');
const router = express.Router();
const { registerPatient, loginPatient } = require('../controllers/patientController');

// POST /api/patients/register
router.post('/register', registerPatient);

// POST /api/patients/login
router.post('/login', loginPatient);

module.exports = router;