const { gql } = require('@apollo/client');

const createModel = async (model, operations) => {
  const createdModel = await operations.mutate({
    mutation: gql`
      mutation($model: ModelInput!) {
        addModel(model: $model) {
          ... on Model {
            _id
            name {
              value
              lang
            }
            description {
              value
              lang
            }
            images {
              large
              medium
              small
              thumbnail
            }
            category {
              name {
                value
                lang
              }
            }
          }
          ... on Error {
            message
            statusCode
          }
        }
      }
    `,
    variables: { model },
  });

  return createdModel.data.addModel;
};
const updateModel = async (id, model, operations) => {
  const updatedModel = await operations.mutate({
    mutation: gql`
      mutation($model: ModelInput!, $id: ID!) {
        updateModel(id: $id, model: $model) {
          ... on Model {
            name {
              value
              lang
            }
            description {
              value
              lang
            }
          }
          ... on Error {
            statusCode
            message
          }
        }
      }
    `,
    variables: {
      model,
      id,
    },
  });
  console.log(updatedModel);
  return updatedModel.data.updateModel;
};
const deleteModel = async (id, operations) => {
  const deletedModel = await operations.mutate({
    mutation: gql`
      mutation($id: ID!) {
        deleteModel(id: $id) {
          ... on Model {
            _id
            name {
              value
              lang
            }
            description {
              value
              lang
            }
          }
          ... on Error {
            statusCode
            message
          }
        }
      }
    `,
    variables: { id },
  });

  return deletedModel.data.deleteModel;
};
const getModelsByCategory = async (category, operations) => {
  const result = await operations.query({
    query: gql`
      query($category: ID!) {
        getModelsByCategory(id: $category) {
          category {
            _id
          }
          name {
            value
            lang
          }
          description {
            value
            lang
          }
          images {
            large
            medium
            small
            thumbnail
          }
        }
      }
    `,
    variables: {
      category,
    },
  });

  return result.data.getModelsByCategory;
};
const getModelById = async (id, operations) => {
  const result = await operations.query({
    query: gql`
      query($id: ID!) {
        getModelById(id: $id) {
          ... on Model {
            category {
              _id
            }
            name {
              value
              lang
            }
            description {
              value
              lang
            }
            images {
              large
              medium
              small
              thumbnail
            }
          }
          ... on Error {
            message
            statusCode
          }
        }
      }
    `,
    variables: {
      id,
    },
  });

  return result.data.getModelById;
};

module.exports = {
  createModel,
  deleteModel,
  getModelsByCategory,
  getModelById,
  updateModel,
};
