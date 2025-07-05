import prettier from 'prettier';
import prettierPluginMove from 'prettier-plugin-move-js';

export async function formatMove(content: string, prettierConfigPath?: string): Promise<string> {
  let config;
  if (prettierConfigPath) {
    config = await prettier.resolveConfig(prettierConfigPath);
  }
  try {
    return prettier.format(content, {
      plugins: [prettierPluginMove],
      parser: 'move-parse',
      printWidth: 120,
      semi: true,
      tabWidth: 2,
      useTabs: false,
      bracketSpacing: true,
      ...config
    });
  } catch (error) {
    let message;
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = error;
    }
    console.log(`Error during output formatting: ${message}`);
    return content;
  }
}

export async function formatTypescript(content: string): Promise<string> {
  return prettier.format(content, {
    parser: 'typescript'
  });
}
