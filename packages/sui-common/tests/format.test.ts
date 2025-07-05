import { formatMove } from '../src';
import { describe, it, expect } from 'vitest';

describe('formatMove', async () => {
  it('formats Move code', async () => {
    const input = `module dubhe::access_control {
use dubhe::world::{AdminCap, World};
use sui::dynamic_field as df;
`;

    const r = await formatMove(input);
    console.log(r);
  });
});
