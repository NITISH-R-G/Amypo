const sequelize = require('../config/database');

// Import models
const Question = require('./Question');
const QuestionFile = require('./QuestionFile');
const TestSpec = require('./TestSpec');
const Baseline = require('./Baseline');
const Submission = require('./Submission');
const EvaluationRun = require('./EvaluationRun');
const Artifact = require('./Artifact');
const WhitelistDomain = require('./WhitelistDomain');

// Define relationships

// Question 1:N QuestionFile
Question.hasMany(QuestionFile, { foreignKey: 'question_id', onDelete: 'CASCADE' });
QuestionFile.belongsTo(Question, { foreignKey: 'question_id' });

// Question 1:1 TestSpec (or 1:N if versions, assuming 1:1 for simplicity)
Question.hasOne(TestSpec, { foreignKey: 'question_id', onDelete: 'CASCADE' });
TestSpec.belongsTo(Question, { foreignKey: 'question_id' });

// Question 1:N Baseline
Question.hasMany(Baseline, { foreignKey: 'question_id', onDelete: 'CASCADE' });
Baseline.belongsTo(Question, { foreignKey: 'question_id' });

// Question 1:N Submission
Question.hasMany(Submission, { foreignKey: 'question_id', onDelete: 'CASCADE' });
Submission.belongsTo(Question, { foreignKey: 'question_id' });

// Submission 1:1 EvaluationRun
Submission.hasOne(EvaluationRun, { foreignKey: 'submission_id', onDelete: 'CASCADE' });
EvaluationRun.belongsTo(Submission, { foreignKey: 'submission_id' });

// EvaluationRun 1:N Artifact (one per viewport + global ones)
EvaluationRun.hasMany(Artifact, { foreignKey: 'run_id', onDelete: 'CASCADE' });
Artifact.belongsTo(EvaluationRun, { foreignKey: 'run_id' });

module.exports = {
  sequelize,
  Question,
  QuestionFile,
  TestSpec,
  Baseline,
  Submission,
  EvaluationRun,
  Artifact,
  WhitelistDomain
};
