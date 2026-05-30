const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// Security and Performance Middlewares
app.use(helmet());
app.use(compression());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api', limiter);

app.use(cors());
app.use(express.json());

// Serve evaluation artifacts written by the worker (/app/artifacts in Docker).
app.use('/artifacts', express.static(path.resolve(__dirname, '..', 'artifacts')));

const submissionRoutes = require('./src/routes/submissionRoutes');
const submissionController = require('./src/controllers/submissionController');
const adminRoutes = require('./src/routes/adminRoutes');
const trainerRoutes = require('./src/routes/trainerRoutes');
const questionRoutes = require('./src/routes/questionRoutes');

// Routes will be mounted here
app.use('/api/submissions', submissionRoutes);
// Convenience alias to match spec examples (same handler, protected by submission/run ownership checks).
app.get('/submissions/:id/artifacts/:filename', submissionController.getSubmissionArtifact);
app.use('/api/admin', adminRoutes);
app.use('/api/trainer', trainerRoutes);
app.use('/api/questions', questionRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Assessment Engine API is running' });
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { User } = require('./src/models');
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = app;
