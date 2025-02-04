const { UserInputError } = require('apollo-server');
const { OAuth2Client } = require('google-auth-library');
const fetch = require('node-fetch');
const { jwtClient } = require('../../client/jwt-client');
const { bcryptClient } = require('../../client/bcrypt-client');
const uploadService = require('../upload/upload.service');

const User = require('./user.model');
const Wishlist = require('../wishlist/wishlist.model');

const {
  EmailActions: {
    CONFIRM_EMAIL,
    RECOVER_PASSWORD,
    BLOCK_USER,
    UNLOCK_USER,
    CONFIRM_ADMIN_EMAIL,
    CONFIRM_CREATION_SUPERADMIN_EMAIL,
  },
} = require('../../consts/email-actions');
const emailService = require('../email/email.service');
const { deleteFiles } = require('../upload/upload.service');
const {
  SECRET,
  RECOVERY_EXPIRE,
  CONFIRMATION_SECRET,
  REACT_APP_GOOGLE_CLIENT_ID,
  TOKEN_EXPIRES_IN,
} = require('../../dotenvValidator');
const {
  countItemsOccurrence,
  changeDataFormat,
  reduceByDaysCount,
} = require('../helper-functions');
const {
  USER_ALREADY_EXIST,
  USER_NOT_FOUND,
  WRONG_CREDENTIALS,
  INVALID_PERMISSIONS,
  PASSWORD_RECOVERY_ATTEMPTS_LIMIT_EXCEEDED,
  RESET_PASSWORD_TOKEN_NOT_VALID,
  AUTHENTICATION_TOKEN_NOT_VALID,
  USER_EMAIL_ALREADY_CONFIRMED,
  INVALID_ADMIN_INVITATIONAL_TOKEN,
  REFRESH_TOKEN_IS_NOT_VALID,
  YOU_CANT_BLOCK_YOURSELF,
  USER_IS_ALREADY_BLOCKED,
  USER_IS_ALREADY_UNLOCKED,
  YOU_CANT_UNLOCK_YOURSELF,
  ONLY_SUPER_ADMIN_CAN_UNLOCK_ADMIN,
  ONLY_SUPER_ADMIN_CAN_BLOCK_ADMIN,
  INVALID_OTP_CODE,
  TOKEN_IS_EXPIRIED,
  USER_IS_BLOCKED,
  SUPER_ADMIN_IS_IMMUTABLE,
} = require('../../error-messages/user.messages');
const FilterHelper = require('../../helpers/filter-helper');
const {
  STATUS_CODES: { NOT_FOUND, BAD_REQUEST, FORBIDDEN, UNAUTHORIZED },
} = require('../../consts/status-codes');
const {
  USER_BLOCK_PERIOD: { UNLOCKED, ONE_MONTH, TWO_MONTH, INFINITE },
  USER_BLOCK_COUNT: { NO_ONE_TIME, ONE_TIME, TWO_TIMES, THREE_TIMES },
} = require('../../consts/user-block-period');
const {
  LOCALES: { UK },
} = require('../../consts/locations');
const {
  SOURCES: { HORONDI, GOOGLE, FACEBOOK },
  USER_FIELDS: { USER_EMAIL, USER_ID },
  userDateFormat,
  roles: { USER },
} = require('../../consts');
const RuleError = require('../../errors/rule.error');
const {
  roles: { ADMIN, SUPERADMIN },
} = require('../../consts');
const {
  HISTORY_ACTIONS: { BLOCK_EVENT, UNLOCK_EVENT, REGISTER_EVENT },
  HISTORY_NAMES: { USER_EVENT, ADMIN_EVENT },
} = require('../../consts/history-events');
const {
  generateHistoryObject,
  getChanges,
  generateHistoryChangesData,
} = require('../../utils/history');
const { addHistoryRecord } = require('../history/history.service');

const {
  HISTORY_OBJ_KEYS: { ROLE, BANNED, FIRST_NAME, LAST_NAME, EMAIL },
} = require('../../consts/history-obj-keys');
const { generateOtpCode } = require('../../utils/user');

