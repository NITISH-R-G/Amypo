const { Submission, EvaluationRun } = require('../models');

const getQuestionAnalytics = async (req, res) => {
  try {
    const { questionId } = req.params;
    
    // Fetch all completed submissions with their runs
    const submissions = await Submission.findAll({
      where: { question_id: questionId, status: 'completed' },
      include: [{ model: EvaluationRun }]
    });

    if (!submissions || submissions.length === 0) {
      return res.json({ 
        message: 'No data',
        avgScore: 0,
        scoreHistogram: [0, 0, 0, 0, 0], // 0-20, 20-40, 40-60, 60-80, 80-100
        failedTestsFrequency: {},
        visualDiffDist: { '0-1%': 0, '1-3%': 0, '3-6%': 0, '>6%': 0 },
        avgExecutionTimeMs: 0
      });
    }

    let totalScoreSum = 0;
    const scoreHistogram = [0, 0, 0, 0, 0];
    const failedTestsFrequency = {};
    const visualDiffDist = { '0-1%': 0, '1-3%': 0, '3-6%': 0, '>6%': 0 };
    let executionTotalMs = 0;
    let evalCountWithTime = 0;

    submissions.forEach(sub => {
      const score = sub.total_score || 0;
      totalScoreSum += score;
      
      // Histogram
      if (score <= 20) scoreHistogram[0]++;
      else if (score <= 40) scoreHistogram[1]++;
      else if (score <= 60) scoreHistogram[2]++;
      else if (score <= 80) scoreHistogram[3]++;
      else scoreHistogram[4]++;

      const run = sub.EvaluationRun;
      if (run) {
        // Compute failed test frequencies
        if (run.failed_tests && Array.isArray(run.failed_tests)) {
          run.failed_tests.forEach(test => {
            const key = test.testId || test.selector || 'unknown';
            failedTestsFrequency[key] = (failedTestsFrequency[key] || 0) + 1;
          });
        }

        // Visual diff distribution
        if (run.visual_artifacts && Array.isArray(run.visual_artifacts)) {
          run.visual_artifacts.forEach(artifact => {
            const p = artifact.diffPercentage || 0;
            if (p <= 1) visualDiffDist['0-1%']++;
            else if (p <= 3) visualDiffDist['1-3%']++;
            else if (p <= 6) visualDiffDist['3-6%']++;
            else visualDiffDist['>6%']++;
          });
        }

        // Execution average
        if (run.execution_timings && run.execution_timings.puppeteer_eval) {
          const msStr = run.execution_timings.puppeteer_eval.replace('ms', '');
          const ms = parseInt(msStr, 10);
          if (!isNaN(ms)) {
            executionTotalMs += ms;
            evalCountWithTime++;
          }
        }
      }
    });

    const avgScore = totalScoreSum / submissions.length;
    const avgExecutionTimeMs = evalCountWithTime > 0 ? executionTotalMs / evalCountWithTime : 0;

    return res.json({
      avgScore: avgScore.toFixed(2),
      scoreHistogram,
      failedTestsFrequency,
      visualDiffDist,
      avgExecutionTimeMs: Math.round(avgExecutionTimeMs)
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getQuestionAnalytics
};
