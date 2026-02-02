# Go Arlo Wallet - Delegated Wallet Infrastructure with Turnkey

A comprehensive solution for secure, policy-controlled wallet delegation on Solana using Turnkey's infrastructure. This repository demonstrates how to implement delegated wallet management with restrictive policies and automated trading capabilities through an AI-powered Jupiter swap agent.

## Overview

Go Arlo Wallet provides a wallet delegation implementation that enables:

- **Secure Sub-Organization Management**: Create isolated wallet environments with granular access control
- **Policy-Based Restrictions**: Implement spending limits, token allowlists, and risk thresholds
- **Automated Trading**: AI agent that executes Jupiter swaps while respecting configured policies
- **Security**: Private keys managed by Turnkey's secure infrastructure

## Architecture

### 1. Solana Wallet Delegation (`/solana-wallet-delegation`)
A Next.js application that provides:
- Sub-organization creation and management
- Delegated user creation with customizable policies
- Policy templates for common use cases (spending limits, token restrictions)
- RESTful APIs for wallet operations
- Demo interfaces for testing delegation flows

### 2. Jupiter Swap Agent (`/jupiter-swap-agent`)
An AI-powered Python agent that:
- Executes token swaps through Jupiter's DEX aggregator
- Enforces wallet policies automatically
- Provides natural language interface for trading
- Integrates directly with Turnkey for transaction signing

## Key Features

### Delegated User & Wallet Creation
- Create sub-organizations with isolated access control
- Generate delegated users with specific permissions
- Implement wallet addresses tied to policy enforcement
- Non-expiring API key authentication using P256 cryptography

### Policy Enforcement
- **Spending Limits**: Daily and per-transaction limits
- **Token Allowlists**: Restrict trading to approved tokens only
- **Risk Controls**: Automatic rejection of high-risk operations
- **Time-Based Restrictions**: Configure trading windows

### Policy Management
Policies can be created via the web interface and updated programmatically:

```bash
cd jupiter-swap-agent

# Set required environment variables
export POLICY_ID="your-policy-id"
export DELEGATED_USER_ID="your-user-id"
export TRANSFER_ADDRESS_1="allowed-address-1"
export TRANSFER_ADDRESS_2="allowed-address-2"
export TRANSFER_AMOUNT="1000000000"  # In lamports

# Update the policy
python update_policy_script.py
```

### Security Model
- Private keys never leave Turnkey's secure infrastructure
- API authentication using P256 signature scheme
- Policy enforcement at the infrastructure level
- Complete audit trail of all operations

## Prerequisites

- Node.js 24+ for the wallet delegation service
- Python 3.13+ for the Jupiter swap agent
- Turnkey account with API access
- Anthropic API key for the AI agent (or other preferred model)
- Solana wallet with SOL for transaction fees

## Quick Start

### Step 1: Set Up Wallet Delegation

```bash
cd solana-wallet-delegation
npm install
cp .env.example .env
# Configure your Turnkey credentials in .env
npm run dev
```

Navigate to `http://localhost:3000/demo` to create your first delegated wallet.

### Step 2: Configure Jupiter Swap Agent

```bash
cd ../jupiter-swap-agent
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Configure your API keys in .env
```

### Step 3: Generate API Keys

```bash
# Generate P256 keys for API authentication
python generate_api_keys.py --setup

# Or non-interactive mode for scripting
python generate_api_keys.py --setup --non-interactive
```

### Step 4: Test the Integration

```bash
# Start the AI agent
python main.py

# Try a test command
> check balance
```

## Project Structure

```
go-arlo-wallet/
├── solana-wallet-delegation/    # Next.js delegation service
│   ├── app/                     # Application routes and UI
│   ├── services/                # Core business logic
│   │   ├── policy/             # Policy management
│   │   └── wallet/             # Wallet operations
│   └── README.md               # Detailed setup guide
│
├── jupiter-swap-agent/          # Python AI trading agent
│   ├── wallet_manager.py       # Turnkey wallet integration
│   ├── main.py                 # Agent entry point
│   ├── generate_api_keys.py    # API key management
│   ├── update_policy_script.py # Policy updates after creation
│   ├── upload_jupiter_idl.py   # Upload Jupiter IDL to Turnkey
│   └── README.md               # Agent documentation
│
└── README.md                    # This file
```

## Dependencies

### Wallet Delegation Service
- **Next.js 15**: React framework for the web interface
- **TypeScript**: Type-safe development
- **Turnkey SDK**: Wallet infrastructure integration
- **Solana Web3.js**: Blockchain interactions

### Jupiter Swap Agent
- **LangGraph**: Agent orchestration framework
- **Anthropic Claude**: LLM for natural language processing
- **Turnkey Python SDK**: Transaction signing
- **Jupiter API**: DEX aggregation

## Environment Configuration

Both components require environment configuration. See the respective README files for detailed setup:

- [Wallet Delegation Setup](/solana-wallet-delegation/README.md)
- [Jupiter Agent Setup](/jupiter-swap-agent/README.md)

## Security Considerations

- All private keys are managed by Turnkey's secure infrastructure
- API keys should be stored securely and never committed to version control
- Policy enforcement happens at the infrastructure level, not in client code
- Regular security audits are recommended for production deployments
- **NOTE** The Jupiter Swap Agent is for demonstration purposes only in utilizing the delegated wallet. TRADE AT YOUR OWN RISK.

## Use Cases

This infrastructure is ideal for:
- **Trading Firms**: Delegated trading with risk controls
- **DAOs**: Treasury management with spending limits
- **DeFi Protocols**: Automated strategies with safety constraints
- **Institutional Custody**: Multi-signature and policy-based access

## Contributing

Contributions are welcome! Please ensure:
- Tests pass for all changes
- Documentation is updated as needed
- Security best practices are followed

## Support

For detailed documentation, refer to:
- [Wallet Delegation Documentation](/solana-wallet-delegation/README.md)
- [Jupiter Agent Documentation](/jupiter-swap-agent/README.md)
