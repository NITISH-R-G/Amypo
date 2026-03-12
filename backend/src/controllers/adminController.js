const { WhitelistDomain, Submission, EvaluationRun } = require('../models');
const { enqueueEvaluation } = require('../services/queueService');

const getWhitelist = async (req, res) => {
  try {
    const domains = await WhitelistDomain.findAll();
    res.json(domains);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addWhitelist = async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'domain required' });
    const newDomain = await WhitelistDomain.create({ domain });
    res.status(201).json(newDomain);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const removeWhitelist = async (req, res) => {
  try {
    const { id } = req.params;
    await WhitelistDomain.destroy({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const replayEvaluation = async (req, res) => {
  try {
    const { id } = req.params; // EvaluationRun id
    const run = await EvaluationRun.findByPk(id);
    if (!run) return res.status(404).json({ error: 'Evaluation Run not found' });
    
    // Re-enqueue the submission using the original code
    await enqueueEvaluation(run.submission_id);
    
    // Set submission status back to pending
    await Submission.update({ status: 'pending' }, { where: { id: run.submission_id }});
    
    res.json({ message: 'Replay successfully queued', submission_id: run.submission_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getLogs = async (req, res) => {
  // Mock endpoint to fetch logs for Admin Dashboard
  try {
    const runs = await EvaluationRun.findAll({
      order: [['created_at', 'DESC']],
      limit: 100
    });
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getWhitelist,
  addWhitelist,
  removeWhitelist,
  replayEvaluation,
  getLogs
};
