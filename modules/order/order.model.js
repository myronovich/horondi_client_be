const mongoose = require('mongoose');
const CurrencySet = require('../../models/CurrencySet').schema;
const Delivery = require('../../models/Delivery').schema;
const OrderItem = require('../../models/OrderItem').schema;
const {
  PAYMENT_TYPES: { CASH },
} = require('../../consts/payment-types');
const {
  ORDER_STATUSES: { CREATED },
} = require('../../consts/order-statuses');
const {
  DB_COLLECTIONS_NAMES: { ORDER, USER, TRANSLATIONS },
} = require('../../consts/db-collections-names');

const orderSchema = new mongoose.Schema({
  orderNumber: String,
  paymentUrl: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    default: CREATED,
  },
  recipient: {
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    email: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: USER,
  },
  dateOfCreation: {
    type: Date,
    default: Date.now,
  },
  lastUpdatedDate: {
    type: Date,
    default: Date.now,
  },
  userComment: {
    type: String,
    default: '',
  },
  cancellationReason: {
    type: String,
    default: '',
  },
  delivery: Delivery,
  items: [OrderItem],
  totalItemsPrice: [CurrencySet],
  totalPriceToPay: [CurrencySet],
  paymentMethod: {
    type: String,
    default: CASH,
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  paymentStatus: {
    type: String,
    default: CREATED,
  },
  translationsKey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: TRANSLATIONS,
  },
});

module.exports = mongoose.model(ORDER, orderSchema);
