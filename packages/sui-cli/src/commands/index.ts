import { CommandModule } from 'yargs';

import localnode from './localnode';
import faucet from './faucet';
import schemagen from './schemagen';
import publish from './publish';
import test from './test';
import build from './build';
import hello from './hello';
import generateKey from './generateKey';
import checkBalance from './checkBalance';
import configStore from './configStore';
import watch from './watch';
import wait from './wait';
import switchEnv from './switchEnv';
import info from './info';
import loadMetadata from './loadMetadata';
import doctor from './doctor';
import convertJson from './convertJson';
import upgrade from './upgrade';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Each command has different options
export const commands: CommandModule<any, any>[] = [
  localnode,
  publish,
  // call,
  // query,
  faucet,
  schemagen,
  upgrade,
  test,
  build,
  hello,
  generateKey,
  checkBalance,
  configStore,
  watch,
  wait,
  switchEnv,
  info,
  loadMetadata,
  doctor,
  convertJson
];
