"""
Jupiter Swap Agent using LangGraph and Delegated Wallet

This agent can perform Jupiter swaps on Solana using a delegated wallet
managed by the Turnkey delegation system.
"""

import asyncio
import json
import os
from typing import Dict, Any, Optional

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

from delegated_wallet_manager import DelegatedWalletManager
from jupiter_swap_tool import JupiterSwapTool

load_dotenv()

# Initialize the language model
model = ChatAnthropic(
    model="claude-sonnet-4-5-20250929",
    temperature=0.1
)

# Initialize delegated wallet manager
wallet_manager = DelegatedWalletManager(
    api_url=os.getenv("WALLET_API_URL", "http://localhost:3000/api"),
    api_key=os.getenv("WALLET_API_KEY"),
    delegated_wallet_address=os.getenv("DELEGATED_WALLET_ADDRESS")
)

# Initialize Jupiter swap tool
jupiter_tool = JupiterSwapTool(wallet_manager)


@tool
def get_wallet_balance() -> str:
    """Get the current SOL balance of the delegated wallet."""
    try:
        balance = wallet_manager.get_sol_balance()
        return f"Current SOL balance: {balance:.4f} SOL"
    except Exception as e:
        return f"Error getting balance: {str(e)}"


@tool
def get_token_price(token_symbol: str) -> str:
    """Get the current price of a token from Jupiter Price API."""
    try:
        price_data = jupiter_tool.get_token_price(token_symbol)
        if price_data:
            return f"{token_symbol} current price: ${price_data['price']:.6f}"
        return f"Could not fetch price for {token_symbol}"
    except Exception as e:
        return f"Error getting token price: {str(e)}"


@tool
def execute_swap(
    action: str,
    token_symbol: str,
    token_address: str,
    amount_usd: float,
    slippage_bps: int = 50
) -> str:
    """
    Execute a Jupiter swap transaction with USD amount.

    Args:
        action: "buy" or "sell"
        token_symbol: Symbol of the token (e.g., "BONK")
        token_address: Mint address of the token
        amount_usd: Amount in USD to trade
        slippage_bps: Slippage tolerance in basis points (default 50 = 0.5%)
    """
    try:
        result = jupiter_tool.execute_swap(
            action=action.upper(),
            token_symbol=token_symbol,
            token_address=token_address,
            amount_usd=amount_usd,
            slippage_bps=slippage_bps
        )

        if result["success"]:
            tx_hash = result["transaction_hash"]
            return f"""
✅ Swap executed successfully!

Transaction Hash: {tx_hash}
Action: {action.upper()}
Token: {token_symbol}
Amount: ${amount_usd}
Slippage: {slippage_bps/100}%

View on Solscan: https://solscan.io/tx/{tx_hash}
"""
        else:
            return f"❌ Swap failed: {result['error']}"

    except Exception as e:
        return f"Error executing swap: {str(e)}"


@tool
def swap_sol_for_token(
    token_symbol: str,
    token_address: str,
    sol_amount: float,
    slippage_bps: int = 50
) -> str:
    """
    Swap SOL for a token using SOL amount.

    Args:
        token_symbol: Symbol of the token (e.g., "BONK")
        token_address: Mint address of the token
        sol_amount: Amount of SOL to swap
        slippage_bps: Slippage tolerance in basis points (default 50 = 0.5%)
    """
    try:
        result = jupiter_tool.execute_sol_swap(
            action="BUY",
            token_symbol=token_symbol,
            token_address=token_address,
            sol_amount=sol_amount,
            slippage_bps=slippage_bps
        )

        if result["success"]:
            tx_hash = result["transaction_hash"]
            return f"""
✅ SOL swap executed successfully!

Transaction Hash: {tx_hash}
Action: SOL → {token_symbol}
Amount: {sol_amount} SOL
Slippage: {slippage_bps/100}%

View on Solscan: https://solscan.io/tx/{tx_hash}
"""
        else:
            return f"❌ Swap failed: {result['error']}"

    except Exception as e:
        return f"Error executing SOL swap: {str(e)}"


