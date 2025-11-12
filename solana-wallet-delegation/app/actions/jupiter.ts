"use server";

// Jupiter Lite API v1 endpoints
const JUP_QUOTE_URL =
  process.env.JUP_QUOTE_URL || "https://lite-api.jup.ag/swap/v1/quote";
const JUP_SWAP_URL =
  process.env.JUP_SWAP_URL || "https://lite-api.jup.ag/swap/v1/swap";

// Legacy Ultra API endpoints (if still needed)
const ULTRA_ORDER_URL =
  process.env.JUP_ULTRA_ORDER_URL || "https://api.jup.ag/ultra/v1/order";
const ULTRA_EXECUTE_URL =
  process.env.JUP_ULTRA_EXECUTE_URL ||
  "https://api.jup.ag/ultra/v1/execute";

interface OrderParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  taker: string;
  slippageBps?: number;
}

interface ExecuteParams {
  requestId: string;
  signedTransaction: string;
}

interface QuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
}

interface BalanceItem {
  tokenMint: string;
  amount: string;
  decimals: number;
  symbol: string;
  name?: string;
  logoURI?: string;
  uiAmount?: number;
}

/**
 * Create Ultra order (unsigned tx + requestId)
 */
export async function createUltraOrder(params: OrderParams) {
  const { inputMint, outputMint, amount, taker, slippageBps = 50 } = params;

  const url =
    `${ULTRA_ORDER_URL}?` +
    `inputMint=${encodeURIComponent(inputMint)}` +
    `&outputMint=${encodeURIComponent(outputMint)}` +
    `&amount=${amount}` +
    `&taker=${encodeURIComponent(taker)}` +
    `&slippageBps=${slippageBps}`;

  console.log('Creating Ultra order with params:', { inputMint, outputMint, amount, taker, slippageBps });
  console.log('Creating Ultra order with URL:', url);

  const resp = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error('Ultra order error response:', { status: resp.status, statusText: resp.statusText, body: err });
    throw new Error(`Ultra order failed: ${resp.status} ${resp.statusText} - ${err}`);
  }

  const result = await resp.json();
  console.log('Ultra order response keys:', Object.keys(result));
  console.log('Ultra order response:', result);

  // Check if response has expected structure
  if (!result || typeof result !== 'object') {
    throw new Error('Invalid Ultra order response format');
  }

  return result;
}

/**
 * Execute Ultra order (broadcast signed tx)
 */
export async function executeUltraOrder(params: ExecuteParams) {
  const resp = await fetch(ULTRA_EXECUTE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    cache: "no-store",
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Ultra execute failed: ${resp.status} ${err}`);
  }

  return resp.json();
}

/**
 * Get Ultra balances for a wallet address
 */
export async function getUltraBalances(taker: string): Promise<BalanceItem[]> {
  try {
    // Use Solana RPC to get token account balances
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

    // Get SOL balance
    const solBalanceResp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [taker]
      })
    });

    const balances: BalanceItem[] = [];

    if (solBalanceResp.ok) {
      const solData = await solBalanceResp.json();
      if (solData.result) {
        balances.push({
          tokenMint: 'So11111111111111111111111111111111111111112', // SOL mint
          amount: solData.result.value.toString(),
          decimals: 9,
          symbol: 'SOL',
          name: 'Solana',
          uiAmount: solData.result.value / 1e9
        });
      }
    }

    // Get token account balances
    const tokenResp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'getTokenAccountsByOwner',
        params: [
          taker,
          { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          { encoding: 'jsonParsed' }
        ]
      })
    });

    if (tokenResp.ok) {
      const tokenData = await tokenResp.json();
      if (tokenData.result && tokenData.result.value) {
        for (const account of tokenData.result.value) {
          const info = account.account.data.parsed.info;
          if (info.tokenAmount.uiAmount > 0) {
            balances.push({
              tokenMint: info.mint,
              amount: info.tokenAmount.amount,
              decimals: info.tokenAmount.decimals,
              symbol: getTokenSymbolByMint(info.mint) || info.mint.slice(0, 8),
              name: getTokenSymbolByMint(info.mint) || info.mint.slice(0, 8),
              uiAmount: info.tokenAmount.uiAmount
            });
          }
        }
      }
    }

    return balances;
  } catch (error) {
    console.error('Error fetching balances:', error);
    return [];
  }
}

// Helper function to get token mint by symbol
function getTokenMintBySymbol(symbol: string): string {
  const tokenMap: Record<string, string> = {
    'SOL': 'So11111111111111111111111111111111111111112',
    'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
  };
  return tokenMap[symbol] || '';
}

// Helper function to get token symbol by mint
function getTokenSymbolByMint(mint: string): string | null {
  const mintMap: Record<string, string> = {
    'So11111111111111111111111111111111111111112': 'SOL',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT'
  };
  return mintMap[mint] || null;
}

// Helper function to get token decimals by symbol
function getTokenDecimalsBySymbol(symbol: string): number {
  const decimalMap: Record<string, number> = {
    'SOL': 9,
    'USDC': 6,
    'USDT': 6
  };
  return decimalMap[symbol] || 9;
}

/**
 * Create regular Jupiter swap transaction using v6 API
 */
export async function createJupiterSwap(params: {
  inputMint: string;
  outputMint: string;
  amount: number;
  userPublicKey: string;
  slippageBps?: number;
}) {
  const { inputMint, outputMint, amount, userPublicKey, slippageBps = 50 } = params;

  console.log('Creating Jupiter swap with params:', { inputMint, outputMint, amount, userPublicKey, slippageBps });

  // First get quote
  const quoteResponse = await getUltraQuote({
    inputMint,
    outputMint,
    amount,
    slippageBps,
  });

  console.log('Got quote response:', quoteResponse);

  // Then get swap transaction using v6 API
  const swapUrl = JUP_SWAP_URL;
  const swapResponse = await fetch(swapUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto"
    }),
  });

  if (!swapResponse.ok) {
    const err = await swapResponse.text();
    console.error('Jupiter swap error response:', { status: swapResponse.status, statusText: swapResponse.statusText, body: err });
    throw new Error(`Jupiter swap failed: ${swapResponse.status} ${swapResponse.statusText} - ${err}`);
  }

  const result = await swapResponse.json();
  console.log('Jupiter swap response keys:', Object.keys(result));
  console.log('Jupiter swap response:', result);
  return result;
}

/**
 * Get quote from Jupiter Swap Quote API
 */
export async function getUltraQuote(params: QuoteParams) {
  const { inputMint, outputMint, amount, slippageBps = 50 } = params;

  const url =
    `${JUP_QUOTE_URL}?` +
    `inputMint=${encodeURIComponent(inputMint)}` +
    `&outputMint=${encodeURIComponent(outputMint)}` +
    `&amount=${amount}` +
    `&slippageBps=${slippageBps}`;

  console.log('Getting quote from:', url);

  const resp = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      'Accept': 'application/json',
    }
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error('Quote error response:', { status: resp.status, statusText: resp.statusText, body: err });
    throw new Error(`Quote failed: ${resp.status} ${resp.statusText} - ${err}`);
  }

  const result = await resp.json();
  console.log('Quote response:', result);
  return result;
}