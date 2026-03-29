import type { CommandModule } from 'yargs';
import chalk from 'chalk';
import { spawn } from 'child_process';
import Table from 'cli-table3';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';
import axios, { AxiosRequestConfig } from 'axios';
import packageJson from '../../package.json';
import { downloadWithAxios } from '../utils/axios-downloader';
import { handlerExit } from './shell';

// Check result type
interface CheckResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  fixSuggestion?: string;
}

// GitHub Release type
interface GitHubRelease {
  tag_name: string;
  name: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
  published_at: string;
}

// Tool configuration
interface ToolConfig {
  name: string;
  repo: string;
  binaryName: string;
  installDir: string;
}

// System information
interface SystemInfo {
  platform: string;
  arch: string;
  platformForAsset: string;
  archForAsset: string;
}

// Get system information
function getSystemInfo(): SystemInfo {
  const platform = process.platform;
  const arch = process.arch;

  let platformForAsset: string;
  let archForAsset: string;

  switch (platform) {
    case 'darwin':
      platformForAsset = 'macos';
      break;
    case 'win32':
      platformForAsset = 'windows';
      break;
    case 'linux':
      platformForAsset = 'ubuntu';
      break;
    default:
      platformForAsset = platform;
  }

  switch (arch) {
    case 'x64':
      archForAsset = 'x86_64';
      break;
    case 'arm64':
      archForAsset = 'aarch64';
      break;
    default:
      archForAsset = arch;
  }

  return {
    platform,
    arch,
    platformForAsset,
    archForAsset
  };
}

// Tool configurations
const TOOL_CONFIGS: Record<string, ToolConfig> = {
  sui: {
    name: 'sui',
    repo: 'MystenLabs/sui',
    binaryName: 'sui',
    installDir: path.join(os.homedir(), '.dubhe', 'bin')
  },
  'dubhe-indexer': {
    name: 'dubhe-indexer',
    repo: '0xobelisk/dubhe',
    binaryName: 'dubhe-indexer',
    installDir: path.join(os.homedir(), '.dubhe', 'bin')
  }
};

// Execute shell command and return output
async function execCommand(
  command: string,
  args: string[] = []
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { shell: true });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ code: code || 0, stdout, stderr });
    });

    child.on('error', () => {
      resolve({ code: -1, stdout, stderr });
    });
  });
}

// Enhanced axios function
async function fetchWithAxios(
  url: string,
  options: AxiosRequestConfig = {}
): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<any>;
  headers: any;
}> {
  try {
    // Configure axios with better defaults for network issues
    const axiosConfig: AxiosRequestConfig = {
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Accept all status codes < 500
      ...options
    };

    const response = await axios(url, axiosConfig);
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      json: async () => response.data,
      headers: response.headers
    };
  } catch (error: any) {
    // Handle network errors more gracefully
    let status = error.response?.status || 0;
    let statusText = error.response?.statusText || error.message;

    // Handle specific network error cases
    if (error.code === 'ENOTFOUND') {
      statusText = 'DNS resolution failed - please check your internet connection';
    } else if (error.code === 'ECONNRESET') {
      statusText = 'Connection reset - please check your network connection';
    } else if (error.code === 'ETIMEDOUT') {
      statusText = 'Connection timeout - please check your network connection';
    } else if (error.message.includes('protocol mismatch')) {
      statusText = 'Protocol mismatch - please check your network configuration';
    }

    return {
      ok: false,
      status,
      statusText,
      json: async () => error.response?.data || {},
      headers: error.response?.headers || {}
    };
  }
}

// Fetch GitHub releases with retry
async function fetchGitHubReleases(
  repo: string,
  count: number = 10,
  retries: number = 3
): Promise<GitHubRelease[]> {
  const url = `https://api.github.com/repos/${repo}/releases?per_page=${count}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(chalk.gray(`     Retry ${attempt}/${retries}...`));
      }

      const response = await fetchWithAxios(url, {
        headers: {
          'User-Agent': 'dubhe-cli',
          Accept: 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            `GitHub API rate limit: ${response.status}. Please retry later or set GITHUB_TOKEN environment variable`
          );
        }
        throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
      }

      const releases = await response.json();
      return releases;
    } catch (error) {
      if (attempt > 1) {
        console.log(
          chalk.yellow(
            `     ⚠️ Attempt ${attempt} failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }

      if (attempt === retries) {
        console.error(chalk.red(`   ❌ Failed to fetch releases after ${retries} attempts`));
        return [];
      }

      // Wait 1 second before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  return [];
}

// Find compatible assets for current system
function findCompatibleAssets(release: GitHubRelease, systemInfo: SystemInfo): string[] {
  const assets = release.assets.filter((asset) => {
    const name = asset.name.toLowerCase();

    // Platform matching with various aliases
    const platformVariants = [
      systemInfo.platformForAsset.toLowerCase(),
      ...(systemInfo.platformForAsset === 'macos' ? ['darwin', 'apple'] : []),
      ...(systemInfo.platformForAsset === 'windows' ? ['win', 'win32', 'windows'] : []),
      ...(systemInfo.platformForAsset === 'ubuntu' ? ['linux', 'gnu'] : [])
    ];

    // Architecture matching with various aliases
    const archVariants = [
      systemInfo.archForAsset.toLowerCase(),
      ...(systemInfo.archForAsset === 'x86_64' ? ['amd64', 'x64'] : []),
      ...(systemInfo.archForAsset === 'aarch64' ? ['arm64'] : [])
    ];

    const platformMatch = platformVariants.some((variant) => name.includes(variant));
    const archMatch = archVariants.some((variant) => name.includes(variant));

    // Check for archive formats
    const isArchive =
      name.endsWith('.tar.gz') ||
      name.endsWith('.zip') ||
      name.endsWith('.tgz') ||
      name.endsWith('.tar.bz2') ||
      name.endsWith('.tar.xz');

    return platformMatch && archMatch && isArchive;
  });

  return assets.map((asset) => asset.name);
}

