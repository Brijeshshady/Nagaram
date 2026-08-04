const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const complaintRoutes = require('./routes/complaint.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const departmentRoutes = require('./routes/department.routes');
const notificationRoutes = require('./routes/notification.routes');
const announcementRoutes = require('./routes/announcement.routes');

const app = express();

// =============================================
// Middleware
// =============================================

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', apiLimiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// =============================================
// Routes
// =============================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'NAGARAM - Smart City Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);

// =============================================
// Error Handling
// =============================================

app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// =============================================
// Start Server
// =============================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🏙️  NAGARAM Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   API Health: http://localhost:${PORT}/api/health\n`);
  });
};

startServer();

module.exports = app;
