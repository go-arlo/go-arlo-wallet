# PRP: Solana Wallet with Advanced Delegation

## Mission
Implement an embedded Solana wallet powered by Turnkey with advanced delegation capabilities, sub-organization isolation, and comprehensive policy management for trading and long-term storage accounts.

## Context & Research

### Documentation Resources
- [Turnkey Overview](https://docs.turnkey.com/concepts/overview)
- [Turnkey Wallets](https://docs.turnkey.com/concepts/wallets)
- [Turnkey React SDK](https://docs.turnkey.com/sdks/react/getting-started)
- [Embedded Wallets Overview](https://docs.turnkey.com/embedded-wallets/overview)
- [Production Checklist](https://docs.turnkey.com/production-checklist/embedded-wallet)
- [Policies Overview](https://docs.turnkey.com/concepts/policies/overview)
- [Delegated Access](https://docs.turnkey.com/concepts/policies/delegated-access)
- [Access Control Examples](https://docs.turnkey.com/concepts/policies/examples/access-control)
- [Signing Control Examples](https://docs.turnkey.com/concepts/policies/examples/signing-control)
- [Solana Policy Examples](https://docs.turnkey.com/concepts/policies/examples/solana)

### Reference Examples
- `examples/sdk/examples/with-solana/` - Solana wallet implementation patterns
- `examples/demo-ewk/` - Embedded wallet kit with auth components
- `examples/sdk/examples/with-indexed-db/` - IndexedDB session storage patterns
- `examples/sdk/examples/trading-runner/` - Trading/long-term storage account patterns
- `examples/react-native-demo-wallet/` - Mobile wallet patterns

## Architecture Blueprint

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Parent Organization                     │
│                     (Read-only Visibility)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
┌───────▼──────────┐           ┌───────────▼──────────┐
│ Sub-Organization │           │  Sub-Organization    │
│   (Wallet 1)     │           │    (Wallet 2)        │
│                  │           │                      │
│ ┌──────────────┐ │           │ ┌──────────────────┐ │
│ │Trading Acct  │ │           │ │Trading Account   │ │
│ │(m/44'/501'   │ │           │ │(m/44'/501'/0'/0')│ │
│ │ /0'/0')      │ │           │ └──────────────────┘ │
│ └──────────────┘ │           │ ┌──────────────────┐ │
│ ┌──────────────┐ │           │ │Long-Term Storage │ │
│ │Long-Term     │ │           │ │(m/44'/501'/0'/1')│ │
│ │Storage       │ │           │ └──────────────────┘ │
│ │(m/44'/501'   │ │           │                      │
│ │ /0'/1')      │ │           │ Users:               │
│ └──────────────┘ │           │ - Owner (root)       │
│                  │           │ - Trader (delegated) │
│ Users:           │           │ - Agent (delegated)  │
│ - Owner (root)   │           └──────────────────────┘
│ - Admin (root)   │
│ - Trader (tag)   │
└──────────────────┘
```

### Service Layer

1. **WalletService**
   - Sub-organization creation and management
   - Wallet derivation (HD paths for Solana)
   - Account creation (Trading, Long-Term Storage)
   - Key-based wallet management

2. **DelegationService**
   - Process delegation requests from agents/platforms
   - Time-based and condition-based controls
   - Policy key creation via Turnkey API
   - Manual grant/revocation management
   - Emergency kill-switch functionality

3. **PolicyService**
   - Translate UI constraints to Turnkey policy format
   - Manage policy templates for common scenarios
   - Handle SPL token transfer policies
   - Enforce trading restrictions and quotas
   - Admin privilege management

4. **AuthenticationService**
   - Multiple auth methods (passkeys, email, OAuth, SMS)
   - Session management via IndexedDB/SubtleCrypto
   - Session expiration handling (15-minute default)
   - Credential storage and recovery

5. **TransactionService**
   - Policy enforcement at signing
   - Automatic signing for compliant transactions
   - Rejection and logging for violations
   - Real-time notifications
   - Audit trail generation

## Implementation Plan

### Phase 1: Core Infrastructure Setup

```typescript
// 1. Project structure
src/
├── services/
│   ├── wallet/
│   │   ├── WalletService.ts
│   │   ├── SubOrganizationManager.ts
│   │   └── AccountDerivation.ts
│   ├── delegation/
│   │   ├── DelegationService.ts
│   │   ├── DelegationRequest.ts
│   │   └── RevocationManager.ts
│   ├── policy/
│   │   ├── PolicyService.ts
│   │   ├── PolicyTemplates.ts
│   │   └── PolicyEvaluator.ts
│   ├── auth/
│   │   ├── AuthenticationService.ts
│   │   ├── SessionManager.ts
│   │   └── CredentialStore.ts
│   └── transaction/
│       ├── TransactionService.ts
│       ├── SigningEngine.ts
│       └── AuditLogger.ts
├── components/
│   ├── wallet/
│   ├── delegation/
│   └── dashboard/
└── utils/
    ├── turnkey/
    ├── solana/
    └── crypto/
```

### Phase 2: Sub-Organization & Wallet Creation

Reference: `examples/sdk/examples/trading-runner/src/index.ts:106-254`

```typescript
// Pattern from trading-runner example
async function createWalletWithAccounts(
  client: TurnkeySDKServer,
  ownerEmail: string,
  rootUsers: string[]
) {
  // 1. Create sub-organization
  const subOrg = await client.apiClient().createSubOrganization({
    name: `Wallet-${Date.now()}`,
    rootUsers,
    rootQuorumThreshold: 1
  });

  // 2. Create user tags for role-based access
  const adminTagId = await createUserTag(client, "admin", []);
  const traderTagId = await createUserTag(client, "trader", []);

  // 3. Create wallet with HD derivation for Solana
  const wallet = await client.apiClient().createWallet({
    walletName: "Primary Wallet",
    accounts: [
      {
        curve: "CURVE_ED25519",
        pathFormat: "PATH_FORMAT_BIP32",
        path: "m/44'/501'/0'/0'", // Trading account
        addressFormat: "ADDRESS_FORMAT_SOLANA"
      },
      {
        curve: "CURVE_ED25519",
        pathFormat: "PATH_FORMAT_BIP32",
        path: "m/44'/501'/0'/1'", // Long-term storage
        addressFormat: "ADDRESS_FORMAT_SOLANA"
      }
    ]
  });

  return { subOrg, wallet, tags: { adminTagId, traderTagId } };
}
```

### Phase 3: Policy Implementation

Reference: `examples/sdk/examples/trading-runner/src/index.ts:164-253`

```typescript
// Solana-specific policy patterns
async function setupTradingPolicies(
  client: TurnkeySDKServer,
  tags: { adminTagId: string, traderTagId: string },
  accounts: { trading: string, longTermStorage: string }
) {
  // Admin can do everything
  await createPolicy(client, {
    name: "Admin users have unrestricted access",
    effect: "EFFECT_ALLOW",
    consensus: `approvers.any(user, user.tags.contains('${tags.adminTagId}'))`,
    condition: "true"
  });

  // Trader can only trade within limits
  await createPolicy(client, {
    name: "Traders can execute swaps on trading account",
    effect: "EFFECT_ALLOW",
    consensus: `approvers.any(user, user.tags.contains('${tags.traderTagId}'))`,
    condition: `
      solana.tx.instructions.count() <= 3 &&
      solana.tx.spl_transfers.any(transfer,
        transfer.from == '${accounts.trading}' &&
        transfer.amount <= 1000000000
      )
    `
  });

  // Traders can deposit to long-term but not withdraw
  await createPolicy(client, {
    name: "Traders can deposit to long-term storage",
    effect: "EFFECT_ALLOW",
    consensus: `approvers.any(user, user.tags.contains('${tags.traderTagId}'))`,
    condition: `
      solana.tx.instructions.count() == 1 &&
      solana.tx.spl_transfers.any(transfer,
        transfer.to == '${accounts.longTermStorage}'
      )
    `
  });

  // Deny traders from arbitrary transfers
  await createPolicy(client, {
    name: "Deny traders from sending to unknown addresses",
    effect: "EFFECT_DENY",
    consensus: `approvers.any(user, user.tags.contains('${tags.traderTagId}'))`,
    condition: `
      solana.tx.spl_transfers.any(transfer,
        transfer.to != '${accounts.longTermStorage}' &&
        transfer.to != '${accounts.trading}'
      )
    `
  });
}
```

### Phase 4: Delegation Request Flow

```typescript
interface DelegationRequest {
  agentId: string;
  scope: {
    permissions: string[];
    programs: string[]; // Allowed Solana program IDs
    tokens: string[];   // Allowed SPL token mints
    limits: {
      perTransaction: number;
      daily: number;
      weekly: number;
    };
    duration: number; // in seconds
  };
}

async function processDelegationRequest(
  request: DelegationRequest,
  userId: string
): Promise<DelegationResponse> {
  // 1. Validate agent identity
  const agent = await verifyAgent(request.agentId);

  // 2. Generate risk assessment
  const riskScore = calculateRiskScore(request.scope);

  // 3. Present to user for approval
  const userApproval = await promptUserApproval({
    agent,
    scope: request.scope,
    riskScore
  });

  if (!userApproval) {
    return { status: "REJECTED", reason: "User declined" };
  }

  // 4. Create delegated policy key
  const policyKey = await createDelegatedPolicyKey({
    effect: "EFFECT_ALLOW",
    consensus: `approvers.any(user, user.id == '${request.agentId}')`,
    condition: buildConditionFromScope(request.scope),
    expiration: Date.now() + request.scope.duration * 1000
  });

  return {
    status: "APPROVED",
    policyKeyId: policyKey.id,
    expiresAt: policyKey.expiration
  };
}
```

### Phase 5: Session Management with IndexedDB

Reference: `examples/sdk/examples/with-indexed-db/`

```typescript
// Session storage using unextractable keys
class SessionManager {
  private async createSession(userId: string): Promise<Session> {
    // Generate unextractable P-256 key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256"
      },
      false, // unextractable
      ["sign", "verify"]
    );

    // Store in IndexedDB
    const db = await this.openDB();
    const tx = db.transaction(["sessions"], "readwrite");
    await tx.objectStore("sessions").put({
      userId,
      publicKey: await crypto.subtle.exportKey("spki", keyPair.publicKey),
      privateKey: keyPair.privateKey, // stored as CryptoKey object
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
    });

    return {
      userId,
      keyPair,
      expiresAt: Date.now() + 15 * 60 * 1000
    };
  }

  private async validateSession(sessionId: string): Promise<boolean> {
    const db = await this.openDB();
    const session = await db
      .transaction(["sessions"])
      .objectStore("sessions")
      .get(sessionId);

    if (!session || session.expiresAt < Date.now()) {
      return false;
    }

    return true;
  }
}
```

### Phase 6: Authentication Flow

Reference: `examples/demo-ewk/src/app/dashboard/page.tsx`

```typescript
// Multi-method authentication setup
const authConfig = {
  methods: {
    passkey: {
      enabled: true,
      rpId: "localhost",
      attestation: "direct"
    },
    email: {
      enabled: true,
      provider: "turnkey", // Uses iframe for secure OTP
      magicLink: false,
      otp: true
    },
    oauth: {
      google: { enabled: true, clientId: process.env.GOOGLE_CLIENT_ID },
      apple: { enabled: false },
      facebook: { enabled: false }
    },
    sms: {
      enabled: true,
      provider: "twilio"
    }
  }
};

// Email auth flow with iframe isolation
async function emailAuthentication(email: string): Promise<AuthResult> {
  // 1. Request OTP
  const { otpId } = await turnkeyClient.emailAuth({
    email,
    organizationId: process.env.ORGANIZATION_ID
  });

  // 2. Render secure iframe for OTP entry
  const iframe = document.createElement("iframe");
  iframe.src = `${TURNKEY_IFRAME_URL}/email-auth`;
  iframe.sandbox = "allow-scripts allow-same-origin";

  // 3. Handle OTP verification in iframe
  // Credentials never leave the iframe context
  const result = await new Promise((resolve) => {
    window.addEventListener("message", (event) => {
      if (event.data.type === "AUTH_SUCCESS") {
        resolve(event.data.credentials);
      }
    });
  });

  return result;
}
```

## Implementation Tasks

### Setup & Configuration
- [ ] Initialize Next.js 14+ project with TypeScript
- [ ] Install Turnkey SDK dependencies (@turnkey/sdk-react, @turnkey/sdk-server)
- [ ] Configure environment variables for Turnkey API
- [ ] Set up project structure following Phase 1 blueprint

### Core Wallet Implementation
- [ ] Implement SubOrganizationManager service
- [ ] Create WalletService with HD derivation for Solana
- [ ] Implement account creation (Trading & Long-Term Storage)
- [ ] Add wallet import/export functionality

### User & Access Management
- [ ] Implement user creation with tags (admin, trader)
- [ ] Create role-based access control system
- [ ] Implement root vs non-root user permissions
- [ ] Add user credential management (API keys, passkeys)

### Policy Engine Integration
- [ ] Create PolicyService with Turnkey policy engine integration
- [ ] Implement policy templates for common scenarios
- [ ] Add SPL token transfer policy support
- [ ] Create quota tracking and enforcement logic
- [ ] Implement admin privilege policies
- [ ] Add trading account restriction policies

### Delegation System
- [ ] Build DelegationService for request processing
- [ ] Implement time-based delegation logic
- [ ] Add condition-based control evaluation
- [ ] Create manual grant/revocation endpoints
- [ ] Implement emergency kill-switch
- [ ] Add delegation dashboard UI

### Authentication & Sessions
- [ ] Implement multi-method authentication (passkey, email, OAuth, SMS)
- [ ] Create IndexedDB session storage with SubtleCrypto
- [ ] Add session expiration handling
- [ ] Implement iframe-based email authentication
- [ ] Add passkey WebAuthn integration
- [ ] Create OAuth flow handlers

### Transaction Management
- [ ] Build TransactionService with policy enforcement
- [ ] Implement automatic signing for compliant transactions
- [ ] Add rejection handling and logging
- [ ] Create real-time notification system
- [ ] Implement comprehensive audit logging

### UI Components
- [ ] Create wallet dashboard component
- [ ] Build delegation request approval UI
- [ ] Implement policy management interface
- [ ] Add transaction history viewer
- [ ] Create emergency controls UI

### Advanced Features
- [ ] Add webhook notification support
- [ ] Implement rate limiting
- [ ] Create organizational delegation support
- [ ] Add misconfiguration recovery workflows
- [ ] Implement policy versioning

### Testing & Validation
- [ ] Write unit tests for all services
- [ ] Create integration tests for policy enforcement
- [ ] Test delegation flows end-to-end
- [ ] Validate session management security
- [ ] Test emergency revocation scenarios

## Validation Gates

### Code Quality Checks
```bash
# TypeScript compilation
npm run typecheck

# Linting
npm run lint

# Format check
npm run format:check
```

### Unit Tests
```bash
# Run all unit tests
npm test

# Run with coverage
npm test -- --coverage

# Test specific service
npm test -- WalletService
```

### Integration Tests
```bash
# Test policy enforcement
npm run test:integration -- --testNamePattern="Policy enforcement"

# Test delegation flows
npm run test:integration -- --testNamePattern="Delegation"

# Test authentication methods
npm run test:integration -- --testNamePattern="Authentication"
```

### E2E Tests
```bash
# Full wallet creation flow
npm run test:e2e -- wallet-creation.spec.ts

# Delegation request flow
npm run test:e2e -- delegation-request.spec.ts

# Transaction execution with policies
npm run test:e2e -- policy-transaction.spec.ts
```

### Security Validation
```bash
# Audit dependencies
npm audit

# Check for secrets in code
npm run secrets-scan

# Validate policy configurations
npm run validate:policies
```

## Critical Implementation Notes

### Policy Evaluation Rules
1. Explicit DENY always overrides ALLOW
2. Root users bypass all policies
3. Multiple policies are evaluated with OR logic for ALLOW
4. Conditions must match exactly for policy to apply

### SPL Token Transfer Policies
- Use Associated Token Addresses (ATA) for policy conditions
- Calculate ATA: `getAssociatedTokenAddress(mint, owner)`
- Policy condition example:
  ```typescript
  solana.tx.spl_transfers.any(transfer,
    transfer.to == '<calculated_ata_address>'
  )
  ```

### Session Security
- Use unextractable keys in IndexedDB
- Never expose private keys to browser context
- Implement automatic session expiration
- Use iframe isolation for sensitive operations

### Transaction Data Access in Policies
- Solana instruction data format differs from Ethereum
- Access program IDs: `solana.tx.instructions[0].program_id`
- SPL transfer detection: `solana.tx.spl_transfers`
- Native SOL transfers: `solana.tx.transfers`

### Error Handling
- Catch and handle "Consensus Needed" errors
- Implement retry logic for transient failures
- Provide clear user feedback for policy violations
- Log all errors with full context for debugging

## Security Considerations

### Critical Security Requirements
1. **Never expose private keys**: All keys managed by Turnkey's secure enclaves
2. **Iframe isolation**: Email auth and sensitive operations in sandboxed iframes
3. **Unextractable session keys**: Use SubtleCrypto API with non-extractable flag
4. **Policy enforcement**: All constraints enforced at cryptographic signing layer
5. **Audit trail**: Immutable logging of all activities

### Threat Mitigation
- **Malicious agents**: Verify identity, track reputation, enforce strict policies
- **Compromised keys**: Immediate revocation, emergency kill-switch
- **Policy bypass**: Multiple validation layers, Turnkey enforcement
- **Replay attacks**: Nonce validation, timestamp checks
- **Social engineering**: Clear risk communication, confirmation requirements

## Success Metrics
- [ ] All 10 requirements from INITIAL.md fully implemented
- [ ] Zero private key exposure vulnerabilities
- [ ] < 100ms policy evaluation time
- [ ] 100% audit trail coverage
- [ ] All validation gates passing
- [ ] Complete test coverage (>80%)

## Confidence Score: 9/10

High confidence due to:
- Comprehensive examples available in codebase
- Clear patterns from trading-runner for policy implementation
- Well-documented Turnkey SDK and APIs
- Proven session management patterns from with-indexed-db
- Detailed requirements in INITIAL.md

Minor uncertainty around:
- Specific Solana program ID validation patterns
- Optimal policy composition for complex scenarios