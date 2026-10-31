const test = require('node:test');
const assert = require('node:assert');
const { calculateTotal } = require('./app');

test('total for 2 items at 500 is 1000', () => {
  assert.strictEqual(calculateTotal(500, 2), 1000);
});
