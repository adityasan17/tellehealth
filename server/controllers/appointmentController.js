const Appointment = require('../models/AppointmentModel');
const Doctor = require('../models/DoctorModel');
const Patient = require('../models/PatientModel');
const axios = require('axios');

// (createAppointment is unchanged)
// @desc    Create a new appointment
// @route   POST /api/appointments
const createAppointment = async (req, res) => {
  
  const { 
    doctorId,          
    appointmentDate, 
    age, 
    gender, 
    symptoms, 
    medicationsAndAllergies 
  } = req.body;
  
  const patientId = req.patient._id;

  if (!doctorId || !appointmentDate || !age || !gender || !symptoms) {
    return res.status(400).json({ 
      message: 'Missing required fields: doctorId, appointmentDate, age, gender, and symptoms are all required.' 
    });
  }

  try {
    const appointmentStartTime = new Date(appointmentDate);
    const expiryTime = appointmentStartTime.getTime() + 3600 * 1000; // Add 1 hour in milliseconds
    const expiryTimestamp = Math.floor(expiryTime / 1000);

    const API_KEY = process.env.DAILY_API_KEY;
    const response = await axios.post(
      'https://api.daily.co/v1/rooms',
      { properties: { exp: expiryTimestamp } },
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

    const appointment = new Appointment({
      patient: patientId,
      doctor: doctorId,
      status: 'upcoming',
      roomUrl: roomUrl,
      appointmentDate: appointmentDate,
      age: age,
      gender: gender,
      symptoms: symptoms,
      medicationsAndAllergies: medicationsAndAllergies || 'None provided',
    });

    const createdAppointment = await appointment.save();
    res.status(201).json(createdAppointment);

  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Error creating appointment:', error.message);
    res.status(500).json({ message: 'Server error while creating appointment' });
  }
};

// (getDoctorAppointments is unchanged)
// @desc    Get a doctor's upcoming appointments
// @route   GET /api/appointments/doctor
const getDoctorAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctor: req.doctor._id,
      status: 'upcoming',
    })
    .sort({ appointmentDate: 'asc' })
    .populate('patient', 'name email');

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// (getUpcomingAppointments is unchanged)
// @desc    Get patient's upcoming appointments
// @route   GET /api/appointments/upcoming
const getUpcomingAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patient: req.patient._id,
      status: 'upcoming',
    })
    .sort({ appointmentDate: 'asc' })
    .populate('doctor', 'name specialty');
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// (getPastAppointments is unchanged)
// @desc    Get patient's past appointments
// @route   GET /api/appointments/past
const getPastAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patient: req.patient._id,
      status: 'completed',
    })
    .sort({ appointmentDate: 'desc' })
    .populate('doctor', 'name specialty');
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// (completeAppointment is unchanged)
// @desc    Mark an appointment as completed
// @route   PUT /api/appointments/complete/:id
const completeAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.id,
        patient: req.patient._id,
      },
      {
        status: 'completed',
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found or not owned by user' });
    }
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


// @desc    Get a doctor's available slots for a specific day
// @route   GET /api/appointments/slots
const getAvailableSlots = async (req, res) => {
  const { doctorId, date } = req.query; // e.g., ...?doctorId=...&date=2025-11-07

  if (!doctorId || !date) {
    return res.status(400).json({ message: 'Missing doctorId or date' });
  }

  try {
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const { start, end } = doctor.workingHours;
    const slotDuration = 30;

    // --- THIS IS THE FIX ---
    
    // 1. Get the current date and time
    const now = new Date();
    
    // 2. Check if the user is booking for today
    const selectedDay = new Date(date);
    selectedDay.setHours(0, 0, 0, 0); // Normalize to midnight
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight

    const isToday = (selectedDay.getTime() === today.getTime());

    // --- END FIX ---

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: 'upcoming',
    });

    const bookedSlots = new Set(
      existingAppointments.map(appt => 
        new Date(appt.appointmentDate).toISOString()
      )
    );

    const availableSlots = [];
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const slotTime = new Date(startOfDay);
    slotTime.setHours(startHour, startMin, 0, 0);

    const endTime = new Date(startOfDay);
    endTime.setHours(endHour, endMin, 0, 0);

    while (slotTime < endTime) {
      const slotISO = slotTime.toISOString();
      
      // --- THIS IS THE FIX ---
      // We add a new condition:
      // If it IS today, only add the slot if it's in the future.
      const isBookable = !bookedSlots.has(slotISO) && (!isToday || slotTime > now);
      
      if (isBookable) {
        availableSlots.push(new Date(slotTime));
      }
      // --- END FIX ---

      slotTime.setMinutes(slotTime.getMinutes() + slotDuration);
    }

    res.json(availableSlots);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAppointment,
  getDoctorAppointments,
  getUpcomingAppointments,
  getPastAppointments,
  completeAppointment,
  getAvailableSlots,
};