# Solana Wallet with Delegated Access

A secure Solana wallet implementation featuring policy-based delegated access control using Turnkey infrastructure. This demo showcases how to create sub-organizations with restricted user permissions, enabling automated trading bots and services to operate within defined security boundaries.

## 🎯 Demo Overview

This application demonstrates:
- **Sub-Organization Isolation**: Each wallet in its own isolated sub-organization
- **Policy-Based Access Control**: Granular permissions with transaction limits
- **Delegated User Management**: Backend services with restricted access
- **Root Quorum Control**: End users maintain ultimate administrative control

## 📋 Prerequisites

### 1. Turnkey Account Setup

1. **Create Turnkey Account**
   - Visit [https://app.turnkey.com](https://app.turnkey.com)
   - Sign up and verify your email address

2. **Create Organization**
   - Click "Create Organization"
   - Name: "Solana Wallet Demo Org" (or any name)
   - Type: "Development"
   - **Save the Organization ID** - you'll need this

3. **Generate API Keys**
   - Navigate to Settings → API Keys
   - Click "Generate New API Key"
   - Algorithm: **P-256**
   - **Save both public and private keys securely**

### 2. Development Environment

Ensure you have:
- **Node.js 16.x or higher**
- **npm or yarn**

## 🚀 Setup Instructions

### 1. Clone and Install

```bash
cd solana-wallet-delegation

# Install dependencies
npm install
```

### 2. Environment Configuration

Create your environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Turnkey credentials:

```env
# Turnkey API Configuration
TURNKEY_API_PUBLIC_KEY=your_public_key_here
TURNKEY_API_PRIVATE_KEY=your_private_key_here
NEXT_PUBLIC_TURNKEY_API_BASE_URL=https://api.turnkey.com
NEXT_PUBLIC_ORGANIZATION_ID=your_organization_id_here

# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Authentication Settings
NEXT_PUBLIC_RPID=localhost
NEXT_PUBLIC_SESSION_DURATION=900000

# Optional OAuth (not required for demo)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=optional_for_basic_testing
```

### 3. Verify Configuration

Before running the demo, ensure you have:
- ✅ Created a Turnkey account at [https://app.turnkey.com](https://app.turnkey.com)
- ✅ Generated P-256 API keys in your Turnkey dashboard
- ✅ Added `TURNKEY_API_PUBLIC_KEY` and `TURNKEY_API_PRIVATE_KEY` to `.env.local`
- ✅ Added your `NEXT_PUBLIC_ORGANIZATION_ID` to `.env.local`

### 4. Start the Application

```bash
# Run development server
npm run dev

# Open in browser
open http://localhost:3000
```

## 🎮 Running the Demo

### Step 1: Access the Demo

1. Navigate to [http://localhost:3000]
2. Click the **"Delegated Access Demo"** button
3. You'll be taken to the delegated access configuration page

### Step 2: Create Sub-Organization & Delegated User

Fill out the form with these recommended values:

| Field | Recommended Value | Purpose |
|-------|------------------|---------|
| **Organization Name** | "Trading Bot Demo Org" | Name for your sub-organization |
| **End User Email** | your-email@example.com | The user who maintains full control |
| **Delegated User API Public Key** | [Your P-256 Public Key] | Backend service authentication key |

**Account Configuration:**
- ✅ **Enable Trading Account** - For active trading operations
- ✅ **Enable Long-term Storage Account** - For secure asset storage

**What Happens:**
1. Creates an isolated sub-organization
2. Sets up end user with email authentication
3. Creates delegated user with API key authentication
4. Generates Solana wallet with both account types
5. Prepares for policy configuration

Click **"Create Sub-Organization with Delegated Access"**

### Step 3: Configure Delegated Access Policy

After creating the sub-organization, you'll be taken to the policy configuration page (or navigate there manually with the Organization ID, Delegated User ID, and End User ID).

#### Organization & User IDs
These are auto-populated if coming from Step 2:
- **Organization ID**: Sub-organization ID from previous step
- **Delegated User ID**: ID of the delegated user
- **End User ID**: ID of the end user (optional, for root quorum update)

#### Allowed Addresses
The **long-term storage address is automatically loaded** when you enter the Organization ID.

You can manage addresses:
- **Default**: Long-term storage address is pre-added
- **Add More**: Click the input field, paste a Solana address, and click "Add"
- **Remove**: Click "Remove" on any address (including the default)

Example additional addresses:
```
11111111111111111111111111111112
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8
```

#### Transaction Restrictions
- **Max Transaction Amount**: `1000000` lamports (0.001 SOL) - Adjust as needed
- **Max Instructions per Transaction**: `5` - Limits complexity of transactions

#### Root Quorum Update
- ✅ **Automatically update root quorum to exclude delegated user**
  - When enabled, removes delegated user from administrative actions
  - Only end user retains full organizational control

### Step 4: Create the Policy

1. Review your configuration
2. Click **"Create Delegated Access Policy"**
3. The system will:
   - Create a restrictive policy for the delegated user
   - Configure allowed addresses, amount limits, and instruction limits
   - Optionally update root quorum to exclude delegated user
   - Apply the policy to the sub-organization

### Step 5: Verify the Results

After successful creation, you'll see:

#### Policy Details
- **Policy ID**: Unique identifier for the policy
- **Policy Name**: "Delegated Access - Limited Transaction Policy"
- **Effect**: ALLOW
- **Consensus Rule**: Only the delegated user can use this policy
- **Condition**: Full policy condition showing all restrictions

#### Configuration Summary
- ✅ All allowed recipient addresses
- ✅ Transaction amount limit enforced
- ✅ Instruction count limit applied
- ✅ Root quorum updated (if enabled)

#### Next Steps
- Test the policy by attempting transactions with delegated user credentials
- Monitor transaction attempts in the Turnkey dashboard
- Verify restrictions are enforced correctly

## 🔍 Understanding the Demo

### What This Accomplishes

1. **Isolation**: Each setup creates a completely isolated sub-organization
2. **Dual Access**: Two types of users with different permission levels:
   - **End User**: Full administrative control via email/passkey authentication
   - **Delegated User**: Limited access via API key (P-256) authentication
3. **Flexible Address Management**: 
   - Long-term storage address automatically configured
   - Add multiple whitelisted recipient addresses
   - Remove or modify addresses as needed
4. **Policy Enforcement**: Delegated user can only:
   - Send SPL tokens to whitelisted addresses
   - Stay within per-transaction amount limits
   - Execute transactions with limited instruction count
5. **Security**: 
   - Delegated user excluded from root quorum
   - Cannot escalate own privileges
   - All transactions validated against policy conditions

### Two-Stage Process

**Stage 1: Sub-Organization Setup**
- Creates isolated sub-organization
- Establishes end user with full control
- Creates delegated user with API key
- Generates Solana wallet with multiple accounts

**Stage 2: Policy Configuration**
- Define allowed recipient addresses
- Set transaction amount limits
- Configure instruction count limits
- Update root quorum for security

### Real-World Applications

- **Trading Bots**: Automated trading with spending limits and address restrictions
- **Payment Processors**: Restricted vendor payments with multiple approved recipients
- **Custodial Services**: Automated withdrawals to verified addresses only
- **DeFi Protocols**: Programmatic distributions with safety guardrails
- **Gaming Platforms**: Automated rewards with anti-abuse controls
- **Corporate Treasury**: Multi-recipient payments within policy boundaries

## 🔧 Key Features Demonstrated

| Feature | How It Works | Benefit |
|---------|--------------|---------|
| **Sub-Organization Isolation** | Each wallet in separate Turnkey sub-organization | Complete separation of assets and permissions |
| **Dynamic Address Management** | Add/remove whitelisted addresses via UI | Flexible recipient management without code changes |
| **Auto-configured Storage** | Long-term storage address automatically added | Seamless setup with secure default configuration |
| **Amount Limits** | Per-transaction maximum enforced in policy | Caps potential losses from compromised delegation |
| **Instruction Limits** | Maximum instructions per transaction | Prevents complex attack vectors |
| **SPL Token Transfers** | Policy restricted to SPL token operations | Focused permissions for token transfers |
| **Root Quorum Exclusion** | Delegated user removed from admin quorum | Cannot escalate own privileges or modify policies |
| **Two-Stage Setup** | Separate org creation and policy configuration | Clear separation of concerns and flexibility |

## 🔐 Security Notes

- **Private keys never leave Turnkey**: All signing happens in Turnkey's secure infrastructure
- **API key authentication**: Delegated users authenticate with P-256 keys
- **Policy enforcement**: Every transaction validated against defined policies before execution
- **Whitelist-based access**: Only pre-approved addresses can receive transfers
- **Amount and complexity limits**: Both transaction amount and instruction count restricted
- **Root quorum protection**: Delegated users cannot modify organizational settings
- **Audit trails**: All actions logged in Turnkey for compliance and monitoring
- **Isolated sub-organizations**: Complete separation between different wallet setups

## 🛠️ Technical Details

### Policy Structure

The delegated access policy is created with:

```javascript
{
  effect: "EFFECT_ALLOW",
  consensus: "approvers.any(user, user.id == '<delegated_user_id>')",
  condition: `
    solana.tx.instructions.count() <= <instruction_limit> &&
    solana.tx.spl_transfers.any(transfer,
      (transfer.to == '<address1>' || transfer.to == '<address2>' || ...) &&
      transfer.amount <= <max_amount>
    )
  `
}
```

### API Endpoints

- **POST** `/api/wallet/create-delegated` - Creates sub-org with delegated user
- **POST** `/api/policy/create-delegated` - Creates restrictive policy
- **GET** `/api/wallet/get-storage-address` - Fetches long-term storage address

### Key Components

- **PolicyService**: Manages policy creation and condition building
- **WalletService**: Handles wallet and sub-organization operations
- **Dynamic UI**: React-based forms with real-time validation

## 📝 Troubleshooting

### Common Issues

**Issue**: "Authentication failed" or "Invalid API credentials"
- **Solution**: Verify you have created a Turnkey account and generated P-256 API keys
- **Solution**: Ensure `TURNKEY_API_PUBLIC_KEY` and `TURNKEY_API_PRIVATE_KEY` are correctly set in `.env.local`
- **Solution**: Confirm your `NEXT_PUBLIC_ORGANIZATION_ID` matches your Turnkey organization

**Issue**: Cannot create sub-organization
- **Solution**: You must have a valid Turnkey account with API keys configured
- **Solution**: Check that your Turnkey API keys are correctly configured in `.env.local`
- **Solution**: Verify your parent organization ID is correct

**Issue**: "Long-term storage address not found"
- **Solution**: Ensure you enabled "Long-term Storage Account" during sub-org creation

**Issue**: "At least one allowed address must be provided"
- **Solution**: Add at least one recipient address in the policy configuration

**Issue**: Policy creation fails
- **Solution**: Verify all required fields (Sub-organization ID, Delegated User ID) are filled
