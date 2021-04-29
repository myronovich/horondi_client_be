const wrongId = '5f311ec5f2983e390432a8c3';
const skip = 0;
const wrongSkip = -1;
const wrongLimit = -5;
const limit = 5;
const testValue = 'test value';
const updateValue = 'update value';
const finalPrice = [
  {
    currency: 'UAH',
    value: 0,
  },
  null,
];

const mutationPatternToAdd = (materialId, modelId) => ({
  name: [
    {
      lang: 'uk',
      value: testValue,
    },
    {
      lang: 'en',
      value: testValue,
    },
  ],
  description: [
    {
      lang: 'uk',
      value: testValue,
    },
    {
      lang: 'en',
      value: testValue,
    },
  ],
  optionType: 'PATTERN',
  model: modelId,
  features: {
    material: materialId,
    handmade: false,
  },
  additionalPrice: 1,
  available: true,
  customizable: true,
});

const queryPatternToAdd = (materialId, modelId) => ({
  name: [
    {
      lang: 'uk',
      value: testValue,
    },
    {
      lang: 'en',
      value: testValue,
    },
  ],
  description: [
    {
      lang: 'uk',
      value: testValue,
    },
    {
      lang: 'en',
      value: testValue,
    },
  ],
  optionType: 'PATTERN',
  model: modelId,
  features: {
    material: materialId,
    handmade: false,
  },
  additionalPrice: 1,
  available: true,
  customizable: false,
});

const createdPattern = (materialId, modelId) => ({
  name: [
    {
      lang: 'uk',
      value: testValue,
    },
    {
      lang: 'en',
      value: testValue,
    },
  ],
  description: [
    {
      lang: 'uk',
      value: testValue,
    },
    {
      lang: 'en',
      value: testValue,
    },
  ],
  optionType: 'PATTERN',
  model: { _id: modelId },
  features: {
    material: { _id: materialId },
    handmade: false,
  },
  additionalPrice: finalPrice,
  available: true,
  customizable: true,
});

const patternToUpdate = (materialId, modelId) => ({
  name: [
    {
      lang: 'uk',
      value: updateValue,
    },
    {
      lang: 'en',
      value: updateValue,
    },
  ],
  description: [
    {
      lang: 'uk',
      value: updateValue,
    },
    {
      lang: 'en',
      value: updateValue,
    },
  ],
  optionType: 'PATTERN',
  model: modelId,
  features: {
    material: materialId,
    handmade: false,
  },
  additionalPrice: 1,
  available: true,
  customizable: false,
});

const patternAfterUpdate = (materialId, modelId) => ({
  name: [
    {
      lang: 'uk',
      value: updateValue,
    },
    {
      lang: 'en',
      value: updateValue,
    },
  ],
  description: [
    {
      lang: 'uk',
      value: updateValue,
    },
    {
      lang: 'en',
      value: updateValue,
    },
  ],
  optionType: 'PATTERN',
  model: { _id: modelId },
  features: {
    material: { _id: materialId },
    handmade: false,
  },
  additionalPrice: finalPrice,
  available: true,
  customizable: false,
});

module.exports = {
  patternToUpdate,
  wrongId,
  skip,
  limit,
  wrongSkip,
  wrongLimit,
  finalPrice,
  queryPatternToAdd,
  mutationPatternToAdd,
  createdPattern,
  patternAfterUpdate,
};
