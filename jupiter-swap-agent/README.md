# Jupiter Swap Agent

An AI-powered agent that executes Jupiter swaps on Solana using a delegated wallet managed by Turnkey. The agent provides a conversational interface for performing secure, policy-enforced token swaps.

## Features

- 🤖 **AI-Powered Trading**: Natural language interface for executing swaps
- 🔐 **Delegated Wallet Security**: Uses Turnkey's secure wallet delegation
- 📏 **Policy Enforcement**: Automatic compliance with spending limits and restrictions
- 🔄 **Jupiter Integration**: Direct access to Solana's premier DEX aggregator
- 📊 **Real-time Pricing**: Live token prices from Jupiter Price API
- 💰 **Balance Management**: Check SOL and token balances directly from Solana
- 🔍 **Token Information**: Get detailed token metadata
- 🚀 **Self-Contained**: No external services required after initial setup

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   AI Agent      │         │  Turnkey API     │
│                 │◄────────►│                  │
│ - LangGraph     │         │ - Transaction    │
│ - Claude LLM    │         │   Signing        │
│ - Tool Calling  │         │ - API Keys       │
└─────────────────┘         └──────────────────┘
        │
        │
        ▼
┌─────────────────┐         ┌──────────────────┐
│  Jupiter API    │         │   Solana RPC     │
│                 │         │                  │
│ - Swap Quotes   │         │ - Balance Check  │
│ - Routing       │         │ - Transaction    │
│ - Price Feed    │         │   Submission     │
└─────────────────┘         └──────────────────┘
```

The agent is completely self-contained and interacts directly with:
- **Turnkey API**: For transaction signing and API key management
- **Jupiter API**: For swap quotes and routing
- **Solana RPC**: For balance checks and transaction submission

## Prerequisites

### 1. Delegated Wallet Setup (One-time)

If you don't already have a delegated wallet, use the wallet delegation demo to create one:

```bash
# Only needed for initial setup
cd ../solana-wallet-delegation
npm run dev
# Navigate to http://localhost:3000/demo
```

Complete the one-time setup:
1. Create a sub-organization (if needed)
2. Create a delegated user
3. Configure policies
4. Note the delegated wallet address and user ID

**After initial setup, the wallet delegation service is no longer needed.**

### 2. Turnkey API Keys

Generate P256 key pair for Turnkey API authentication:

```bash
python generate_api_keys.py --setup
```

This will:
- Generate a P256 (secp256r1) key pair
- Display the keys for your `.env` file
- Optionally append them to your `.env` file
- Create API keys directly in Turnkey (with `--setup` flag)

**Note**: You need main organization API keys to create delegated user API keys. Ensure you have both main and delegated API keys configured in your `.env` file.

### 3. Environment Setup

Create and configure your `.env` file:

```bash
cp .env.example .env
# Edit .env with your values
```

### 4. Python Environment

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

   Note: The `cryptography` library is required for P256 key operations with Turnkey.

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

## Configuration

### Environment Variables

#### Required Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key for the LLM agent |
| `DELEGATED_WALLET_ADDRESS` | Public key of delegated wallet from Turnkey |
| `TURNKEY_ORGANIZATION_ID` | Your Turnkey organization ID |

#### API Key Configuration (Required for Automated Signing)

| Variable | Description |
|----------|-------------|
| `TURNKEY_API_PUBLIC_KEY` | P256 public key (hex) for delegated user API access |
| `TURNKEY_API_PRIVATE_KEY` | P256 private key (hex) for delegated user API access |
| `MAIN_TURNKEY_API_PUBLIC_KEY` | Main organization P256 public key (hex) |
| `MAIN_TURNKEY_API_PRIVATE_KEY` | Main organization P256 private key (hex) |
| `MAIN_ORGANIZATION` | Main Turnkey organization ID |
| `DELEGATED_USER_ID` | Turnkey delegated user ID |

#### Optional Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `TURNKEY_API_BASE_URL` | Turnkey API endpoint | `https://api.turnkey.com` |
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.mainnet-beta.solana.com` |

### Setting Up Delegated User Access

1. **First-time Setup**: If you haven't created a delegated user yet:
   ```bash
   # Use the wallet delegation demo (one-time only)
   cd ../solana-wallet-delegation
   npm run dev
   open http://localhost:3000/demo

   # Complete "Create Delegated Access"
   # Note down the User ID and Wallet Address
   # Stop the service after setup - it's no longer needed
   ```

2. **Configure API Keys**: Generate keys and create them in Turnkey:
   ```bash
   # Generate P256 keys and create API keys in Turnkey
   python generate_api_keys.py --setup --user-id your-user-id

   # Or if you have DELEGATED_USER_ID in .env:
   python generate_api_keys.py --setup
   ```

3. **Test Configuration**:
   ```bash
   # Test delegated user authentication
   python test_updated_wallet_manager.py

   # Should show successful authentication and balance
   ```

4. **Verify Complete Setup**:
   ```bash
   # Start the agent and verify everything works
   python main.py

   # In the agent chat:
   You: check balance
   ```

## Usage

### Starting the Agent

```bash
# Ensure virtual environment is activated (if using one)
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the agent
python main.py
```

The agent will:
1. Validate environment configuration
2. Check Turnkey and Solana RPC connectivity
3. Display current wallet balance
4. Start the interactive chat interface
5. Show warnings if API keys are not configured

**Note**: The agent is fully self-contained and does not require the wallet delegation service to be running.

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

#### 🛠️ Control & Configuration
- `diagnose` - Check wallet and configuration status
- `help` - Show available commands
- `exit` - Quit the agent

**Note**: API keys should be configured using `generate_api_keys.py --setup` before starting the agent.

### Natural Language Interface

The agent understands natural language requests:

```
You: I want to swap 5 dollars of SOL for BONK tokens
You: swap 0.01 SOL for BONK
You: swap 1000 BONK for SOL
You: Show me the current price of Jupiter token
You: Can you check how much SOL I have?
You: Get information about this token: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
You: Diagnose my wallet configuration
```

### API Key Management

#### Setting Up API Keys for Automated Signing

API keys should be configured before starting the agent:

```bash
# Generate keys and create them in Turnkey
python generate_api_keys.py --setup