// Get available versions for a tool
async function getAvailableVersions(
  toolName: string,
  systemInfo: SystemInfo
): Promise<Array<{ version: string; hasCompatibleAsset: boolean }>> {
  const config = TOOL_CONFIGS[toolName];
  if (!config) return [];

  const releases = await fetchGitHubReleases(config.repo, 10);

  return releases.map((release) => ({
    version: release.tag_name,
    hasCompatibleAsset: findCompatibleAssets(release, systemInfo).length > 0
  }));
}

// Auto-add PATH to shell configuration file
async function autoAddToShellConfig(installDir: string): Promise<void> {
  try {
    // Detect current shell
    const shell = detectCurrentShell();
    if (!shell) {
      console.log(chalk.gray(`Please add to PATH: export PATH="$PATH:${installDir}"`));
      return;
    }

    const { shellName, configFile } = shell;
    const pathCommand =
      shellName === 'fish'
        ? `set -gx PATH $PATH ${installDir}`
        : `export PATH="$PATH:${installDir}"`;

    // Check if PATH is already added
    if (fs.existsSync(configFile)) {
      const content = fs.readFileSync(configFile, 'utf8');
      if (content.includes(installDir)) {
        console.log(chalk.green(`     ✓ PATH already configured in ${configFile}`));
        return;
      }
    }

    // Add PATH to configuration file
    const comment = shellName === 'fish' ? '# Added by dubhe doctor' : '# Added by dubhe doctor';
    const pathLine = `${comment}\n${pathCommand}`;

    fs.appendFileSync(configFile, `\n${pathLine}\n`);

    console.log(chalk.green(`     ✓ Automatically added to PATH in ${configFile}`));
    console.log(chalk.blue(`     📝 To apply changes: source ${configFile} or restart terminal`));
  } catch (error) {
    console.log(
      chalk.yellow(
        `     ⚠️ Could not auto-configure PATH: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
    console.log(chalk.gray(`     Please manually add to PATH: export PATH="$PATH:${installDir}"`));
  }
}

// Detect current shell and return shell info
function detectCurrentShell(): { shellName: string; configFile: string } | null {
  const homeDir = os.homedir();

  // Method 1: Check SHELL environment variable
  const shellEnv = process.env.SHELL;
  if (shellEnv) {
    if (shellEnv.includes('zsh')) {
      return {
        shellName: 'zsh',
        configFile: path.join(homeDir, '.zshrc')
      };
    } else if (shellEnv.includes('bash')) {
      // On macOS, prefer .bash_profile, on Linux prefer .bashrc
      const bashProfile = path.join(homeDir, '.bash_profile');
      const bashrc = path.join(homeDir, '.bashrc');
      return {
        shellName: 'bash',
        configFile:
          process.platform === 'darwin' && fs.existsSync(bashProfile) ? bashProfile : bashrc
      };
    } else if (shellEnv.includes('fish')) {
      const fishConfigDir = path.join(homeDir, '.config', 'fish');
      if (!fs.existsSync(fishConfigDir)) {
        fs.mkdirSync(fishConfigDir, { recursive: true });
      }
      return {
        shellName: 'fish',
        configFile: path.join(fishConfigDir, 'config.fish')
      };
    }
  }

  // Method 2: Check which config files exist
  const possibleConfigs = [
    { name: 'zsh', file: path.join(homeDir, '.zshrc') },
    {
      name: 'bash',
      file:
        process.platform === 'darwin'
          ? path.join(homeDir, '.bash_profile')
          : path.join(homeDir, '.bashrc')
    },
    { name: 'bash', file: path.join(homeDir, '.bashrc') }
  ];

  for (const config of possibleConfigs) {
    if (fs.existsSync(config.file)) {
      return {
        shellName: config.name,
        configFile: config.file
      };
    }
  }

  // Method 3: Try to create default based on common patterns
  if (process.env.ZSH || fs.existsSync('/bin/zsh')) {
    return {
      shellName: 'zsh',
      configFile: path.join(homeDir, '.zshrc')
    };
  }

  return null;
}

// Download and install tool
async function downloadAndInstallTool(toolName: string, version?: string): Promise<boolean> {
  const config = TOOL_CONFIGS[toolName];
  if (!config) {
    console.error(`Unknown tool: ${toolName}`);
    return false;
  }

  const systemInfo = getSystemInfo();
  console.log(chalk.gray(`   System: ${systemInfo.platform}/${systemInfo.arch}`));

  try {
    // Fetch releases
    console.log(chalk.gray(`   Fetching release information...`));
    const releases = await fetchGitHubReleases(config.repo, 10);
    if (releases.length === 0) {
      console.error(chalk.red(`   ❌ Unable to fetch releases for ${config.name}`));
      return false;
    }

    let selectedRelease: GitHubRelease | null = null;

    if (version) {
      // Find specific version
      if (!version.startsWith('v')) {
        version = `v${version}`;
      }
      selectedRelease = releases.find((r) => r.tag_name === version) || null;
      if (!selectedRelease) {
        console.error(`Version ${version} not found`);
        return false;
      }
    } else {
      // Find latest compatible version
      for (const release of releases) {
        const compatibleAssets = findCompatibleAssets(release, systemInfo);
        if (compatibleAssets.length > 0) {
          selectedRelease = release;
          break;
        }
      }
    }

    if (!selectedRelease) {
      console.error(`No compatible version found`);
      return false;
    }

    // Find compatible asset
    const compatibleAssets = findCompatibleAssets(selectedRelease, systemInfo);
    if (compatibleAssets.length === 0) {
      console.error(`Version ${selectedRelease.tag_name} has no compatible binaries`);
      return false;
    }

    const assetName = compatibleAssets[0];
    const asset = selectedRelease.assets.find((a) => a.name === assetName);
    if (!asset) {
      console.error(`Asset file not found: ${assetName}`);
      return false;
    }

    console.log(chalk.green(`   ✓ Found compatible version: ${selectedRelease.tag_name}`));
    console.log(chalk.gray(`   Download file: ${asset.name}`));

    // Verify download link
    try {
      const headResponse = await fetchWithAxios(asset.browser_download_url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'dubhe-cli' }
      });
      if (!headResponse.ok) {
        console.log(
          chalk.yellow(`   ⚠️ Warning: Unable to access download file (${headResponse.status})`)
        );
      } else {
        const fileSize = headResponse.headers['content-length'];
        if (fileSize) {
          console.log(
            chalk.gray(
              `   File size: ${Math.round((parseInt(fileSize) / 1024 / 1024) * 100) / 100} MB`
            )
          );
        }
      }
    } catch (_error) {
      console.log(chalk.yellow(`   ⚠️ Warning: Unable to verify download file`));
    }

    // Create install directory
    if (!fs.existsSync(config.installDir)) {
      fs.mkdirSync(config.installDir, { recursive: true });
      console.log(chalk.gray(`   Created install directory: ${config.installDir}`));
    }

    // Download file with retry and progress bar
    console.log(chalk.blue(`   📥 Downloading...`));

    const tempFile = path.join(os.tmpdir(), asset.name);
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(chalk.gray(`   Attempt ${attempt} to download...`));
        }

        await downloadWithAxios(asset.browser_download_url, tempFile);
        break;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(chalk.yellow(`   ⚠️ Download failed (attempt ${attempt}): ${errorMsg}`));

        if (attempt === maxRetries) {
          throw new Error(`Download failed after ${maxRetries} attempts: ${errorMsg}`);
        }

        // Wait before retry
        console.log(chalk.gray(`   Waiting ${attempt * 2} seconds before retry...`));
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }

    // Extract and install
    console.log(chalk.blue('   📦 Extracting and installing...'));

    const extractDir = path.join(os.tmpdir(), `extract_${Date.now()}`);
    fs.mkdirSync(extractDir, { recursive: true });

    if (asset.name.endsWith('.tar.gz') || asset.name.endsWith('.tgz')) {
      // Extract tar.gz / tgz
      const tarResult = await execCommand('tar', ['-xzf', tempFile, '-C', extractDir]);
      if (tarResult.code !== 0) {
        throw new Error(`Extraction failed: ${tarResult.stderr}`);
      }
    } else if (asset.name.endsWith('.tar.bz2')) {
      // Extract tar.bz2
      const tarResult = await execCommand('tar', ['-xjf', tempFile, '-C', extractDir]);
      if (tarResult.code !== 0) {
        throw new Error(`Extraction failed: ${tarResult.stderr}`);
      }
    } else if (asset.name.endsWith('.tar.xz')) {
      // Extract tar.xz
      const tarResult = await execCommand('tar', ['-xJf', tempFile, '-C', extractDir]);
      if (tarResult.code !== 0) {
        throw new Error(`Extraction failed: ${tarResult.stderr}`);
      }
    } else if (asset.name.endsWith('.zip')) {
      // Extract zip (requires unzip command)
      const unzipResult = await execCommand('unzip', ['-q', tempFile, '-d', extractDir]);
      if (unzipResult.code !== 0) {
        throw new Error(`Extraction failed: ${unzipResult.stderr}`);
      }
    } else {
      throw new Error(`Unsupported compression format: ${asset.name}`);
    }

    // Find binary file
    const findBinary = (dir: string): string | null => {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          const result = findBinary(fullPath);
          if (result) return result;
        } else if (file.name === config.binaryName || file.name === `${config.binaryName}.exe`) {
          return fullPath;
        }
      }
      return null;
    };

    const binaryPath = findBinary(extractDir);
    if (!binaryPath) {
      throw new Error(`Cannot find ${config.binaryName} binary in extracted files`);
    }

    // Copy binary to install directory
    const targetPath = path.join(
      config.installDir,
      config.binaryName + (process.platform === 'win32' ? '.exe' : '')
    );
    fs.copyFileSync(binaryPath, targetPath);

    // Make executable on Unix systems
    if (process.platform !== 'win32') {
      fs.chmodSync(targetPath, 0o755);
    }

    // Cleanup
    fs.rmSync(tempFile, { force: true });
    fs.rmSync(extractDir, { recursive: true, force: true });

    console.log(chalk.green(`   ✅ Installation completed!`));
    console.log(chalk.gray(`   Location: ${targetPath}`));
    console.log(chalk.gray(`   Version: ${selectedRelease.tag_name}`));

    // Check if install directory is in PATH
    const currentPath = process.env.PATH || '';
    if (!currentPath.includes(config.installDir)) {
      console.log(
        chalk.yellow('   ⚠️  Warning: Install directory is not in PATH environment variable')
      );

      if (process.platform === 'win32') {
        console.log(chalk.gray(`     Please add to PATH: set PATH=%PATH%;${config.installDir}`));
      } else {
        // Auto-add to shell configuration file
        await autoAddToShellConfig(config.installDir);
      }
    }

    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Installation failed: ${error}`));
    return false;
  }
}

