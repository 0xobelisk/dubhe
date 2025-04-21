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
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "mainnet-v1.46.3" }
Dubhe = { git = "https://github.com/0xobelisk/dubhe-framework.git", rev = "dubhe-mainnet-v1.1.0" }
${config.plugins?.length ? config.plugins.map((plugin) => `${plugin} = { git = "https://github.com/0xobelisk/merak.git", rev = "main", subdir = "contracts/${plugin}" }`).join('\n') : '' }

[addresses]
sui = "0x2"
${config.name} = "0x1024"
`;
  await formatAndWriteMove(
    code,
    `${srcPrefix}/contracts/${config.name}/Move.toml`,
    'formatAndWriteMove'
  );
  console.log('✅ Move.toml Generation Complete\n');
}