# Expected output:
✅ API keys successfully created for user!
User ID: user_xyz123...
Activity ID: act_abc456...
Status: Completed

The delegated user now has API access for automated transaction signing.
```

#### Troubleshooting API Key Issues

If you encounter issues:

1. **Missing Turnkey Credentials**:
   ```bash
   # Generate new P256 keys
   python generate_api_keys.py
   ```

2. **Missing User ID**:
   - Check Turnkey dashboard for existing user ID
   - Or create new delegated user via demo interface

3. **Test Setup**:
   ```bash
   # Test the complete setup
   python test_updated_wallet_manager.py

   # Should show successful authentication and balance check
   ```

## Automated Transaction Signing

The agent can automatically sign transactions using the delegated wallet through Turnkey's API. This enables:

- **Fully Automated Swaps**: No manual intervention needed
- **API-based Authentication**: Secure P256 signature scheme
- **Non-expiring Access**: API keys created without expiration for continuous operation
- **Policy Compliance**: All transactions respect configured policies

### How It Works

1. **API Key Creation**: The agent creates API keys for the delegated user
2. **Request Stamping**: Each API request is signed with your P256 private key
3. **Transaction Signing**: Turnkey signs transactions on behalf of the delegated wallet
4. **Execution**: Signed transactions are submitted to Solana network

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

## Troubleshooting

### Common Issues and Solutions

#### 1. Authentication Failed / Invalid Signature

**Error**: `authentication failed: could not verify api key signature`

**Solution**:
- Ensure you're using the correct signature format (official Turnkey SDK approach)
- Verify your API keys are properly configured in `.env`
- Regenerate API keys using `generate_api_keys.py`
- Make sure you have both main organization and delegated user API keys

#### 2. API Key Creation Failed

**Error**: Issues creating API keys for delegated user

**Solution**:
- Verify you have main organization API keys configured
- Check that `MAIN_ORGANIZATION` environment variable is set
- Use main organization credentials to create sub-organization API keys
- Run: `python test_main_keys.py` to test main org authentication

#### 3. Transaction Encoding Errors

**Error**: `failed to decode Solana transaction: encoding/hex: invalid byte`

**Solution**:
- This is automatically handled in the updated implementation
- Jupiter returns base64 transactions, Turnkey expects hex
- The agent now properly converts between formats

#### 4. Virtual Environment Issues

**Error**: `ModuleNotFoundError` when running the agent

**Solution**:
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies with correct versions
pip install -r requirements.txt
```

#### 5. Wallet Balance Shows 0

**Possible Causes**:
- Wrong wallet address in configuration
- Network connectivity issues
- Wrong Solana RPC endpoint

**Solution**:
```bash
# Test wallet manager directly
python test_updated_wallet_manager.py

# Check wallet address and network in .env file
```

### Testing Your Setup

#### Complete System Test

```bash
# 1. Test main organization authentication
python test_main_keys.py

# 2. Test delegated user authentication and balance
python test_updated_wallet_manager.py

# 3. Test Jupiter API connectivity
python test_jupiter_response.py

# 4. Run the complete agent
python main.py
```

#### Expected Output for Working Setup

```
🧪 Testing delegated user authentication with updated WalletManager...
✅ Delegated user authentication successful!

🔄 Testing Jupiter swap functionality...
✅ Jupiter swap successful!
Transaction hash: [hash]
```

### Performance Notes

- **Initial Startup**: ~2-3 seconds to validate connections
- **Swap Execution**: ~5-10 seconds including quote, signing, and submission
- **Balance Checks**: ~1-2 seconds
- **Price Queries**: ~1 second

### Security Considerations

- API keys are stored locally in `.env` file
- Private keys never leave your machine
- All transactions are signed by Turnkey's secure infrastructure
- Policy enforcement happens at the Turnkey level
- No sensitive data is transmitted to Jupiter or other external services
