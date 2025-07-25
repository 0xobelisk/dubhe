// import {
//   Dubhe,
//   NetworkType,
//   TransactionArgument,
//   loadMetadata,
//   Transaction,
//   DevInspectResults,
//   bcs,
// } from '../src/index';
// import dotenv from 'dotenv';
// import * as fs from 'fs';
// import * as path from 'path';
// dotenv.config();

// // Utility function: convert number to 64-bit string format (no base conversion, just pad with zeros)
// function toHex64String(num: number): string {
//   // Convert number to string, then pad to 64 bits (pad zeros at front)
//   const numStr = num.toString();
//   const padded = numStr.padStart(64, '0');
//   return `0x${padded}`;
// }

// // Latency statistics class
// class LatencyStats {
//   private durations: number[] = []; // 30-second cycle data
//   private mediumTermDurations: number[] = []; // 10-minute cycle data
//   private longTermDurations: number[] = []; // 30-minute cycle data
//   private totalTransactions: number = 0;
//   private startTime: number;
//   private logFilePath: string;

//   constructor() {
//     this.startTime = Date.now();

//     // Create logs directory
//     const logsDir = path.join(__dirname, '../logs');
//     if (!fs.existsSync(logsDir)) {
//       fs.mkdirSync(logsDir, { recursive: true });
//     }

//     // Create log file path, using timestamp as filename
//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//     this.logFilePath = path.join(logsDir, `latency-stats-${timestamp}.log`);

//     // Write initial log header
//     this.writeLogHeader();
//   }

//   private writeLogHeader() {
//     const header = `
// ========================================
// Multi-level Latency Statistics Log File
// Start Time: ${new Date(this.startTime).toLocaleString()}
// Statistics Levels: 30sec(Small) | 10min(Medium) | 30min(Large)
// ========================================

// `;
//     fs.writeFileSync(this.logFilePath, header);
//   }

//   addDuration(duration: number) {
//     this.durations.push(duration);
//     this.mediumTermDurations.push(duration);
//     this.longTermDurations.push(duration);
//     this.totalTransactions++;
//   }

//   private calculateStats(durations: number[]) {
//     if (durations.length === 0) {
//       return {
//         count: 0,
//         avgLatency: 0,
//         minLatency: 0,
//         maxLatency: 0,
//         p95: 0,
//         p99: 0,
//       };
//     }

//     const sorted = [...durations].sort((a, b) => a - b);
//     const sum = durations.reduce((a, b) => a + b, 0);
//     const avg = sum / durations.length;
//     const min = Math.min(...durations);
//     const max = Math.max(...durations);

//     // Calculate percentiles
//     const p95Index = Math.floor(sorted.length * 0.95);
//     const p99Index = Math.floor(sorted.length * 0.99);
//     const p95 = sorted[p95Index] || 0;
//     const p99 = sorted[p99Index] || 0;

//     return {
//       count: durations.length,
//       avgLatency: avg,
//       minLatency: min,
//       maxLatency: max,
//       p95,
//       p99,
//     };
//   }

//   getStats(type: 'short' | 'medium' | 'long' = 'short') {
//     let durations;
//     switch (type) {
//       case 'medium':
//         durations = this.mediumTermDurations;
//         break;
//       case 'long':
//         durations = this.longTermDurations;
//         break;
//       default:
//         durations = this.durations;
//     }

//     const stats = this.calculateStats(durations);
//     return {
//       ...stats,
//       totalTransactions: this.totalTransactions,
//       uptime: Date.now() - this.startTime,
//     };
//   }

//   resetShort() {
//     this.durations = [];
//   }

//   resetMedium() {
//     this.mediumTermDurations = [];
//   }

//   resetLong() {
//     this.longTermDurations = [];
//   }

//   private writeToLog(
//     stats: any,
//     type: 'small' | 'medium' | 'large',
//     duration: string
//   ) {
//     const timestamp = new Date().toLocaleString();
//     const uptimeMinutes = (stats.uptime / 1000 / 60).toFixed(2);

//     const typeEmojis = {
//       small: '🔹',
//       medium: '🔸',
//       large: '🔶',
//     };

//     const typeNames = {
//       small: 'Small Stats(30sec)',
//       medium: 'Medium Stats(10min)',
//       large: 'Large Stats(30min)',
//     };

//     let logEntry = `\n${typeEmojis[type]} [${timestamp}] ${typeNames[type]} - ${duration}:\n`;
//     logEntry += `Uptime: ${uptimeMinutes} minutes\n`;
//     logEntry += `Total Transactions: ${stats.totalTransactions}\n`;
//     logEntry += `Current Cycle Samples: ${stats.count}\n`;

