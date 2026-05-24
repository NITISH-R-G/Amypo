const request = require('supertest');
const app = require('../app');
const { closeQueues } = require('../src/services/queueService');

jest.mock('../src/models', () => {
  const SequelizeMock = require('sequelize');
  const mockSequelize = new SequelizeMock('sqlite::memory:', { logging: false });

  const Question = mockSequelize.define('Question', {
    title: SequelizeMock.STRING,
    description: SequelizeMock.TEXT,
    allowed_libraries: SequelizeMock.JSONB,
  }, {
    tableName: 'questions',
    timestamps: true,
    underscored: true
  });

  return {
    sequelize: mockSequelize,
    Question,
    // Provide empty methods or models if controller relies on them
    TestSpec: mockSequelize.define('TestSpec', {}),
    QuestionFile: mockSequelize.define('QuestionFile', {}),
    Baseline: mockSequelize.define('Baseline', {}),
    Submission: mockSequelize.define('Submission', {}),
    EvaluationRun: mockSequelize.define('EvaluationRun', {}),
    Artifact: mockSequelize.define('Artifact', {}),
    WhitelistDomain: mockSequelize.define('WhitelistDomain', {}),
    Course: mockSequelize.define('Course', {}),
    User: mockSequelize.define('User', {})
  };
});

describe('Question Endpoints', () => {
  beforeAll(async () => {
    const { sequelize } = require('../src/models');
    await sequelize.sync({ force: true });
    // Seed test data
    const { Question } = require('../src/models');
    await Question.create({
        title: 'Test Question',
        description: 'Test description',
        allowed_libraries: []
    });
  });

  afterAll(async () => {
    const { sequelize } = require('../src/models');
    await sequelize.close();
    await closeQueues();
  });

  it('GET /api/questions should return a 200 status', async () => {
    const response = await request(app).get('/api/questions');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('questions');
    expect(Array.isArray(response.body.questions)).toBe(true);
  });
});