@tool
def swap_token_for_sol(
    token_symbol: str,
    token_address: str,
    token_amount: float,
    slippage_bps: int = 50
) -> str:
    """
    Swap a token for SOL using token amount.

    Args:
        token_symbol: Symbol of the token (e.g., "BONK")
        token_address: Mint address of the token
        token_amount: Amount of tokens to swap
        slippage_bps: Slippage tolerance in basis points (default 50 = 0.5%)
    """
    try:
        result = jupiter_tool.execute_sol_swap(
            action="SELL",
            token_symbol=token_symbol,
            token_address=token_address,
            token_amount=token_amount,
            slippage_bps=slippage_bps
        )

        if result["success"]:
            tx_hash = result["transaction_hash"]
            return f"""
✅ Token swap executed successfully!

Transaction Hash: {tx_hash}
Action: {token_symbol} → SOL
Amount: {token_amount} {token_symbol}
Slippage: {slippage_bps/100}%

View on Solscan: https://solscan.io/tx/{tx_hash}
"""
        else:
            return f"❌ Swap failed: {result['error']}"

    except Exception as e:
        return f"Error executing token swap: {str(e)}"


@tool
def get_token_info(token_address: str) -> str:
    """Get detailed information about a token."""
    try:
        info = jupiter_tool.get_token_info(token_address)
        return f"""
Token Information:
- Symbol: {info.get('symbol', 'Unknown')}
- Name: {info.get('name', 'Unknown')}
- Decimals: {info.get('decimals', 'Unknown')}
- Address: {token_address}
"""
    except Exception as e:
        return f"Error getting token info: {str(e)}"


@tool
def diagnose_wallet_setup() -> str:
    """Diagnose wallet configuration issues."""
    try:
        result = wallet_manager._make_request(
            'GET',
            f'/wallet/info/{wallet_manager.delegated_wallet_address}'
        )

        turnkey_info = result.get('turnkey', {})
        solana_info = result.get('solana', {})

        diagnosis = f"""
🔍 **Wallet Diagnosis for {wallet_manager.delegated_wallet_address}**

**Solana Network:**
- Balance: {solana_info.get('balanceSOL', 0):.4f} SOL
- Account exists: {solana_info.get('exists', False)}
- Network: {solana_info.get('network', 'unknown')}

**Turnkey Integration:**
- Found in organization: {turnkey_info.get('found', False)}
"""

        if turnkey_info.get('found'):
            diagnosis += f"""
- Wallet ID: {turnkey_info.get('walletId', 'N/A')}
- Wallet Name: {turnkey_info.get('walletName', 'N/A')}
✅ **Wallet properly configured for signing**
"""
        else:
            diagnosis += f"""
❌ **Issue: Wallet not found in Turnkey organization**

**To fix this:**
1. Navigate to http://localhost:3000/demo
2. Complete "Step 1: Create Delegated Access"
3. Use the wallet address shown there as your DELEGATED_WALLET_ADDRESS
4. Or create a new delegated wallet through the demo interface
"""

        if turnkey_info.get('error'):
            diagnosis += f"\n⚠️ **Turnkey Error:** {turnkey_info.get('error')}"

        return diagnosis

    except Exception as e:
        return f"""
❌ **Diagnosis Failed**

Error: {str(e)}

**Quick troubleshooting:**
1. Ensure wallet delegation service is running: http://localhost:3000
2. Check your .env configuration
3. Verify DELEGATED_WALLET_ADDRESS is correct
4. Complete wallet setup via demo interface
"""


