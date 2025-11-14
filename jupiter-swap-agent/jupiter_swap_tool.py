"""
Jupiter Swap Tool for the AI Agent

This module provides functionality to execute Jupiter swaps
through the delegated wallet system.
"""

import requests
import json
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class JupiterSwapTool:
    """Tool for executing Jupiter swaps via delegated wallet."""

    def __init__(self, wallet_manager):
        self.wallet_manager = wallet_manager

    def get_token_price(self, token_symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get current token price from Jupiter Price API.

        Args:
            token_symbol: Symbol of the token (e.g., "SOL", "BONK")

        Returns:
            Price data dictionary or None if not found
        """
        try:
            # Common token mint addresses
            token_mints = {
                "SOL": "So11111111111111111111111111111111111111112",
                "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                "BONK": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
                "WIF": "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
                "JTO": "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
                "JUP": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
            }

            mint_address = token_mints.get(token_symbol.upper())
            if not mint_address:
                return None

            response = requests.get(
                "https://api.jup.ag/price/v2",
                params={"ids": mint_address},
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                token_data = data.get("data", {}).get(mint_address, {})
                if token_data:
                    return {
                        "price": token_data.get("price"),
                        "mint": mint_address,
                        "symbol": token_symbol.upper()
                    }

        except Exception as e:
            logger.error(f"Error fetching token price: {e}")

        return None

    def get_token_info(self, token_address: str) -> Dict[str, Any]:
        """
        Get token information from Jupiter Token List API.

        Args:
            token_address: Mint address of the token

        Returns:
            Token information dictionary
        """
        try:
            response = requests.get(
                f"https://tokens.jup.ag/tokens/{token_address}",
                timeout=10
            )

            if response.status_code == 200:
                return response.json()

        except Exception as e:
            logger.error(f"Error fetching token info: {e}")

        return {
            "symbol": "Unknown",
            "name": "Unknown Token",
            "decimals": 9
        }

    def execute_swap(
        self,
        action: str,
        token_symbol: str,
        token_address: str,
        amount_usd: float,
        slippage_bps: int = 50
    ) -> Dict[str, Any]:
        """
        Execute a Jupiter swap through the delegated wallet.

        Args:
            action: "BUY" or "SELL"
            token_symbol: Symbol of the token
            token_address: Mint address of the token
            amount_usd: Amount in USD to trade
            slippage_bps: Slippage tolerance in basis points

        Returns:
            Result dictionary with success status and details
        """
        try:
            # Determine input and output mints
            sol_mint = "So11111111111111111111111111111111111111112"

            if action.upper() == "BUY":
                input_mint = sol_mint
                output_mint = token_address
            else:  # SELL
                input_mint = token_address
                output_mint = sol_mint

            # Calculate token amount
            if action.upper() == "BUY":
                # Get SOL price to convert USD to lamports
                sol_price_data = self.get_token_price("SOL")
                if not sol_price_data:
                    raise Exception("Could not fetch SOL price")

                sol_amount = amount_usd / sol_price_data["price"]
                amount = int(sol_amount * 10**9)  # Convert to lamports
            else:
                # For selling, we need to get the token price
                token_price_data = self.get_token_price(token_symbol)
                if not token_price_data:
                    raise Exception(f"Could not fetch {token_symbol} price")

                token_amount = amount_usd / token_price_data["price"]
                # Get token info to determine decimals
                token_info = self.get_token_info(token_address)
                decimals = token_info.get("decimals", 9)
                amount = int(token_amount * (10 ** decimals))

            # Prepare swap parameters
            swap_params = {
                "inputMint": input_mint,
                "outputMint": output_mint,
                "amount": amount,
                "slippageBps": slippage_bps,
                "userPublicKey": self.wallet_manager.delegated_wallet_address,
                "tradingDecision": {
                    "action": action.upper(),
                    "tokenSymbol": token_symbol,
                    "tokenAddress": token_address,
                    "amountUsd": amount_usd,
                    "source": "jupiter_swap_agent"
                }
            }

            # Execute the swap via delegated wallet API
            result = self.wallet_manager.execute_swap(swap_params)

            if result.get("success"):
                return {
                    "success": True,
                    "transaction_hash": result.get("transactionHash"),
                    "executed_amount": amount,
                    "received_amount": result.get("receivedAmount"),
                    "action": action.upper(),
                    "token_symbol": token_symbol,
                    "amount_usd": amount_usd
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", "Unknown error"),
                    "details": result.get("details")
                }

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Error executing swap: {e}\nDetails: {error_details}")
            return {
                "success": False,
                "error": str(e),
                "error_details": error_details
            }

    def execute_sol_swap(
        self,
        action: str,
        token_symbol: str,
        token_address: str,
        sol_amount: float = None,
        token_amount: float = None,
        slippage_bps: int = 50
    ) -> Dict[str, Any]:
        """
        Execute a Jupiter swap using SOL or token amounts directly.

        Args:
            action: "BUY" (SOL->Token) or "SELL" (Token->SOL)
            token_symbol: Symbol of the token
            token_address: Mint address of the token
            sol_amount: Amount of SOL to swap (for BUY actions)
            token_amount: Amount of tokens to swap (for SELL actions)
            slippage_bps: Slippage tolerance in basis points

        Returns:
            Result dictionary with success status and details
        """
        try:
            # Determine input and output mints
            sol_mint = "So11111111111111111111111111111111111111112"

            if action.upper() == "BUY":
                if sol_amount is None:
                    raise Exception("sol_amount is required for BUY action")

                input_mint = sol_mint
                output_mint = token_address
                amount = int(sol_amount * 10**9)  # Convert SOL to lamports

            else:  # SELL
                if token_amount is None:
                    raise Exception("token_amount is required for SELL action")

                input_mint = token_address
                output_mint = sol_mint

                # Get token info to determine decimals
                token_info = self.get_token_info(token_address)
                decimals = token_info.get("decimals", 9)
                amount = int(token_amount * (10 ** decimals))

            # Prepare swap parameters
            swap_params = {
                "inputMint": input_mint,
                "outputMint": output_mint,
                "amount": amount,
                "slippageBps": slippage_bps,
                "userPublicKey": self.wallet_manager.delegated_wallet_address,
                "tradingDecision": {
                    "action": action.upper(),
                    "tokenSymbol": token_symbol,
                    "tokenAddress": token_address,
                    "solAmount": sol_amount if action.upper() == "BUY" else None,
                    "tokenAmount": token_amount if action.upper() == "SELL" else None,
                    "source": "jupiter_swap_agent_sol"
                }
            }

            # Execute the swap via delegated wallet API
            result = self.wallet_manager.execute_swap(swap_params)

            if result.get("success"):
                return {
                    "success": True,
                    "transaction_hash": result.get("transactionHash"),
                    "executed_amount": amount,
                    "received_amount": result.get("receivedAmount"),
                    "action": action.upper(),
                    "token_symbol": token_symbol,
                    "sol_amount": sol_amount,
                    "token_amount": token_amount
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", "Unknown error"),
                    "details": result.get("details")
                }

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Error executing SOL swap: {e}\nDetails: {error_details}")
            return {
                "success": False,
                "error": str(e),
                "error_details": error_details
            }

    def get_quote(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        slippage_bps: int = 50
    ) -> Optional[Dict[str, Any]]:
        """
        Get a quote for a swap from Jupiter Quote API.

        Args:
            input_mint: Input token mint address
            output_mint: Output token mint address
            amount: Amount in token's smallest unit
            slippage_bps: Slippage tolerance in basis points

        Returns:
            Quote data or None if failed
        """
        try:
            params = {
                "inputMint": input_mint,
                "outputMint": output_mint,
                "amount": amount,
                "slippageBps": slippage_bps
            }

            response = requests.get(
                "https://lite-api.jup.ag/swap/v1/quote",
                params=params,
                timeout=10
            )

            if response.status_code == 200:
                return response.json()

        except Exception as e:
            logger.error(f"Error getting quote: {e}")

        return None