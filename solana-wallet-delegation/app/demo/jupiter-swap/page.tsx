'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUltraBalances, getUltraQuote } from '@/app/actions/jupiter';

// Common token mints on Solana
const TOKENS = {
  SOL: {
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    decimals: 9,
    name: 'Solana',
  },
  USDC: {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
  },
  USDT: {
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    decimals: 6,
    name: 'Tether',
  },
};

interface SwapResult {
  txSignature: string;
  inputMint: string;
  outputMint: string;
  amount: number;
  expectedOutput: number;
  priceImpact: number;
  explorerUrl: string;
}

interface TokenBalance {
  tokenMint: string;
  amount: string;
  decimals: number;
  symbol: string;
  name?: string;
  uiAmount?: number;
}

export default function JupiterSwapDemo() {
  const [isSwapping, setIsSwapping] = useState(false);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const [result, setResult] = useState<SwapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [policyViolation, setPolicyViolation] = useState(false);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [quote, setQuote] = useState<any>(null);

  const [formData, setFormData] = useState({
    organizationId: '',
    delegatedUserId: '',
    walletAddress: '',
    inputToken: 'SOL',
    outputToken: 'USDC',
    amount: '0.001', // In token units (e.g., 0.001 SOL)
    slippageBps: 50, // 0.5% slippage
  });

  // Parse URL parameters if coming from policy setup
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orgId = urlParams.get('organizationId');
    const delegatedId = urlParams.get('delegatedUserId');
    const wallet = urlParams.get('walletAddress');

    if (orgId) setFormData(prev => ({ ...prev, organizationId: orgId }));
    if (delegatedId) setFormData(prev => ({ ...prev, delegatedUserId: delegatedId }));
    if (wallet) setFormData(prev => ({ ...prev, walletAddress: wallet }));
  }, []);

  // Fetch balances when wallet address changes
  useEffect(() => {
    if (formData.walletAddress) {
      fetchBalances();
    }
  }, [formData.walletAddress]);

  // Fetch quote when swap parameters change
  useEffect(() => {
    if (formData.amount && parseFloat(formData.amount) > 0) {
      fetchQuote();
    }
  }, [formData.inputToken, formData.outputToken, formData.amount]);

  const fetchBalances = async () => {
    if (!formData.walletAddress) return;

    setIsFetchingBalances(true);
    try {
      const balanceData = await getUltraBalances(formData.walletAddress);
      // Ensure we always set an array
      setBalances(Array.isArray(balanceData) ? balanceData : []);
    } catch (err) {
      console.error('Failed to fetch balances:', err);
      // Set empty array on error to prevent runtime errors
      setBalances([]);
    } finally {
      setIsFetchingBalances(false);
    }
  };

  const fetchQuote = async () => {
    const inputMint = TOKENS[formData.inputToken as keyof typeof TOKENS].mint;
    const outputMint = TOKENS[formData.outputToken as keyof typeof TOKENS].mint;
    const inputDecimals = TOKENS[formData.inputToken as keyof typeof TOKENS].decimals;
    const amount = Math.floor(parseFloat(formData.amount) * Math.pow(10, inputDecimals));

    if (!amount || amount <= 0) return;

    setIsFetchingQuote(true);
    try {
      const quoteData = await getUltraQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps: formData.slippageBps,
      });
      setQuote(quoteData);
    } catch (err) {
      console.error('Failed to fetch quote:', err);
      setQuote(null);
    } finally {
      setIsFetchingQuote(false);
    }
  };

  const handleSwap = async () => {
    setIsSwapping(true);
    setError(null);
    setPolicyViolation(false);

    try {
      const inputMint = TOKENS[formData.inputToken as keyof typeof TOKENS].mint;
      const outputMint = TOKENS[formData.outputToken as keyof typeof TOKENS].mint;
      const inputDecimals = TOKENS[formData.inputToken as keyof typeof TOKENS].decimals;
      const amount = Math.floor(parseFloat(formData.amount) * Math.pow(10, inputDecimals));

      const response = await fetch('/api/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputMint,
          outputMint,
          amount,
          walletAddress: formData.walletAddress,
          organizationId: formData.organizationId,
          delegatedUserId: formData.delegatedUserId,
          slippageBps: formData.slippageBps,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPolicyViolation(data.policyViolation || false);
        throw new Error(data.error || 'Failed to execute swap');
      }

      setResult(data);
      // Refresh balances after swap
      fetchBalances();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute swap');
    } finally {
      setIsSwapping(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setPolicyViolation(false);
  };

  const getTokenBalance = (tokenSymbol: string) => {
    const token = TOKENS[tokenSymbol as keyof typeof TOKENS];
    // Ensure balances is an array before using find
    if (!Array.isArray(balances)) {
      return '0';
    }
    const balance = balances.find(b => b.tokenMint === token.mint);
    if (!balance) return '0';
    const uiAmount = parseFloat(balance.amount) / Math.pow(10, token.decimals);
    return uiAmount.toFixed(6);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/demo/delegated-policy" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Policy Demo
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Jupiter Swap Demo</h1>
        <p className="text-gray-600 mt-2">
          Execute token swaps through Jupiter using the delegated user&apos;s sub-organization wallet with policy enforcement
        </p>
      </div>

      {!result && !error && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-6">Configure Token Swap</h2>

          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization ID *
                </label>
                <input
                  type="text"
                  value={formData.organizationId}
                  onChange={(e) => setFormData(prev => ({ ...prev, organizationId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Sub-organization ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wallet Address *
                </label>
                <input
                  type="text"
                  value={formData.walletAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, walletAddress: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Solana wallet address"
                />
              </div>
            </div>

            {formData.walletAddress && Array.isArray(balances) && balances.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Wallet Balances</h3>
                <div className="grid grid-cols-3 gap-3">
                  {Object.keys(TOKENS).map(symbol => (
                    <div key={symbol} className="text-sm">
                      <span className="font-medium">{symbol}:</span>{' '}
                      <span className="font-mono">{getTokenBalance(symbol)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Swap Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Token
                  </label>
                  <select
                    value={formData.inputToken}
                    onChange={(e) => setFormData(prev => ({ ...prev, inputToken: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(TOKENS).map(([key, token]) => (
                      <option key={key} value={key}>
                        {token.symbol} - {token.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Balance: {getTokenBalance(formData.inputToken)} {formData.inputToken}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Token
                  </label>
                  <select
                    value={formData.outputToken}
                    onChange={(e) => setFormData(prev => ({ ...prev, outputToken: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(TOKENS)
                      .filter(([key]) => key !== formData.inputToken)
                      .map(([key, token]) => (
                        <option key={key} value={key}>
                          {token.symbol} - {token.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Balance: {getTokenBalance(formData.outputToken)} {formData.outputToken}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.001"
                    step="0.001"
                    min="0"
                  />
                  <span className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md">
                    {formData.inputToken}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slippage Tolerance (basis points)
                </label>
                <input
                  type="number"
                  value={formData.slippageBps}
                  onChange={(e) => setFormData(prev => ({ ...prev, slippageBps: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.slippageBps / 100}% slippage tolerance (50 = 0.5%)
                </p>
              </div>
            </div>

            {quote && !isFetchingQuote && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Quote Preview</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>
                    <strong>You pay:</strong> {formData.amount} {formData.inputToken}
                  </p>
                  <p>
                    <strong>You receive:</strong> ~
                    {(quote.outAmount / Math.pow(10, TOKENS[formData.outputToken as keyof typeof TOKENS].decimals)).toFixed(6)}{' '}
                    {formData.outputToken}
                  </p>
                  {quote.priceImpactPct && (
                    <p>
                      <strong>Price Impact:</strong> {parseFloat(quote.priceImpactPct).toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-yellow-800 mb-2">Policy Enforcement</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>• Transaction will be signed using the delegated user&apos;s permissions</p>
              <p>• Swap must comply with all policy restrictions (amount limits, allowed programs)</p>
              <p>• Jupiter&apos;s program ID must be whitelisted in your policy</p>
              <p>• Transaction will be rejected if it violates any policy rules</p>
            </div>
          </div>

          <button
            onClick={handleSwap}
            disabled={
              isSwapping ||
              !formData.organizationId ||
              !formData.walletAddress ||
              !formData.amount ||
              parseFloat(formData.amount) <= 0
            }
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {isSwapping ? 'Executing Swap...' : `Swap ${formData.inputToken} for ${formData.outputToken}`}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="text-green-600 text-2xl mr-3">✅</div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">Swap Executed Successfully!</h3>
                <p className="text-green-700 mt-1">
                  Your token swap has been completed and confirmed on the blockchain.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-600">Transaction Signature:</span>
                <p className="font-mono text-sm bg-gray-50 p-2 rounded mt-1 break-all">
                  {result.txSignature}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Swapped:</span>
                  <p className="text-sm mt-1">
                    {(result.amount / Math.pow(10, TOKENS[formData.inputToken as keyof typeof TOKENS].decimals)).toFixed(6)}{' '}
                    {formData.inputToken}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Received:</span>
                  <p className="text-sm mt-1">
                    ~{(result.expectedOutput / Math.pow(10, TOKENS[formData.outputToken as keyof typeof TOKENS].decimals)).toFixed(6)}{' '}
                    {formData.outputToken}
                  </p>
                </div>
              </div>
              <div>
                <a
                  href={result.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                >
                  View on Solscan →
                </a>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Policy Compliance</h3>
            <div className="text-blue-700 space-y-2 text-sm">
              <p>✅ Transaction approved by Turnkey policy engine</p>
              <p>✅ Signed using delegated user permissions</p>
              <p>✅ Amount within policy limits</p>
              <p>✅ Jupiter program was whitelisted</p>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleReset}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Execute Another Swap
            </button>
            <Link
              href="/demo/delegated-policy"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-center transition-colors"
            >
              Back to Policy Demo
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className={`${policyViolation ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'} border rounded-lg p-6`}>
          <div className="flex items-center">
            <div className={`${policyViolation ? 'text-yellow-600' : 'text-red-600'} text-2xl mr-3`}>
              {policyViolation ? '⚠️' : '❌'}
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${policyViolation ? 'text-yellow-800' : 'text-red-800'}`}>
                {policyViolation ? 'Transaction Denied by Policy' : 'Swap Failed'}
              </h3>
              <p className={`${policyViolation ? 'text-yellow-700' : 'text-red-700'} mt-1`}>
                {error}
              </p>
              {policyViolation && (
                <div className="mt-3 text-sm text-yellow-600 space-y-1">
                  <p>Possible reasons:</p>
                  <ul className="list-disc list-inside ml-2">
                    <li>Amount exceeds policy limits</li>
                    <li>Jupiter program not whitelisted</li>
                    <li>Token addresses not in allowed list</li>
                    <li>Too many instructions in transaction</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleReset}
            className={`mt-4 ${policyViolation ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-600 hover:bg-red-700'} text-white py-2 px-4 rounded-lg transition-colors`}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}