// Interactive version selection
async function selectVersion(toolName: string): Promise<string | null> {
  const systemInfo = getSystemInfo();
  const versions = await getAvailableVersions(toolName, systemInfo);

  if (versions.length === 0) {
    console.log(chalk.red(`Unable to get version information for ${toolName}`));
    return null;
  }

  const compatibleVersions = versions.filter((v) => v.hasCompatibleAsset).slice(0, 5);

  if (compatibleVersions.length === 0) {
    console.log(chalk.red(`No compatible versions found for current system`));
    return null;
  }

  console.log(chalk.blue(`\n📋 Select version for ${toolName}`));
  console.log(chalk.gray(`System: ${systemInfo.platform}/${systemInfo.arch}`));
  console.log(chalk.gray(`Compatible versions (latest 5):\n`));

  const choices = compatibleVersions.map((version, index) => ({
    name: `${version.version} ${index === 0 ? chalk.green('(latest)') : chalk.gray('(available)')}`,
    value: version.version,
    short: version.version
  }));

  try {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'version',
        message: 'Please select a version to install:',
        choices: [
          ...choices,
          new inquirer.Separator(),
          {
            name: chalk.gray('Cancel installation'),
            value: 'cancel'
          }
        ],
        default: choices[0].value
      }
    ]);

    if (answer.version === 'cancel') {
      console.log(chalk.gray('Installation cancelled'));
      return null;
    }

    return answer.version;
  } catch (_error) {
    console.log(chalk.gray('\nInstallation cancelled'));
    return null;
  }
}

