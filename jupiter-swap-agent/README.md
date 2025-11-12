# Jupiter Swap Agent

An AI-powered agent that executes Jupiter swaps on Solana using a delegated wallet managed by Turnkey. The agent provides a conversational interface for performing secure, policy-enforced token swaps.

## Features

- 🤖 **AI-Powered Trading**: Natural language interface for executing swaps
- 🔐 **Delegated Wallet Security**: Uses Turnkey's secure wallet delegation
- 📏 **Policy Enforcement**: Automatic compliance with spending limits and restrictions
- 🔄 **Jupiter Integration**: Access to Solana's premier DEX aggregator
- 📊 **Real-time Pricing**: Live token prices from Jupiter Price API
- 💰 **Balance Management**: Check SOL and token balances
- 🔍 **Token Information**: Get detailed token metadata

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Agent      │    │ Delegated Wallet │    │   Jupiter DEX   │
│                 │    │   (Turnkey)      │    │                 │
│ - LangGraph     │◄──►│ - Policy Engine  │◄──►│ - Swap Quotes   │
│ - Claude LLM    │    │ - Transaction    │    │ - Execution     │
│ - Tool Calling  │    │   Signing        │    │ - Price Feed    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Prerequisites

### 1. Wallet Delegation Service

Ensure the wallet delegation service is running:

```bash
cd ../solana-wallet-delegation
npm run dev  # Service should run on http://localhost:3000
```

Complete the delegation setup:
1. Navigate to http://localhost:3000/demo
2. Complete "Delegated Access" setup
3. Configure policies as needed
4. Note the delegated wallet address

### 2. Environment Setup

Create a `.env` file with your configuration:

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Python Environment

Python 3.11+ is required.

## Installation

1. **Clone and navigate to the agent directory:**
   ```bash
   cd go-arlo-wallet/jupiter-swap-agent
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-api03-...` |
| `WALLET_API_URL` | Wallet delegation API URL | `http://localhost:3000/api` |
| `WALLET_API_KEY` | API key for wallet service | `your-secure-key` |
| `DELEGATED_WALLET_ADDRESS` | Public key of delegated wallet | `8FbYKGy88FsdTNKKgW24ewB3BBS2VA6Z7GknELU4RfmB` |

### Wallet Service Configuration

Ensure the wallet delegation service has the matching API key:

```env
# In solana-wallet-delegation/.env
AGENT_API_KEY=your-secure-key
```

## Usage

### Starting the Agent

```bash
python main.py
```

The agent will:
1. Validate environment configuration
2. Check wallet delegation service connectivity
3. Display current wallet balance
4. Start the interactive chat interface

### Example Commands

#### Check Balance
```
You: check balance
Agent: Current SOL balance: 0.5000 SOL
```

#### Get Token Price
```
You: what's the price of BONK?
Agent: BONK current price: $0.000012
```

#### Execute a Buy Order
```
You: buy 10 USD of BONK
Agent: I'll execute a buy order for BONK...

✅ Swap executed successfully!

Transaction Hash: 2x7K8pQ...
Action: BUY
Token: BONK
Amount: $10
Slippage: 0.5%

View on Solscan: https://solscan.io/tx/2x7K8pQ...
```

#### Get Token Information
```
You: token info DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
Agent: Token Information:
- Symbol: BONK
- Name: Bonk
- Decimals: 5
- Address: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
```

### Supported Commands

#### 💰 Balance & Information
- `check balance` - Get current SOL balance
- `price of [TOKEN]` - Get token price (e.g., "price of SOL")
- `token info [ADDRESS]` - Get token details

#### 💱 USD-based Trading
- `buy [AMOUNT] USD of [TOKEN]` - Buy tokens with USD value
- `sell [AMOUNT] USD of [TOKEN]` - Sell tokens for USD value

#### 🔄 SOL-based Trading (New!)
- `swap [AMOUNT] SOL for [TOKEN]` - Swap SOL for tokens
- `swap [AMOUNT] [TOKEN] for SOL` - Swap tokens for SOL

#### 🛠️ Control
- `help` - Show available commands
- `exit` - Quit the agent

### Natural Language Interface

The agent understands natural language requests:

```
You: I want to swap 5 dollars of SOL for BONK tokens
You: swap 0.01 SOL for BONK
You: swap 1000 BONK for SOL
You: Show me the current price of Jupiter token
You: Can you check how much SOL I have?
You: Get information about this token: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

## Policy Enforcement

The agent respects all policies configured in the Turnkey delegation system:

### Automatic Validation
- **Spending limits**: Daily/transaction limits enforced
- **Token allowlists**: Only approved tokens can be traded
- **Risk thresholds**: High-risk trades are automatically rejected
- **Time restrictions**: Trading windows enforced if configured

### Policy Violations
If a trade violates policies, the agent will explain the issue:

```
Agent: ❌ Swap failed: Policy violation - Daily spending limit exceeded
Current limit: $100, Attempted: $150
Please try a smaller amount or wait for the limit to reset.
```

## Common Token Addresses

| Token | Symbol | Mint Address |
|-------|--------|--------------|
| Solana | SOL | `So11111111111111111111111111111111111111112` |
| USD Coin | USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| Bonk | BONK | `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263` |
| dogwifhat | WIF | `EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm` |
| Jito | JTO | `jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL` |
| Jupiter | JUP | `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN` |

## Error Handling

### Common Issues and Solutions

1. **"Cannot connect to wallet delegation service"**
   ```
   Solution: Ensure the wallet service is running on http://localhost:3000
   Check: curl http://localhost:3000/api/health
   ```

2. **"Policy violation"**
   ```
   Solution: Check policy limits in the Turnkey dashboard
   Adjust trade amounts or wait for limit reset
   ```

3. **"Insufficient balance"**
   ```
   Solution: Fund the delegated wallet with SOL
   Check balance: solana balance [wallet-address]
   ```

4. **"Token not found"**
   ```
   Solution: Verify the token mint address
   Use token info command to validate
   ```

## Development

### Project Structure
```
jupiter-swap-agent/
├── main.py                      # Main agent script
├── jupiter_swap_tool.py         # Jupiter swap functionality
├── delegated_wallet_manager.py  # Wallet delegation interface
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment template
└── README.md                    # This file
```

### Adding New Features

1. **New Tools**: Add tool functions in `main.py` with `@tool` decorator
2. **Token Support**: Extend token mint mapping in `jupiter_swap_tool.py`
3. **Policy Features**: Add new validation in `delegated_wallet_manager.py`

### Testing

Run manual tests with small amounts:

```python
# Test wallet connection
wallet_manager.health_check()

# Test balance fetch
balance = wallet_manager.get_sol_balance()

# Test price fetch
price = jupiter_tool.get_token_price("SOL")
```

## Security Considerations

- **API Key Security**: Never commit API keys to version control
- **Policy Compliance**: All trades are subject to Turnkey policies
- **Rate Limiting**: Respect Jupiter API rate limits
- **Small Test Amounts**: Test with small amounts first
- **Monitor Transactions**: Review all transactions on Solscan

## Troubleshooting

### Debug Mode

Enable detailed logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Health Checks

Verify all systems:

```bash
# Check wallet service
curl http://localhost:3000/api/health

# Check balance
curl -H "X-API-Key: your-key" \
     http://localhost:3000/api/wallet/balance/[wallet-address]
```

### Support

For issues:
1. Check the wallet delegation service logs
2. Verify environment configuration
3. Test with the demo interface first
4. Review Turnkey policy settings

## License

This project is part of the Go-Arlo trading system and follows the same licensing terms.