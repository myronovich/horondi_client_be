const contactService = require('./contact.service');
const RuleError = require('../../errors/rule.error');

const contactQuery = {
  getContacts: async (parent, args) => {
    try {
      return await contactService.getContacts(args);
    } catch (error) {
      return new RuleError(error.message, error.statusCode);
    }
  },

  getContactById: async (parent, args) => {
    try {
      return await contactService.getContactById(args.id);
    } catch (error) {
      return new RuleError(error.message, error.statusCode);
    }
  },
};

const contactMutation = {
  addContact: async (parent, args) => {
    try {
      return await contactService.addContact(args);
    } catch (error) {
      return new RuleError(error.message, error.statusCode);
    }
  },

  deleteContact: async (parent, args) => {
    try {
      return await contactService.deleteContact(args.id);
    } catch (error) {
      return new RuleError(error.message, error.statusCode);
    }
  },

  updateContact: async (parent, args) => {
    try {
      return await contactService.updateContact(args);
    } catch (error) {
      return new RuleError(error.message, error.statusCode);
    }
  },
};

module.exports = { contactQuery, contactMutation };
