const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getUpcomingAppointments,
  getPastAppointments,
  completeAppointment,
  getAvailableSlots,
  getDoctorAppointments
} = require('../controllers/appointmentController');
const { protect ,doctorProtect} = require('../middleware/authMiddleware'); // <-- Import our "lock"

// Apply the "protect" middleware to all these routes
router.post('/', protect, createAppointment);
router.get('/upcoming', protect, getUpcomingAppointments);
router.get('/past', protect, getPastAppointments);
router.put('/complete/:id', protect, completeAppointment);
router.get('/slots', getAvailableSlots);
router.get('/doctor', doctorProtect, getDoctorAppointments);

module.exports = router;