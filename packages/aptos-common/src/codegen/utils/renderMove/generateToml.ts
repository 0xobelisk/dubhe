import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';

export function generateToml(config: DubheConfig, srcPrefix: string) {
  let code = `[package]
name = "${config.name}"
version = "1.0.0"
upgrade_policy = "compatible"
authors = []

[addresses]
${config.name} = "_"

[dev-addresses]

[dependencies.AptosFramework]
git = "https://github.com/aptos-labs/aptos-core.git"
rev = "mainnet"
subdir = "aptos-move/framework/aptos-framework"

[dev-dependencies]
`;
  formatAndWriteMove(code, `${srcPrefix}/contracts/${config.name}/Move.toml`, 'formatAndWriteMove');
}
