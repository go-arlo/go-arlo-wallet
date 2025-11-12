'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Bot, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface TradingDecision {
  action: string;
  confidence: number;
  score: number;
  riskScore: number;
  reasoning: string;
  tokenSymbol: string;
  tokenAddress: string;
}

interface TradeResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  details?: string;
  tradingDecision?: TradingDecision;
}

export default function AgentTradingDemo() {
  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [amount, setAmount] = useState('10');
  const [tradingDecision, setTradingDecision] = useState<TradingDecision | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [tradeResult, setTradeResult] = useState<TradeResult | null>(null);
  const [delegatedWallet, setDelegatedWallet] = useState('');

  // Simulate agent analysis
  const analyzeToken = async () => {
    setIsAnalyzing(true);
    setTradingDecision(null);
    setTradeResult(null);

    try {
      // Simulate API call to trading agent
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock trading decision
      const mockDecision: TradingDecision = {
        action: 'BUY',
        confidence: 85,
        score: 78,
        riskScore: 22,
        reasoning: 'Strong buy signal based on positive market indicators, low risk profile, and bullish sentiment.',
        tokenSymbol: tokenSymbol || 'TOKEN',
        tokenAddress: tokenAddress,
      };

      setTradingDecision(mockDecision);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Execute trade via agent
  const executeTrade = async () => {
    if (!tradingDecision || !delegatedWallet) return;

    setIsExecuting(true);
    setTradeResult(null);

    try {
      const response = await fetch('/api/agent/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NEXT_PUBLIC_AGENT_API_KEY || 'demo-key',
        },
        body: JSON.stringify({
          inputMint: 'So11111111111111111111111111111111111111112', // SOL
          outputMint: tokenAddress,
          amount: parseInt(amount) * 10**9, // Convert to lamports
          slippageBps: 50,
          userPublicKey: delegatedWallet,
          tradingDecision: tradingDecision,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setTradeResult({
          success: true,
          transactionHash: result.transactionHash,
          tradingDecision: tradingDecision,
        });
      } else {
        setTradeResult({
          success: false,
          error: result.error,
          details: result.details,
        });
      }
    } catch (error: any) {
      setTradeResult({
        success: false,
        error: 'Failed to execute trade',
        details: error.message,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6" />
            AI Trading Agent Demo
          </CardTitle>
          <CardDescription>
            Demonstrates how the trading agent analyzes tokens and executes trades via delegated wallet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Token Input */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 1: Token Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tokenAddress">Token Address (Solana)</Label>
                <Input
                  id="tokenAddress"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  placeholder="Enter token mint address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tokenSymbol">Token Symbol</Label>
                <Input
                  id="tokenSymbol"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                  placeholder="e.g., BONK"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Trade Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount in USD"
              />
            </div>
          </div>

          {/* Step 2: Wallet Setup */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 2: Delegated Wallet</h3>
            <div className="space-y-2">
              <Label htmlFor="wallet">Delegated Wallet Address</Label>
              <Input
                id="wallet"
                value={delegatedWallet}
                onChange={(e) => setDelegatedWallet(e.target.value)}
                placeholder="Enter delegated wallet public key"
              />
            </div>
          </div>

          {/* Step 3: Agent Analysis */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 3: Agent Analysis</h3>
            <Button
              onClick={analyzeToken}
              disabled={!tokenAddress || !tokenSymbol || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Token...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Analyze with Trading Agent
                </>
              )}
            </Button>

            {tradingDecision && (
              <Card className="bg-muted">
                <CardHeader>
                  <CardTitle className="text-lg">Trading Decision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Action</p>
                      <p className={`font-bold ${
                        tradingDecision.action === 'BUY' ? 'text-green-600' :
                        tradingDecision.action === 'SELL' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {tradingDecision.action}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <p className="font-bold">{tradingDecision.confidence}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Trading Score</p>
                      <p className="font-bold">{tradingDecision.score}/100</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Risk Score</p>
                      <p className="font-bold">{tradingDecision.riskScore}/100</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground">Reasoning</p>
                    <p className="text-sm mt-1">{tradingDecision.reasoning}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Step 4: Execute Trade */}
          {tradingDecision && tradingDecision.action === 'BUY' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 4: Execute Trade</h3>

              {tradingDecision.confidence >= 75 && tradingDecision.riskScore <= 30 ? (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    Trade meets auto-execution criteria (Confidence ≥75%, Risk ≤30)
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-yellow-500 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    Manual review recommended - Does not meet auto-execution criteria
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={executeTrade}
                disabled={!delegatedWallet || isExecuting}
                className="w-full"
                variant={tradingDecision.confidence >= 75 ? "default" : "secondary"}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing Trade...
                  </>
                ) : (
                  'Execute Jupiter Swap'
                )}
              </Button>
            </div>
          )}

          {/* Trade Result */}
          {tradeResult && (
            <Alert className={tradeResult.success ? 'border-green-500' : 'border-red-500'}>
              <AlertDescription>
                {tradeResult.success ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-green-600">✅ Trade Executed Successfully!</p>
                    <p className="text-sm">
                      Transaction: {' '}
                      <a
                        href={`https://solscan.io/tx/${tradeResult.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-600"
                      >
                        {tradeResult.transactionHash?.slice(0, 8)}...
                      </a>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-semibold text-red-600">❌ Trade Failed</p>
                    <p className="text-sm">{tradeResult.error}</p>
                    {tradeResult.details && (
                      <p className="text-xs text-muted-foreground">{tradeResult.details}</p>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold">1. Token Analysis</h4>
            <p className="text-muted-foreground">
              The AI trading agent analyzes market data, sentiment, risk factors, and technical indicators
            </p>
          </div>
          <div>
            <h4 className="font-semibold">2. Trading Decision</h4>
            <p className="text-muted-foreground">
              Agent generates a recommendation (BUY/SELL/HOLD) with confidence and risk scores
            </p>
          </div>
          <div>
            <h4 className="font-semibold">3. Policy Enforcement</h4>
            <p className="text-muted-foreground">
              Trades are validated against policies (min confidence 75%, max risk 30%)
            </p>
          </div>
          <div>
            <h4 className="font-semibold">4. Execution via Jupiter</h4>
            <p className="text-muted-foreground">
              Approved trades are executed through Jupiter using the delegated wallet
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}