// Check if binary exists in install directory
function checkBinaryExists(toolName: string): boolean {
  const config = TOOL_CONFIGS[toolName];
  if (!config) return false;

  const binaryPath = path.join(
    config.installDir,
    config.binaryName + (process.platform === 'win32' ? '.exe' : '')
  );

  return fs.existsSync(binaryPath);
}

// Check dubhe-indexer version consistency with sui-cli
async function checkDubheIndexerVersionConsistency(): Promise<CheckResult> {
  try {
    const currentSuiCliVersion = packageJson.version;

    // Get dubhe-indexer version
    const result = await execCommand('dubhe-indexer', ['--version']);
    if (result.code !== 0) {
      return {
        name: 'Dubhe-indexer Version Consistency',
        status: 'warning',
        message: 'Cannot get dubhe-indexer version',
        fixSuggestion: 'Unable to verify version consistency'
      };
    }

    // Parse version from output (expected format: "dubhe-indexer 1.2.0-pre.46" or similar)
    const versionMatch = result.stdout.trim().match(/dubhe-indexer\s+(\S+)/);
    if (!versionMatch) {
      return {
        name: 'Dubhe-indexer Version Consistency',
        status: 'warning',
        message: 'Cannot parse dubhe-indexer version',
        fixSuggestion: 'Unable to verify version consistency'
      };
    }

    const dubheIndexerVersion = versionMatch[1];

    // Compare versions
    if (currentSuiCliVersion === dubheIndexerVersion) {
      return {
        name: 'Dubhe-indexer Version Consistency',
        status: 'success',
        message: `Versions match (${currentSuiCliVersion})`
      };
    } else {
      return {
        name: 'Dubhe-indexer Version Consistency',
        status: 'warning',
        message: `Version mismatch: sui-cli ${currentSuiCliVersion}, dubhe-indexer ${dubheIndexerVersion}`,
        fixSuggestion: `Consider reinstalling dubhe-indexer to match sui-cli version ${currentSuiCliVersion}`
      };
    }
  } catch (_error) {
    return {
      name: 'Dubhe-indexer Version Consistency',
      status: 'warning',
      message: 'Version check failed',
      fixSuggestion: 'Unable to verify version consistency'
    };
  }
}

// Check if command is available in PATH
async function checkCommand(
  command: string,
  versionFlag: string = '--version'
): Promise<CheckResult> {
  try {
    const result = await execCommand(command, [versionFlag]);
    if (result.code === 0) {
      const version = result.stdout.trim().split('\n')[0];
      return {
        name: command,
        status: 'success',
        message: `Installed ${version}`
      };
    } else {
      // Check if binary exists in install directory but not in PATH
      if (checkBinaryExists(command)) {
        const shell = detectCurrentShell();
        const shellConfig = shell ? shell.configFile : '~/.zshrc (or ~/.bashrc)';

        return {
          name: command,
          status: 'warning',
          message: 'Installed but not in PATH',
          fixSuggestion: `Binary exists in install directory. Please apply PATH changes: source ${shellConfig} (or restart terminal), then run dubhe doctor again`
        };
      }

      return {
        name: command,
        status: 'error',
        message: 'Not installed',
        fixSuggestion: getInstallSuggestion(command)
      };
    }
  } catch (_error) {
    // Check if binary exists in install directory but not in PATH
    if (checkBinaryExists(command)) {
      const shell = detectCurrentShell();
      const shellConfig = shell ? shell.configFile : '~/.zshrc (or ~/.bashrc)';

      return {
        name: command,
        status: 'warning',
        message: 'Installed but not in PATH',
        fixSuggestion: `Binary exists in install directory. Please apply PATH changes: source ${shellConfig} (or restart terminal), then run dubhe doctor again`
      };
    }

    return {
      name: command,
      status: 'error',
      message: 'Not installed',
      fixSuggestion: getInstallSuggestion(command)
    };
  }
}

