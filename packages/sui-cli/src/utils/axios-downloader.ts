// Better download implementation using axios
import chalk from 'chalk';
import * as cliProgress from 'cli-progress';
import * as fs from 'fs';
import axios from 'axios';

/**
 * Download file using axios
 */
export async function downloadWithAxios(url: string, outputPath: string): Promise<void> {
  try {
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 30000,
      headers: { 'User-Agent': 'dubhe-cli' },
      maxRedirects: 5,
      validateStatus: (status) => status < 400 // Accept all status codes < 400
    });

    await streamToFile(response, outputPath);
    console.log(chalk.green(`   ✓ Successfully downloaded`));
  } catch (error: any) {
    // Handle specific network error cases with more descriptive messages
    if (error.code === 'ENOTFOUND') {
      throw new Error(
        `DNS resolution failed: ${error.message}. Please check your internet connection.`
      );
    } else if (error.code === 'ECONNRESET') {
      throw new Error(`Connection reset: ${error.message}. Please check your network connection.`);
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error(
        `Connection timeout: ${error.message}. Please check your network connection.`
      );
    } else if (error.message.includes('protocol mismatch')) {
      throw new Error(
        `Protocol mismatch: ${error.message}. Please check your network configuration.`
      );
    } else if (error.response) {
      throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
    } else {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Download failed: ${errorMsg}`);
    }
  }
}

/**
 * Stream response data to file with progress bar
 */
async function streamToFile(response: any, outputPath: string): Promise<void> {
  const totalSize = parseInt(response.headers['content-length'] || '0');

  // Create progress bar
  const progressBar = new cliProgress.SingleBar({
    format:
      chalk.cyan('Download Progress') +
      ' |{bar}| {percentage}% | {value}/{total} MB | Speed: {speed} MB/s | ETA: {eta}s',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    barsize: 30,
    forceRedraw: true
  });

  if (totalSize > 0) {
    progressBar.start(Math.round((totalSize / 1024 / 1024) * 100) / 100, 0, {
      speed: '0.00'
    });
  } else {
    console.log(chalk.blue('📥 Downloading... (unable to get file size)'));
  }

  const writer = fs.createWriteStream(outputPath);
  let downloadedBytes = 0;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    response.data.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;

      if (totalSize > 0) {
        const downloadedMB = Math.round((downloadedBytes / 1024 / 1024) * 100) / 100;
        const elapsedTime = (Date.now() - startTime) / 1000;
        const speed = elapsedTime > 0 ? Math.round((downloadedMB / elapsedTime) * 100) / 100 : 0;

        progressBar.update(downloadedMB, {
          speed: speed.toFixed(2)
        });
      }
    });

    response.data.pipe(writer);

    writer.on('finish', () => {
      if (totalSize > 0) {
        progressBar.stop();
      }

      const totalMB = Math.round((downloadedBytes / 1024 / 1024) * 100) / 100;
      const elapsedTime = (Date.now() - startTime) / 1000;
      const avgSpeed = elapsedTime > 0 ? Math.round((totalMB / elapsedTime) * 100) / 100 : 0;

      console.log(
        chalk.green(`✓ Download completed! ${totalMB} MB, average speed: ${avgSpeed} MB/s`)
      );
      resolve();
    });

    writer.on('error', (error) => {
      if (totalSize > 0) {
        progressBar.stop();
      }
      reject(error);
    });
  });
}
