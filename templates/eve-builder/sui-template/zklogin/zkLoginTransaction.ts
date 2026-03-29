import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { coinWithBalance, Transaction } from '@mysten/sui/transactions';
import { requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { getFaucetHost } from '@mysten/sui/faucet';
import {
  genAddressSeed,
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
  jwtToAddress,
  type ZkLoginSignatureInputs
} from '@mysten/sui/zklogin';
import axios from 'axios';
import { jwtDecode, type JwtPayload } from 'jwt-decode';
import { createInterface } from 'readline';

type ProverResponse = Omit<ZkLoginSignatureInputs, 'addressSeed'>;

/** Send a transaction with the zkLogin address.
 - Check balance
 - Generate ephemeral credentials
 - Display login URL
 - Wait for JWT input (returned from the user)
 - Execute transaction (either with the provided transaction bytes or a test transaction)
*/

// Configuration
const AUTH_URL = 'https://test.auth.evefrontier.com';
const CLIENT_ID = '00d3ce5b-4cab-4970-a9dc-e122fc1d30ce'; // Utopia

/** This ZK Prover endpoint works only for sui:devnet
 In order to get proof for testnet and mainnet, you need to use an Enoki endpoint
 You can create an Enoki client API key at https://portal.enoki.mystenlabs.com/
*/
const NETWORK = 'devnet';
const PROVER_URL = 'https://prover-dev.mystenlabs.com/v1';
const SUI_NETWORK_URL = 'https://fullnode.devnet.sui.io:443';

const suiClient = new SuiGrpcClient({
  network: NETWORK,
  baseUrl: SUI_NETWORK_URL
});

// Fixed salt (TODO: Change to Enoki return)
const USER_SALT = '000000';

// Helper to prompt user for input
const promptUser = (question: string): Promise<string> => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};

// Calculate proof expiration epoch
const calculateProofExpirationEpoch = async (epochDuration: number = 5): Promise<number> => {
  const { response: epochInfo } = await suiClient.ledgerService.getEpoch({});
  const rawEpoch = epochInfo.epoch?.epoch;
  if (rawEpoch === undefined || rawEpoch === null) {
    throw new Error('Failed to retrieve current epoch from Sui ledger service.');
  }
  const currentEpoch = Number(rawEpoch);
  if (!Number.isFinite(currentEpoch)) {
    throw new Error(
      `Unparseable epoch value received from Sui ledger service: ${String(rawEpoch)}`
    );
  }
  return currentEpoch + epochDuration;
};

// Generate ephemeral keypair, randomness, and nonce for zkLogin
const generateUserDataForZkLogin = async () => {
  const ephemeralKeyPair = new Ed25519Keypair();
  const randomness = generateRandomness();
  const maxEpoch = await calculateProofExpirationEpoch();

  const nonce = generateNonce(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness);

  return {
    ephemeralKeyPair,
    maxEpoch,
    randomness,
    nonce
  };
};

// Create login URL
const createLoginUrl = (nonce: string): string => {
  const redirectURL = encodeURIComponent('https://www.sui.io');
  return `${AUTH_URL}/oauth2/authorize?client_id=${CLIENT_ID}&response_type=id_token&scope=openid&redirect_uri=${redirectURL}&nonce=${nonce}`;
};

// Get ZK proof from prover
const getProof = async (
  jwt: string,
  ephemeralKeyPair: Ed25519Keypair,
  maxEpoch: number,
  randomness: string
): Promise<ProverResponse> => {
  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(ephemeralKeyPair.getPublicKey());

  const zkProofResult = await axios.post<ProverResponse>(
    PROVER_URL,
    {
      jwt,
      extendedEphemeralPublicKey,
      maxEpoch,
      jwtRandomness: randomness,
      salt: USER_SALT,
      keyClaimName: 'sub'
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  return zkProofResult.data;
};

const fetchBalance = async (zkLoginUserAddress: string) => {
  console.log('\n📍 Your zkLogin address:', zkLoginUserAddress);

  const suiBalance = await suiClient.core.getBalance({
    owner: zkLoginUserAddress,
    coinType: '0x2::sui::SUI'
  });

  console.log('(Make sure this address has SUI for gas fees)\n');
  console.log('SUI balance:', suiBalance.balance.balance);

  if (Number(suiBalance.balance.balance) === 0) {
    console.log('No current balance');
    console.log('Requesting balance');
    const txDigest = await requestSuiFromFaucetV2({
      host: getFaucetHost(NETWORK),
      recipient: zkLoginUserAddress
    });

    console.log('Requested balance from faucet. Digest:', txDigest);
  }

  return suiBalance.balance.balance;
};

// Create test transaction bytes
const createTestTransactionBytes = async (zkLoginUserAddress: string) => {
  const testTx = new Transaction();
  const coin = coinWithBalance({ balance: 100_000_000 });
  testTx.transferObjects(
    [coin],
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  );
  testTx.setSender(zkLoginUserAddress);
  const testTxnBytes = await testTx.build({ client: suiClient });
  return testTxnBytes.toString();
};

// Parse the transaction bytes
const formatTxBytes = (txbytesString: string) => {
  const byteStrings = txbytesString.split(',');
  const byteValues = byteStrings.map((value, index) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      throw new Error(
        `Invalid transaction bytes: empty value at position ${index}. ` +
          'Expected a comma-separated list of integers between 0 and 255.'
      );
    }
    const num = Number(trimmed);
    if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0 || num > 255) {
      throw new Error(
        `Invalid transaction bytes: value "${trimmed}" at position ${index} ` +
          'is not an integer between 0 and 255.'
      );
    }
    return num;
  });
  const txBytesFormatted = Uint8Array.from(byteValues);
  return txBytesFormatted;
};

