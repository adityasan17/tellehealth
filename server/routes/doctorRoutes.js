const express = require('express');
const router = express.Router();
const { 
  registerDoctor, 
  loginDoctor, 
  getDoctorsBySpecialty // <-- Import this
} = require('../controllers/doctorController');

// --- ADD THIS NEW ROUTE ---
router.get('/', getDoctorsBySpecialty); // GET /api/doctors

router.post('/register', registerDoctor);
router.post('/login', loginDoctor);

module.exports = router;