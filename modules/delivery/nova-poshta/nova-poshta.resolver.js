const deliveryService = require('./nova-poshta.service');
const RuleError = require('../../../errors/rule.error');

const novaPoshtaQuery = {
  getNovaPoshtaCities: async (parent, args) => {
    try {
      return await deliveryService.getNovaPoshtaCities(args.city);
    } catch (error) {
      return new RuleError(error.message, error.status);
    }
  },

  getNovaPoshtaStreets: async (parent, args) => {
    try {
      return await deliveryService.getNovaPoshtaStreets(
        args.cityRef,
        args.street
      );
    } catch (error) {
      return new RuleError(error.message, error.status);
    }
  },

  getNovaPoshtaWarehouses: async (parent, args) => {
    try {
      return await deliveryService.getNovaPoshtaWarehouses(args.city);
    } catch (error) {
      return new RuleError(error.message, error.status);
    }
  },

  getNovaPoshtaPrices: async (parent, args) => {
    try {
      return await deliveryService.getNovaPoshtaPrices(args.data);
    } catch (error) {
      return new RuleError(error.message, error.status);
    }
  },
};

module.exports = { novaPoshtaQuery };
