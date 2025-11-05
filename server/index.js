// Load env vars FIRST
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// --- Import Routes ---
const patientRoutes = require('./routes/patientRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes'); // <-- NEW
const doctorRoutes = require('./routes/doctorRoutes');

// Connect to database
connectDB();

// Initialize the app
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// --- API Routes ---
app.get('/api/health', (req, res) => {
  res.json({ message: "Hello from the Telehealth server!" });
});

app.use('/api/patients', patientRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes); 

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});