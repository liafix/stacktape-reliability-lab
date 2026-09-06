import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import { createFixtureStore } from '../../apps/fixture-service/src/store.ts';

test('fixture store starts from deterministic synthetic records', () => {
  const store = createFixtureStore();
  assert.deepEqual(store.list().map((item) => item.id), ['item-1', 'item-2']);
  assert.equal(store.get('item-1')?.name, 'Synthetic Alpha');
});

test('fixture store creates sequential synthetic ids', () => {
  const store = createFixtureStore();
  const first = store.create({ name: 'Gamma', description: null });
  const second = store.create({ name: 'Delta', description: 'Synthetic only.' });

  assert.equal(first.id, 'item-3');
  assert.equal(second.id, 'item-4');
  assert.equal(store.get('item-4')?.description, 'Synthetic only.');
});

test('fixture store returns undefined for unknown ids', () => {
  const store = createFixtureStore();
  assert.equal(store.get('item-999'), undefined);
});

test('fixture stores do not leak mutable state between instances', () => {
  const first = createFixtureStore();
  const second = createFixtureStore();
  first.create({ name: 'Gamma', description: null });

  assert.equal(first.list().length, 3);
  assert.equal(second.list().length, 2);
});
