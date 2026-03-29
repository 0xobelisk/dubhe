import { atom } from 'jotai';

const SellPopUpBoxState = atom(false);
const SellState = atom({
  type: '',
  hash: '',
  state: false,
});
const OpenBoxState = atom(false);
const Value = atom('');

export { SellPopUpBoxState, SellState, OpenBoxState, Value };
