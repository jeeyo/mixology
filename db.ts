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
  public mixture!: number;
  public randomized_by_user!: boolean;
  public finished_by_bartender!: boolean;
  public paid!: boolean;
  public played_by_dj!: boolean;
  public time!: string;
}

Order.init({
  id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
  mixture: { type: Sequelize.INTEGER, allowNull: false },
  randomized_by_user: { type: Sequelize.BOOLEAN, allowNull: false },
  finished_by_bartender: { type: Sequelize.BOOLEAN, allowNull: false },
  paid: { type: Sequelize.BOOLEAN, allowNull: false },
  played_by_dj: { type: Sequelize.BOOLEAN, allowNull: false },
  time: { type: Sequelize.STRING, allowNull: true },
}, {
  sequelize: sequelize,
  timestamps: false,
  freezeTableName: true,
  tableName: 'orders',
});

export {
  Sequelize,
  sequelize,
  Order,
};