class UserService extends FilterHelper {
  async blockUser(userId, { _id: adminId, role }) {
    let blockedUser;

    const userToBlock = await User.findById(userId).exec();

    if (!userToBlock) {
      throw new RuleError(USER_NOT_FOUND, NOT_FOUND);
    }
    if (userToBlock.banned.blockPeriod !== UNLOCKED) {
      throw new RuleError(USER_IS_ALREADY_BLOCKED, FORBIDDEN);
    }

    if (userToBlock._id.toString() === adminId.toString()) {
      throw new RuleError(YOU_CANT_BLOCK_YOURSELF, FORBIDDEN);
    }

    if (
      (userToBlock.role === ADMIN || userToBlock.role === SUPERADMIN) &&
      role !== SUPERADMIN
    ) {
      throw new RuleError(ONLY_SUPER_ADMIN_CAN_BLOCK_ADMIN, FORBIDDEN);
    }

    switch (userToBlock.banned.blockCount) {
      case NO_ONE_TIME: {
        blockedUser = await User.findByIdAndUpdate(
          userToBlock._id,
          {
            $set: {
              banned: {
                blockPeriod: ONE_MONTH,
                blockCount: ONE_TIME,
                updatedAt: Date.now(),
              },
            },
          },
          { new: true }
        ).exec();

        await emailService.sendEmail(userToBlock.email, BLOCK_USER, {
          period: blockedUser.banned.blockPeriod,
        });

        break;
      }

      case ONE_TIME: {
        blockedUser = await User.findByIdAndUpdate(
          userToBlock._id,
          {
            $set: {
              banned: {
                blockPeriod: TWO_MONTH,
                blockCount: TWO_TIMES,
                updatedAt: Date.now(),
              },
            },
          },
          { new: true }
        ).exec();

        await emailService.sendEmail(userToBlock.email, BLOCK_USER, {
          period: blockedUser.banned.blockPeriod,
        });

        break;
      }
      case TWO_TIMES: {
        blockedUser = await User.findByIdAndUpdate(
          userToBlock._id,
          {
            $set: {
              banned: {
                blockPeriod: INFINITE,
                blockCount: THREE_TIMES,
                updatedAt: Date.now(),
              },
            },
          },
          { new: true }
        ).exec();

        await emailService.sendEmail(userToBlock.email, BLOCK_USER, {
          period: blockedUser.banned.blockPeriod,
        });

        break;
      }
      default: {
        break;
      }
    }

    const { beforeChanges, afterChanges } = getChanges(
      userToBlock,
      blockedUser
    );
    const historyEvent = {
      action: BLOCK_EVENT,
      historyName: USER_EVENT,
    };
    const historyRecord = generateHistoryObject(
      historyEvent,
      '',
      `${userToBlock.firstName} ${userToBlock.lastName}`,
      userToBlock._id,
      beforeChanges,
      afterChanges,
      adminId
    );
    await addHistoryRecord(historyRecord);

    return blockedUser;
  }

  async unlockUser(userId, { _id: adminId, role }) {
    let unlockedUser;

    const userToUnlock = await User.findById(userId).exec();

    if (!userToUnlock) {
      throw new RuleError(USER_NOT_FOUND, NOT_FOUND);
    }

    if (userToUnlock.banned.blockPeriod === UNLOCKED) {
      throw new RuleError(USER_IS_ALREADY_UNLOCKED, FORBIDDEN);
    }

    if (userToUnlock._id.toString() === adminId.toString()) {
      throw new RuleError(YOU_CANT_UNLOCK_YOURSELF, FORBIDDEN);
    }

    if (
      (userToUnlock.role === ADMIN || userToUnlock.role === SUPERADMIN) &&
      role !== SUPERADMIN
    ) {
      throw new RuleError(ONLY_SUPER_ADMIN_CAN_UNLOCK_ADMIN, FORBIDDEN);
    }

    if (userToUnlock.banned.blockPeriod === INFINITE) {
      unlockedUser = await User.findByIdAndUpdate(
        userToUnlock._id,
        {
          $set: {
            banned: {
              blockPeriod: UNLOCKED,
              blockCount: TWO_TIMES,
              updatedAt: Date.now(),
            },
          },
        },
        { new: true }
      ).exec();

      await emailService.sendEmail(userToUnlock.email, UNLOCK_USER);
    } else {
      unlockedUser = await User.findByIdAndUpdate(
        userToUnlock._id,
        {
          $set: {
            banned: {
              blockPeriod: UNLOCKED,
              blockCount: userToUnlock.banned.blockCount,
              updatedAt: Date.now(),
            },
          },
        },
        { new: true }
      ).exec();

      await emailService.sendEmail(userToUnlock.email, UNLOCK_USER);
    }
    const { beforeChanges, afterChanges } = getChanges(
      userToUnlock,
      unlockedUser
    );
    const historyEvent = {
      action: UNLOCK_EVENT,
      historyName: USER_EVENT,
    };
    const historyRecord = generateHistoryObject(
      historyEvent,
      '',
      `${userToUnlock.firstName} ${userToUnlock.lastName}`,
      userToUnlock._id,
      beforeChanges,
      afterChanges,
      adminId
    );
    await addHistoryRecord(historyRecord);

    return unlockedUser;
  }

