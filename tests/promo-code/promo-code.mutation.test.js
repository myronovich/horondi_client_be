const { newPromoCode } = require('./promo-code.variables');
const { setupApp } = require('../helper-functions');

const { addPromoCode, deletePromoCode } = require('./promo-code.helper');

let promoCodes;
let promoCodeId;
let operations;

describe('PromoCodes queries', () => {
  beforeAll(async () => {
    operations = await setupApp();
  });

  it('should add add to database', async () => {
    promoCodes = await addPromoCode(newPromoCode, operations);

    expect(promoCodes).toHaveProperty('code', newPromoCode.code);
    expect(promoCodes.dateFrom).toEqual('2021-12-26');
    expect(promoCodes).toHaveProperty('discount', newPromoCode.discount);
    expect(promoCodes.discount).toEqual(12);
  });

  it('delete promo-code', async () => {
    promoCodeId = promoCodes._id;
    const res = await deletePromoCode(promoCodeId, operations);
    promoCodes = res.data.deletePromoCode;
    expect(promoCodes).toHaveProperty('code', newPromoCode.code);
    expect(promoCodes.dateFrom).toEqual('2021-12-26');
    expect(promoCodes).toHaveProperty('discount', newPromoCode.discount);
  });
});
