import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';

export async function generateDappKey(config: DubheConfig, srcPrefix: string) {
  let code = `module ${config.name}::${config.name}_dapp_key {
\t/// Authorization token for the app.
\tpublic struct DappKey has drop {}

\tpublic(package) fun new(): DappKey {
\t\tDappKey {  }
\t}
}
`;
  await formatAndWriteMove(
    code,
    `${srcPrefix}/contracts/${config.name}/sources/codegen/core/dapp_key.move`,
    'formatAndWriteMove'
  );
}
