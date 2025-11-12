#!/bin/bash

# Jupiter Swap Agent Setup Script

set -e

echo "🚀 Setting up Jupiter Swap Agent..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed. Please install Python 3.8+ and try again."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual configuration before running the agent"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration:"
echo "   - ANTHROPIC_API_KEY: Your Claude API key"
echo "   - WALLET_API_KEY: API key for wallet delegation service"
echo "   - DELEGATED_WALLET_ADDRESS: Your delegated wallet address"
echo ""
echo "2. Ensure wallet delegation service is running:"
echo "   cd ../solana-wallet-delegation && npm run dev"
echo ""
echo "3. Start the agent:"
echo "   source venv/bin/activate && python main.py"
echo ""
echo "Happy trading! 🎯"