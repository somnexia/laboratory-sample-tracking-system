'use strict';

const { Model } = require('sequelize');

/**
 * SampleRating — оценка качества образца 1–5 (таблица sample_ratings).
 *
 * UNIQUE (sample_id, user_id): один пользователь — одна оценка на образец.
 * Повторный POST той же пары → 400 (фаза 7).
 */
module.exports = (sequelize, DataTypes) => {
  class SampleRating extends Model {
    static associate(models) {
      SampleRating.belongsTo(models.Sample, { foreignKey: 'sample_id', as: 'sample' });
      SampleRating.belongsTo(models.User, { foreignKey: 'user_id', as: 'author' });
    }
  }

  SampleRating.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    sample_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'samples',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    score: {
      type: DataTypes.TINYINT,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'SampleRating',
    tableName: 'sample_ratings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['sample_id', 'user_id'],
        name: 'uk_sample_ratings_sample_user',
      },
    ],
  });

  return SampleRating;
};
