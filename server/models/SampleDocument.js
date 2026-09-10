'use strict';

const { Model } = require('sequelize');

/**
 * SampleDocument — файл, прикреплённый к образцу (таблица sample_documents).
 *
 * Аналог Photo из ТЗ. Владелец файла — user_id (кто загрузил), не created_by образца.
 * POST /samples/:id/documents доступен любому с JWT; DELETE своего файла — позже.
 * Удаление образца каскадом снимает строки (ON DELETE CASCADE).
 */
module.exports = (sequelize, DataTypes) => {
  class SampleDocument extends Model {
    static associate(models) {
      SampleDocument.belongsTo(models.Sample, { foreignKey: 'sample_id', as: 'sample' });
      SampleDocument.belongsTo(models.User, { foreignKey: 'user_id', as: 'uploader' });
    }
  }

  SampleDocument.init({
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
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    file_path: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'SampleDocument',
    tableName: 'sample_documents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true,
  });

  return SampleDocument;
};
