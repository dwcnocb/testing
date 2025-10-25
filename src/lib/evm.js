/**
 * EVM Hybrid Balance Fetcher
 * Combines Moralis + Covalent + Public RPCs
 * Supports multiple EVM networks and filters balances > 0
 */

import axios from "axios";
import { ethers } from "ethers";

// --------------- ENV VARIABLES -----------------
// Put these in your .env file:
// VITE_MORALIS_API_KEY=your_moralis_key
// VITE_COVALENT_API_KEY=your_covalent_key

const MORALIS_KEY = import.meta.env.VITE_MORALIS_API_KEY;
const COVALENT_KEY = import.meta.env.VITE_COVALENT_API_KEY;

// --------------- SUPPORTED EVM NETWORKS -----------------
export const NETWORKS = {
  eth: {
    chainId: 1,
    rpc: "https://rpc.ankr.com/eth",
    covalentChain: "eth-mainnet",
  },
  bsc: {
    chainId: 56,
    rpc: "https://bsc-dataseed.binance.org/",
    covalentChain: "bsc-mainnet",
  },
  polygon: {
    chainId: 137,
    rpc: "https://polygon-rpc.com",
    covalentChain: "matic-mainnet",
  },
  avalanche: {
    chainId: 43114,
    rpc: "https://api.avax.network/ext/bc/C/rpc",
    covalentChain: "avalanche-mainnet",
  },
  arbitrum: {
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    covalentChain: "arbitrum-mainnet",
  },
  optimism: {
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    covalentChain: "optimism-mainnet",
  },
  fantom: {
    chainId: 250,
    rpc: "https://rpc.ftm.tools/",
    covalentChain: "fantom-mainnet",
  },
};

// ---------------------------------------------------------

/**
 * Fetch native token balance using public RPC
 */
async function fetchNativeBalance(address, rpcUrl) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance));
  } catch (err) {
    console.error("RPC Native Balance Error:", err.message);
    return 0;
  }
}

/**
 * Fetch ERC-20 token balances using Moralis API
 */
async function fetchMoralisBalances(address, chain) {
  if (!MORALIS_KEY) return [];
  try {
    const url = https://deep-index.moralis.io/api/v2.2/${address}/erc20?chain=${chain};
    const res = await axios.get(url, {
      headers: { "X-API-Key": MORALIS_KEY },
    });
    return (
      res.data
        ?.filter((t) => parseFloat(t.balance) > 0)
        .map((t) => ({
          name: t.name,
          symbol: t.symbol,
          decimals: t.decimals,
          balance: parseFloat(ethers.formatUnits(t.balance, t.decimals)),
          token_address: t.token_address,
        })) || []
    );
  } catch (err) {
    console.error("Moralis ERC20 Error:", err.message);
    return [];
  }
}

/**
 * Fetch token balances using Covalent API
 */
async function fetchCovalentBalances(address, chain) {
  if (!COVALENT_KEY) return [];
  try {
    const url = https://api.covalenthq.com/v1/${NETWORKS[chain].covalentChain}/address/${address}/balances_v2/?key=${COVALENT_KEY};
    const res = await axios.get(url);
    return (
      res.data?.data?.items
        ?.filter((t) => t.balance && parseFloat(t.balance) > 0)
        .map((t) => ({
          name: t.contract_name,
          symbol: t.contract_ticker_symbol,
          decimals: t.contract_decimals,
          balance: parseFloat(
            ethers.formatUnits(t.balance, t.contract_decimals)
          ),
          token_address: t.contract_address,
        })) || []
    );
  } catch (err) {
    console.error("Covalent Error:", err.message);
    return [];
  }
}

/**
 * Core function: getEvmBalances
 * Combines Moralis + Covalent + RPC to ensure redundancy
 */
export async function getEvmBalances(address, chain = "bsc") {
  if (!address) return console.error("❌ Address missing");
  if (!NETWORKS[chain]) return console.error("❌ Unsupported network");

  console.log(🔍 Fetching balances for ${address} on ${chain.toUpperCase()}...);

  const { rpc } = NETWORKS[chain];
  const results = [];

  // Fetch native balance
  const nativeBal = await fetchNativeBalance(address, rpc);
  if (nativeBal > 0) {
    results.push({
      name: chain.toUpperCase() + " Native",
      symbol: chain === "bsc" ? "BNB" : chain === "eth" ? "ETH" : "Token",
      balance: nativeBal,
      token_address: "native",
    });
  }

  // Fetch ERC-20 balances (Moralis + Covalent)
  const [moralisTokens, covalentTokens] = await Promise.all([
    fetchMoralisBalances(address, chain),
    fetchCovalentBalances(address, chain),
  ]);

  // Merge + deduplicate
  const merged = [...moralisTokens, ...covalentTokens];
  const unique = Object.values(
    merged.reduce((acc, token) => {
      acc[token.token_address] = token;
      return acc;
    }, {})
  );

  // Filter > 0
  const nonZero = unique.filter((t) => t.balance > 0);
  results.push(...nonZero);

  console.log(✅ Found ${results.length} tokens);
  return results;
}
