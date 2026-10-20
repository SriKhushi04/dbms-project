const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = require('./config/db');

const dashboardRoutes = require('./routes/dashboardRoutes');
const hostelRoutes = require('./routes/hostelRoutes');
const roomRoutes = require('./routes/roomRoutes');
const studentRoutes = require('./routes/studentRoutes');
const allocationRoutes = require('./routes/allocationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint (checks database connectivity)
app.get('/api/health', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT 1 + 1 AS db_check');
    res.json({
      status: 'UP',
      phase: 'Phase 1 - Hostel Allocation System',
      database: 'Connected to MySQL',
      db_check: result[0].db_check,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'DOWN',
      phase: 'Phase 1 - Hostel Allocation System',
      database: 'Disconnected',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/allocations', allocationRoutes);

// Serve static frontend files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred',
    error: err.message
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Phase 1: Hostel Allocation System Backend Running `);
    console.log(` URL: http://localhost:${PORT}                      `);
    console.log(` Database: ${process.env.DB_NAME || 'hostel_db'}   `);
    console.log(`====================================================`);
  });
}

module.exports = app;
