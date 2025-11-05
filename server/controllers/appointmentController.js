const Appointment = require('../models/AppointmentModel');
const Doctor = require('../models/DoctorModel');
const Patient = require('../models/PatientModel');
const axios = require('axios'); // For creating Daily.co rooms

// @desc    Create a new appointment
// @route   POST /api/appointments
const createAppointment = async (req, res) => {

  // --- 1. Get ALL data from the request body ---
  const { 
    doctorId,          // <-- CHANGED
    appointmentDate,
    age, 
    gender, 
    symptoms, 
    medicationsAndAllergies,
  } = req.body;

  const patientId = req.patient._id; // <-- From our 'protect' middleware

  // --- 2. Validation ---
  if (!doctorId || !appointmentDate || !age || !gender || !symptoms) {
    return res.status(400).json({ 
      message: 'Missing required fields: specialty, age, gender, and symptoms are all required.' 
    });
  }

  try {
    // --- 3. Create the Daily.co Video Room ---
    const API_KEY = process.env.DAILY_API_KEY;
    const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour expiry

    const response = await axios.post(
      'https://api.daily.co/v1/rooms',
      { properties: { exp: expiry } },
      { headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
      }
    );

    const roomUrl = response.data.url;
    if (!roomUrl) {
      throw new Error('Failed to create video room');
    }

    // --- 4. Create the Appointment in MongoDB with ALL fields ---
    const appointment = new Appointment({
      patient: patientId,
      doctor: doctorId,
      status: 'upcoming',
      roomUrl: roomUrl,
      appointmentDate: appointmentDate,
      // Add the new intake data
      age: age,
      gender: gender,
      symptoms: symptoms,
      medicationsAndAllergies: medicationsAndAllergies || 'None provided',
    });

    const createdAppointment = await appointment.save();
    res.status(201).json(createdAppointment);

  } catch (error) {
    // Handle potential validation errors from Mongoose (e.g., bad 'gender' enum)
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Error creating appointment:', error.message);
    res.status(500).json({ message: 'Server error while creating appointment' });
  }
};

// --- (The other functions remain exactly the same) ---

// @desc    Get patient's upcoming appointments
// @route   GET /api/appointments/upcoming
const getUpcomingAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patient: req.patient._id,
      status: 'upcoming',
    })
    .sort({ appointmentDate: 'asc' }) // Sort by appointment date
    .populate('doctor', 'name specialty'); // <-- THIS IS THE FIX

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get patient's past appointments
// @route   GET /api/appointments/past
const getPastAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patient: req.patient._id,
      status: 'completed',
    })
    .sort({ appointmentDate: 'desc' }) // Sort by appointment date
    .populate('doctor', 'name specialty'); // <-- THIS IS THE FIX
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark an appointment as completed
// @route   PUT /api/appointments/complete/:id
const completeAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.id, // Find by appointment ID
        patient: req.patient._id, // Ensure this patient owns it
      },
      {
        status: 'completed', // Set status to 'completed'
      },
      { new: true } // Return the updated document
    );

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get a doctor's available slots for a specific day
// @route   GET /api/appointments/slots
const getAvailableSlots = async (req, res) => {
  const { doctorId, date } = req.query; // e.g., ...?doctorId=...&date=2025-11-06

  if (!doctorId || !date) {
    return res.status(400).json({ message: 'Missing doctorId or date' });
  }

  try {
    // --- 1. Get Doctor's Working Hours ---
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const { start, end } = doctor.workingHours; // e.g., '09:00' and '17:00'
    const slotDuration = 30; // 30 minutes

    // --- 2. Find All Booked Slots for that Day ---
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const existingAppointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: 'upcoming', // Only check upcoming appointments
    });

    // Create a set of "booked" start times for easy lookup
    const bookedSlots = new Set(
      existingAppointments.map(appt => 
        new Date(appt.appointmentDate).toISOString()
      )
    );

    // --- 3. Generate All Possible Slots ---
    const availableSlots = [];
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    // Create a start time on the correct date in UTC
    const slotTime = new Date(startOfDay);
    slotTime.setUTCHours(startHour, startMin, 0, 0);

    // Create an end time on the correct date in UTC
    const endTime = new Date(startOfDay);
    endTime.setUTCHours(endHour, endMin, 0, 0);

    while (slotTime < endTime) {
      const slotISO = slotTime.toISOString();

      // If this slot is NOT in our "booked" set, add it
      if (!bookedSlots.has(slotISO)) {
        availableSlots.push(new Date(slotTime));
      }

      // Move to the next 30-minute slot
      slotTime.setMinutes(slotTime.getMinutes() + slotDuration);
    }

    res.json(availableSlots); // Send the list of available slot Date objects

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Get a doctor's upcoming appointments
// @route   GET /api/appointments/doctor
const getDoctorAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctor: req.doctor._id, // Find appointments for THIS doctor
      status: 'upcoming',
    })
    .sort({ appointmentDate: 'asc' })
    // --- Populate the Patient's info! ---
    .populate('patient', 'name email'); // Get patient's name and email

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = {
  createAppointment,
  getUpcomingAppointments,
  getPastAppointments,
  completeAppointment,
  getAvailableSlots,
  getDoctorAppointments,
};