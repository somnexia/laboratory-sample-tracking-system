'use strict';

const { Model } = require('sequelize');
const { EVENT_ACTIONS } = require('../config/sampleEvents');

/**
 * SampleEvent — запись истории образца (таблица sample_events).
 *
 * INSERT-only: в API нет PUT/PATCH/DELETE для событий.
 * Читают ленту через GET /samples/:id/history, не через /events.
 * Контроллеры не должны вызывать update / destroy на этой модели.
 * ON DELETE CASCADE: удаление образца забирает и его ленту.
 */
module.exports = (sequelize, DataTypes) => {
  class SampleEvent extends Model {
    static associate(models) {
      SampleEvent.belongsTo(models.Sample, { foreignKey: 'sample_id', as: 'sample' });
      SampleEvent.belongsTo(models.User, { foreignKey: 'user_id', as: 'actor' });
    }
  }

  SampleEvent.init({
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
    action: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        isIn: [EVENT_ACTIONS],
      },
    },
    old_value: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    new_value: {
      type: DataTypes.STRING(255),
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
    modelName: 'SampleEvent',
    tableName: 'sample_events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true,
  });

  return SampleEvent;
};
