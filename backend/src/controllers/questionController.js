const { Question, TestSpec, QuestionFile } = require('../models');

async function listQuestions(req, res) {
  try {
    const questions = await Question.findAll({
      order: [['id', 'ASC']],
      attributes: ['id', 'title', 'description', 'allowed_libraries', 'created_at', 'updated_at']
    });
    res.json({ questions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getQuestionDetails(req, res) {
  try {
    const { id } = req.params;
    const question = await Question.findByPk(id);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const spec = await TestSpec.findOne({ where: { question_id: id } });
    const files = await QuestionFile.findAll({ where: { question_id: id } });

    res.json({
      question,
      testSpec: spec ? spec.spec_json : null,
      files
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { listQuestions, getQuestionDetails };

