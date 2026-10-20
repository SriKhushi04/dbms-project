// ============================================================================
// HostelHub Express Backend Server
// ============================================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import pool from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getJwtSecret } from './middleware/auth.js';

import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Enforce required security configuration on startup
try {
  getJwtSecret();
} catch (configErr) {
  console.error('\n====================================================');
  console.error(configErr.message);
  console.error('====================================================\n');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT 1 + 1 AS health_check');
    res.json({
      status: 'UP',
      app: 'HostelHub API',
      database: 'MySQL Connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'DOWN',
      app: 'HostelHub API',
      database: 'Disconnected',
      error: err.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/admin', adminRoutes);

// Extensibility hook: Reserved for future Hostel Management Module
// app.use('/management', hostelManagementRoutes);

// 404 Handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// Centralized Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log('  HostelHub Backend Server is Running               ');
    console.log(`  URL: http://localhost:${PORT}                      `);
    console.log(`  Database: ${process.env.DB_NAME || 'hostelhub_db'}`);
    console.log('====================================================');
  });
}

export default app;