//     if (stats.count > 0) {
//       logEntry += `Average Latency: ${stats.avgLatency.toFixed(2)}ms (${(stats.avgLatency / 1000).toFixed(2)}sec)\n`;
//       logEntry += `Min Latency: ${stats.minLatency}ms (${(stats.minLatency / 1000).toFixed(2)}sec)\n`;
//       logEntry += `Max Latency: ${stats.maxLatency}ms (${(stats.maxLatency / 1000).toFixed(2)}sec)\n`;
//       logEntry += `P95 Latency: ${stats.p95}ms (${(stats.p95 / 1000).toFixed(2)}sec)\n`;
//       logEntry += `P99 Latency: ${stats.p99}ms (${(stats.p99 / 1000).toFixed(2)}sec)\n`;

//       const periodSeconds =
//         type === 'small' ? 30 : type === 'medium' ? 600 : 1800;
//       const tps = stats.count / periodSeconds;
//       logEntry += `TPS: ${tps.toFixed(2)}\n`;
//     } else {
//       logEntry += `No completed transactions in this cycle\n`;
//     }
//     logEntry += `${'-'.repeat(50)}\n`;

//     // Append to log file
//     fs.appendFileSync(this.logFilePath, logEntry);
//   }

//   printShortStats() {
//     const stats = this.getStats('short');
//     const uptimeMinutes = (stats.uptime / 1000 / 60).toFixed(2);

//     console.log(
//       '\n🔹 =============== Small Stats Report (30sec) ==============='
//     );
//     console.log(`🕐 Uptime: ${uptimeMinutes} minutes`);
//     console.log(`📈 Total Transactions: ${stats.totalTransactions}`);
//     console.log(`📋 Current Cycle Samples: ${stats.count}`);

//     if (stats.count > 0) {
//       console.log(
//         `⚡ Average Latency: ${stats.avgLatency.toFixed(2)}ms (${(stats.avgLatency / 1000).toFixed(2)}sec)`
//       );
//       console.log(
//         `🚀 Min Latency: ${stats.minLatency}ms (${(stats.minLatency / 1000).toFixed(2)}sec)`
//       );
//       console.log(
//         `🐌 Max Latency: ${stats.maxLatency}ms (${(stats.maxLatency / 1000).toFixed(2)}sec)`
//       );
//       console.log(
//         `📊 P95 Latency: ${stats.p95}ms (${(stats.p95 / 1000).toFixed(2)}sec)`
//       );
//       console.log(
//         `📊 P99 Latency: ${stats.p99}ms (${(stats.p99 / 1000).toFixed(2)}sec)`
//       );

//       const tps = stats.count / 30;
//       console.log(`⚡ TPS: ${tps.toFixed(2)}`);
//     } else {
//       console.log('❌ No completed transactions in this cycle');
//     }
//     console.log('=================================================\n');

//     this.writeToLog(stats, 'small', '30sec cycle');
//   }

//   printMediumStats() {
//     const stats = this.getStats('medium');
//     const uptimeMinutes = (stats.uptime / 1000 / 60).toFixed(2);

//     console.log(
//       '\n🔸 =============== Medium Stats Report (10min) ==============='
//     );
//     console.log(`🕐 Uptime: ${uptimeMinutes} minutes`);
//     console.log(`📈 Total Transactions: ${stats.totalTransactions}`);
//     console.log(`📋 10-minute Samples: ${stats.count}`);

//     if (stats.count > 0) {
//       console.log(
//         `⚡ Average Latency: ${stats.avgLatency.toFixed(2)}ms (${(stats.avgLatency / 1000).toFixed(2)}sec)`
//       );
//       console.log(
//         `🚀 Min Latency: ${stats.minLatency}ms (${(stats.minLatency / 1000).toFixed(2)}sec)`
//       );
//       console.log(
//         `🐌 Max Latency: ${stats.maxLatency}ms (${(stats.maxLatency / 1000).toFixed(2)}sec)`
//       );
//       console.log(
//         `📊 P95 Latency: ${stats.p95}ms (${(stats.p95 / 1000).toFixed(2)}sec)`
//       );
//       console.log(
//         `📊 P99 Latency: ${stats.p99}ms (${(stats.p99 / 1000).toFixed(2)}sec)`
//       );

//       const tps = stats.count / 600; // 10 minutes = 600 seconds
//       console.log(`⚡ Average TPS: ${tps.toFixed(2)}`);
//     } else {
//       console.log('❌ No completed transactions in 10 minutes');
//     }
//     console.log('===================================================\n');

