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
A Next.js application with three core services:

**WalletService** — Sub-organization and wallet lifecycle management:
- Create isolated sub-organizations with dual root users (delegated + end user)
- Multi-account wallets (TRADING and LONG_TERM_STORAGE)
- Wallet import/export with encryption and BIP32 account derivation
- Balance querying via Solana RPC

**PolicyService** — Granular transaction policy creation and enforcement:
- 15+ policy templates for common and advanced use cases
- CRUD operations for managing policies on Turnkey
- Composable condition expressions evaluated at the signing layer

**DelegationService** — Agent delegation lifecycle management:
- Process and approve delegation requests from agents
- Permission-scoped access (TRANSFER, SWAP, STAKE, MINT_NFT)
- Quota tracking, expiration enforcement, and emergency revocation

### 2. Jupiter Swap Agent (`/jupiter-swap-agent`)
An AI-powered Python agent that:
- Executes token swaps through Jupiter's DEX aggregator
- Enforces wallet policies automatically at the Turnkey signing layer
- Provides natural language interface for trading via LangGraph + Claude
- Integrates directly with Turnkey for transaction signing

## Key Features

### Delegated User & Wallet Creation
- Create sub-organizations with isolated access control
- Generate delegated users with specific permissions
- Implement wallet addresses tied to policy enforcement
- Non-expiring API key authentication using P256 cryptography

### Policy Enforcement
Policies are enforced at the cryptographic signing layer through Turnkey — not in
application code. Available policy types include:

- **Admin Access**: Unrestricted access for admin-tagged users
- **Trader**: Instruction-limited trading with per-transaction spend caps
- **Deposit Only**: Restrict to deposits into long-term storage
- **Deny Arbitrary Transfers**: Block transfers to non-whitelisted addresses
- **SPL Token Transfer**: Restrict by token mint, recipient, and amount
- **Delegated Access**: Multi-address whitelisting with amount and instruction limits
- **Jupiter Swap**: DEX interaction with configurable instruction counts
- **Program Restriction**: Limit transactions to specific Solana programs
- **Time-Bound**: Policies that auto-expire at a given timestamp
- **Quota**: Daily and weekly spending limits
- **NFT Mint**: Collection-scoped minting restrictions
- **Full Access**: Unrestricted access for a delegated user (use with caution)
- **Emergency Freeze**: Deny-all policy for emergency situations

Deny policies always take precedence — if any `EFFECT_DENY` policy matches, the
transaction is rejected regardless of allow policies.

### Delegation Management
Agents receive scoped credentials — not open keys. The DelegationService handles:
- **Agent Verification**: Validate agent identity before granting access
- **Scoped Permissions**: Grant only the actions an agent needs (TRANSFER, SWAP, etc.)
- **Quota Tracking**: Monitor daily/weekly/monthly usage against limits
- **Revocation**: Revoke individual delegations or use the emergency kill-switch
- **Auto-Expiry**: Delegations expire automatically based on configured duration

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

#### Jupiter IDL Upload
To enable instruction-level policy parsing for Jupiter swaps, upload the Jupiter
program IDL to Turnkey:

```bash
cd jupiter-swap-agent
python upload_jupiter_idl.py
```

This allows policies to reference parsed instruction data (e.g., `instruction_name == 'route'`)
rather than raw bytes.

### API Endpoints
The delegation service exposes the following REST APIs:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/wallet/create-delegated` | Create sub-org with delegated user |
| GET | `/api/wallet/get-storage-address` | Fetch long-term storage address |
| POST | `/api/policy/create-delegated` | Create delegated access policy |
| POST | `/api/policy/create-jupiter` | Create Jupiter swap policy |
| POST | `/api/policy/manage` | List, update, or delete policies |
| POST | `/api/smart-contract/upload-idl` | Upload program IDL to Turnkey |

### Security Model
- Private keys never leave Turnkey's secure infrastructure
- API authentication using P256 signature scheme
- Policy enforcement at the cryptographic signing layer, not in application code
- Deny policies always override allow policies (explicit deny precedence)
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
│   ├── app/
│   │   ├── api/
│   │   │   ├── wallet/         # Wallet creation & query endpoints
│   │   │   ├── policy/         # Policy CRUD & Jupiter endpoints
│   │   │   └── smart-contract/ # IDL upload endpoint
│   │   ├── demo/
│   │   │   ├── delegated-access/   # Sub-org & user creation demo
│   │   │   └── delegated-policy/   # Policy configuration demo
│   │   └── admin/
│   │       └── policy/         # Policy management interface
│   ├── services/
│   │   ├── policy/             # PolicyService - 15+ policy templates
│   │   ├── wallet/             # WalletService & SubOrganizationManager
│   │   ├── delegation/         # DelegationService - agent lifecycle
│   │   └── auth/               # SessionManager
│   └── README.md
│
├── jupiter-swap-agent/          # Python AI trading agent
│   ├── main.py                 # LangGraph agent entry point
│   ├── wallet_manager.py       # Turnkey wallet integration
│   ├── jupiter_swap_tool.py    # Jupiter DEX interaction
│   ├── generate_api_keys.py    # P256 API key management
│   ├── update_policy_script.py # Policy updates after creation
│   ├── upload_jupiter_idl.py   # Upload Jupiter IDL to Turnkey
│   ├── idl.json                # Jupiter program IDL
│   └── README.md
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
