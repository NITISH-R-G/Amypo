const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuestionFile = sequelize.define('QuestionFile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  question_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('html', 'css', 'js'),
    allowNull: false,
  }
}, {
  tableName: 'question_files',
  timestamps: false
});

module.exports = QuestionFile;
