'use strict';

const { Model } = require('sequelize');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = 10;

/**
 * User — учётная запись API (таблица users).
 *
 * Хеш пароля: хуки beforeCreate / beforeUpdate, в БД никогда не лежит plaintext.
 * Ответы API: toJSON() вырезает password, даже если контроллер сделает res.json(user).
 * Это закрывает пункт ТЗ «не отдавать пароль» (фаза 3.6).
 */
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /** Связи зарегистрирует models/index.js (фаза 2.8). */
    static associate(models) {
      User.hasMany(models.Sample, { foreignKey: 'created_by', as: 'samples' });
      User.hasMany(models.SampleDocument, { foreignKey: 'user_id', as: 'documents' });
      User.hasMany(models.SampleRating, { foreignKey: 'user_id', as: 'ratings' });
      User.hasMany(models.SampleEvent, { foreignKey: 'user_id', as: 'events' });
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
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
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true,
  });

  User.beforeCreate(async (user) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
    }
  });

  // Не хешировать повторно, если пароль не меняли (иначе сломается вход).
  User.beforeUpdate(async (user) => {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
    }
  });

  // res.json(user) и JSON.stringify(user) не должны утечь хеш.
  User.prototype.toJSON = function toJSON() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  return User;
};
