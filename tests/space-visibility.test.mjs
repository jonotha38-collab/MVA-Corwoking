import test from 'node:test';
import assert from 'node:assert/strict';
import { isSpacePubliclyVisible } from '../src/lib/space-visibility.ts';

test('exibe apenas salas aprovadas e disponíveis', () => {
  assert.equal(isSpacePubliclyVisible({ approval: 'aprovado', status: 'available' }), true);

  for (const status of ['maintenance', 'hidden', 'occupied']) {
    assert.equal(
      isSpacePubliclyVisible({ approval: 'aprovado', status }),
      false,
      `Status ${status} não pode aparecer no marketplace`,
    );
  }

  for (const approval of ['pendente', 'rejeitado']) {
    assert.equal(isSpacePubliclyVisible({ approval, status: 'available' }), false);
  }
});
