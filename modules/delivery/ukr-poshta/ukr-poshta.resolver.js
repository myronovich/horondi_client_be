const deliveryService = require('./ukr-poshta.service');
const RuleError = require('../../../errors/rule.error');

const ukrPoshtaQuery = {
  getUkrPoshtaRegions: async () => {
    try {
      return await deliveryService.getUkrPoshtaRegions();
    } catch (error) {
      return new RuleError(error.message, error.status);
    }
  },
  getUkrPoshtaDistrictsByRegionId: async (parent, args) => {
    try {
      return await deliveryService.getUkrPoshtaDistrictsByRegionId(args.id);
    } catch (error) {
      return new RuleError(error.message, error.status);
    }
  },
  getUkrPoshtaCitiesByDistrictId: async (parent, args) => {
    try {
      return await deliveryService.getUkrPoshtaCitiesByDistrictId(args.id);
    } catch (error) {
      return new RuleError(error.message, error.status);
    }
  },
  getUkrPoshtaPostofficesCityId: async (parent, args) => {
    try {
      return await deliveryService.getUkrPoshtaPostofficesCityId(args.id);
    } catch (error) {
      return new RuleError(error.message, error.status);
    }
  },
};

module.exports = { ukrPoshtaQuery };
