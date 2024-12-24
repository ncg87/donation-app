# Donation App

This is a decentralized donation platform built using Solidity, React, and Foundry. The app allows users to connect their Ethereum wallet, make donations, and track their contributions and donor tier. It also provides functionalities for contract owners to manage funds and view statistics.

## Features

- **Wallet Integration**: Seamless connection with MetaMask for managing Ethereum transactions.
- **Donation Tracking**: View total donations, individual contributions, and donor tiers (Bronze, Silver, Gold).
- **Real-Time Updates**: Updates donation stats dynamically.
- **Contract Management**: Owners can view the contract balance, total donations, and withdraw funds.
- **Responsive Design**: Built with TailwindCSS for a clean and responsive UI.

## Technologies Used

- **Blockchain**: Ethereum smart contracts using Solidity and deployed via Foundry.
- **Frontend**: React with Vite for fast development and deployment.
- **Styling**: TailwindCSS for custom styling.
- **Ethereum Library**: Ethers.js for interacting with the Ethereum blockchain.

## Prerequisites

- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) installed.
- [Foundry](https://github.com/foundry-rs/foundry) for smart contract development.
- MetaMask extension in your browser.

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd donation-app
```
### 2. Install dependencies

```bash
pnpm install
```
### 3. Start the development server

```bash
pnpm dev
```

### 4. Deploy the Smart Contract

1. Set up your Foundry environment (foundry.toml configuration already included).
2. Compile the contract:
```bash
forge build
```
3. Deploy the contract using Foundry or any Ethereum-compatible deployment tool.

### 5. Connect Wallet and Test
Open your browser at http://localhost:3000 and connect your wallet to start donating.

# Project Structure
 - contracts: Solidity contracts for managing donations.
 - web: Frontend application built using React and Vite.
 - config: Foundry and Etherscan API configurations.
# Environment Variables
Create a .env file in the root directory with the following values:

```bash
VITE_CONTRACT_ADDRESS=<Deployed_Contract_Address>
```
# Contribution
Contributions are welcome! Please open an issue or submit a pull request.