// Execute the test transaction
const executeTxn = async (
  txBytes: Uint8Array,
  jwt: string,
  ephemeralKeyPair: Ed25519Keypair,
  maxEpoch: number,
  proof: ProverResponse
) => {
  const decodedJwt = jwtDecode(jwt) as JwtPayload;

  const signedBytes = await ephemeralKeyPair.signTransaction(txBytes);

  if (!decodedJwt.sub || !decodedJwt.aud || Array.isArray(decodedJwt?.aud)) {
    throw new Error('Missing or invalid decoded JWT fields');
  }

  const addressSeed: string = genAddressSeed(
    BigInt(USER_SALT),
    'sub',
    decodedJwt.sub,
    decodedJwt.aud
  ).toString();

  const zkLoginSignature = getZkLoginSignature({
    inputs: {
      ...proof,
      addressSeed
    },
    maxEpoch,
    userSignature: signedBytes.signature
  });

  console.log('📤 Executing transaction...\n');

  const res = await suiClient.core.executeTransaction({
    transaction: new Uint8Array(Buffer.from(signedBytes.bytes, 'base64')),
    signatures: [zkLoginSignature]
  });

  if (res.$kind === 'Transaction') {
    console.log('✅ Transaction completed!');
    console.log('   Digest:', res.Transaction?.digest);
    console.log('   Status:', res.Transaction?.effects);
  } else {
    console.error('❌ Transaction failed!');
    console.error('   Status:', res.FailedTransaction);
  }
};

// Main interactive flow
const main = async () => {
  console.log('\n🚀 zkLogin Transaction Script\n');
  console.log('═'.repeat(50));

  // Step 1: Generate credentials
  console.log('\n📝 Step 1: Generating ephemeral credentials...');
  const { ephemeralKeyPair, maxEpoch, randomness, nonce } = await generateUserDataForZkLogin();

  console.log('   ✓ Ephemeral keypair created');
  console.log('   ✓ Max epoch:', maxEpoch);
  console.log('   ✓ Randomness generated');

  // Step 2: Display login URL
  console.log('\n🔗 Step 2: Login URL generated\n');
  const loginUrl = createLoginUrl(nonce);
  console.log('   Open this URL in your browser to log in:\n');
  console.log(`   ${loginUrl}\n`);

  console.log('═'.repeat(50));
  console.log("\n   After logging in, you'll be redirected to sui.io");
  console.log("   Copy the 'id_token' value from the URL fragment.\n");

  // Step 3: Wait for JWT input
  const jwt = await promptUser('📋 Paste your JWT token here: ');

  if (!jwt) {
    console.error('\n❌ No JWT provided. Exiting.');
    process.exit(1);
  }

  // Step 4: Execute transaction
  console.log('\n═'.repeat(30));
  console.log('\n⚙️  Step 3: Checking balance...\n');

  try {
    await fetchBalance(jwtToAddress(jwt, USER_SALT, false));
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }

  // Fetch ZK proof once and cache it for all transactions
  console.log('\n🔐 Fetching ZK proof (one-time)...');
  const proof = await getProof(jwt, ephemeralKeyPair, maxEpoch, randomness);
  console.log('   ✓ ZK proof cached\n');

  const getTxBytesString = await createTestTransactionBytes(jwtToAddress(jwt, USER_SALT, false));

  console.log('\n⚙️  Test transaction bytes:\n', getTxBytesString);
  console.log('\n═'.repeat(10));

  console.log('\n⚙️  Step 4: Ready to execute transactions\n');
  console.log("   Type 'exit' or 'quit' to stop\n");

  // Transaction loop - keeps running until user exits
  while (true) {
    try {
      const txbytesString = await promptUser(
        "📋 Paste transaction bytes, 'test' to generate new tx bytes or 'exit' to quit: "
      );

      // Check for exit commands
      if (txbytesString.toLowerCase() === 'exit' || txbytesString.toLowerCase() === 'quit') {
        console.log('\n👋 Goodbye!\n');
        break;
      }

      if (txbytesString.toLowerCase() === 'test') {
        const testTxBytes = await createTestTransactionBytes(jwtToAddress(jwt, USER_SALT, false));
        console.log('\n⚙️  Test transaction bytes:\n', testTxBytes);
        console.log('\n═'.repeat(10));
        continue;
      }

      // Else, format and build tx bytes for zklogin
      const txBytesFormatted = formatTxBytes(txbytesString);
      const txb = Transaction.from(txBytesFormatted);
      txb.setSender(jwtToAddress(jwt, USER_SALT, false));
      const txBytes = await txb.build({ client: suiClient });

      await executeTxn(txBytes, jwt, ephemeralKeyPair, maxEpoch, proof);

      console.log('✅ Ready for next transaction\n');
      console.log('\n═'.repeat(10));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as { response?: { data?: unknown }; message?: string };
        console.error('\n❌ Error:', axiosError.response?.data || axiosError.message);
      } else if (error instanceof Error) {
        console.error('\n❌ Error:', error.message);
      } else {
        console.error('\n❌ Unknown error occurred');
      }
      // Don't exit - just continue to next iteration
      console.log("\n🔄 You can try again or type 'exit' to quit\n");
    }
  }
};

main();
