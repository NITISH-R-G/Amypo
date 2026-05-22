const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./src/models');

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

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Export app for testing
module.exports = app;

// Serve evaluation artifacts written by the worker (/app/artifacts in Docker).
app.use('/artifacts', express.static(path.resolve(__dirname, '..', 'artifacts')));

const submissionRoutes = require('./src/routes/submissionRoutes');
const submissionController = require('./src/controllers/submissionController');
const adminRoutes = require('./src/routes/adminRoutes');
const trainerRoutes = require('./src/routes/trainerRoutes');
const questionRoutes = require('./src/routes/questionRoutes');
const aiRoutes = require('./src/routes/aiRoutes');

// Routes will be mounted here
app.use('/api/submissions', submissionRoutes);
// Convenience alias to match spec examples (same handler, protected by submission/run ownership checks).
app.get('/submissions/:id/artifacts/:filename', submissionController.getSubmissionArtifact);
app.use('/api/admin', adminRoutes);
app.use('/api/trainer', trainerRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/ai', aiRoutes);

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

// Database Sync and Server Startup
const startServer = async () => {
  try {
    // Authenticate with DB (Note: Alter locally during dev, avoid full sync in prod)
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Pre-sync repair: if submissions exist but users are missing, FK creation during `alter`
    // will fail. Backfill minimal user rows for all distinct `student_id` values.
    try {
      const [rows] = await sequelize.query('SELECT DISTINCT student_id FROM submissions');
      if (Array.isArray(rows) && rows.length > 0) {
        for (const r of rows) {
          const sid = r?.student_id == null ? null : String(r.student_id);
          if (!sid) continue;
          await sequelize.query(
            'INSERT INTO users (id, name, role, current_streak, highest_streak, last_activity_date, created_at, updated_at) ' +
            'VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) ' +
            'ON CONFLICT (id) DO NOTHING',
            { bind: [sid, `Student ${sid}`, 'student', 0, 0, null] }
          );
        }
        console.log(`Pre-sync: ensured users exist for ${rows.length} distinct submission student_id values.`);
      }
    } catch (_) {
      // Tables might not exist yet on first boot; ignore.
    }

    // FR-8 replay support: older schema versions had a UNIQUE constraint on evaluation_runs.submission_id.
    // Sequelize's sync({ alter: true }) doesn't reliably drop unique constraints, so we do it explicitly.
    try {
      const [rows] = await sequelize.query(`
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'evaluation_runs' AND c.contype = 'u'
      `);
      if (Array.isArray(rows)) {
        for (const r of rows) {
          const name = String(r?.conname || '');
          if (!name) continue;
          if (name.toLowerCase().includes('submission')) {
            await sequelize.query(`ALTER TABLE evaluation_runs DROP CONSTRAINT IF EXISTS "${name}"`);
          }
        }
      }
    } catch (_) {
      // ignore (table may not exist yet)
    }
    
    // Sync models (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('Database synced.');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
  }
};

if (require.main === module) {
  startServer();
}
