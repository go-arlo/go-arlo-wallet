# FEATURE:
## Context and Goals
This feature enables an embedded Solana wallet powered by Turnkey. Each wallet lives in its own segregated sub‑organization, and the application defines who can access resources at creation. Delegated access through Turnkey’s policy engine lets wallet owners allow platforms or AI agents to sign on their behalf without sharing private keys or passphrases. The wallet must support trading and long‑term storage accounts similar to the trading‑runner example, allow user account creation, and provide granular controls over permissions and assets. Additional requirements include support for multiple authentication methods, session handling via IndexedDB and SubtleCrypto, and the use of key‑based wallets.

### Requirement 1: Sub‑Organization and Wallet Setup
User Story: As an application developer, I want each wallet to be isolated in its own sub‑organization with configurable root users, so that I can control who holds signing power and safely create trading and long‑term storage accounts.
Acceptance Criteria
1. Sub‑Organization Creation: When a new wallet is created, the system shall create a separate sub‑organization and allow configuration of its root users and quorum threshold. The parent organization retains read‑only visibility.
2. Configurable Access at Creation: When initializing the sub‑organization, the system shall specify which entities (e.g., wallet owner, platform) are granted root or delegated access, ensuring that only designated users can authorize actions.
3. Trading vs Long‑Term Accounts: When wallets are set up, the system shall create at least two accounts: a Trading account and a Long‑Term Storage account, mirroring the trading‑runner example. Only admin users may withdraw from the long‑term storage account.
4. User Accounts and Tags: When the wallet owner adds additional users, the system shall allow creation of users within the sub‑organization with unique IDs, credentials (API keys or passkeys) and optional tags. These tags can be referenced in policies to distinguish roles such as admin and trader.
5. Root vs Non‑Root Permissions: When configuring users, the system shall distinguish between root users (with unilateral authority) and delegated users whose actions are subject to policies.
6. Wallet Derivation: The system shall use HD wallet derivation for Solana (m/44'/501'/0'/0') so additional accounts can be derived without exposing the mnemonic.

### Requirement 2: Delegated Access Control
User Story: As a wallet owner, I want to grant temporary signing permissions to platforms or agents with specific time and condition constraints, so that I can automate transactions without exposing my private keys.
Acceptance Criteria
1. Time‑Based Delegations: When a user creates a time‑based delegation, the system shall automatically revoke access after the specified period (e.g., 1 h, 24 h, 7 d).
2. Condition‑Based Controls: When setting transaction conditions, the system shall enforce restrictions such as allowed transaction types (swaps, transfers, staking, NFT mints), maximum per‑transaction size, daily or weekly spend limits, permitted Solana program IDs, and allowed token mints or NFT collections. Violations result in rejection.
3. Manual Grant/Revocation: When the owner manually grants or revokes access, the system shall immediately update the delegated key so that agents gain or lose permission without exposing the root key.
4. Policy Composition: When a delegation is created, the system shall encode the rules in Turnkey’s policy engine using effect, consensus, and condition fields. Policies must specify which user(s) can act (consensus) and the conditions under which the policy applies (condition).
5. Policy Evaluation: When multiple policies apply to an activity, the system shall evaluate them according to Turnkey’s evaluation rules, where explicit denies override allows and root users bypass policies.
6. Trading Account Policies: Policies shall permit traders to execute trades within the Trading account but restrict them from sending funds to arbitrary addresses. Traders may send funds only to the Long‑Term Storage account or other pre‑approved destinations.
7. Admin Privileges: When a user with admin tag signs, the policy shall allow unrestricted trading and sweeping, enabling admins to transfer funds between accounts or to external addresses.

### Requirement 3: Asset Control Management
User Story: As a wallet owner, I want granular control over which assets can be accessed through delegation, so that I can limit exposure based on trust level and use case.
Acceptance Criteria
1. Full vs Partial Authority: When a user grants full authority delegation, the system shall allow access to all assets within other specified constraints. For quota‑based delegations, the system shall track cumulative asset movement and revoke permissions once limits are reached.
2. Token‑Specific Limits: When the owner restricts to specific tokens or NFT collections, the system shall enforce transactions only for the designated assets, rejecting any other asset type.
3. Trading Account Quotas: For trading accounts, the system shall allow a trader to spend only up to the quota defined in their policy, while admin users are exempt from these caps.
4. Long‑Term Storage Protections: When funds reside in the long‑term storage account, the system shall allow only admin users to move funds out, ensuring that traders can deposit but not withdraw.

### Requirement 4: Agent Authentication and Whitelisting
User Story: As a wallet owner, I want to verify and manage which platforms or agents can request delegation, so that I can ensure only trusted entities have access.
Acceptance Criteria
1. Explicit Approval: When an agent requests delegation, the system shall require explicit approval from the wallet owner before generating a delegated key.
2. Verified Identity Display: When displaying agent information, the system shall show verified identity details (e.g., domain, agent ID, certificate) to help the owner make informed decisions.
3. Whitelisting: When a user whitelists an agent, the system shall record the agent as trusted, enabling faster approval for future delegation requests.
4. Unverified Agents: When an unverified agent requests access, the system shall clearly indicate the lack of verification, giving the owner the option to decline.

