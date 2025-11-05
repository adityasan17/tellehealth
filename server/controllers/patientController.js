const Patient = require('../models/PatientModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new patient
// @route   POST /api/patients/register
const registerPatient = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check if patient already exists
    const patientExists = await Patient.findOne({ email });
    if (patientExists) {
      return res.status(400).json({ message: 'Patient already exists' });
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create new patient
    const patient = await Patient.create({
      name,
      email,
      password: hashedPassword,
    });

    // 4. Respond with success (we'll add a token here later)
    if (patient) {
      res.status(201).json({
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        message: "Patient registered successfully"
      });
    } else {
      res.status(400).json({ message: 'Invalid patient data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Auth patient & get token (Login)
// @route   POST /api/patients/login
const loginPatient = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if patient exists
    const patient = await Patient.findOne({ email });

    // 2. Check password
    if (patient && (await bcrypt.compare(password, patient.password))) {
      // --- NEW TOKEN CODE ---
      // Create token
      const token = jwt.sign(
        { id: patient._id }, // This is the "payload" we want to store
        process.env.JWT_SECRET, // Our secret key
        { expiresIn: '1d' } // Token expires in 1 day
      );

      // Send back all data *including* the token
      res.json({
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        token: token, // <-- Send the token to the client
      });
      // --- END NEW TOKEN CODE ---
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { registerPatient, loginPatient };