const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./src/models');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const submissionRoutes = require('./src/routes/submissionRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const trainerRoutes = require('./src/routes/trainerRoutes');

// Routes will be mounted here
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trainer', trainerRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Assessment Engine API is running' });
});

// Database Sync and Server Startup
const startServer = async () => {
  try {
    // Authenticate with DB (Note: Alter locally during dev, avoid full sync in prod)
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync models (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('Database synced.');

    app.listen(PORT, () => {
      console.log(`API Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
  }
};

startServer();
