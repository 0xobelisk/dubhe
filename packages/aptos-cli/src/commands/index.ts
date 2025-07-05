import { CommandModule } from 'yargs';

import localnode from './localnode';
import faucet from './faucet';
import schemagen from './schemagen';
import publish from './publish';
import upgrade from './upgrade';
import test from './test';
import hello from './hello';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Each command has different options
export const commands: CommandModule<any, any>[] = [
  publish,
  localnode,
  faucet,
  schemagen,
  upgrade,
  test,
  hello
];
