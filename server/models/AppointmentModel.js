const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Patient', 
  },

  // --- THIS IS THE KEY CHANGE ---
  // We no longer store just the specialty, we link to the doctor
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Doctor', // This links to our new 'Doctor' model
  },
  // --- END CHANGE ---

  status: {
    type: String,
    required: true,
    enum: ['upcoming', 'completed', 'cancelled'],
    default: 'upcoming',
  },
  roomUrl: {
    type: String,
    required: true, 
  },
  appointmentDate: {
    type: Date,
    required: true,
  },

  // Intake Form data
  age: {
    type: Number,
    required: true,
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
  },
  symptoms: {
    type: String,
    required: true,
  },
  medicationsAndAllergies: {
    type: String,
    default: 'None provided',
  },

}, {
  timestamps: true, 
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;