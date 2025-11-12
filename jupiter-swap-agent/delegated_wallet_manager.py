"""
Delegated Wallet Manager

This module manages interactions with the Turnkey delegated wallet system
for executing Jupiter swaps with policy enforcement.
"""

import requests
import json
import os
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class DelegatedWalletManager:
    """Manager for delegated wallet operations."""

    def __init__(self, api_url: str, api_key: str, delegated_wallet_address: str):
        """
        Initialize the delegated wallet manager.

        Args:
            api_url: Base URL for the wallet delegation API
            api_key: API key for authentication
            delegated_wallet_address: Public key of the delegated wallet
        """
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key
        self.delegated_wallet_address = delegated_wallet_address

        # Validate required parameters
        if not all([api_url, api_key, delegated_wallet_address]):
            raise ValueError("All parameters (api_url, api_key, delegated_wallet_address) are required")

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """
        Make an authenticated request to the wallet API.

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            **kwargs: Additional request parameters

        Returns:
            Response JSON data

        Raises:
            Exception: If request fails
        """
        url = f"{self.api_url}/{endpoint.lstrip('/')}"

        headers = {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key
        }

        if 'headers' in kwargs:
            headers.update(kwargs.pop('headers'))

        kwargs['headers'] = headers
        kwargs['timeout'] = kwargs.get('timeout', 30)

        try:
            response = requests.request(method, url, **kwargs)

            if response.status_code not in [200, 201]:
                error_data = {}
                try:
                    error_data = response.json()
                except:
                    pass

                error_msg = error_data.get('error', f"HTTP {response.status_code}")
                details = error_data.get('details', response.text or 'No details')

                raise Exception(f"API request failed: {error_msg} - {details}")

            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {e}")
            raise Exception(f"Request failed: {str(e)}")

    def health_check(self) -> bool:
        """
        Check if the wallet delegation service is running and accessible.

        Returns:
            True if service is healthy

        Raises:
            Exception: If health check fails
        """
        try:
            # Health check doesn't need authentication
            url = f"{self.api_url}/health"
            response = requests.get(url, timeout=10)

            if response.status_code == 200:
                data = response.json()
                return data.get('status') == 'healthy'
            else:
                raise Exception(f"Health check returned status {response.status_code}")

        except Exception as e:
            raise Exception(f"Health check failed: {str(e)}")

    def get_sol_balance(self) -> float:
        """
        Get the current SOL balance of the delegated wallet.

        Returns:
            SOL balance as a float

        Raises:
            Exception: If balance fetch fails
        """
        try:
            response = self._make_request(
                'GET',
                f'/wallet/balance/{self.delegated_wallet_address}'
            )
            balance_lamports = response.get('balance', 0)
            return balance_lamports / 10**9  # Convert lamports to SOL
        except Exception as e:
            logger.error(f"Error fetching SOL balance: {e}")

            # If it's a 404, provide helpful guidance
            if "404" in str(e):
                raise Exception(
                    f"Wallet balance endpoint not found. "
                    f"Please ensure the wallet delegation service is properly configured "
                    f"and the wallet address {self.delegated_wallet_address} is set up correctly."
                )
            raise

    def get_token_balance(self, token_mint: str) -> float:
        """
        Get the balance of a specific token in the delegated wallet.

        Args:
            token_mint: Mint address of the token

        Returns:
            Token balance as a float

        Raises:
            Exception: If balance fetch fails
        """
        try:
            response = self._make_request(
                'GET',
                f'/wallet/token-balance/{self.delegated_wallet_address}/{token_mint}'
            )
            return response.get('balance', 0)
        except Exception as e:
            logger.error(f"Error fetching token balance: {e}")
            raise

    def execute_swap(self, swap_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a Jupiter swap through the delegated wallet.

        Args:
            swap_params: Swap parameters including:
                - inputMint: Input token mint address
                - outputMint: Output token mint address
                - amount: Amount to swap (in smallest units)
                - slippageBps: Slippage tolerance in basis points
                - walletAddress: Delegated wallet public key
                - organizationId: Turnkey organization ID

        Returns:
            Swap execution result

        Raises:
            Exception: If swap execution fails
        """
        try:
            logger.info(f"Executing swap: {swap_params}")

            # Convert to the format expected by the existing API
            api_params = {
                "inputMint": swap_params["inputMint"],
                "outputMint": swap_params["outputMint"],
                "amount": swap_params["amount"],
                "walletAddress": swap_params["userPublicKey"],
                "organizationId": os.getenv("TURNKEY_ORGANIZATION_ID"),
                "slippageBps": swap_params.get("slippageBps", 50),
            }

            response = self._make_request(
                'POST',
                '/swap',
                json=api_params
            )

            logger.info(f"Swap executed successfully: {response}")
            return {
                "success": True,
                "transactionHash": response.get("txHash") or response.get("transactionHash"),
                "receivedAmount": response.get("receivedAmount"),
                **response
            }

        except Exception as e:
            logger.error(f"Swap execution failed: {e}")
            # Re-raise with more context
            if "policy" in str(e).lower():
                raise Exception(f"Policy violation: {str(e)}")
            elif "insufficient" in str(e).lower():
                raise Exception(f"Insufficient balance: {str(e)}")
            else:
                raise Exception(f"Swap failed: {str(e)}")

    def get_wallet_info(self) -> Dict[str, Any]:
        """
        Get information about the delegated wallet.

        Returns:
            Wallet information dictionary

        Raises:
            Exception: If wallet info fetch fails
        """
        try:
            response = self._make_request(
                'GET',
                f'/wallet/info/{self.delegated_wallet_address}'
            )
            return response
        except Exception as e:
            logger.error(f"Error fetching wallet info: {e}")
            raise

    def get_transaction_history(self, limit: int = 10) -> Dict[str, Any]:
        """
        Get recent transaction history for the delegated wallet.

        Args:
            limit: Maximum number of transactions to return

        Returns:
            Transaction history data

        Raises:
            Exception: If history fetch fails
        """
        try:
            response = self._make_request(
                'GET',
                f'/wallet/transactions/{self.delegated_wallet_address}',
                params={'limit': limit}
            )
            return response
        except Exception as e:
            logger.error(f"Error fetching transaction history: {e}")
            raise

    def get_policy_status(self) -> Dict[str, Any]:
        """
        Get the current policy status and limits for the delegated wallet.

        Returns:
            Policy status information

        Raises:
            Exception: If policy status fetch fails
        """
        try:
            response = self._make_request(
                'GET',
                f'/policy/status/{self.delegated_wallet_address}'
            )
            return response
        except Exception as e:
            logger.error(f"Error fetching policy status: {e}")
            raise

    def validate_swap_parameters(self, swap_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate swap parameters against current policies without executing.

        Args:
            swap_params: Swap parameters to validate

        Returns:
            Validation result with any policy violations

        Raises:
            Exception: If validation request fails
        """
        try:
            response = self._make_request(
                'POST',
                '/swap/validate',
                json=swap_params
            )
            return response
        except Exception as e:
            logger.error(f"Parameter validation failed: {e}")
            raise