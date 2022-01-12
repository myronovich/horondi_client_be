const { ApolloServer } = require('apollo-server-express');
const { createTestClient } = require('apollo-server-testing');
const { bcryptClient } = require('../client/bcrypt-client');
const config = require('./config.test.app');
const User = require('../modules/user/user.model');
const {
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
} = require('../dotenvValidator');
const {
  SOURCES: { HORONDI },
  roles: { SUPERADMIN },
} = require('../consts');
const { FIRST_NAME, LAST_NAME } = require('../consts/test-admin');

const registerAdmin = async (email, password, role = SUPERADMIN) => {
  await User.deleteOne({ email });
  const admin = new User();
  admin.firstName = FIRST_NAME;
  admin.lastName = LAST_NAME;
  admin.email = email;
  admin.role = role;
  admin.credentials = [
    {
      source: HORONDI,
      tokenPass: await bcryptClient.hashPassword(password, 12),
    },
  ];
  await admin.save();
  return admin;
};
const setupApp = async (role = SUPERADMIN) => {
  const userWithRole = await registerAdmin(
    SUPER_ADMIN_EMAIL,
    SUPER_ADMIN_PASSWORD,
    role
  );

  const server = new ApolloServer({
    ...config,
    context: { user: userWithRole },
  });
  return createTestClient(server);
};

module.exports = { setupApp, registerAdmin };