  async checkIfTokenIsValid(token) {
    const decoded = jwtClient.decodeToken(token, SECRET);
    const user = await this.getUserByFieldOrThrow(USER_ID, decoded.userId);

    if (user.recoveryToken !== token) {
      throw new UserInputError(AUTHENTICATION_TOKEN_NOT_VALID, {
        statusCode: BAD_REQUEST,
      });
    }
    return true;
  }

  async getUserByFieldOrThrow(key, param) {
    const checkedUser = await User.findOne({
      [key]: param,
    }).exec();

    if (!checkedUser) {
      throw new RuleError(USER_NOT_FOUND, BAD_REQUEST);
    }

    return checkedUser;
  }

  async getPurchasedProducts(id) {
    const user = await User.findOne({
      _id: id,
    })
      .populate('orders')
      .exec();
    const paidOrders = user.orders.filter(order => order.isPaid);
    return paidOrders.reduce(
      (acc, order) => [
        ...acc,
        ...order.items.map(item => ({ _id: item.productId })),
      ],
      []
    );
  }

  async getAllUsers({ filter, pagination, sort }) {
    const filteredItems = this.filterItems(filter);
    const aggregatedItems = this.aggregateItems(
      filteredItems,
      pagination,
      sort
    );

    const [users] = await User.aggregate([
      {
        $addFields: {
          name: { $concat: ['$firstName', ' ', '$lastName'] },
        },
      },
    ])
      .collation({ locale: UK })
      .facet({
        items: aggregatedItems,
        calculations: [{ $match: filteredItems }, { $count: 'count' }],
      })
      .exec();
    let userCount;

    const {
      items,
      calculations: [calculations],
    } = users;

    if (calculations) {
      userCount = calculations.count;
    }

    return {
      items,
      count: userCount || 0,
    };
  }

  async getUsersForStatistic({ filter }) {
    const filters = this.filterItems(filter);
    const users = await User.find(filters)
      .sort({ registrationDate: 1 })
      .lean()
      .exec();
    const formattedData = users.map(el =>
      changeDataFormat(el.registrationDate, userDateFormat)
    );
    const userOccurrence = countItemsOccurrence(formattedData);
    const counts = Object.values(userOccurrence);
    const names = Object.keys(userOccurrence);
    const total = counts.reduce(
      (userTotal, userCount) => userTotal + userCount,
      0
    );

    const { labels, count } = reduceByDaysCount(names, counts, filter.days);

    return { labels, counts: count, total };
  }

  async getUser(id) {
    return this.getUserByFieldOrThrow(USER_ID, id);
  }

  async updateUserById(updatedUser, user, image, id) {
    let userToUpdate = {};
    if (id) {
      userToUpdate = await User.findById(id).exec();
    } else {
      userToUpdate = user;
    }
    if (!userToUpdate.images) userToUpdate.images = [];
    if (image) {
      if (userToUpdate.images?.length) {
        await deleteFiles(
          Object.values(userToUpdate.images).filter(
            item => typeof item === 'string' && item
          )
        );
      }

      const uploadResult = await uploadService.uploadFiles([image]);
      const imageResults = await uploadResult[0];
      updatedUser.images = imageResults.fileNames;
    }
    return User.findByIdAndUpdate(userToUpdate._id, updatedUser, { new: true });
  }

  async loginAdmin({ email, password }) {
    const user = await this.getUserByFieldOrThrow(USER_EMAIL, email);

    if (user?.banned?.blockPeriod !== UNLOCKED) {
      throw new RuleError(USER_IS_BLOCKED, FORBIDDEN);
    }

    const match = await bcryptClient.comparePassword(
      password,
      user.credentials.find(cred => cred.source === HORONDI).tokenPass
    );

    if (user.role === USER) {
      throw new RuleError(INVALID_PERMISSIONS, BAD_REQUEST);
    }

    if (!match) {
      throw new RuleError(WRONG_CREDENTIALS, BAD_REQUEST);
    }

    jwtClient.setData({ userId: user._id });
    const { accessToken, refreshToken } = jwtClient.generateTokens(
      SECRET,
      TOKEN_EXPIRES_IN
    );

    return {
      ...user._doc,
      _id: user._id,
      token: accessToken,
      refreshToken,
    };
  }

