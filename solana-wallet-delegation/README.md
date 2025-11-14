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
# Clone the repository
git clone [repository-url]
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

### 3. Start the Application

```bash
# Run development server
npm run dev

# Open in browser
open http://localhost:3000
```

## 🎮 Running the Demo

### Step 1: Access the Demo

1. Navigate to [http://localhost:3000](http://localhost:3000)
2. Click the blue **"Start Demo"** button
3. You'll be taken to the delegated access configuration page

### Step 2: Configure Sub-Organization

Fill out the first section with these recommended values:

| Field | Recommended Value | Purpose |
|-------|------------------|---------|
| **Organization Name** | "DeFi Trading Service" | Name for your sub-organization |
| **End User Email** | your-email@example.com | The user who maintains full control |
| **Delegated User API Public Key** | [Your API Public Key] | Backend service authentication |

**Enable both account types:**
- ✅ **Enable Trading Account**
- ✅ **Enable Long-term Storage Account**

### Step 3: Configure Access Policy

Set up transaction restrictions in the second section:

#### Allowed Addresses (Recipient Whitelist)
Add multiple addresses to demonstrate flexible recipient management:

```
11111111111111111111111111111112
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8
```

#### Transaction Limits
- **Max Transaction Amount**: `100000000` (0.1 SOL in lamports)
- **Max Instructions**: `5` (default)

#### Allowed Programs
These are pre-populated:
- **TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA** (SPL Token Program)
- **11111111111111111111111111111111** (System Program)

### Step 4: Create the Setup

1. Click **"Create Sub-Organization with Delegated Access"**
2. Watch the progress as the system:
   - Creates a sub-organization
   - Adds two root users (end user + delegated user)
   - Creates a wallet with trading and storage accounts
   - Applies restrictive policy to delegated user
   - Updates root quorum (removes delegated user from admin actions)

### Step 5: Verify the Results

After creation, you'll see confirmation of:

- **Organization Details**: Sub-organization ID and wallet ID
- **User Configuration**: Both end user and delegated user IDs
- **Policy Details**: The restrictive policy with conditions
- **Root Quorum Status**: Updated to exclude delegated user

## 🔍 Understanding the Demo

### What This Accomplishes

1. **Isolation**: Each setup creates a completely isolated sub-organization
2. **Dual Access**: Two types of users with different permission levels:
   - **End User**: Full administrative control via email authentication
   - **Delegated User**: Limited access via API key authentication
3. **Policy Enforcement**: Delegated user can only:
   - Send to whitelisted addresses
   - Stay within transaction amount limits
   - Use approved Solana programs
4. **Security**: Delegated user cannot modify their own permissions

### Real-World Applications

- **DeFi Trading Bots**: Automated trading with spending limits
- **Corporate Treasury**: Restricted vendor payments and payroll
- **Gaming Platforms**: Automated rewards with anti-abuse controls
- **DAO Operations**: Programmatic distributions with community oversight

## 🔧 Key Features Demonstrated

| Feature | How It Works | Benefit |
|---------|--------------|---------|
| **Sub-Organization Isolation** | Each wallet in separate Turnkey organization | Complete separation of assets and permissions |
| **Multiple Address Whitelisting** | Policy allows sends to any of multiple addresses | Operational flexibility for different recipients |
| **Amount Limits** | Per-transaction maximum enforced | Caps potential losses from compromised delegation |
| **Program Restrictions** | Only specific Solana programs allowed | Prevents unauthorized contract interactions |
| **Root Quorum Exclusion** | Delegated user removed from admin quorum | Cannot escalate own privileges |

## 🧪 Testing the Setup

After running the demo, you can:

1. **View on Solana Explorer**: Click the provided links to see accounts on devnet
2. **Test Different Configurations**: Run the demo again with different parameters
3. **Modify Restrictions**: Try different amount limits and address combinations

## 🔐 Security Notes

- **Private keys never leave Turnkey**: All signing happens in Turnkey's secure infrastructure
- **Unextractable session keys**: Browser-based keys cannot be exported
- **Policy enforcement**: Every transaction validated against defined policies
- **Audit trails**: All actions logged for compliance and monitoring
