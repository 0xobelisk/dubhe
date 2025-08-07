import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import packageJson from '../../../../package.json';

export async function generateToml(config: DubheConfig, srcPrefix: string) {
  console.log('\n📄 Starting Move.toml Generation...');
  console.log(`  └─ Output path: ${srcPrefix}/src/${config.name}/Move.toml`);

  let code = `[package]
name = "${config.name}"
version = "1.0.0"
edition = "2024"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "mainnet-v1.46.3" }
Dubhe = { git = "https://github.com/0xobelisk/dubhe.git", subdir = "framework/src/dubhe", rev = "v${packageJson.version}" }

[addresses]
sui = "0x2"
${config.name} = "0x0"
`;
  await formatAndWriteMove(code, `${srcPrefix}/src/${config.name}/Move.toml`, 'formatAndWriteMove');
  console.log('✅ Move.toml Generation Complete\n');
}
