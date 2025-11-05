const Doctor = require('../models/DoctorModel');
const jwt = require('jsonwebtoken');

// @desc    Register a new doctor
// @route   POST /api/doctors/register
const registerDoctor = async (req, res) => {
  const { name, email, password, specialty, workingHours } = req.body;

  try {
    const doctorExists = await Doctor.findOne({ email });
    if (doctorExists) {
      return res.status(400).json({ message: 'Doctor already exists' });
    }

    const doctor = await Doctor.create({
      name,
      email,
      password,
      specialty,
      workingHours,
    });

    if (doctor) {
      res.status(201).json({
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialty: doctor.specialty,
        token: jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, { expiresIn: '1d' }),
      });
    } else {
      res.status(400).json({ message: 'Invalid doctor data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth doctor & get token (Login)
// @route   POST /api/doctors/login
const loginDoctor = async (req, res) => {
  const { email, password } = req.body;
  try {
    const doctor = await Doctor.findOne({ email });

    if (doctor && (await doctor.matchPassword(password))) {
      res.json({
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialty: doctor.specialty,
        token: jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, { expiresIn: '1d' }),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get doctors by specialty
// @route   GET /api/doctors
const getDoctorsBySpecialty = async (req, res) => {
  const { specialty } = req.query; // Get specialty from query (e.g., /api/doctors?specialty=Cardiology)

  if (!specialty) {
    return res.status(400).json({ message: 'Please provide a specialty' });
  }

  try {
    const doctors = await Doctor.find({ specialty: specialty }).select('-password');
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerDoctor, loginDoctor ,getDoctorsBySpecialty,};