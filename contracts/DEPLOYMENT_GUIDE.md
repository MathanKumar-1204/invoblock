# InvoiceMarketplace Smart Contract Deployment Guide

## Prerequisites

1. **MetaMask Wallet**: Install MetaMask browser extension
2. **Test ETH**: Get test ETH from a faucet for the testnet you're using
3. **Remix IDE**: Use https://remix.ethereum.org for easy deployment

## Deployment Steps

### Option 1: Deploy using Remix IDE (Recommended for Testing)

1. **Open Remix IDE**
   - Go to https://remix.ethereum.org

2. **Create Contract File**
   - Create a new file named `InvoiceMarketplace.sol`
   - Copy the entire contract code from `InvoiceMarketplace.sol`

3. **Compile Contract**
   - Select Solidity Compiler (left sidebar)
   - Choose compiler version: `0.8.0` or higher
   - Click "Compile InvoiceMarketplace.sol"

4. **Deploy Contract**
   - Select "Deploy & Run Transactions" (left sidebar)
   - Environment: Select "Injected Provider - MetaMask"
   - Connect your MetaMask wallet when prompted
   - Ensure you're on the correct network (e.g., Sepolia, Goerli)
   - Click "Deploy"
   - Confirm the transaction in MetaMask

5. **Copy Contract Address**
   - After deployment, copy the deployed contract address
   - Add it to your `.env.local` file:
     ```
     NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddressHere
     ```

### Option 2: Deploy using Hardhat

1. **Install Hardhat**
   ```bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   ```

2. **Initialize Hardhat Project**
   ```bash
   npx hardhat init
   ```

3. **Configure hardhat.config.js**
   ```javascript
   require("@nomicfoundation/hardhat-toolbox");
   require("dotenv").config();

   module.exports = {
     solidity: "0.8.0",
     networks: {
       sepolia: {
         url: process.env.SEPOLIA_RPC_URL,
         accounts: [process.env.PRIVATE_KEY]
       }
     }
   };
   ```

4. **Create Deployment Script**
   Create `scripts/deploy.js`:
   ```javascript
   async function main() {
     const InvoiceMarketplace = await ethers.getContractFactory("InvoiceMarketplace");
     const marketplace = await InvoiceMarketplace.deploy();
     await marketplace.deployed();
     console.log("InvoiceMarketplace deployed to:", marketplace.address);
   }

   main().catch((error) => {
     console.error(error);
     process.exitCode = 1;
   });
   ```

5. **Deploy**
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```

## Recommended Test Networks

### Sepolia Testnet
- **Network Name**: Sepolia
- **RPC URL**: https://sepolia.infura.io/v3/YOUR-PROJECT-ID
- **Chain ID**: 11155111
- **Block Explorer**: https://sepolia.etherscan.io
- **Faucet**: https://sepoliafaucet.com

### Goerli Testnet (Being deprecated)
- **Network Name**: Goerli
- **RPC URL**: https://goerli.infura.io/v3/YOUR-PROJECT-ID
- **Chain ID**: 5
- **Block Explorer**: https://goerli.etherscan.io
- **Faucet**: https://goerlifaucet.com

## After Deployment

1. **Update Environment Variables**
   ```bash
   # .env.local
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedContractAddress
   ```

2. **Verify Contract on Etherscan** (Optional but recommended)
   - Go to the block explorer for your network
   - Find your contract address
   - Click "Verify and Publish"
   - Follow the verification steps

3. **Install Web3 Dependencies**
   ```bash
   npm install web3
   ```

4. **Test the Integration**
   - Create an invoice as MSME
   - Have it acknowledged by buyer
   - List it for sale (this will trigger blockchain transaction)
   - Check MetaMask for transaction confirmation

## Important Notes

- **Gas Fees**: Ensure you have enough test ETH for gas fees
- **Network**: Make sure MetaMask is connected to the same network where contract is deployed
- **Contract Address**: Must be set in `.env.local` before running the application
- **Transaction Time**: Blockchain transactions may take 15-30 seconds to confirm

## Troubleshooting

### "Contract address not configured"
- Ensure `NEXT_PUBLIC_CONTRACT_ADDRESS` is set in `.env.local`
- Restart the Next.js dev server after updating `.env.local`

### "MetaMask not available"
- Install MetaMask browser extension
- Refresh the page after installation

### "Transaction failed"
- Check if you have enough test ETH for gas
- Verify you're on the correct network
- Check if the invoice ID is unique (not already listed)

### "Incorrect ETH amount" when purchasing
- Ensure the exact listed price is being sent
- Check that the price in ETH matches the blockchain listing
