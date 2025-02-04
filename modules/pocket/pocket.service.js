const Pocket = require('./pocket.model');
const { calculateAdditionalPrice } = require('../currency/currency.utils');
const uploadService = require('../upload/upload.service');
const RuleError = require('../../errors/rule.error');
const createTranslations = require('../../utils/createTranslations');
const {
  addTranslations,
  updateTranslations,
  deleteTranslations,
} = require('../translations/translations.service');
const { POCKET_NOT_FOUND } = require('../../error-messages/pocket.messages');
const {
  STATUS_CODES: { NOT_FOUND },
} = require('../../consts/status-codes');
const {
  HISTORY_ACTIONS: { ADD_EVENT, DELETE_EVENT, EDIT_EVENT },
  HISTORY_NAMES: { POCKET_EVENT },
} = require('../../consts/history-events');
const {
  generateHistoryObject,
  getChanges,
  generateHistoryChangesData,
} = require('../../utils/history');
const { addHistoryRecord } = require('../history/history.service');
const {
  LANGUAGE_INDEX: { UA },
} = require('../../consts/languages');
const {
  HISTORY_OBJ_KEYS: {
    NAME,
    ADDITIONAL_PRICE,
    AVAILABLE,
    FEATURES,
    OPTION_TYPE,
    MODEL,
  },
} = require('../../consts/history-obj-keys');

class PocketService {
  async getAllPockets(limit, skip, filter) {
    const filterOptions = {};

    if (filter?.search) {
      filterOptions['name.0.value'] = {
        $regex: `${filter.search.trim()}`,
        $options: 'i',
      };
    }

    const items = await Pocket.find(filterOptions)
      .skip(skip)
      .limit(limit)
      .exec();

    const count = await Pocket.countDocuments(filterOptions).exec();

    return {
      items,
      count,
    };
  }

  async getPocketById(id) {
    const foundPocket = await Pocket.findById(id).exec();
    if (foundPocket) {
      return foundPocket;
    }
    throw new RuleError(POCKET_NOT_FOUND, NOT_FOUND);
  }

  async deletePocket(id, { _id: adminId }) {
    const foundPocket = await Pocket.findByIdAndDelete(id)
      .lean()
      .exec();

    if (!foundPocket) {
      throw new RuleError(POCKET_NOT_FOUND, NOT_FOUND);
    }
    const historyEvent = {
      action: DELETE_EVENT,
      historyName: POCKET_EVENT,
    };
    const historyRecord = generateHistoryObject(
      historyEvent,
      foundPocket.model,
      foundPocket.name[UA].value,
      foundPocket._id,
      generateHistoryChangesData(foundPocket, [
        NAME,
        OPTION_TYPE,
        MODEL,
        FEATURES,
        AVAILABLE,
        ADDITIONAL_PRICE,
      ]),
      [],
      adminId
    );

    await addHistoryRecord(historyRecord);

    await deleteTranslations(foundPocket.translationsKey);

    return foundPocket;
  }

  async updatePocket(id, pocket, image, { _id: adminId }) {
    const pocketToUpdate = await Pocket.findById(id).exec();

    if (!pocketToUpdate) {
      throw new RuleError(POCKET_NOT_FOUND, NOT_FOUND);
    }

    pocket.additionalPrice = await calculateAdditionalPrice(
      pocket.additionalPrice
    );

    if (image) {
      if (pocketToUpdate.images) {
        const images = Object.values(pocketToUpdate.images).filter(
          item => typeof item === 'string' && item
        );
        await uploadService.deleteFiles(images);
      }
      const uploadResult = await uploadService.uploadFiles([image]);
      const imageResults = await uploadResult[0];
      pocket.images = imageResults.fileNames;
    }

    const { beforeChanges, afterChanges } = getChanges(pocketToUpdate, pocket);
    const historyEvent = {
      action: EDIT_EVENT,
      historyName: POCKET_EVENT,
    };
    const historyRecord = generateHistoryObject(
      historyEvent,
      pocketToUpdate.model?._id,
      pocketToUpdate.name[UA].value,
      pocketToUpdate._id,
      beforeChanges,
      afterChanges,
      adminId
    );

    await addHistoryRecord(historyRecord);

    await updateTranslations(
      pocketToUpdate.translationsKey,
      createTranslations(pocket)
    );

    return Pocket.findByIdAndUpdate(id, pocket, {
      new: true,
    }).exec();
  }

  async addPocket(pocket, image, { _id: adminId }) {
    if (image) {
      const uploadImage = await uploadService.uploadFile(image);
      pocket.images = uploadImage.fileNames;
    }

    pocket.additionalPrice = await calculateAdditionalPrice(
      pocket.additionalPrice
    );

    pocket.translationsKey = await addTranslations(createTranslations(pocket));

    const newPocket = await new Pocket(pocket).save();
    const historyEvent = {
      action: ADD_EVENT,
      historyName: POCKET_EVENT,
    };
    const historyRecord = generateHistoryObject(
      historyEvent,
      newPocket.model?._id,
      newPocket.name[UA].value,
      newPocket._id,
      [],
      generateHistoryChangesData(newPocket, [
        NAME,
        OPTION_TYPE,
        MODEL,
        FEATURES,
        AVAILABLE,
        ADDITIONAL_PRICE,
      ]),
      adminId
    );

    await addHistoryRecord(historyRecord);

    return newPocket;
  }
}

module.exports = new PocketService();