  async loginUser({ email, password, rememberMe }) {
    const user = await User.findOne({ email }).exec();

    if (!user) {
      throw new RuleError(WRONG_CREDENTIALS, BAD_REQUEST);
    }

    if (user?.banned?.blockPeriod !== UNLOCKED) {
      throw new RuleError(USER_IS_BLOCKED, FORBIDDEN);
    }

    const match = await bcryptClient.comparePassword(
      password,
      user.credentials.find(cred => cred.source === HORONDI).tokenPass
    );

    if (!match) {
      throw new RuleError(WRONG_CREDENTIALS, BAD_REQUEST);
    }

    jwtClient.setData({ userId: user._id });
    const { accessToken, refreshToken } = jwtClient.generateTokens(
      SECRET,
      TOKEN_EXPIRES_IN
    );

    return {
      ...user._doc,
      _id: user._id,
      token: accessToken,
      refreshToken: rememberMe ? refreshToken : null,
    };
  }

  async regenerateAccessToken(refreshTokenForVerify) {
    const { userId } = jwtClient.decodeToken(refreshTokenForVerify, SECRET);

    if (!userId) {
      throw new RuleError(REFRESH_TOKEN_IS_NOT_VALID, FORBIDDEN);
    }
    await this.getUserByFieldOrThrow('_id', userId);

    jwtClient.setData({ userId });
    const { accessToken, refreshToken } = jwtClient.generateTokens(
      SECRET,
      TOKEN_EXPIRES_IN
    );

    return { refreshToken, token: accessToken };
  }

