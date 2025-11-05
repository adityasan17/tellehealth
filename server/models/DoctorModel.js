const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const workingHoursSchema = new mongoose.Schema({
  // We'll use 24-hour format, e.g., '09:00'
  start: { type: String, default: '09:00' },
  end: { type: String, default: '17:00' },
});

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  specialty: {
    type: String,
    required: true,
    // Match the specialties in your frontend form
    enum: ['Cardiology', 'Dermatology', 'Pediatrics', 'Neurology', 'General Practice'],
  },
  // We'll give each doctor simple working hours for now
  // We can expand this later (e.g., per day) if needed
  workingHours: {
    type: workingHoursSchema,
    default: () => ({}),
  },
}, {
  timestamps: true,
});

// Hash password before saving
doctorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to check password for login
doctorSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;