//     this.writeToLog(stats, 'medium', '10min cycle');
//   }

//   printLongStats() {
//     const stats = this.getStats('long');
//     const uptimeMinutes = (stats.uptime / 1000 / 60).toFixed(2);

//     console.log(
//       '\n🔶 =============== Large Stats Report (30min) ==============='
//     );
//     console.log(`🕐 Uptime: ${uptimeMinutes} minutes`);
//     console.log(`📈 Total Transactions: ${stats.totalTransactions}`);
//     console.log(`📋 30-minute Samples: ${stats.count}`);

//     if (stats.count > 0) {
//       console.log(
//         `⚡ Average Latency: ${stats.avgLatency.toFixed(2)}ms (${(stats.avgLatency / 1000).toFixed(2)}sec)`
//       );
//       console.log(
//         `🚀 Min Latency: ${stats.minLatency}ms (${(stats.minLatency / 1000).toFixed(2)}sec)`
//       );
//       console.log(
//         `🐌 Max Latency: ${stats.maxLatency}ms (${(stats.maxLatency / 1000).toFixed(2)}sec)`
//       );
//       console.log(
//         `📊 P95 Latency: ${stats.p95}ms (${(stats.p95 / 1000).toFixed(2)}sec)`
//       );
//       console.log(
//         `📊 P99 Latency: ${stats.p99}ms (${(stats.p99 / 1000).toFixed(2)}sec)`
//       );

//       const tps = stats.count / 1800; // 30 minutes = 1800 seconds
//       console.log(`⚡ Average TPS: ${tps.toFixed(2)}`);
//     } else {
//       console.log('❌ No completed transactions in 30 minutes');
//     }
//     console.log('====================================================\n');

//     this.writeToLog(stats, 'large', '30min cycle');
//   }

//   // Write final statistics when program exits
//   writeFinalStats() {
//     const stats = this.getStats('long');
//     const timestamp = new Date().toLocaleString();
//     const uptimeMinutes = (stats.uptime / 1000 / 60).toFixed(2);
//     const uptimeHours = (stats.uptime / 1000 / 60 / 60).toFixed(2);

//     let finalEntry = `\n${'='.repeat(60)}\n`;
//     finalEntry += `[${timestamp}] Program Ended - Final Statistics Report:\n`;
//     finalEntry += `Total Runtime: ${uptimeMinutes} minutes (${uptimeHours} hours)\n`;
//     finalEntry += `Total Transactions: ${stats.totalTransactions}\n`;

//     if (stats.totalTransactions > 0) {
//       const totalTPS = stats.totalTransactions / (stats.uptime / 1000);
//       finalEntry += `Overall Average TPS: ${totalTPS.toFixed(2)}\n`;

//       if (stats.count > 0) {
//         finalEntry += `Overall Average Latency: ${stats.avgLatency.toFixed(2)}ms\n`;
//         finalEntry += `Overall P95 Latency: ${stats.p95}ms\n`;
//         finalEntry += `Overall P99 Latency: ${stats.p99}ms\n`;
//       }
//     }

//     finalEntry += `Log File Location: ${this.logFilePath}\n`;
//     finalEntry += `${'='.repeat(60)}\n`;

//     fs.appendFileSync(this.logFilePath, finalEntry);
//     console.log(`📄 Complete log saved to: ${this.logFilePath}`);
//   }
// }

// async function init() {
//   const network = 'testnet';
//   const packageId =
//     '0x7c3dca4b87464f7e1900c50303a0e5eb02ca4f5f1d9bc742c75259e415a95e5f';

//   const metadata = await loadMetadata(network as NetworkType, packageId);

//   const privateKey = process.env.PRIVATE_KEY;

//   const dubhe = new Dubhe({
//     networkType: network as NetworkType,
//     packageId: packageId,
//     metadata: metadata,
//     secretKey: privateKey,
//   });

//   console.log(dubhe.getAddress());
//   // await dubhe.requestFaucet();
//   let balance = await dubhe.getBalance();
//   console.log('balance', balance);

//   const CONFIG = {
//     endpoint: 'http://localhost:4000/graphql',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//   };

//   const client = createDubheGraphqlClient(CONFIG);

//   // Create latency statistics instance
//   const latencyStats = new LatencyStats();

//   // Set 30-second timer to output statistics
//   const statsInterval = setInterval(() => {
//     latencyStats.printShortStats();
//     latencyStats.resetShort(); // Reset statistics data, start new 30-second cycle
//   }, 30000); // 30 seconds = 30000 milliseconds