// Get installation suggestions
function getInstallSuggestion(command: string): string {
  const suggestions: Record<string, string> = {
    docker: 'Visit https://docs.docker.com/get-docker/ to install Docker',
    'docker-compose': 'Visit https://docs.docker.com/compose/install/ to install Docker Compose',
    sui: 'Run `dubhe doctor --install sui` to auto-install, or visit https://docs.sui.io/guides/developer/getting-started/sui-install',
    'dubhe-indexer':
      'Run `dubhe doctor --install dubhe-indexer` to auto-install, or download from https://github.com/0xobelisk/dubhe/releases',
    pnpm: 'Run: npm install -g pnpm',
    node: 'Visit https://nodejs.org/ to download and install Node.js'
  };

  return suggestions[command] || `Please install ${command}`;
}

// Check Node.js version
async function checkNodeVersion(): Promise<CheckResult> {
  try {
    const result = await execCommand('node', ['--version']);
    if (result.code === 0) {
      const version = result.stdout.trim();
      const versionNumber = parseFloat(version.replace('v', ''));

      if (versionNumber >= 18) {
        return {
          name: 'Node.js Version',
          status: 'success',
          message: `${version} (meets requirement >=18.0)`
        };
      } else {
        return {
          name: 'Node.js Version',
          status: 'warning',
          message: `${version} (recommend upgrade to >=18.0)`,
          fixSuggestion: 'Please upgrade Node.js to 18.0 or higher'
        };
      }
    } else {
      return {
        name: 'Node.js Version',
        status: 'error',
        message: 'Not installed',
        fixSuggestion: 'Please install Node.js 18.0 or higher'
      };
    }
  } catch (_error) {
    return {
      name: 'Node.js Version',
      status: 'error',
      message: 'Check failed',
      fixSuggestion: 'Please install Node.js'
    };
  }
}

// Check Docker service status
async function checkDockerService(): Promise<CheckResult> {
  try {
    const result = await execCommand('docker', ['info']);
    if (result.code === 0) {
      return {
        name: 'Docker Service',
        status: 'success',
        message: 'Running'
      };
    } else {
      return {
        name: 'Docker Service',
        status: 'warning',
        message: 'Not running',
        fixSuggestion: 'Please start Docker service'
      };
    }
  } catch (_error) {
    return {
      name: 'Docker Service',
      status: 'error',
      message: 'Check failed',
      fixSuggestion: 'Please install and start Docker'
    };
  }
}

// Check NPM configuration
async function checkNpmConfig(): Promise<CheckResult> {
  try {
    const result = await execCommand('npm', ['config', 'get', 'registry']);
    if (result.code === 0) {
      const registry = result.stdout.trim();
      return {
        name: 'NPM Configuration',
        status: 'success',
        message: `Configured (${registry})`
      };
    } else {
      return {
        name: 'NPM Configuration',
        status: 'warning',
        message: 'Configuration issue',
        fixSuggestion: 'Check NPM configuration: npm config list'
      };
    }
  } catch (_error) {
    return {
      name: 'NPM Configuration',
      status: 'warning',
      message: 'Check failed',
      fixSuggestion: 'Please install Node.js and NPM'
    };
  }
}

// Check if port is available
async function checkPortAvailable(port: number): Promise<boolean> {
  // Check both localhost and all interfaces
  const hosts = ['127.0.0.1', '0.0.0.0'];

  for (const host of hosts) {
    const available = await checkPortOnHost(port, host);
    if (!available) {
      return false; // Port is occupied on this host
    }
  }

  return true; // Port is available on all checked hosts
}

// Check if port is available on specific host
async function checkPortOnHost(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    // Set a timeout to avoid hanging
    const timeout = setTimeout(() => {
      server.close();
      resolve(false); // Assume occupied if timeout
    }, 2000);

    // Try to bind to the port - if this fails, port is in use
    server.listen(port, host, () => {
      clearTimeout(timeout);
      server.close(() => {
        resolve(true); // Port is available on this host
      });
    });

    server.on('error', (err: any) => {
      clearTimeout(timeout);
      server.close();
      // If error code is EADDRINUSE, port is definitely in use
      if (err.code === 'EADDRINUSE') {
        resolve(false); // Port is in use
      } else {
        // For other errors, also assume port is not available
        resolve(false);
      }
    });
  });
}

// Check PostgreSQL port (5432)
async function checkPostgreSQLPort(): Promise<CheckResult> {
  try {
    const isAvailable = await checkPortAvailable(5432);

    if (isAvailable) {
      return {
        name: 'PostgreSQL Port (5432)',
        status: 'success',
        message: 'Available'
      };
    } else {
      return {
        name: 'PostgreSQL Port (5432)',
        status: 'warning',
        message: 'Port is occupied',
        fixSuggestion:
          'Port 5432 is in use. Check if PostgreSQL is already running or stop the service using this port. This may cause template startup failure.'
      };
    }
  } catch (_error) {
    return {
      name: 'PostgreSQL Port (5432)',
      status: 'warning',
      message: 'Check failed',
      fixSuggestion: 'Unable to check port status'
    };
  }
}

// Check GraphQL Server port (4000)
async function checkGraphQLPort(): Promise<CheckResult> {
  try {
    const isAvailable = await checkPortAvailable(4000);

    if (isAvailable) {
      return {
        name: 'GraphQL Server Port (4000)',
        status: 'success',
        message: 'Available'
      };
    } else {
      return {
        name: 'GraphQL Server Port (4000)',
        status: 'warning',
        message: 'Port is occupied',
        fixSuggestion:
          'Port 4000 is in use. Check if GraphQL server is already running or stop the service using this port. This may cause template startup failure.'
      };
    }
  } catch (_error) {
    return {
      name: 'GraphQL Server Port (4000)',
      status: 'warning',
      message: 'Check failed',
      fixSuggestion: 'Unable to check port status'
    };
  }
}

