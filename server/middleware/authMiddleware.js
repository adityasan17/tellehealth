const jwt = require('jsonwebtoken');
const Patient = require('../models/PatientModel');
const Doctor = require('../models/DoctorModel'); // <-- Make sure this is at the top

// --- This is the Patient middleware ---
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.patient = await Patient.findById(decoded.id).select('-password');

      if (!req.patient) {
        return res.status(401).json({ message: 'Not authorized, patient not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// --- This is the new, fixed Doctor middleware ---
const doctorProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.doctor = await Doctor.findById(decoded.id).select('-password');

      if (!req.doctor) { // <-- This check is critical
        return res.status(401).json({ message: 'Not authorized, doctor not found' });
      }

      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect, doctorProtect };