//   // Set 10-minute timer to output medium statistics
//   const mediumStatsInterval = setInterval(() => {
//     latencyStats.printMediumStats();
//     latencyStats.resetMedium(); // Reset 10-minute data
//   }, 600000); // 10 minutes = 600000 milliseconds

//   // Set 30-minute timer to output large statistics
//   const longStatsInterval = setInterval(() => {
//     latencyStats.printLongStats();
//     latencyStats.resetLong(); // Reset 30-minute data
//   }, 1800000); // 30 minutes = 1800000 milliseconds

//   // Print multi-level statistics setup information
//   console.log(
//     '\n🚀 =============== Multi-level Statistics System Started ==============='
//   );
//   console.log('📊 Statistics Level Setup:');
//   console.log(
//     '   🔹 Small Stats: Output every 30 seconds (short-term performance monitoring)'
//   );
//   console.log(
//     '   🔸 Medium Stats: Output every 10 minutes (medium-term trend analysis)'
//   );
//   console.log(
//     '   🔶 Large Stats: Output every 30 minutes (long-term performance evaluation)'
//   );
//   console.log('📄 All statistics data will be automatically saved to log file');
//   console.log(
//     '⚠️  Press Ctrl+C to safely exit and generate final statistics report'
//   );
//   console.log('=======================================================\n');

//   // Add cleanup timers when process exits
//   process.on('SIGINT', () => {
//     console.log('\n🛑 Program is exiting...');

//     // Output final statistics
//     latencyStats.printShortStats();
//     latencyStats.printMediumStats();
//     latencyStats.printLongStats();

//     // Clear all timers
//     clearInterval(statsInterval);
//     clearInterval(mediumStatsInterval);
//     clearInterval(longStatsInterval);

//     latencyStats.writeFinalStats(); // Write final statistics to log file
//     process.exit(0);
//   });

//   let i = 0;
//   while (true) {
//     const tx = new Transaction();
//     await dubhe.tx.dapp_system.hello_encounter({
//       tx,
//       params: [
//         tx.object(
//           '0x071886c22bc3726c4f29373825738a84c3c9de47a65adb3b242b31c9491a3f0f'
//         ),
//         tx.pure.address(`0x${i}`),
//         tx.pure.bool(true),
//         tx.pure.address('0x0'),
//         tx.pure.u256(i),
//       ],
//       onSuccess: async (res) => {
//         console.log('success', res.digest);

//         // Start timing
//         const startTime = Date.now();
//         const targetPlayer = toHex64String(i);
//         console.log(`🔍 Starting query for player: ${targetPlayer}`);

//         let record: any = null;
//         let attempts = 0;

//         // Retry query until record is found
//         while (!record) {
//           attempts++;

//           try {
//             const singleRecord = await client.getAllTables('encounters', {
//               first: 1,
//               filter: {
//                 catchAttempts: { equalTo: i.toString() },
//               },
//               fields: ['player', 'monster', 'catchAttempts', 'exists'],
//             });
//             // console.log('singleRecord', singleRecord);

//             record = singleRecord.edges[0]?.node || null;

//             if (record) {
//               // Calculate total duration
//               const endTime = Date.now();
//               const duration = endTime - startTime;

//               // Add to statistics data
//               latencyStats.addDuration(duration);

//               console.log('✅ Successfully queried record!');
//               console.log(`📊 Query Statistics:`);
//               console.log(`   - Attempts: ${attempts}`);
//               console.log(
//                 `   - Total Duration: ${duration}ms (${(duration / 1000).toFixed(2)}sec)`
//               );
//               console.log(
//                 `   - Average per Attempt: ${(duration / attempts).toFixed(2)}ms`
//               );
//               console.log(`📋 Record Content:`);
//               console.log(`   - Player: ${record.player}`);
//               console.log(`   - Monster: ${record.monster}`);
//               console.log(`   - Catch Attempts: ${record.catchAttempts}`);
//               console.log(`   - Exists: ${record.exists}`);
//             } else {
//               // // Record not found, wait and retry
//               // console.log(
//               //   `⏳ Query attempt ${attempts} found no record, waiting for indexer sync...`
//               // );
//               // await new Promise((resolve) => setTimeout(resolve, 50)); // Wait 500ms before retry
//             }
//           } catch (error: any) {
//             console.log(`❌ Query attempt ${attempts} error:`, error.message);
//             // await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second on error before retry
//           }
//         }

//         i++;
//       },
//       onError: (err) => {
//         console.log('error', err);
//       },
//     });

//     await new Promise((resolve) => setTimeout(resolve, 1000));
//   }
// }

// init();