### Requirement 5: Delegation Request Flow
User Story: As a wallet owner, I want to review and approve delegation requests with clear information about scope and risks, so that I can make informed decisions about granting access.
Acceptance Criteria
1. Delegation Prompts: When an agent submits a delegation request, the system shall surface the request in the wallet UI as a prompt containing the requesting agent, scope, time limits, and conditions.
2. Risk Summary: When displaying a delegation request, the system shall generate an automatic risk summary describing potential impacts of the requested permissions (e.g., spending limit, allowed programs).
3. Key Creation: When a user approves a request, the system shall create a delegated policy key scoped to the approved parameters using Turnkey’s policy engine.
4. Rejection Handling: When a user rejects a request, the system shall deny access and notify the requesting agent.

### Requirement 6: Transaction Execution and Monitoring
User Story: As a wallet owner, I want to monitor delegated transactions in real time and receive notifications about agent activity, so that I can stay informed about automated actions on my behalf.
Acceptance Criteria
1. Policy Enforcement at Signing: When an agent submits a transaction with a delegated key, the system shall validate the transaction against the delegated policy and only sign if conditions are satisfied.
2. Automatic Signing or Rejection: If a transaction complies with the policy, the system shall auto‑sign and broadcast it; otherwise, it shall reject the transaction and log the attempt.
3. Real‑Time Notifications: When a delegated transaction is executed or rejected, the system shall send real‑time notifications (via in‑app alerts, email or webhooks) to the wallet owner.
4. Audit Logging: Every delegated transaction and rejection shall be recorded with details such as timestamp, agent ID, policy ID, and transaction parameters, enabling future audits.
5. Session Context: When transactions are signed within a session, the system shall tie the activity to the user’s session credentials stored in IndexedDB.

### Requirement 7: Delegation Management and Revocation
User Story: As a wallet owner, I want to view, manage, and revoke active delegations at any time, so that I can maintain control over my wallet’s security.
Acceptance Criteria
1. Delegation Dashboard: When the user opens the delegation dashboard, the system shall display all active delegations with their scope, expiration time, quota usage, and policy details.
2. Manual Revocation: When a user manually revokes a delegation, the system shall immediately disable the delegated key and notify any active agents.
3. Emergency Kill‑Switch: When the user activates the emergency kill‑switch, the system shall revoke all active delegations and optionally pause any in‑flight sessions.
4. Auto‑Expiration: When time‑based delegations expire or quotas are exhausted, the system shall automatically revoke the delegation and update the dashboard.
5. Policy Update: When policies change (e.g., adding a new program ID), the system shall support policy versioning and update affected delegations without requiring full recreation.

### Requirement 8: Security, User Accounts & Audit Trail
User Story: As a wallet owner, I want comprehensive security measures and audit trails for all delegated activities, so that I can trust the system and track all actions.
Acceptance Criteria
1. Private Key Protection: At all times, the system shall prevent exposure of the wallet’s private keys, using Turnkey’s secure enclaves and sub‑organization isolation.
2. User Credentials: Users shall authenticate using secure credentials such as API keys, passkeys or email auth codes. Each user’s activities must be associated with their unique ID and tags.
3. Audit Trails: The system shall log every activity (policy creation, delegation, transaction signing, revocation) with the acting user, timestamp and outcome, ensuring traceability.
4. Root User Override: Policies shall respect Turnkey’s evaluation rules, where root users can override policies and explicit denies take precedence.
5. Security Alerts: When large or unusual transactions are attempted, the system shall optionally require multi‑factor confirmation (e.g., email code or passkey) before signing.

### Requirement 9: Authentication and Session Handling
User Story: As a wallet owner, I want flexible authentication options and secure session handling, so that I can access my wallet conveniently without compromising security.
Acceptance Criteria
1. Authentication Methods: When configuring the app, the system shall support multiple authentication methods, including passkeys, email (magic link or OTP), social logins (OAuth) and SMS (OTP). Multiple methods may be enabled for backup or recovery.
2. Email Authentication Flow: When using email auth, the system shall follow the Turnkey email auth flow where a one‑time code or magic link is sent to the user’s email and decrypted inside a secure iframe. The wallet owner’s organization cannot take over the sub‑organization because credentials live within the iframe.
3. Passkey Authentication: When using passkeys, the system shall create WebAuthn credentials for the user during sub‑organization creation, using helpers like getWebAuthnAttestation.
4. Session Storage: When a user signs in, the system shall store session credentials as asymmetric key pairs using IndexedDB and the SubtleCrypto API, ensuring that keys are unextractable and survive page reloads. The system shall also support fallback storage options (iframe, localStorage, secure storage) for platforms where IndexedDB is unavailable.
5. Session Duration: Session credentials shall expire after a configurable duration, with a default of 15 minutes, and the system must prompt re‑authentication upon expiration.
6. Key‑Based Wallets: The wallet implementation shall use key‑based wallets by default for simplicity and cross‑chain compatibility. Smart contract wallets may be considered in future versions.

