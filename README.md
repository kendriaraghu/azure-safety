# Azure Safety

A fully homomorphic encryption (FHE) enabled construction site safety management system built on FHEVM. This project demonstrates how to build privacy-preserving applications using encrypted data on the blockchain.

## 🎯 Overview

Azure Safety is a decentralized application (dApp) that manages encrypted safety scores for construction sites. It leverages FHEVM to enable computations on encrypted data without revealing sensitive information, ensuring privacy while maintaining transparency and accountability.

### Key Features

- 🔐 **Encrypted Safety Scores**: User safety scores are stored and computed in encrypted form using FHEVM
- 📊 **Segment-Based Management**: Organize users into segments with customizable thresholds
- 👥 **Admin Controls**: Role-based access control for managing segments, thresholds, and users
- 📈 **Aggregate Calculations**: Compute aggregate safety metrics across multiple segments
- 🎨 **Modern UI**: Built with Next.js 15, React 19, and Tailwind CSS
- 🔄 **Dual Mode Support**: Development with local mock relayer or production with real relayer

## 🏗️ Architecture

The project consists of two main components:

1. **Smart Contracts** (`fhevm-hardhat-template/`): Solidity contracts using FHEVM for encrypted computations
2. **Frontend** (`azure-safety-frontend/`): Next.js application with wallet integration and FHEVM relayer support

## 📋 Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Version 7.0.0 or higher
- **Git**: For cloning the repository
- **MetaMask** or compatible Web3 wallet (for frontend interaction)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/kendriaraghu/azure-safety.git
cd azure-safety
```

### 2. Install Dependencies

#### Smart Contracts

```bash
cd fhevm-hardhat-template
npm install
```

#### Frontend

```bash
cd ../azure-safety-frontend
npm install
```

### 3. Configure Environment Variables

#### For Smart Contracts

```bash
cd fhevm-hardhat-template

# Set your mnemonic phrase
npx hardhat vars set MNEMONIC

# Set Infura API key for network access
npx hardhat vars set INFURA_API_KEY

# Optional: Set Etherscan API key for contract verification
npx hardhat vars set ETHERSCAN_API_KEY
```

### 4. Compile and Test Contracts

```bash
cd fhevm-hardhat-template

# Compile contracts
npm run compile

# Run tests
npm run test
```

### 5. Deploy Contracts

#### Local Development

```bash
# Start local Hardhat node with FHEVM support
npx hardhat node

# In another terminal, deploy to localhost
npx hardhat deploy --network localhost
```

#### Sepolia Testnet

```bash
# Deploy to Sepolia
npx hardhat deploy --network sepolia

# Verify contract (optional)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### 6. Run Frontend

#### Development Mode with Mock Relayer (Local)

```bash
cd azure-safety-frontend

# Ensure Hardhat node is running, then:
npm run dev:mock
```

This will:
- Check if Hardhat node is running
- Generate ABI and address mappings
- Start Next.js dev server with mock relayer

#### Development Mode with Real Relayer (Testnet)

```bash
cd azure-safety-frontend

# Generate ABI and start dev server
npm run dev
```

The frontend will automatically detect the network and use the appropriate relayer:
- `chainId=31337` (localhost) → Mock relayer
- Other networks → Real relayer (CDN-loaded)

#### Build for Production

```bash
cd azure-safety-frontend

# Check static export compliance
npm run check:static

# Build static site
npm run build
```

The static site will be generated in the `out/` directory.

## 📁 Project Structure

```
azure-safety/
├── fhevm-hardhat-template/      # Smart contracts and deployment
│   ├── contracts/               # Solidity source files
│   │   ├── AzureSafety.sol      # Main safety management contract
│   │   └── FHECounter.sol       # Example FHE counter contract
│   ├── deploy/                  # Deployment scripts
│   ├── test/                    # Test files
│   ├── tasks/                   # Hardhat custom tasks
│   └── types/                   # TypeScript type definitions
│
├── azure-safety-frontend/        # Next.js frontend application
│   ├── app/                     # Next.js app directory
│   │   ├── admin/               # Admin management pages
│   │   ├── dashboard/           # User dashboard
│   │   ├── aggregation/         # Aggregate calculations
│   │   └── report/              # Reporting pages
│   ├── components/              # React components
│   ├── hooks/                   # Custom React hooks
│   ├── fhevm/                   # FHEVM integration layer
│   ├── scripts/                 # Build and utility scripts
│   └── abi/                     # Generated contract ABIs
│
└── README.md                    # This file
```

## 🔧 Available Scripts

### Smart Contracts

| Script | Description |
|--------|-------------|
| `npm run compile` | Compile all contracts |
| `npm run test` | Run all tests |
| `npm run test:sepolia` | Run tests on Sepolia testnet |
| `npm run coverage` | Generate coverage report |
| `npm run lint` | Run linting checks |
| `npm run clean` | Clean build artifacts |

### Frontend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (real relayer) |
| `npm run dev:mock` | Start dev server (mock relayer) |
| `npm run build` | Build static site |
| `npm run genabi` | Generate ABI and address mappings |
| `npm run check:static` | Verify static export compliance |
| `npm run lint` | Run ESLint |

## 🔐 Security Features

- **Encrypted Storage**: All safety scores stored as `euint32` (encrypted uint32)
- **Privacy-Preserving Computations**: Operations performed on encrypted data
- **Access Control**: Admin-only functions for critical operations
- **Threshold Management**: Configurable safety thresholds per segment
- **Event Logging**: Immutable event history for audit trails

## 🌐 Network Support

- **Localhost**: Development with Hardhat node and mock relayer
- **Sepolia**: Testnet deployment with real relayer
- **Ethereum Mainnet**: Production deployment (configure as needed)

## 📚 Documentation

### Smart Contracts

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Setup Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [FHEVM Testing Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat/write_test)

### Frontend

- [Next.js Documentation](https://nextjs.org/docs)
- [FHEVM Relayer SDK](https://docs.zama.ai/fhevm/relayer-sdk)
- [Ethers.js Documentation](https://docs.ethers.org/)

## 🧪 Testing

### Contract Tests

```bash
cd fhevm-hardhat-template

# Run all tests
npm run test

# Run specific test file
npx hardhat test test/AzureSafety.ts

# Run with coverage
npm run coverage
```

### Frontend Testing

The frontend uses static export and client-side rendering. Test by:
1. Building the project: `npm run build`
2. Verifying static export: `npm run check:static`
3. Testing in browser with wallet connected

## 🛠️ Development

### Adding New Features

1. **Smart Contracts**: Add new contracts in `fhevm-hardhat-template/contracts/`
2. **Frontend**: Add components in `azure-safety-frontend/components/` and pages in `app/`
3. **ABI Generation**: Run `npm run genabi` in frontend directory after contract changes

### Code Style

- **Solidity**: Follow Solidity style guide, use Prettier
- **TypeScript/React**: Follow Next.js conventions, use ESLint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](fhevm-hardhat-template/LICENSE) file for details.

## 🆘 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/kendriaraghu/azure-safety/issues)
- **FHEVM Documentation**: [docs.zama.ai](https://docs.zama.ai)
- **Zama Community**: [Discord](https://discord.gg/zama)

## 🙏 Acknowledgments

- Built with [FHEVM](https://github.com/zama-ai/fhevm) by Zama
- Uses [Hardhat](https://hardhat.org/) for smart contract development
- Frontend powered by [Next.js](https://nextjs.org/) and [React](https://react.dev/)

---

**Built with ❤️ using FHEVM**