// Create table row data
function formatTableRow(result: CheckResult): string[] {
  const statusIcon = {
    success: chalk.green('✓'),
    warning: chalk.yellow('!'),
    error: chalk.red('✗')
  };

  const statusText = {
    success: chalk.green('Pass'),
    warning: chalk.yellow('Warning'),
    error: chalk.red('Fail')
  };

  // Decide what content to display based on status
  let fixContent = '';
  if (result.status === 'success') {
    fixContent = result.message;
  } else {
    fixContent = result.fixSuggestion || result.message;
  }

  return [result.name, `${statusIcon[result.status]} ${statusText[result.status]}`, fixContent];
}

// Main check function
async function runDoctorChecks(options: {
  install?: string;
  selectVersion?: boolean;
  listVersions?: string;
  debug?: boolean;
}) {
  console.log(chalk.bold.blue('\n🔍 Dubhe Doctor - Development Environment Checker\n'));

  // Handle list-versions option
  if (options.listVersions) {
    const toolName = options.listVersions;
    if (!TOOL_CONFIGS[toolName]) {
      console.error(chalk.red(`❌ Unsupported tool: ${toolName}`));
      handlerExit(1);
    }

    console.log(chalk.blue(`📋 Available versions for ${toolName}:`));
    const systemInfo = getSystemInfo();
    console.log(chalk.gray(`System: ${systemInfo.platform}/${systemInfo.arch}\n`));

    // Get 10 versions directly to avoid duplicate calls
    const config = TOOL_CONFIGS[toolName];
    const releases = await fetchGitHubReleases(config.repo, 10);

    if (releases.length === 0) {
      console.log(chalk.red('Unable to get version information'));
      handlerExit(1);
    }

    // Process version compatibility check
    const versions = releases.map((release) => ({
      version: release.tag_name,
      hasCompatibleAsset: findCompatibleAssets(release, systemInfo).length > 0,
      publishDate: new Date(release.published_at).toLocaleDateString('en-US')
    }));

    const table = new Table({
      head: [
        chalk.bold.cyan('Version'),
        chalk.bold.cyan('Compatibility'),
        chalk.bold.cyan('Release Date')
      ],
      colWidths: [30, 15, 25]
    });

    versions.forEach((version) => {
      table.push([
        version.version,
        version.hasCompatibleAsset ? chalk.green('✓ Compatible') : chalk.red('✗ Incompatible'),
        version.publishDate
      ]);
    });

    console.log(table.toString());

    if (options.debug && versions.length > 0) {
      console.log(chalk.blue('\n🔍 Debug Information:'));
      const latestCompatible = versions.find((v) => v.hasCompatibleAsset);
      if (latestCompatible) {
        const release = releases.find((r) => r.tag_name === latestCompatible.version);
        if (release) {
          console.log(chalk.gray(`Latest compatible version: ${latestCompatible.version}`));
          console.log(chalk.gray(`Available asset files:`));
          release.assets.forEach((asset) => {
            console.log(chalk.gray(`  - ${asset.name}`));
          });

          const compatibleAssets = findCompatibleAssets(release, systemInfo);
          console.log(chalk.gray(`Compatible asset files:`));
          compatibleAssets.forEach((asset) => {
            console.log(chalk.green(`  ✓ ${asset}`));
          });
        }
      }
    }

    handlerExit();
  }

  console.log(chalk.gray('Checking your development environment...\n'));

  // Handle install option
  if (options.install) {
    const toolName = options.install;
    if (!TOOL_CONFIGS[toolName]) {
      console.error(chalk.red(`❌ Unsupported tool: ${toolName}`));
      console.log(chalk.gray(`Supported tools: ${Object.keys(TOOL_CONFIGS).join(', ')}`));
      handlerExit(1);
    }

    let version: string | null = null;
    if (options.selectVersion) {
      version = await selectVersion(toolName);
      if (!version) {
        handlerExit(1);
      }
    } else if (toolName === 'dubhe-indexer') {
      // Default to sui-cli version for dubhe-indexer
      version = packageJson.version;
      console.log(
        chalk.blue(`📦 Installing dubhe-indexer version ${version} (matching sui-cli version)`)
      );
    }

    const success = await downloadAndInstallTool(toolName, version || undefined);
    handlerExit(success ? 0 : 1);
  }

  const results: CheckResult[] = [];

  // Execute all checks
  console.log('Running checks...\n');

  // Required tools check
  const nodeCheck = await checkNodeVersion();
  results.push(nodeCheck);

  const pnpmCheck = await checkCommand('pnpm');
  results.push(pnpmCheck);

  // Package manager configuration check
  const npmConfigCheck = await checkNpmConfig();
  // Treat npm config as optional, don't affect overall status
  if (npmConfigCheck.status === 'error') {
    npmConfigCheck.status = 'warning';
  }
  results.push(npmConfigCheck);

  // Docker related checks
  const dockerCheck = await checkCommand('docker');
  results.push(dockerCheck);

  let dockerServiceCheck: CheckResult | null = null;
  if (dockerCheck.status === 'success') {
    dockerServiceCheck = await checkDockerService();
    results.push(dockerServiceCheck);
  }

  const dockerComposeCheck = await checkCommand('docker-compose');
  results.push(dockerComposeCheck);

  // Sui CLI check
  const suiCheck = await checkCommand('sui');
  results.push(suiCheck);

  // Dubhe indexer check
  const dubheIndexerCheck = await checkCommand('dubhe-indexer');
  results.push(dubheIndexerCheck);

  // Dubhe indexer version consistency check (only if basic check passed)
  if (dubheIndexerCheck.status === 'success') {
    const dubheIndexerVersionCheck = await checkDubheIndexerVersionConsistency();
    results.push(dubheIndexerVersionCheck);
  }

  // Port availability checks
  const postgresPortCheck = await checkPostgreSQLPort();
  results.push(postgresPortCheck);

  const graphqlPortCheck = await checkGraphQLPort();
  results.push(graphqlPortCheck);

  // Create and display table
  const table = new Table({
    head: [
      chalk.bold.cyan('Check Item'),
      chalk.bold.cyan('Result'),
      chalk.bold.cyan('Description/Fix Suggestion')
    ],
    colWidths: [25, 15, 60],
    style: {
      head: ['cyan'],
      border: ['grey']
    },
    wordWrap: true
  });

  // Add table rows
  results.forEach((result) => {
    table.push(formatTableRow(result));
  });

  console.log(table.toString());

  // Summarize results
  const summary = {
    success: results.filter((r) => r.status === 'success').length,
    warning: results.filter((r) => r.status === 'warning').length,
    error: results.filter((r) => r.status === 'error').length
  };

  console.log('\n' + chalk.bold('📊 Check Summary:'));
  console.log(`   ${chalk.green('✓ Passed:')} ${summary.success} items`);
  console.log(`   ${chalk.yellow('! Warning:')} ${summary.warning} items`);
  console.log(`   ${chalk.red('✗ Failed:')} ${summary.error} items`);

  // Handle dubhe-indexer version inconsistency
  const versionInconsistencyWarning = results.find(
    (r) =>
      r.name === 'Dubhe-indexer Version Consistency' &&
      r.status === 'warning' &&
      r.message.includes('Version mismatch')
  );

  if (versionInconsistencyWarning) {
    console.log(chalk.yellow('\n⚠️  Dubhe-indexer version inconsistency detected!'));
    console.log(chalk.gray(`   ${versionInconsistencyWarning.message}`));

    try {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'reinstallDubheIndexer',
          message: 'Would you like to reinstall dubhe-indexer to match the sui-cli version?',
          default: true
        }
      ]);

      if (answer.reinstallDubheIndexer) {
        console.log(chalk.blue('\n📦 Reinstalling dubhe-indexer...\n'));
        console.log(chalk.blue(`${'='.repeat(60)}`));
        console.log(chalk.blue('📦 Installing dubhe-indexer...'));
        console.log(chalk.blue(`${'='.repeat(60)}`));

        // Get the current sui-cli version to install matching dubhe-indexer
        const success = await downloadAndInstallTool('dubhe-indexer', packageJson.version);

        if (success) {
          console.log(chalk.green('\n✅ Dubhe-indexer reinstallation completed successfully!'));
          console.log(
            chalk.blue('   Please restart your terminal or run: source ~/.zshrc (or ~/.bashrc)')
          );
          console.log(chalk.blue('   Then run: dubhe doctor to verify the installation'));
        } else {
          console.log(chalk.red('\n❌ Dubhe-indexer reinstallation failed'));
          console.log(
            chalk.gray('   You can try manual installation: dubhe doctor --install dubhe-indexer')
          );
        }
      } else {
        console.log(chalk.gray('\nVersion inconsistency ignored. You can reinstall later with:'));
        console.log(chalk.gray('   dubhe doctor --install dubhe-indexer'));
      }
    } catch (_error) {
      console.log(chalk.gray('\nVersion inconsistency check cancelled.'));
    }
  }

  // Handle missing tools
  const allFailedTools = results.filter((r) => r.status === 'error');
  const autoInstallableTools = allFailedTools.filter((r) => TOOL_CONFIGS[r.name]);
  const manualInstallTools = allFailedTools.filter((r) => !TOOL_CONFIGS[r.name]);

  // Show manual installation suggestions for non-auto-installable tools
  if (manualInstallTools.length > 0) {
    console.log(chalk.blue('\n🔧 Missing tools that require manual installation:'));
    manualInstallTools.forEach((tool) => {
      console.log(`   ${chalk.red('✗')} ${tool.name}: ${tool.fixSuggestion || tool.message}`);
    });
  }

  // Auto-install missing tools that support it
  if (autoInstallableTools.length > 0) {
    // Check if any of the tools are already installed in the install directory
    const alreadyInstalledTools = autoInstallableTools.filter((tool) =>
      checkBinaryExists(tool.name)
    );
    const notInstalledTools = autoInstallableTools.filter((tool) => !checkBinaryExists(tool.name));

    if (alreadyInstalledTools.length > 0) {
      const installedNames = alreadyInstalledTools.map((tool) => tool.name).join(', ');
      const installDir = TOOL_CONFIGS[alreadyInstalledTools[0].name]?.installDir || '~/.dubhe/bin';
      const shell = detectCurrentShell();
      const shellConfig = shell ? shell.configFile : '~/.zshrc (or ~/.bashrc)';

      console.log(chalk.yellow(`\n⚠️  Tools already installed but not in PATH: ${installedNames}`));
      console.log(chalk.gray(`   Location: ${installDir}`));
      console.log(chalk.blue('   To fix this, apply PATH changes:'));
      console.log(chalk.green(`     source ${shellConfig}`));
      console.log(chalk.blue('   Or restart your terminal, then run: dubhe doctor'));
      console.log(
        chalk.gray(
          `   If you want to reinstall, remove the files from ${installDir} and run dubhe doctor again`
        )
      );
    }

    if (notInstalledTools.length > 0) {
      const notInstalledNames = notInstalledTools.map((tool) => tool.name).join(', ');
      console.log(chalk.blue(`\n🚀 Auto-installable tools detected: ${notInstalledNames}`));

      try {
        const answer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'installAll',
            message: `Would you like to automatically install these tools? (${notInstalledNames})`,
            default: true
          }
        ]);

        if (answer.installAll) {
          console.log(chalk.blue('\n📦 Starting installation of auto-installable tools...\n'));

          let installationResults: Array<{ name: string; success: boolean }> = [];

          for (const tool of notInstalledTools) {
            console.log(chalk.blue(`${'='.repeat(60)}`));
            console.log(chalk.blue(`📦 Installing ${tool.name}...`));
            console.log(chalk.blue(`${'='.repeat(60)}`));

            // Use sui-cli version for dubhe-indexer
            const installVersion = tool.name === 'dubhe-indexer' ? packageJson.version : undefined;
            if (tool.name === 'dubhe-indexer') {
              console.log(
                chalk.blue(`   Using version ${installVersion} (matching sui-cli version)`)
              );
            }

            const success = await downloadAndInstallTool(tool.name, installVersion);
            installationResults.push({ name: tool.name, success });

            if (success) {
              console.log(chalk.green(`\n✅ ${tool.name} installation completed successfully!`));
            } else {
              console.log(chalk.red(`\n❌ ${tool.name} installation failed`));
              console.log(
                chalk.gray(`   Manual installation: dubhe doctor --install ${tool.name}`)
              );
            }
            console.log(''); // Add spacing between tools
          }

          // Show installation summary
          console.log(chalk.blue(`${'='.repeat(60)}`));
          console.log(chalk.bold('📋 Installation Summary:'));
          console.log(chalk.blue(`${'='.repeat(60)}`));

          installationResults.forEach((result) => {
            const status = result.success ? chalk.green('✅ Success') : chalk.red('❌ Failed');
            console.log(`   ${result.name}: ${status}`);
          });

          const successCount = installationResults.filter((r) => r.success).length;
          const failureCount = installationResults.length - successCount;

          console.log(
            `\n   ${chalk.green('Successful:')} ${successCount}/${installationResults.length}`
          );
          if (failureCount > 0) {
            console.log(`   ${chalk.red('Failed:')} ${failureCount}/${installationResults.length}`);
          }

          // Check if any tools were successfully installed
          if (successCount > 0) {
            const shell = detectCurrentShell();
            const shellConfig = shell ? shell.configFile : '~/.zshrc (or ~/.bashrc)';

            console.log(chalk.blue('\n🔄 Next Steps:'));
            console.log(chalk.yellow('   1. Apply PATH changes by running:'));
            console.log(chalk.green(`      source ${shellConfig}`));
            console.log(chalk.yellow('   2. Or restart your terminal'));
            console.log(chalk.yellow('   3. Then run the doctor check again:'));
            console.log(chalk.green('      dubhe doctor'));
            console.log(
              chalk.gray('\n   This will verify that all tools are properly configured.')
            );
          } else {
            console.log(
              chalk.red('\n❌ All installations failed. Please check the error messages above.')
            );
          }
        } else {
          console.log(
            chalk.gray('\nAuto-installation skipped. You can install them manually later:')
          );
          notInstalledTools.forEach((tool) => {
            console.log(chalk.gray(`   dubhe doctor --install ${tool.name}`));
          });
        }
      } catch (_error) {
        console.log(chalk.gray('\nInstallation cancelled. You can install them manually later:'));
        notInstalledTools.forEach((tool) => {
          console.log(chalk.gray(`   dubhe doctor --install ${tool.name}`));
        });
      }
    }
  }

  // If no auto-installable tools are missing, show final status
  if (autoInstallableTools.length === 0) {
    if (summary.error > 0) {
      console.log(
        chalk.red(
          '\n❌ Your environment has some issues. Please fix them according to the suggestions above.'
        )
      );
      handlerExit(1);
    } else if (summary.warning > 0) {
      console.log(
        chalk.yellow(
          '\n⚠️  Your environment is basically ready, but we recommend fixing the warnings for better development experience.'
        )
      );
    } else {
      console.log(
        chalk.green('\n✅ Congratulations! Your development environment is fully ready!')
      );
    }
  }

  console.log(
    chalk.gray(
      '\n💡 Tip: For more help, visit https://docs.sui.io/ or https://github.com/0xobelisk/dubhe'
    )
  );
}

const commandModule: CommandModule = {
  command: 'doctor',
  describe: 'Check if local development environment is ready',
  builder(yargs) {
    return yargs
      .option('install', {
        type: 'string',
        describe: 'Auto-install specified tool (sui, dubhe-indexer)',
        choices: Object.keys(TOOL_CONFIGS)
      })
      .option('select-version', {
        type: 'boolean',
        default: false,
        describe: 'Select specific version for installation'
      })
      .option('list-versions', {
        type: 'string',
        describe: 'List available versions for specified tool',
        choices: Object.keys(TOOL_CONFIGS)
      })
      .option('debug', {
        type: 'boolean',
        default: false,
        describe: 'Show detailed debug information'
      });
  },
  async handler(argv) {
    try {
      await runDoctorChecks({
        install: argv.install as string | undefined,
        selectVersion: argv['select-version'] as boolean,
        listVersions: argv['list-versions'] as string | undefined,
        debug: argv.debug as boolean
      });
    } catch (error) {
      console.error(chalk.red('Error occurred during check:'), error);
      handlerExit(1);
    }
  }
};

export default commandModule;