  async googleUser(idToken, rememberMe) {
    const source = GOOGLE;
    const client = new OAuth2Client(REACT_APP_GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      expectedAudience: REACT_APP_GOOGLE_CLIENT_ID,
    });
    const dataUser = ticket.getPayload();
    const userId = dataUser.sub;
    if (!(await User.findOne({ email: dataUser.email }).exec())) {
      const user = await this.registerSocialUser({
        firstName: dataUser.given_name,
        lastName: dataUser.family_name,
        email: dataUser.email,
        credentials: [
          {
            source,
            tokenPass: userId,
          },
        ],
      });

      new Wishlist({ user_id: user._id, products: [] }).save();
    }
    return this.loginSocialUser({
      email: dataUser.email,
      rememberMe,
    });
  }

  async facebookUser(idToken, rememberMe) {
    const source = FACEBOOK;
    const graphFacebookUrl = `${process.env.GRAPH_FACEBOOK_URL}${idToken}`;
    const res = await fetch(graphFacebookUrl, {
      method: 'GET',
    });
    const data = await res.json();
    if (!(await User.findOne({ email: data.email }).exec())) {
      const user = await this.registerSocialUser({
        firstName: data.name.split(' ')[0],
        lastName: data.name.split(' ')[1],
        email: data.email,
        credentials: [
          {
            source,
            tokenPass: data.id,
          },
        ],
      });

      new Wishlist({ user_id: user._id, products: [] }).save();
    }
    return this.loginSocialUser({
      email: data.email,
      rememberMe,
    });
  }

  async loginSocialUser({ email, rememberMe }) {
    const user = await User.findOne({ email }).exec();
    if (!user) {
      throw new UserInputError(WRONG_CREDENTIALS, { statusCode: BAD_REQUEST });
    }

    jwtClient.setData({ userId: user._id });
    const { accessToken, refreshToken } = jwtClient.generateTokens(
      SECRET,
      TOKEN_EXPIRES_IN
    );

    return {
      ...user._doc,
      _id: user._id,
      token: accessToken,
      refreshToken: rememberMe ? refreshToken : null,
    };
  }

  async registerSocialUser({ firstName, lastName, email, credentials }) {
    if (await User.findOne({ email }).exec()) {
      throw new UserInputError(USER_ALREADY_EXIST, { statusCode: BAD_REQUEST });
    }

    const user = new User({
      firstName,
      lastName,
      email,
      credentials,
    });
    return user.save();
  }

  async registerUser({ firstName, lastName, email, password }, language) {
    const candidate = await User.findOne({ email }).exec();

    if (candidate) {
      throw new RuleError(USER_ALREADY_EXIST, BAD_REQUEST);
    }

    const encryptedPassword = await bcryptClient.hashPassword(password, 12);

    const user = new User({
      firstName,
      lastName,
      email,
      credentials: [
        {
          source: HORONDI,
          tokenPass: encryptedPassword,
        },
      ],
    });
    const savedUser = await user.save();

    new Wishlist({ user_id: user._id, products: [] }).save();

    jwtClient.setData({ userId: savedUser._id });
    const accessToken = jwtClient.generateAccessToken(
      CONFIRMATION_SECRET,
      RECOVERY_EXPIRE
    );

    savedUser.confirmationToken = accessToken;

    await emailService.sendEmail(user.email, CONFIRM_EMAIL, {
      language,
      token: accessToken,
    });
    await savedUser.save();

    return savedUser;
  }

  async sendConfirmationLetter(email, language) {
    const user = await this.getUserByFieldOrThrow(USER_EMAIL, email);
    if (user.confirmed) {
      throw new RuleError(USER_EMAIL_ALREADY_CONFIRMED, BAD_REQUEST);
    }

    jwtClient.setData({ userId: user._id });
    const accessToken = jwtClient.generateAccessToken(
      CONFIRMATION_SECRET,
      RECOVERY_EXPIRE
    );

    user.confirmationToken = accessToken;
    await user.save();
    await emailService.sendEmail(user.email, CONFIRM_EMAIL, {
      language,
      token: accessToken,
    });
    return true;
  }

  async deleteUser(id) {
    const user = await User.findById(id).exec();

    if (!user) {
      throw new RuleError(USER_NOT_FOUND, NOT_FOUND);
    }

    if (user.role === SUPERADMIN) {
      throw new RuleError(SUPER_ADMIN_IS_IMMUTABLE, FORBIDDEN);
    }
    return User.findByIdAndDelete(id).exec();
  }

  async confirmUser(token) {
    let userId = null;

    try {
      const decoded = jwtClient.decodeToken(token, CONFIRMATION_SECRET);
      userId = decoded.userId;
    } catch (err) {
      throw new RuleError(TOKEN_IS_EXPIRIED, UNAUTHORIZED);
    }

    const candidate = await User.findById(userId).exec();

    if (!candidate) {
      throw new RuleError(USER_NOT_FOUND, NOT_FOUND);
    }

    if (candidate.confirmed) {
      throw new RuleError(USER_EMAIL_ALREADY_CONFIRMED, FORBIDDEN);
    }

    jwtClient.setData({ userId });
    const { accessToken, refreshToken } = jwtClient.generateTokens(
      SECRET,
      TOKEN_EXPIRES_IN
    );

    await User.findByIdAndUpdate(userId, {
      $set: {
        confirmed: true,
      },
      $unset: {
        confirmationToken: '',
      },
    }).exec();

    return {
      token: accessToken,
      refreshToken,
      confirmed: true,
    };
  }

  async recoverUser(email, language) {
    const user = await User.findOne({ email }).exec();

    if (user) {
      jwtClient.setData({ userId: user._id });
      const accessToken = jwtClient.generateAccessToken(
        SECRET,
        RECOVERY_EXPIRE
      );

      user.recoveryToken = accessToken;
      await emailService.sendEmail(user.email, RECOVER_PASSWORD, {
        language,
        token: accessToken,
      });
      await user.save();
    }

    return true;
  }

  async switchUserStatus(id) {
    const user = await this.getUserByFieldOrThrow(USER_ID, id);

    user.banned = !user.banned;

    await user.save();

    return { isSuccess: true };
  }

  async resetPassword(password, token) {
    const decoded = jwtClient.decodeToken(token, SECRET);
    const user = await this.getUserByFieldOrThrow(USER_ID, decoded.userId);

    if (user.recoveryToken !== token) {
      throw new UserInputError(RESET_PASSWORD_TOKEN_NOT_VALID, {
        statusCode: BAD_REQUEST,
      });
    }

    const dayHasPassed =
      Math.floor((Date.now() - user.lastRecoveryDate) / 3600000) >= 24;
    if (dayHasPassed) {
      await User.findByIdAndUpdate(user._id, {
        recoveryAttempts: 0,
        lastRecoveryDate: Date.now(),
      }).exec();
    }
    if (user.recoveryAttempts >= 3) {
      throw new UserInputError(PASSWORD_RECOVERY_ATTEMPTS_LIMIT_EXCEEDED, {
        statusCode: FORBIDDEN,
      });
    }
    const encryptedPassword = await bcryptClient.hashPassword(password, 12);
    const updates = {
      $set: {
        lastRecoveryDate: Date.now(),
        recoveryAttempts: !user.recoveryAttempts ? 1 : ++user.recoveryAttempts,
        credentials: [
          {
            source: HORONDI,
            tokenPass: encryptedPassword,
          },
        ],
      },
      $unset: {
        recoveryToken: '',
      },
    };
    await User.findByIdAndUpdate(user._id, updates).exec();
    return true;
  }

  async registerAdmin({ email, role, code }, admin) {
    if (code && code !== admin.otp_code) {
      throw new RuleError(INVALID_OTP_CODE, FORBIDDEN);
    }

    const isAdminExists = await User.findOne({ email }).exec();

    if (isAdminExists) {
      throw new RuleError(USER_ALREADY_EXIST, BAD_REQUEST);
    }

    const user = new User({
      email,
      role,
    });

    const savedUser = await user.save();

    jwtClient.setData({ userId: savedUser._id });
    const invitationalToken = jwtClient.generateAccessToken(
      SECRET,
      TOKEN_EXPIRES_IN
    );

    await emailService.sendEmail(email, CONFIRM_ADMIN_EMAIL, {
      token: invitationalToken,
    });

    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          otp_code: null,
        },
      },
      { new: true }
    ).exec();

    return { isSuccess: true };
  }

  async confirmSuperadminCreation(_id) {
    const user = await User.findOne({ _id }).exec();

    if (!user) {
      throw new RuleError(USER_NOT_FOUND, NOT_FOUND);
    }

    const otp_code = generateOtpCode();

    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          otp_code,
        },
      },
      { new: true }
    ).exec();

    await emailService.sendEmail(
      user.email,
      CONFIRM_CREATION_SUPERADMIN_EMAIL,
      { otp_code }
    );

    return { isSuccess: true };
  }

  async resendEmailToConfirmAdmin({ email }) {
    const isAdminExists = await User.findOne({ email }).exec();

    if (!isAdminExists) {
      throw new RuleError(USER_NOT_FOUND, NOT_FOUND);
    }

    jwtClient.setData({ userId: isAdminExists._id });
    const invitationalToken = jwtClient.generateAccessToken(
      SECRET,
      TOKEN_EXPIRES_IN
    );

    await emailService.sendEmail(email, CONFIRM_ADMIN_EMAIL, {
      token: invitationalToken,
    });

    return { isSuccess: true };
  }

  async completeAdminRegister(updatedUser, token) {
    const { password } = updatedUser;
    const userDetails = jwtClient.decodeToken(token, SECRET);

    if (!userDetails) {
      throw new RuleError(INVALID_ADMIN_INVITATIONAL_TOKEN, BAD_REQUEST);
    }

    const user = await User.findOne({ _id: userDetails.userId }).exec();

    if (!user) {
      throw new RuleError(USER_NOT_FOUND, NOT_FOUND);
    }

    const encryptedPassword = await bcryptClient.hashPassword(password, 12);

    await User.findByIdAndUpdate(userDetails.userId, {
      $set: {
        ...updatedUser,
        credentials: [
          {
            source: HORONDI,
            tokenPass: encryptedPassword,
          },
        ],
        confirmed: true,
      },
    }).exec();
    const historyEvent = {
      action: REGISTER_EVENT,
      historyName: ADMIN_EVENT,
    };
    const historyRecord = generateHistoryObject(
      historyEvent,
      '',
      `${user.firstName} ${user.lastName}`,
      user._id,
      [],
      generateHistoryChangesData(user, [
        ROLE,
        BANNED,
        FIRST_NAME,
        LAST_NAME,
        EMAIL,
      ]),
      user._id
    );

    await addHistoryRecord(historyRecord);

    return { isSuccess: true };
  }

  validateConfirmationToken(token) {
    if (!jwtClient.decodeToken(token, SECRET)) {
      throw new UserInputError(INVALID_ADMIN_INVITATIONAL_TOKEN, {
        statusCode: BAD_REQUEST,
      });
    }
    return { isSuccess: true };
  }
}

module.exports = new UserService();