# System prompt for the agent
SYSTEM_PROMPT = """
You are a Jupiter Swap Agent that helps users perform token swaps on Solana using a delegated wallet.

Your capabilities:
1. Check wallet balance
2. Get real-time token prices
3. Execute Jupiter swaps with USD amounts (buy/sell tokens)
4. Execute direct SOL/token swaps with native amounts
5. Get token information

Available swap types:
- USD-based: "buy 10 USD of BONK" or "sell 5 USD of JUP"
- SOL-based: "swap 0.01 SOL for BONK" or "swap 1000 BONK for SOL"

Safety Guidelines:
- Always check wallet balance before executing swaps
- Verify token addresses before swapping
- Use reasonable slippage settings (0.5-2%)
- Warn users about potential risks
- Suggest small test amounts for unknown tokens

When executing swaps:
- For USD amounts: Convert between USD and native amounts automatically
- For SOL amounts: Use exact SOL or token amounts specified
- Always confirm the details before execution
- Show transaction hashes for verification

Be helpful, informative, and prioritize user safety. Support natural language like "swap 0.01 SOL for BONK tokens".
"""


async def chat_with_agent():
    """Main chat loop for interacting with the Jupiter swap agent."""

    # Create the agent with tools
    tools = [
        get_wallet_balance,
        get_token_price,
        execute_swap,
        swap_sol_for_token,
        swap_token_for_sol,
        get_token_info,
        diagnose_wallet_setup
    ]

    agent = create_react_agent(model, tools)

    # Initialize conversation
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    print("🚀 Jupiter Swap Agent initialized!")
    print("💰 Delegated wallet ready for trading")
    print("Type 'help' for commands, 'exit' to quit\n")

    # Show initial wallet status
    try:
        balance = wallet_manager.get_sol_balance()
        print(f"💼 Current wallet balance: {balance:.4f} SOL")
        print(f"🔗 Wallet address: {wallet_manager.delegated_wallet_address}\n")
    except Exception as e:
        print(f"⚠️ Could not fetch wallet balance: {e}\n")

    while True:
        try:
            user_input = input("You: ").strip()

            if user_input.lower() in {"exit", "quit", "bye"}:
                print("👋 Goodbye! Happy trading!")
                break

            if user_input.lower() == "help":
                print("""
📋 Available commands:

💰 Balance & Info:
- "check balance" - Get current SOL balance
- "price of [TOKEN]" - Get token price
- "token info [ADDRESS]" - Get token details

💱 USD-based Trading:
- "buy [AMOUNT] USD of [TOKEN]" - Buy tokens with USD value
- "sell [AMOUNT] USD of [TOKEN]" - Sell tokens for USD value

🔄 SOL-based Trading:
- "swap [AMOUNT] SOL for [TOKEN]" - Swap SOL for tokens
- "swap [AMOUNT] [TOKEN] for SOL" - Swap tokens for SOL

🛠️ Control:
- "diagnose" - Check wallet configuration
- "help" - Show this help
- "exit" - Quit the agent

Examples:
- "swap 0.01 SOL for BONK"
- "swap 1000 BONK for SOL"
- "buy 10 USD of BONK"
- "price of SOL"
- "check balance"
""")
                continue

            if not user_input:
                continue

            # Add user message
            messages.append({"role": "user", "content": user_input})

            # Get agent response
            print("🤖 Agent: ", end="", flush=True)

            response = await agent.ainvoke({"messages": messages})
            ai_message = response["messages"][-1].content

            print(ai_message)

            # Add agent response to history
            messages.append({"role": "assistant", "content": ai_message})

        except KeyboardInterrupt:
            print("\n👋 Goodbye! Happy trading!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")


def main():
    """Entry point for the application."""
    # Validate environment variables
    required_vars = ["WALLET_API_URL", "WALLET_API_KEY", "DELEGATED_WALLET_ADDRESS"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]

    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"  - {var}")
        print("\nPlease check your .env file and try again.")
        return

    # Check if wallet delegation service is running
    try:
        wallet_manager.health_check()
        print("✅ Wallet delegation service is running")
    except Exception as e:
        print(f"❌ Cannot connect to wallet delegation service: {e}")
        print("Please ensure the service is running on the configured URL")
        return

    # Start the chat loop
    try:
        asyncio.run(chat_with_agent())
    except KeyboardInterrupt:
        print("\n👋 Goodbye! Happy trading!")


if __name__ == "__main__":
    main()