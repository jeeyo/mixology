const Sequelize = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './db.sqlite',
  operatorsAliases: false,
  logging: false,
});
sequelize
  .authenticate()
  .catch((err: Error) => {
    console.error('sequelize.authenticate()', err);
  });

class Order extends Sequelize.Model {
  public id!: number;
  public genre!: number;
  public randomized_by_user!: boolean;
  public finished_by_bartender!: boolean;
  public paid!: boolean;
  public played_by_dj!: boolean;

  public readonly createdAt!: Date;
}

Order.init({
  id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
  genre: { type: Sequelize.INTEGER, allowNull: false },
  randomized_by_user: { type: Sequelize.BOOLEAN, allowNull: false },
  finished_by_bartender: { type: Sequelize.BOOLEAN, allowNull: false },
  paid: { type: Sequelize.BOOLEAN, allowNull: false },
  played_by_dj: { type: Sequelize.BOOLEAN, allowNull: false },
  createdAt: { type: Sequelize.DATE, allowNull: true },
}, {
  sequelize: sequelize,
  timestamps: true,
  deletedAt: false,
  updatedAt: false,
  freezeTableName: true,
  tableName: 'orders',
});

export {
  Sequelize,
  sequelize,
  Order,
};