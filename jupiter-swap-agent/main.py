"""
Jupiter Swap Agent using LangGraph and Delegated Wallet

This agent can perform Jupiter swaps on Solana using a delegated wallet
managed by the Turnkey delegation system.
"""

import asyncio
import json
import os
import time
import logging
from typing import Dict, Any, Optional

# Reduce logging noise
logging.basicConfig(
    level=logging.WARNING,
    format='%(levelname)s: %(message)s'
)
# Keep wallet_manager at INFO for transaction status
logging.getLogger('wallet_manager').setLevel(logging.INFO)

from dotenv import load_dotenv
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

from jupiter_swap_tool import JupiterSwapTool
from wallet_manager import WalletManager

load_dotenv()

# Initialize the language model
model = ChatAnthropic(
    model="claude-sonnet-4-5-20250929",
    temperature=0.1
)

wallet_manager = WalletManager(
    delegated_wallet_address=os.getenv("DELEGATED_WALLET_ADDRESS"),
    turnkey_organization_id=os.getenv("TURNKEY_ORGANIZATION_ID"),
    turnkey_api_public_key=os.getenv("TURNKEY_API_PUBLIC_KEY"),
    turnkey_api_private_key=os.getenv("TURNKEY_API_PRIVATE_KEY"),
    main_turnkey_api_public_key=os.getenv("MAIN_TURNKEY_API_PUBLIC_KEY"),
    main_turnkey_api_private_key=os.getenv("MAIN_TURNKEY_API_PRIVATE_KEY"),
    turnkey_api_base_url=os.getenv("TURNKEY_API_BASE_URL", "https://api.turnkey.com"),
    solana_rpc_url=os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
)

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
    sol_amount: float = None,
    token_amount: float = None,
    amount_usd: float = None,
    slippage_bps: int = 50
) -> str:
    """
    Execute a Jupiter swap transaction.

    Args:
        action: "buy" (SOL->Token) or "sell" (Token->SOL)
        token_symbol: Symbol of the token (e.g., "BONK")
        token_address: Mint address of the token
        sol_amount: Amount of SOL to swap (for buy actions, default)
        token_amount: Amount of tokens to swap (for sell actions)
        amount_usd: Amount in USD to trade (alternative to native amounts)
        slippage_bps: Slippage tolerance in basis points (default 50 = 0.5%)
    """
    try:
        result = jupiter_tool.execute_swap(
            action=action.upper(),
            token_symbol=token_symbol,
            token_address=token_address,
            sol_amount=sol_amount,
            token_amount=token_amount,
            amount_usd=amount_usd,
            slippage_bps=slippage_bps
        )

        if result["success"]:
            tx_hash = result["transaction_hash"]
            amount_str = ""
            if sol_amount is not None:
                amount_str = f"{sol_amount} SOL"
            elif token_amount is not None:
                amount_str = f"{token_amount} {token_symbol}"
            elif amount_usd is not None:
                amount_str = f"${amount_usd}"

            return f"""
✅ Swap executed successfully!

Transaction Hash: {tx_hash}
Action: {action.upper()}
Token: {token_symbol}
Amount: {amount_str}
Slippage: {slippage_bps/100}%

View on Solscan: https://solscan.io/tx/{tx_hash}
"""
        else:
            error_msg = f"❌ Swap failed: {result['error']}"
            if "error_details" in result:
                error_msg += f"\n\nDetailed error:\n{result['error_details']}"
            return error_msg

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        return f"Error executing swap: {str(e)}\n\nDetailed error:\n{error_details}"


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
        result = jupiter_tool.execute_swap(
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
            error_msg = f"❌ Swap failed: {result['error']}"
            if "error_details" in result:
                error_msg += f"\n\nDetailed error:\n{result['error_details']}"
            return error_msg

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        return f"Error executing SOL swap: {str(e)}\n\nDetailed error:\n{error_details}"


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
        result = jupiter_tool.execute_swap(
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
            error_msg = f"❌ Swap failed: {result['error']}"
            if "error_details" in result:
                error_msg += f"\n\nDetailed error:\n{result['error_details']}"
            return error_msg

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        return f"Error executing token swap: {str(e)}\n\nDetailed error:\n{error_details}"


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
def test_jupiter_api() -> str:
    """Test Jupiter API connectivity and response."""
    try:
        import requests

        # Test the quote API directly
        headers = {
            "Accept": "application/json",
            "User-Agent": "Jupiter-Swap-Agent/1.0"
        }

        test_params = {
            "inputMint": "So11111111111111111111111111111111111111112",  # SOL
            "outputMint": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",  # BONK
            "amount": "1000000",  # 0.001 SOL in lamports
            "slippageBps": "50"
        }

        response = requests.get(
            "https://lite-api.jup.ag/swap/v1/quote",
            params=test_params,
            headers=headers,
            timeout=10
        )

        return f"""
🧪 Jupiter API Test Results:

**Request URL:** https://lite-api.jup.ag/swap/v1/quote
**Status Code:** {response.status_code}
**Response Headers:** {dict(response.headers)}

**Response Body:**
{response.text[:500]}{'...' if len(response.text) > 500 else ''}

**Parameters Used:**
{test_params}
"""

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        return f"""
❌ Jupiter API Test Failed:

Error: {str(e)}

Detailed error:
{error_details}
"""


@tool
def setup_api_keys(user_id: str = None) -> str:
    """
    Setup API keys for the delegated user.

    Args:
        user_id: Optional user ID for existing delegated user
    """
    try:
        if not wallet_manager.turnkey_api_public_key or not wallet_manager.turnkey_api_private_key:
            return """
❌ Cannot setup API keys: Missing Turnkey API credentials

Please configure these environment variables:
- TURNKEY_API_PUBLIC_KEY
- TURNKEY_API_PRIVATE_KEY

These are needed to create API keys for delegated users.
"""

        delegated_user_id = user_id or os.getenv("DELEGATED_USER_ID")

        if not delegated_user_id:
            return """
❌ Cannot setup API keys: Missing user ID

Please provide either:
1. The user_id parameter
2. Set DELEGATED_USER_ID in your .env file

You can find the user ID in the Turnkey dashboard or from the wallet delegation demo.
"""

        result = wallet_manager.create_api_keys_for_user(
            user_id=delegated_user_id,
            api_key_name=f"Jupiter Agent Key - {int(time.time())}"
        )

        activity = result.get("activity", {})
        if activity.get("status") == "ACTIVITY_STATUS_COMPLETED":
            return f"""
✅ API keys successfully created for user!

User ID: {delegated_user_id}
Activity ID: {activity.get("id")}
Status: Completed

The delegated user now has API access for automated transaction signing.
"""
        else:
            return f"""
⚠️ API key creation initiated but not completed

Status: {activity.get("status")}
Activity ID: {activity.get("id")}

Please check the Turnkey dashboard for completion status.
"""

    except Exception as e:
        return f"""
❌ Failed to setup API keys

Error: {str(e)}

Troubleshooting:
1. Ensure Turnkey API credentials are correct
2. Verify the user ID exists in your organization
3. Check network connectivity to Turnkey API
"""


@tool
def diagnose_wallet_setup() -> str:
    """Diagnose wallet configuration issues."""
    try:
        balance = wallet_manager.get_sol_balance()

        has_turnkey_keys = bool(
            wallet_manager.turnkey_api_public_key and
            wallet_manager.turnkey_api_private_key
        )

        diagnosis = f"""
🔍 **Wallet Diagnosis for {wallet_manager.delegated_wallet_address}**

**Solana Network:**
- Balance: {balance:.4f} SOL
- RPC URL: {wallet_manager.solana_rpc_url}
- Wallet Address: {wallet_manager.delegated_wallet_address}

**Turnkey Configuration:**
- Organization ID: {wallet_manager.turnkey_organization_id or 'NOT SET'}
- API Keys Configured: {'✅ Yes' if has_turnkey_keys else '❌ No'}
- API URL: {wallet_manager.turnkey_api_base_url}
"""

        if has_turnkey_keys:
            diagnosis += """

✅ **Ready for automated transaction signing**
- Can create API keys for delegated users
- Can sign transactions directly
- Can execute swaps automatically
"""
        else:
            diagnosis += """

⚠️ **Limited functionality without Turnkey API keys**

**To enable full automation:**
1. Run: python generate_api_keys.py
2. Add the generated keys to your .env file
3. Ensure you have a delegated user ID from Turnkey
"""

        try:
            _ = wallet_manager._make_solana_rpc_request("getHealth")
            diagnosis += "\n✅ **Solana RPC connection healthy**"
        except:
            diagnosis += "\n❌ **Solana RPC connection failed**"

        return diagnosis

    except Exception as e:
        return f"""
❌ **Diagnosis Failed**

Error: {str(e)}

**Quick troubleshooting:**
1. Check your .env configuration
2. Verify DELEGATED_WALLET_ADDRESS is a valid Solana address
3. Ensure TURNKEY_ORGANIZATION_ID is set
4. Run generate_api_keys.py if you haven't already
"""

SYSTEM_PROMPT = """
You are a Jupiter Swap Agent that helps users perform token swaps on Solana using a delegated wallet.

Your capabilities:
1. Check wallet balance
2. Get real-time token prices
3. Execute Jupiter swaps with USD amounts (buy/sell tokens)
4. Execute direct SOL/token swaps with native amounts
5. Get token information
6. Setup API keys for delegated users
7. Diagnose wallet configuration issues

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

API Key Management:
- If users need to setup automated signing, guide them to use "setup api keys"
- Ensure DELEGATED_USER_ID is configured in the environment
- API keys are created without expiration for continuous operation
- Keys are used for automated transaction signing through Turnkey

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
        diagnose_wallet_setup,
        setup_api_keys,
        test_jupiter_api
    ]

    agent = create_react_agent(model, tools)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    print("🚀 Jupiter Swap Agent initialized!")
    print("💰 Delegated wallet ready for trading")
    print("Type 'help' for commands, 'exit' to quit\n")

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
                print("👋 Goodbye! ")
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
- "setup api keys" - Configure API keys for delegated user
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

            messages.append({"role": "user", "content": user_input})

            print("🤖 Agent: ", end="", flush=True)

            response = await agent.ainvoke({"messages": messages})
            ai_message = response["messages"][-1].content

            print(ai_message)

            messages.append({"role": "assistant", "content": ai_message})

        except KeyboardInterrupt:
            print("\n👋 Goodbye! ")
            break
        except Exception as e:
            print(f"❌ Error: {e}")


def main():
    """Entry point for the application."""

    required_vars = [
        "DELEGATED_WALLET_ADDRESS",
        "TURNKEY_ORGANIZATION_ID",
        "TURNKEY_API_PUBLIC_KEY",
        "TURNKEY_API_PRIVATE_KEY",
        "ANTHROPIC_API_KEY"
    ]

    missing_vars = [var for var in required_vars if not os.getenv(var)]

    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"  - {var}")
        print("\nPlease check your .env file and try again.")
        return

    try:
        if wallet_manager.health_check():
            print("✅ System connections healthy")
        else:
            print("⚠️ Some connections may not be configured")
            print("Run 'diagnose' command for details")
    except Exception as e:
        print(f"⚠️ Health check warning: {e}")
        print("The agent will still work but some features may be limited")

    try:
        asyncio.run(chat_with_agent())
    except KeyboardInterrupt:
        print("\n👋 Goodbye! ")


if __name__ == "__main__":
    main()