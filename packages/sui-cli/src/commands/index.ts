import { CommandModule } from 'yargs';

import localnode from './localnode';
import faucet from './faucet';
import schemagen from './schemagen';
import publish from './publish';
import test from './test';
import fuzz from './fuzz';
import invariantCmd from './invariant';
import qualityTrend from './qualityTrend';
import coverage from './coverage';
import trace from './trace';
import snapshot from './snapshot';
import build from './build';
import debug from './debug';
import debugOpen from './debugOpen';
import debugTui from './debugTui';
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
import workbench from './workbench';
import shell from './shell';

export const commands: CommandModule<any, any>[] = [
  localnode,
  publish,
  // call,
  // query,
  faucet,
  schemagen,
  upgrade,
  workbench,
  test,
  fuzz,
  invariantCmd,
  qualityTrend,
  coverage,
  trace,
  snapshot,
  debug,
  debugOpen,
  debugTui,
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
  convertJson,
  shell
];
