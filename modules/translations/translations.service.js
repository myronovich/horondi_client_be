const Translations = require('./translations.model');
const RuleError = require('../../errors/rule.error');
const {
  TRANSLATIONS_NOT_FOUND,
} = require('../../error-messages/translation.messages');
const {
  STATUS_CODES: { NOT_FOUND },
} = require('../../consts/status-codes');

class TranslationsService {
  async addTranslations(translation) {
    return await new Translations(translation).save();
  }

  async updateTranslations(id, translations) {
    const translationsToUpdate = await Translations.findById(id).exec();

    if (!translationsToUpdate) {
      throw new RuleError(TRANSLATIONS_NOT_FOUND, NOT_FOUND);
    }

    return Translations.findByIdAndUpdate(id, translations, {
      new: true,
    }).exec();
  }

  async getTranslationsById(id) {
    const translations = await Translations.findById(id).exec();

    if (!translations) {
      throw new RuleError(TRANSLATIONS_NOT_FOUND, NOT_FOUND);
    }

    return translations;
  }

  async deleteTranslations(id) {
    const translations = await Translations.findByIdAndDelete(id)
      .lean()
      .exec();

    if (!translations) {
      throw new RuleError(TRANSLATIONS_NOT_FOUND, NOT_FOUND);
    }

    return translations;
  }
}

module.exports = new TranslationsService();
