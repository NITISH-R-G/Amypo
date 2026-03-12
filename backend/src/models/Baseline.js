const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Baseline = sequelize.define('Baseline', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  question_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  viewport: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'desktop' // e.g. 'desktop', 'mobile'
  },
  reference_image_path: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
}, {
  tableName: 'baselines',
  timestamps: true, // We might need created_at
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Baseline;
