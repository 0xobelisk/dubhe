import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';

export async function generateToml(config: DubheConfig, srcPrefix: string) {
  console.log('\n📄 Starting Move.toml Generation...');
  console.log(`  └─ Output path: ${srcPrefix}/contracts/${config.name}/Move.toml`);

  let code = `[package]
name = "${config.name}"
version = "1.0.0"
edition = "2024"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "mainnet-v1.38.3" }
Dubhe = { git = "https://github.com/0xobelisk/dubhe-framework.git", rev = "dubhe-mainnet-v1.1.0" }

[addresses]
sui = "0x2"
${config.name} = "0x0"
`;
  await formatAndWriteMove(
    code,
    `${srcPrefix}/contracts/${config.name}/Move.toml`,
    'formatAndWriteMove'
  );
  console.log('✅ Move.toml Generation Complete\n');
}
