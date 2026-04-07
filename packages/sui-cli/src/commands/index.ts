import { CommandModule } from 'yargs';

import localnode from './localnode';
import faucet from './faucet';
import generate from './generate';
import publish from './publish';
import test from './test';
import build from './build';
import hello from './hello';
import generateKey from './generateKey';
import checkBalance from './checkBalance';
import storeConfig from './storeConfig';
import watch from './watch';
import wait from './wait';
import switchEnv from './switchEnv';
import info from './info';
import loadMetadata from './loadMetadata';
import doctor from './doctor';
import convertJson from './convertJson';
import upgrade from './upgrade';
import shell from './shell';

export const commands: CommandModule<any, any>[] = [
  localnode,
  publish,
  // call,
  // query,
  faucet,
  generate,
  upgrade,
  test,
  build,
  hello,
  generateKey,
  checkBalance,
  storeConfig,
  watch,
  wait,
  switchEnv,
  info,
  loadMetadata,
  doctor,
  convertJson,
  shell
];
