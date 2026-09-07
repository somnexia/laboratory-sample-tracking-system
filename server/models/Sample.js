'use strict';

const { Model } = require('sequelize');
const { SAMPLE_TYPES } = require('../config/sampleTypes');
const { SAMPLE_STATUSES, DEFAULT_STATUS } = require('../config/sampleStatuses');

/**
 * Sample — лабораторный образец (таблица samples).
 *
 * Аналог Landmark из ТЗ. Владелец — created_by (users.id), ON DELETE RESTRICT.
 * research_id / experiment_id — числа без FK (ссылка на большой LIMS).
 * status при создании всегда RECEIVED; смена — только через карту переходов.
 */
module.exports = (sequelize, DataTypes) => {
  class Sample extends Model {
    static associate(models) {
      Sample.belongsTo(models.User, { foreignKey: 'created_by', as: 'owner' });
      Sample.hasMany(models.SampleDocument, { foreignKey: 'sample_id', as: 'documents' });
      Sample.hasMany(models.SampleRating, { foreignKey: 'sample_id', as: 'ratings' });
      Sample.hasMany(models.SampleEvent, { foreignKey: 'sample_id', as: 'events' });
    }
  }

  Sample.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    sample_code: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...SAMPLE_TYPES),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM(...SAMPLE_STATUSES),
      allowNull: false,
      defaultValue: DEFAULT_STATUS,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    research_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    experiment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'Sample',
    tableName: 'samples',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
  });

  return Sample;
};
