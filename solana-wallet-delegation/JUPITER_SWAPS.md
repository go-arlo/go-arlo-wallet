Jupiter Swap Integration

User Story: As a wallet owner, I want to perform token swaps (e.g., USDC ↔ SOL) directly within the wallet using Jupiter’s Ultra API and Turnkey’s signer, so that I can exchange tokens securely through a delegated user and the sub‑organization wallet.

Acceptance Criteria

Login and Wallet Selection: After a wallet has been created, the user shall authenticate through the front‑end by clicking a login button. The application shall use @turnkey/react-wallet-kit to authenticate and load available wallet accounts. Once logged in, the user shall select the wallet account to be used for swaps.

Turnkey Signer Creation: When a wallet account is selected, the system shall instantiate a TurnkeySigner with the organization ID and the selected wallet’s account details. This signer will use the delegated user’s credentials and enforce policy limits during signing.

Fetching Swap Quote: When the user initiates a swap, the system shall fetch a swap quote from the Jupiter Ultra API using a function like getUltraQuote, passing in the input token mint, output token mint, amount, and user’s public key
docs.turnkey.com
.

Creating the Swap Transaction: After obtaining a quote, the system shall request a swap transaction from the Jupiter API via a function like createUltraOrder. The transaction parameters (input/output token, amount, compute unit price) must comply with the wallet’s policy rules.

Signing and Executing the Swap: The system shall sign the swap transaction using the TurnkeySigner and then submit it to the Solana network through a Solana connection (e.g., @solana/web3.js). The delegated user must have the necessary policy permissions to perform the swap.

Status Updates and UI Feedback: During the swap flow, the system shall update the user interface with statuses such as “Fetching quote,” “Creating swap transaction,” and “Signing and sending,” and display the transaction signature with a link to Solscan or another explorer after completion.

Policy Enforcement for Swaps: The system shall enforce policy limits during swap execution, including per‑transaction amount limits, allowed token pairs, and daily spend limits. Transactions that violate policies must be rejected.

Balance Refresh: After the swap is executed, the system shall refresh the user’s token balances by querying the Jupiter Ultra API or the Solana network.

Example and Reference: The integration shall follow the reference implementation provided by Turnkey’s with‑Jupiter example
and the Jupiter cookbook. Any deviations from the example must maintain the same security and policy enforcement principles.
- `examples/sdk/examples/with-juipter/` Jupiter example 
- https://docs.turnkey.com/cookbook/jupiter (Turnkey cookbook)