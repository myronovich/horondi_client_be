const ordersService = require('./order.service');
const { ORDER_NOT_FOUND } = require('../../error-messages/orders.messages');
const RuleError = require('../../errors/rule.error');
const {
  STATUS_CODES: { NOT_FOUND },
} = require('../../consts/status-codes');

const ordersQuery = {
  getOrderById: async (parent, args) => {
    const order = await ordersService.getOrderById(args.id);
    if (order) {
      return order;
    }
    return new RuleError(ORDER_NOT_FOUND, NOT_FOUND);
  },
  getAllOrders: async (parent, args) => await ordersService.getAllOrders(args),
  getUserOrders: async (_, args, { user }) => {
    try {
      return await ordersService.getUserOrders(user);
    } catch (e) {
      return new RuleError(e.message, e.statusCode);
    }
  },

  getOrdersStatistic: (parent, args) =>
    ordersService.getOrdersStatistic(args.date),
  getPaidOrdersStatistic: (parent, args) =>
    ordersService.getPaidOrdersStatistic(args.date),
  getOrderByPaidOrderNumber: async (_, { paidOrderNumber }) => {
    try {
      return await ordersService.getOrderByPaidOrderNumber(paidOrderNumber);
    } catch (e) {
      return new RuleError(e.message, e.statusCode);
    }
  },
};

const ordersMutation = {
  addOrder: async (_, { order }, { user }) => {
    try {
      return await ordersService.addOrder(order, user);
    } catch (e) {
      return new RuleError(e.message, e.statusCode);
    }
  },
  deleteOrder: async (_, args) => {
    const deletedOrder = await ordersService.deleteOrder(args.id);
    if (deletedOrder) {
      return deletedOrder;
    }
    return new RuleError(ORDER_NOT_FOUND, NOT_FOUND);
  },
  updateOrder: async (parent, args) => {
    try {
      return await ordersService.updateOrder(args.order, args.id);
    } catch (e) {
      return new RuleError(e.message, e.statusCode);
    }
  },
};

module.exports = { ordersQuery, ordersMutation };