### Requirement 10: Advanced Features and Notifications
User Story: As a wallet owner, I want advanced features such as webhooks, templates, rate limits and organizational delegation, so that I can streamline common use cases and enforce safety limits.
Acceptance Criteria
1. Webhook Notifications: When delegated transactions occur, the system shall support webhook notifications to external services for real‑time alerts.
2. Policy Templates: When users create delegations, the system shall offer prebuilt policy templates (e.g., Trading Bot, NFT Mint Bot, Automation) to simplify setup.
3. Rate Limits: When agents or delegated keys submit transactions, the system shall enforce configurable rate limits on transactions per minute or hour.
4. Organizational Delegation: When multiple agents operate under a single platform, the system shall support organizational delegation, where each agent has scoped permissions within the platform’s policy.
5. Misconfiguration Recovery: When a delegation is misconfigured or compromised, the system shall provide emergency recovery workflows, such as resetting policies, rotating keys, or exporting funds to a secure wallet.

# EXAMPLES:
All examples should have README files for reference. 

- `examples/sdk/examples/with-solana/` - Turnkey wallet implementation for Solana
- `examples/demo-ewk/` -  Turnkey example using embedded wallet kit
- `examples/sdk/examples/with-indexed-db/` - Turnkey example using IndexedDB
- `examples/sdk/examples/trading-runner/` - Turnkey trading-runner example
- `examples/react-native-demo-wallet/` - React native Turnkey wallet example for mobile


# DOCUMENTATION:
- https://docs.turnkey.com/concepts/overview
- https://docs.turnkey.com/concepts/wallets
- https://docs.turnkey.com/sdks/react/getting-started
- https://docs.turnkey.com/embedded-wallets/overview
- https://docs.turnkey.com/production-checklist/embedded-wallet
- https://docs.turnkey.com/concepts/policies/overview
- https://docs.turnkey.com/concepts/policies/delegated-access
- https://docs.turnkey.com/concepts/policies/examples/access-control
- https://docs.turnkey.com/concepts/policies/examples/signing-control
- https://docs.turnkey.com/concepts/policies/examples/solana

# OTHER CONSIDERATIONS:

## Key Design Principles

- **Zero Private Key Exposure**: All delegation operates through Turnkey's MPC network
- **Policy-First Security**: All constraints enforced at the cryptographic signing layer
- **Granular Control**: Fine-grained permissions for time, assets, and transaction types
- **Audit Transparency**: Complete transaction history and policy violation logging
- **User Experience**: Intuitive delegation management with clear risk communication

## Services

### 1. Delegation Service

**Purpose**: Central orchestrator for delegation lifecycle management

**Key Responsibilities**:
- Process delegation requests from agents
- Coordinate with Turnkey for policy key creation
- Manage delegation state and lifecycle
- Handle revocation requests
- Generate risk assessments for delegation requests
- Support organizational delegation with scoped permissions

### 2. Policy Service

**Purpose**: Translate user-defined constraints into Turnkey policy configurations

**Key Responsibilities**:
- Convert UI constraints to Turnkey policy format
- Validate policy configurations
- Manage policy templates for common use cases
- Handle policy updates and modifications
- Track quota usage and enforce limits
- Support multi-factor confirmation for high-risk transactions

## Security Considerations

### Threat Model

1. **Malicious Agents**: Attempt to exceed delegation constraints or impersonate legitimate services
2. **Compromised Keys**: Agent credentials are stolen or leaked
3. **Policy Bypass**: Attempt to circumvent Turnkey enforcement through transaction manipulation
4. **Replay Attacks**: Reuse of signed transactions or delegation requests
5. **Social Engineering**: Trick users into over-permissive delegations or emergency actions
6. **Quota Manipulation**: Attempt to reset or bypass quota tracking mechanisms
7. **Organizational Abuse**: Misuse of organizational delegation privileges
8. **Emergency System Abuse**: False emergency claims to trigger unnecessary revocations

### Mitigation Strategies

- **Defense in Depth**: Multiple validation layers (client, service, Turnkey) with redundant checks
- **Principle of Least Privilege**: Minimal necessary permissions by default with explicit opt-in for broader access
- **Time-Bounded Access**: Automatic expiration of all delegations with configurable limits
- **Audit Transparency**: Complete visibility into all activities with immutable logging
- **Emergency Controls**: Immediate revocation capabilities with multiple trigger mechanisms
- **Agent Verification**: Multi-factor agent authentication with reputation tracking
- **Risk-Based Controls**: Dynamic risk assessment with adaptive security measures
- **Quota Enforcement**: Cryptographic enforcement of spending limits at the signing layer
- **Rate Limiting**: Distributed rate limiting to prevent abuse across multiple channels

### Compliance and Privacy

- **Data Minimization**: Store only necessary delegation metadata
- **Encryption**: All sensitive data encrypted at rest and in transit
- **Access Controls**: Role-based access to delegation management
- **Audit Retention**: Configurable retention periods for compliance