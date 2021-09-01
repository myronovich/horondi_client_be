const newBasicsInputData = (materialId, colorId) => ({
  name: [
    { lang: 'ua', value: 'Malmo' },
    { lang: 'en', value: 'Malmo' },
  ],
  features: {
    material: materialId,
    color: colorId,
  },
  available: true,
});

const newBasicsInputDataUpdate = (materialId, colorId) => ({
  name: [
    { lang: 'ua', value: 'MalmoChanged' },
    { lang: 'en', value: 'MalmoChanged' },
  ],
  features: {
    material: materialId,
    color: colorId,
  },
  available: false,
  additionalPrice: 4,
});

const wrongId = '611255923321a940581140c0';

const filter = {
  name: '',
  available: [],
  material: [],
  color: [],
};

const skip = 0;
const limit = 3;

module.exports = {
  skip,
  limit,
  filter,
  wrongId,
  newBasicsInputData,
  newBasicsInputDataUpdate,
};
