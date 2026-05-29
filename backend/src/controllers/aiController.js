const aiService = require('../services/aiService');

const fixCode = async (req, res) => {
  const { html, css, js, prompt } = req.body;

  try {
    const { fixedCode, explanation } = await aiService.simulateAiFix(html, css, js, prompt);

    res.json({
      success: true,
      fixedCode,
      explanation
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to process AI code fix' });
  }
};

module.exports = {
  fixCode
};
