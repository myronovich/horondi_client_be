const _ = require('lodash');

const HistoryModel = require('./history.model');
const RuleError = require('../../errors/rule.error');
const {
  HISTORY_RECORD_IS_NOT_PRESENT,
} = require('../../error-messages/history');
const {
  STATUS_CODES: { NOT_FOUND },
} = require('../../consts/status-codes');

class HistoryService {
  async getAllHistoryRecords(limit, skip, filter) {
    const filterOptions = {};
    const filterUserOptions = {};

    if (filter.action?.length) {
      filterOptions.action = { $in: filter.action };
    }
    if (filter.role?.length) {
      filterUserOptions.role = { $in: filter.role };
    }
    if (filter.fullName) {
      const [name, surname] = filter.fullName.split(' ');

      filterUserOptions.$or = [
        { firstName: { $regex: `${name || surname}`, $options: 'i' } },
        { lastName: { $regex: `${name || surname}`, $options: 'i' } },
      ];
    }
    if (filter.date.dateFrom) {
      filterOptions.createdAt = {
        $gte: filter.date.dateFrom.toString(),
      };
    }
    if (filter.date.dateTo) {
      filterOptions.createdAt = {
        $lte: filter.date.dateTo.toString(),
      };
    }

    const historyRecords = await HistoryModel.find(filterOptions)
      .populate({
        path: 'userId',
        match: filterUserOptions,
      })
      .exec();

    const items = _.take(
      _.drop(
        _.filter(historyRecords, record => record.userId),
        skip
      ),
      limit
    );

    const count = _.filter(historyRecords, record => record.userId).length;

    return {
      items,
      count,
    };
  }

  async addHistoryRecord(record) {
    return new HistoryModel(record).save();
  }

  async getHistoryRecordById(id) {
    const historyRecord = await HistoryModel.findById(id)
      .populate({
        path: 'userId',
      })
      .exec();

    if (!historyRecord) {
      throw new RuleError(HISTORY_RECORD_IS_NOT_PRESENT, NOT_FOUND);
    }

    return historyRecord;
  }
}

module.exports = new HistoryService();
