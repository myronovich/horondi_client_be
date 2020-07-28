const { ApolloError } = require('apollo-server');
const Category = require('./category.model');
const {
  CATEGORY_ALREADY_EXIST,
} = require('../../error-messages/category.messages');

class CategoryService {
  async getAllCategories() {
    return await Category.find();
  }

  async getCategoryById(id) {
    return await Category.findById(id);
  }

  async updateCategory(id, category) {
    return await Category.findByIdAndUpdate(id, category, { new: true });
  }

  async addCategory(data) {
    const category = await Category.find({
      code: data.code,
      name: {
        $elemMatch: {
          $or: [{ value: data.name[0].value }, { value: data.name[1].value }],
        },
      },
    });

    if (category.length !== 0) {
      return new ApolloError(CATEGORY_ALREADY_EXIST, 400);
    }
    return new Category(data).save();
  }

  async deleteCategory(id) {
    return await Category.findByIdAndDelete(id);
  }
}
module.exports = new CategoryService();
