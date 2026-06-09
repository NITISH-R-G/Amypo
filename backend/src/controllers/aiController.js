const aiService = require('../services/aiService');

const fixCode = async (req, res) => {
  const { html, css, js } = req.body;

  try {
    const { fixedCode, explanation } = await aiService.simulateAiFix(html, css, js);

    return res.json({
      success: true,
      fixedCode,
      explanation
    });
  } catch (error) {
    console.error('AI code fix error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process AI code fix' });
  }
};

module.exports = {
  fixCode
};
