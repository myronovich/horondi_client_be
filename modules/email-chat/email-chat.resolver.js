const emailChatService = require('./email-chat.service');
const RuleError = require('../../errors/rule.error');

const emailChatQuestionQuery = {
  getAllEmailQuestions: (parent, args) => {
    try {
      return emailChatService.getAllEmailQuestions(args);
    } catch (e) {
      return new RuleError(e.message, e.statusCode);
    }
  },
  getPendingEmailQuestionsCount: (parent, args) => {
    try {
      return emailChatService.getPendingEmailQuestionsCount();
    } catch (e) {
      return new RuleError(e.message, e.statusCode);
    }
  },
  getEmailQuestionById: async (parent, args) => {
    try {
      return await emailChatService.getEmailQuestionById(args.id).exec();
    } catch (e) {
      return new RuleError(e.message, e.statusCode);
    }
  },
};

const emailChatQuestionMutation = {
  addEmailQuestion: async (parent, args) =>
    await emailChatService.addEmailQuestion(args.question),

  makeEmailQuestionsSpam: async (parent, args) => {
    try {
      return await emailChatService.makeEmailQuestionsSpam(args);
    } catch (error) {
      return new RuleError(error.message, error.statusCode);
    }
  },

  answerEmailQuestion: async (parent, args) => {
    try {
      return await emailChatService.answerEmailQuestion(args);
    } catch (error) {
      return new RuleError(error.message, error.statusCode);
    }
  },
  deleteEmailQuestions: async (parent, args) => {
    try {
      return await emailChatService.deleteEmailQuestions(
        args.questionsToDelete
      );
    } catch (error) {
      return new RuleError(error.message, error.statusCode);
    }
  },
};

module.exports = { emailChatQuestionQuery, emailChatQuestionMutation };
