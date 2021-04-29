const Back = require('./back.model');
const uploadService = require('../upload/upload.service');
const { calculatePrice } = require('../currency/currency.utils');
const RuleError = require('../../errors/rule.error');
const {
  BACK_NOT_FOUND,
  BACK_ALREADY_EXIST,
} = require('../../consts/back-messages');
const {
  FILE_SIZES: { SMALL },
} = require('../../consts/file-sizes');
const {
  STATUS_CODES: { NOT_FOUND, BAD_REQUEST },
} = require('../../consts/status-codes');
const {
  HISTORY_ACTIONS: { ADD_BACK, EDIT_BACK, DELETE_BACK },
} = require('../../consts/history-actions');
const {
  generateHistoryObject,
  getChanges,
  generateHistoryChangesData,
} = require('../../utils/hisrory');
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

class BackService {
  async getAllBacks({ skip, limit }) {
    const items = await Back.find()
      .skip(skip)
      .limit(limit)
      .exec();
    const count = await Back.find()
      .countDocuments()
      .exec();

    return {
      items,
      count,
    };
  }

  async getBackById(id) {
    const foundBack = await Back.findById(id).exec();
    if (foundBack) {
      return foundBack;
    }
    throw new RuleError(BACK_NOT_FOUND, NOT_FOUND);
  }

  async getBacksByModel(id) {
    const back = Back.find({ model: id }).exec();
    if (back.length === 0) {
      throw new RuleError(BACK_NOT_FOUND, NOT_FOUND);
    }
    return back;
  }

  async updateBack(id, back, image, { _id: adminId }) {
    const backToUpdate = await Back.findById(id).exec();
    if (!backToUpdate) {
      throw new RuleError(BACK_NOT_FOUND, NOT_FOUND);
    }

    const existChecker = await Promise.resolve(this.checkIfBackExist(back, id));
    if (existChecker) {
      throw new RuleError(BACK_ALREADY_EXIST, BAD_REQUEST);
    }

    if (image) {
      const uploadImage = await uploadService.uploadFile(image, [SMALL]);
      back.image = uploadImage.fileNames.small;
    }

    if (back.additionalPrice) {
      back.additionalPrice = await calculatePrice(back.additionalPrice);
    }

    const updatedBack = await Back.findByIdAndUpdate(id, back).exec();

    const { beforeChanges, afterChanges } = getChanges(backToUpdate, back);

    const historyRecord = generateHistoryObject(
      EDIT_BACK,
      backToUpdate.model?._id,
      backToUpdate.name[UA].value,
      backToUpdate._id,
      beforeChanges,
      afterChanges,
      adminId
    );

    await addHistoryRecord(historyRecord);

    return updatedBack;
  }

  async deleteBack(id, { _id: adminId }) {
    const foundBack = await Back.findById(id)
      .lean()
      .exec();

    if (!foundBack) {
      throw new RuleError(BACK_NOT_FOUND, NOT_FOUND);
    }

    const deletedImage = await uploadService.deleteFiles(
      Object.values(foundBack.image)
    );

    if (await Promise.allSettled(deletedImage)) {
      const historyRecord = generateHistoryObject(
        DELETE_BACK,
        foundBack.model,
        foundBack.name[UA].value,
        foundBack._id,
        generateHistoryChangesData(foundBack, [
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

      return Back.findByIdAndDelete(id);
    }
  }

  async addBack(back, image, { _id: adminId }) {
    const existChecker = await Promise.resolve(this.checkIfBackExist(back));
    if (existChecker) {
      throw new RuleError(BACK_ALREADY_EXIST, BAD_REQUEST);
    }

    if (image) {
      const uploadImage = await uploadService.uploadSmallImage(image);
      back.image = uploadImage.fileNames.small;
    }

    if (back.additionalPrice) {
      back.additionalPrice = await calculatePrice(back.additionalPrice);
    }

    const newBack = await new Back(back).save();

    const historyRecord = generateHistoryObject(
      ADD_BACK,
      newBack.model?._id,
      newBack.name[UA].value,
      newBack._id,
      [],
      generateHistoryChangesData(newBack, [
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

    return newBack;
  }

  async checkIfBackExist(data, id) {
    let backCount = await Back.countDocuments({
      _id: { $ne: id },
      name: {
        $elemMatch: {
          $or: data.name.map(({ value }) => ({ value })),
        },
      },
    }).exec();

    return backCount > 0;
  }
}

module.exports = new BackService();
