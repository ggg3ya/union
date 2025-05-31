const fs = require('fs');
const path = require('path');
// Impor komponen ethers yang spesifik untuk v6
const { ethers, JsonRpcProvider, Wallet, keccak256, solidityPacked } = require('ethers');
const axios = require('axios');
const moment = require('moment-timezone');
const readline = require('readline');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Pengaturan logger
const logger = {
  info: (msg) => console.log(`[✓] ${msg}`),
  warn: (msg) => console.log(`[⚠] ${msg}`),
  error: (msg) => console.log(`[✗] ${msg}`),
  success: (msg) => console.log(`[✅] ${msg}`),
  loading: (msg) => console.log(`[⟳] ${msg}`),
  step: (msg) => console.log(`[➤] ${msg}`),
  banner: () => {
    console.log(`---------------------------------------------`);
    console.log(`  Union Testnet Auto Bot - Script by airdropnode (https://t.me/airdrop_node)  `);
    console.log(`---------------------------------------------`);
    console.log();
  }
};

// ABI kontrak
const UCS03_ABI = [
  {
    inputs: [
      { internalType: 'uint32', name: 'channelId', type: 'uint32' },
      { internalType: 'uint64', name: 'timeoutHeight', type: 'uint64' },
      { internalType: 'uint64', name: 'timeoutTimestamp', type: 'uint64' },
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
      {
        components: [
          { internalType: 'uint8', name: 'version', type: 'uint8' },
          { internalType: 'uint8', name: 'opcode', type: 'uint8' },
          { internalType: 'bytes', name: 'operand', type: 'bytes' },
        ],
        internalType: 'struct Instruction',
        name: 'instruction',
        type: 'tuple',
      },
    ],
    name: 'send',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

const WBTC_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "spender", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "Deposit",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "Withdrawal",
    "type": "event"
  },
  { "stateMutability": "payable", "type": "fallback" },
  {
    "inputs": [],
    "name": "DOMAIN_SEPARATOR",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "nonces",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" },
      { "internalType": "uint8", "name": "v", "type": "uint8" },
      { "internalType": "bytes32", "name": "r", "type": "bytes32" },
      { "internalType": "bytes32", "name": "s", "type": "bytes32" }
    ],
    "name": "permit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "transferFrom",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Pengaturan konstan
const contractAddress = '0x5FbE74A283f7954f10AA04C2eDf55578811aeb03';
const WBTC_ADDRESS = '0xda5dDd7270381A7C2717aD10D1c0ecB19e3CDFb2';
const graphqlEndpoint = 'https://graphql.union.build/v1/graphql';
const baseExplorerUrl = 'https://testnet-explorer.usecorn.com';
const unionUrl = 'https://app.union.build/explorer';
const telegramLink = 'https://t.me/airdrop_node';

const rpcProviders = [new JsonRpcProvider('https://testnet-rpc.usecorn.com')];
let currentRpcProviderIndex = 0;

function provider() {
  return rpcProviders[currentRpcProviderIndex];
}

function rotateRpcProvider() {
  currentRpcProviderIndex = (currentRpcProviderIndex + 1) % rpcProviders.length;
  return provider();
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

const explorer = {
  tx: (txHash) => `${baseExplorerUrl}/tx/${txHash}`,
  address: (address) => `${baseExplorerUrl}/address/${address}`,
};

const union = {
  tx: (txHash) => `${unionUrl}/transfers/${txHash}`,
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fungsi untuk menghasilkan waktu acak antara 30 detik (30.000 ms) dan 120 detik (120.000 ms)
function getRandomDelay() {
  const min = 30000; // 30 detik
  const max = 120000; // 120 detik
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function timelog() {
  return moment().tz('Asia/Jakarta').format('HH:mm:ss | DD-MM-YYYY');
}

function header() {
  process.stdout.write('\x1Bc');
  logger.banner();
}

// Jalur file untuk menyimpan dompet
const WALLET_FILE = path.join(__dirname, 'wallets.json');

// Fungsi untuk memuat dompet dari file
function loadWallets() {
  try {
    if (fs.existsSync(WALLET_FILE)) {
      return JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
    }
    return [];
  } catch (err) {
    logger.error(`Gagal memuat dompet: ${err.message}`);
    return [];
  }
}

// Fungsi untuk menyimpan dompet ke file
function saveWallets(wallets) {
  try {
    fs.writeFileSync(WALLET_FILE, JSON.stringify(wallets, null, 2));
    logger.success('Dompet disimpan ke wallets.json');
  } catch (err) {
    logger.error(`Gagal menyimpan dompet: ${err.message}`);
  }
}

// Fungsi untuk memeriksa saldo dan menyetujui WBTC
async function checkBalanceAndApprove(wallet, wbtcAddress, spenderAddress) {
  const wbtcContract = new ethers.Contract(wbtcAddress, WBTC_ABI, wallet);
  const balance = await wbtcContract.balanceOf(wallet.address);
  if (balance === 0n) {
    logger.error(`${wallet.address} tidak memiliki cukup WBTC. Isi dompet Anda terlebih dahulu!`);
    return false;
  }

  const allowance = await wbtcContract.allowance(wallet.address, spenderAddress);
  if (allowance === 0n) {
    logger.loading(`WBTC belum disetujui. Mengirim transaksi persetujuan...`);
    const approveAmount = ethers.MaxUint256;
    try {
      const tx = await wbtcContract.approve(spenderAddress, approveAmount);
      const receipt = await tx.wait();
      logger.success(`Persetujuan dikonfirmasi: ${explorer.tx(receipt.hash)}`);
      await delay(3000);
    } catch (err) {
      logger.error(`Persetujuan gagal: ${err.message}`);
      return false;
    }
  }
  return true;
}

// Fungsi untuk mengambil hash paket
async function pollPacketHash(txHash, retries = 50, intervalMs = 5000) {
  const headers = {
    accept: 'application/graphql-response+json, application/json',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-US,en;q=0.9,id;q=0.8',
    'content-type': 'application/json',
    origin: 'https://app-union.build',
    referer: 'https://app.union.build/',
    'user-agent': 'Mozilla/5.0',
  };
  const data = {
    query: `
      query ($submission_tx_hash: String!) {
        v2_transfers(args: {p_transaction_hash: $submission_tx_hash}) {
          packet_hash
        }
      }
    `,
    variables: {
      submission_tx_hash: txHash.startsWith('0x') ? txHash : `0x${txHash}`,
    },
  };

  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.post(graphqlEndpoint, data, { headers });
      const result = res.data?.data?.v2_transfers;
      if (result && result.length > 0 && result[0].packet_hash) {
        return result[0].packet_hash;
      }
    } catch (e) {
      logger.error(`Kesalahan paket: ${e.message}`);
    }
    await delay(intervalMs);
  }
  logger.warn(`Tidak ada hash paket ditemukan setelah ${retries} percobaan.`);
  return null;
}

// Fungsi untuk mengirim transaksi dari dompet
async function sendFromWallet(walletInfo, maxTransaction, destination, telegramBot = null, chatId = null) {
  const wallet = new Wallet(walletInfo.privateKey, provider()); // Menggunakan Wallet dari ethers
  let recipientAddress, destinationName, channelId, operand;

  if (destination === 'xion') {
    recipientAddress = walletInfo.xionAddress;
    destinationName = 'Xion';
    channelId = 2;
    if (!recipientAddress) {
      const logMsg = `Melewati dompet '${walletInfo.name || 'Tanpa Nama'}': Alamat Xion tidak ada.`; // Ganti nama variabel
      logger.warn(logMsg);
      if (telegramBot && chatId) telegramBot.sendMessage(chatId, logMsg);
      return;
    }
  } else if (destination === 'holesky') {
    recipientAddress = wallet.address;
    destinationName = 'Holesky';
    channelId = 8;
  } else {
    const logMsg = `Tujuan tidak valid: ${destination}`; // Ganti nama variabel
    logger.error(logMsg);
    if (telegramBot && chatId) telegramBot.sendMessage(chatId, logMsg);
    return;
  }

  const logMsg = `Mengirim ${maxTransaction} Transaksi dari Corn ke ${destinationName} dari ${wallet.address} (${walletInfo.name || 'Tanpa Nama'})`; // Ganti nama variabel
  logger.loading(logMsg);
  if (telegramBot && chatId) telegramBot.sendMessage(chatId, logMsg);

  const shouldProceed = await checkBalanceAndApprove(wallet, WBTC_ADDRESS, contractAddress);
  if (!shouldProceed) {
    if (telegramBot && chatId) telegramBot.sendMessage(chatId, `Gagal melanjutkan dengan ${walletInfo.name || 'Tanpa Nama'}: WBTC tidak cukup atau persetujuan gagal.`);
    return;
  }

  const contract = new ethers.Contract(contractAddress, UCS03_ABI, wallet);
  const senderHex = wallet.address.slice(2).toLowerCase();
  const recipientHex = destination === 'xion' ? Buffer.from(recipientAddress, "utf8").toString("hex") : senderHex;
  const timeoutHeight = 0;

  if (destination === 'xion') {
    operand = `0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000186a00000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000002600000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a00000000000000000000000000000000000000000000000000000000000186a00000000000000000000000000000000000000000000000000000000000000014${senderHex}000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a${recipientHex}00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000141c7d4b196cb0c7b01d743fbc6116a902379c723800000000000000000000000000000000000000000000000000000000000000000000000000000000000000045742544300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000045742544300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e62626e317a7372763233616b6b6778646e77756c3732736674677632786a74356b68736e743377776a687030666668363833687a7035617135613068366e0000`;
  } else {
    operand = `0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000186a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002800000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000000000000000000000000000000000000000014${senderHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014${senderHex}00000000000000000000000000000000000000000000000000000000000000000000000000000000000000141c7d4b196cb0c7b01d743fbc6116a902379c723800000000000000000000000000000000000000000000000000000000000000000000000000000000000000045742544300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000045742544300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001457978bfe465ad9b1c0bf80f6c1539d300705ea50`;
  }

  for (let i = 1; i <= maxTransaction; i++) {
    logger.step((walletInfo.name || 'Tanpa Nama') + ' | Transaksi ' + i + '/' + maxTransaction);
    const now = BigInt(Date.now()) * 1_000_000n;
    const oneDayNs = 86_400_000_000_000n;
    const timeoutTimestamp = (now + oneDayNs).toString();
    const timestampNow = Math.floor(Date.now() / 1000);

    // FIX: Menggunakan solidityPacked dengan argumen yang benar dan keccak256
    const salt = keccak256(solidityPacked(['address', 'uint256'], [wallet.address, timestampNow]));

    // FIX: Menggunakan nilai numerik untuk version dan opcode
    const instruction = {
      version: 0,
      opcode: 2, // 0x02 dalam hex adalah 2 dalam desimal
      operand,
    };

    try {
      const tx = await contract.send(channelId, timeoutHeight, timeoutTimestamp, salt, instruction);
      await tx.wait(1);
      const successMsg = `${timelog()} | ${walletInfo.name || 'Tanpa Nama'} | Transaksi Dikonfirmasi: ${explorer.tx(tx.hash)}`;
      logger.success(successMsg);
      if (telegramBot && chatId) telegramBot.sendMessage(chatId, successMsg);
      const txHash = tx.hash.startsWith('0x') ? tx.hash : `0x${tx.hash}`;
      const packetHash = await pollPacketHash(txHash);
      if (packetHash) {
        const packetMsg = `${timelog()} | ${walletInfo.name || 'Tanpa Nama'} | Paket Dikirim: ${union.tx(packetHash)}`;
        logger.success(packetMsg);
        if (telegramBot && chatId) telegramBot.sendMessage(chatId, packetMsg);
      }
    } catch (err) {
      const errMsg = `Gagal untuk ${wallet.address}: ${err.message}`;
      logger.error(errMsg);
      if (telegramBot && chatId) telegramBot.sendMessage(chatId, errMsg);
    }

    if (i < maxTransaction) {
      const randomDelay = getRandomDelay();
      logger.info(`Menunggu ${randomDelay / 1000} detik sebelum transaksi berikutnya...`);
      if (telegramBot && chatId) telegramBot.sendMessage(chatId, `Menunggu ${randomDelay / 1000} detik sebelum transaksi berikutnya...`);
      await delay(randomDelay);
    }
  }
}

// Fungsi utama untuk mode konsol
async function mainConsole() {
  header();

  let wallets = loadWallets();
  if (wallets.length === 0) {
    wallets = [];
    let index = 1;
    while (true) {
      const privateKey = process.env[`PRIVATE_KEY_${index}`]; // Menggunakan privateKey (huruf kapital)
      const xionAddress = process.env[`XION_ADDRESS_${index}`];
      if (!privateKey) break;
      wallets.push({
        name: `Dompet${index}`,
        privateKey: privateKey, // Menggunakan privateKey (huruf kapital)
        xionAddress: xionAddress || ''
      });
      index++;
    }
    saveWallets(wallets);
  }

  if (wallets.length === 0) {
    logger.error(`Tidak ada dompet ditemukan di .env atau wallets.json. Harap sediakan setidaknya satu PRIVATE_KEY_X.`);
    rl.close();
    process.exit(1);
  }

  while (true) {
    console.log(`Menu (Script by airdropnode - ${telegramLink}):`);
    console.log(`1. Corn - Holesky`);
    console.log(`2. Corn - Xion`);
    console.log(`3. Acak (Holesky dan Xion)`);
    console.log(`4. Keluar`);
    const menuChoice = await askQuestion(`[?] Pilih opsi menu (1-4): `);
    const choice = parseInt(menuChoice.trim());

    if (choice === 4) {
      logger.info(`Keluar dari program.`);
      rl.close();
      process.exit(0);
    }

    if (![1, 2, 3].includes(choice)) {
      logger.error(`Opsi tidak valid. Harap pilih 1, 2, 3, atau 4.`);
      continue;
    }

    const maxTransactionInput = await askQuestion(`[?] Masukkan jumlah transaksi per dompet: `);
    const maxTransaction = parseInt(maxTransactionInput.trim());

    if (isNaN(maxTransaction) || maxTransaction <= 0) {
      logger.error(`Angka tidak valid. Harap masukkan angka positif.`);
      continue;
    }

    for (const walletInfo of wallets) {
      if (!walletInfo.privateKey) { // Menggunakan privateKey (huruf kapital)
        logger.warn(`Melewati dompet '${walletInfo.name}': Kunci pribadi tidak ada.`);
        continue;
      }
      if (!walletInfo.privateKey.startsWith('0x')) { // Menggunakan privateKey (huruf kapital)
        logger.warn(`Melewati dompet '${walletInfo.name}': Kunci pribadi harus dimulai dengan '0x'.`);
        continue;
      }
      if (!/^(0x)[0-9a-fA-F]{64}$/.test(walletInfo.privateKey)) { // Menggunakan privateKey (huruf kapital)
        logger.warn(`Melewati dompet '${walletInfo.name}': Kunci pribadi bukan string heksadesimal 64 karakter yang valid.`);
        continue;
      }

      if (choice === 1) {
        await sendFromWallet(walletInfo, maxTransaction, 'holesky');
      } else if (choice === 2) {
        await sendFromWallet(walletInfo, maxTransaction, 'xion');
      } else if (choice === 3) {
        const destinations = ['holesky', 'xion'].filter(dest => dest !== 'xion' || walletInfo.xionAddress);
        if (destinations.length === 0) {
          logger.warn(`Melewati dompet '${walletInfo.name}': Tidak ada tujuan valid (alamat Xion tidak ada).`);
          continue;
        }
        for (let i = 0; i < maxTransaction; i++) {
          const randomDest = destinations[Math.floor(Math.random() * destinations.length)];
          await sendFromWallet(walletInfo, 1, randomDest);
        }
      }
    }

    if (wallets.length === 0) {
      logger.warn(`Tidak ada dompet yang diproses. Periksa .env atau wallets.json untuk entri yang valid.`);
    }
  }
}

// Fungsi utama untuk mode Telegram
function mainTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const allowedChatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !allowedChatId) {
    logger.warn('Bot Telegram tidak dikonfigurasi: TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID tidak ditemukan di .env. Memulai dalam mode konsol.');
    return mainConsole();
  }

  const bot = new TelegramBot(token, { polling: true });
  const userState = {}; // Untuk menyimpan status pengguna

  // Tombol menu utama
  const mainMenu = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Tambah Dompet', callback_data: 'add_wallet' }],
        [{ text: 'Daftar Dompet', callback_data: 'list_wallets' }],
        [{ text: 'Jalankan Transaksi', callback_data: 'run_transactions' }],
        [{ text: 'Bantuan', callback_data: 'help' }],
        [{ text: 'Join Telegram (airdropnode)', url: telegramLink }],
      ],
    },
  };

  // Tombol kembali ke beranda
  const backToHomeButton = [{ text: 'Kembali ke Beranda', callback_data: 'home' }];

  // Fungsi untuk menampilkan menu utama
  function showMainMenu(chatId, message = `Selamat datang di Union Testnet Auto Bot! (Script by airdropnode - ${telegramLink})\nPilih opsi:`) {
    delete userState[chatId]; // Hapus status pengguna
    bot.sendMessage(chatId, message, mainMenu);
  }

  // Menangani perintah /start
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id.toString();
    if (chatId !== allowedChatId) {
      bot.sendMessage(chatId, 'Akses tidak diizinkan.');
      return;
    }
    showMainMenu(chatId);
  });

  // Menangani tombol
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id.toString();
    if (chatId !== allowedChatId) {
      bot.sendMessage(chatId, 'Akses tidak diizinkan.');
      bot.answerCallbackQuery(query.id);
      return;
    }

    const data = query.data;
    bot.answerCallbackQuery(query.id);

    // Kembali ke menu utama
    if (data === 'home') {
      showMainMenu(chatId, 'Kembali ke menu utama.');
      return;
    }

    // Menampilkan menu utama
    if (data === 'start') {
      showMainMenu(chatId);
      return;
    }

    // Menampilkan bantuan
    if (data === 'help') {
      bot.sendMessage(chatId, 'Aksi yang tersedia:\n- Tambah Dompet: Tambah dompet baru\n- Daftar Dompet: Lihat semua dompet\n- Jalankan Transaksi: Eksekusi transaksi\n- Bantuan: Tampilkan pesan ini', {
        reply_markup: {
          inline_keyboard: [backToHomeButton],
        },
      });
      return;
    }

    // FIX: Menghapus deklarasi duplikat
    // const salt = keccak256(defaultAbiCoder.encode(["address", "uint256"], [wallet.address, timestampNow])); // <-- HAPUS INI
    // const instruction = { version: "0", opcode: "0x02", operand }; // <-- HAPUS INI
    // const instruction = { version: "0", opcode: "0x02", operand }; // <-- HAPUS INI

    if (data === 'add_wallet') {
      userState[chatId] = { step: 'add_wallet_input' };
      bot.sendMessage(chatId, 'Harap masukkan detail dompet dengan format:\nnama: <nama_dompet>\nkunci_pribadi: <kunci_pribadi>\nalamat_xion: <alamat_xion> (opsional)', {
        reply_markup: {
          inline_keyboard: [backToHomeButton],
        },
      });
      return;
    }

    // Daftar dompet
    if (data === 'list_wallets') {
      const wallets = loadWallets();
      if (wallets.length === 0) {
        bot.sendMessage(chatId, 'Tidak ada dompet ditemukan.', {
          reply_markup: {
            inline_keyboard: [backToHomeButton],
          },
        });
        return;
      }
      // FIX: Menggunakan Wallet dari ethers untuk mendapatkan alamat dari privateKey
      const walletList = wallets.map(w => `Nama: ${w.name}\nAlamat: ${new Wallet(w.privateKey).address}\nAlamat Xion: ${w.xionAddress || 'Tidak Ada'}`).join('\n\n');
      bot.sendMessage(chatId, `Dompet:\n\n${walletList}`, {
        reply_markup: {
          inline_keyboard: [backToHomeButton],
        },
      });
      return;
    }

    // Menjalankan transaksi - memilih tujuan
    if (data === 'run_transactions') {
      userState[chatId] = { step: 'select_destination' };
      bot.sendMessage(chatId, 'Pilih tujuan:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Corn - Holesky', callback_data: 'destination_holesky' }],
            [{ text: 'Corn - Xion', callback_data: 'destination_xion' }],
            [{ text: 'Acak (Holesky dan Xion)', callback_data: 'destination_random' }],
            backToHomeButton,
          ],
        },
      });
      return;
    }

    // Memilih tujuan
    if (data.startsWith('destination_')) {
      const destination = data.split('_')[1];
      userState[chatId] = { step: 'enter_transactions', destination };
      bot.sendMessage(chatId, 'Masukkan jumlah transaksi per dompet:', {
        reply_markup: {
          inline_keyboard: [backToHomeButton],
        },
      });
      return;
    }
  });

  // Menangani input teks
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    if (chatId !== allowedChatId) {
      bot.sendMessage(chatId, 'Akses tidak diizinkan.');
      return;
    }

    // Jika pesan adalah perintah (misalnya /start), abaikan karena sudah ditangani
    if (msg.text && msg.text.startsWith('/')) {
      return;
    }

    // Memeriksa status pengguna
    if (!userState[chatId]) {
      showMainMenu(chatId, 'Harap gunakan tombol untuk berinteraksi.');
      return;
    }

    const state = userState[chatId];

    // Menambah dompet
    if (state.step === 'add_wallet_input') {
      try {
        const lines = msg.text.split('\n').map(line => line.trim());
        const wallet = {};
        lines.forEach(line => {
          const [key, value] = line.split(':').map(s => s.trim());
          wallet[key] = value;
        });

        if (!wallet.nama || !wallet.kunci_pribadi) {
          bot.sendMessage(chatId, 'Format tidak valid. Harap masukkan nama dan kunci_pribadi.', {
            reply_markup: {
              inline_keyboard: [backToHomeButton],
            },
          });
          return;
        }
        if (!wallet.kunci_pribadi.startsWith('0x') || !/^(0x)[0-9a-fA-F]{64}$/.test(wallet.kunci_pribadi)) {
          bot.sendMessage(chatId, 'Kunci pribadi tidak valid. Harus berupa string heksadesimal 64 karakter yang dimulai dengan 0x.', {
            reply_markup: {
              inline_keyboard: [backToHomeButton],
            },
          });
          return;
        }

        const wallets = loadWallets();
        wallets.push({
          name: wallet.nama,
          privateKey: wallet.kunci_pribadi, // FIX: Menyesuaikan dengan privateKey (huruf kapital)
          xionAddress: wallet.alamat_xion || ''
        });
        saveWallets(wallets);
        bot.sendMessage(chatId, `Dompet ${wallet.nama} berhasil ditambahkan!`, {
          reply_markup: {
            inline_keyboard: [backToHomeButton],
          },
        });
        delete userState[chatId]; // Selesai operasi
      } catch (err) {
        bot.sendMessage(chatId, `Gagal menambahkan dompet: ${err.message}`, {
          reply_markup: {
            inline_keyboard: [backToHomeButton],
          },
        });
      }
      return;
    }

    // Memasukkan jumlah transaksi
    if (state.step === 'enter_transactions') {
      const maxTransaction = parseInt(msg.text.trim());
      if (isNaN(maxTransaction) || maxTransaction <= 0) {
        bot.sendMessage(chatId, 'Angka tidak valid. Harap masukkan angka positif.', {
          reply_markup: {
            inline_keyboard: [backToHomeButton],
          },
        });
        return;
      }

      const destination = state.destination;
      const wallets = loadWallets();
      if (wallets.length === 0) {
        bot.sendMessage(chatId, 'Tidak ada dompet ditemukan. Harap tambahkan dompet terlebih dahulu.', {
          reply_markup: {
            inline_keyboard: [backToHomeButton],
          },
        });
        delete userState[chatId];
        return;
      }

      bot.sendMessage(chatId, `Memulai ${maxTransaction} transaksi ke ${destination}...`, {
        reply_markup: {
          inline_keyboard: [backToHomeButton],
        },
      });

      for (const walletInfo of wallets) {
        if (!walletInfo.privateKey) { // FIX: Menggunakan privateKey (huruf kapital)
          bot.sendMessage(chatId, `Melewati dompet '${walletInfo.name}': Kunci pribadi tidak ada.`, {
            reply_markup: {
              inline_keyboard: [backToHomeButton],
            },
          });
          continue;
        }
        if (!walletInfo.privateKey.startsWith('0x')) { // FIX: Menggunakan privateKey (huruf kapital)
          bot.sendMessage(chatId, `Melewati dompet '${walletInfo.name}': Kunci pribadi harus dimulai dengan '0x'.`, {
            reply_markup: {
              inline_keyboard: [backToHomeButton],
            },
          });
          continue;
        }
        if (!/^(0x)[0-9a-fA-F]{64}$/.test(walletInfo.privateKey)) { // FIX: Menggunakan privateKey (huruf kapital)
          bot.sendMessage(chatId, `Melewati dompet '${walletInfo.name}': Kunci pribadi bukan string heksadesimal 64 karakter yang valid.`, {
            reply_markup: {
              inline_keyboard: [backToHomeButton],
            },
          });
          continue;
        }

        if (destination === 'holesky') {
          await sendFromWallet(walletInfo, maxTransaction, 'holesky', bot, chatId);
        } else if (destination === 'xion') {
          await sendFromWallet(walletInfo, maxTransaction, 'xion', bot, chatId);
        } else if (destination === 'random') {
          const destinations = ['holesky', 'xion'].filter(dest => dest !== 'xion' || walletInfo.xionAddress);
          if (destinations.length === 0) {
            bot.sendMessage(chatId, `Melewati dompet '${walletInfo.name}': Tidak ada tujuan valid (alamat Xion tidak ada).`, {
              reply_markup: {
                inline_keyboard: [backToHomeButton],
              },
            });
            continue;
          }
          for (let i = 0; i < maxTransaction; i++) {
            const randomDest = destinations[Math.floor(Math.random() * destinations.length)];
            await sendFromWallet(walletInfo, 1, randomDest, bot, chatId);
          }
        }
      }

      bot.sendMessage(chatId, 'Proses transaksi selesai.', {
        reply_markup: {
          inline_keyboard: [backToHomeButton],
        },
      });
      delete userState[chatId]; // Selesai operasi
    }
  });

  logger.info('Bot Telegram dimulai dengan keyboard inline.');
}

// Fungsi utama
async function main() {
  try {
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      mainTelegram();
    } else {
      mainConsole();
    }
  } catch (err) {
    logger.error(`Kesalahan utama: ${err.message}`);
    rl.close();
    process.exit(1);
  }
}

main();
