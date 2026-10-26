import type { Space } from '../types';

/** Somente anúncios aprovados e disponíveis podem aparecer para clientes. */
export function isSpacePubliclyVisible(
  space: Pick<Space, 'approval' | 'status'>,
): boolean {
  return space.approval === 'aprovado' && space.status === 'available';
}
