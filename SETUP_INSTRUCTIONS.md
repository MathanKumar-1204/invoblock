# Complete Setup Instructions for Invoice Marketplace DApp

## Prerequisites

1. **Node.js** (v16 or higher)
2. **MetaMask** browser extension
3. **Access to a Web3 network** (Rinkeby, Goerli, or Sepolia testnets)

## Step 1: Install Dependencies

```bash
npm install web3
```

## Step 2: Deploy the Smart Contract

### Using Remix IDE (Recommended for beginners):

1. Go to [Remix IDE](https://remix.ethereum.org/)
2. Create a new file named `InvoiceMarketplace.sol`
3. Copy the content from `contracts/InvoiceMarketplace.sol` in your project
4. Go to the "Solidity Compiler" tab and compile with version 0.8.0 or higher
5. Go to the "Deploy & Run Transactions" tab
6. Select "Injected Provider - MetaMask" as the environment
7. Make sure MetaMask is connected to a test network (Sepolia, Goerli, etc.)
8. Click "Deploy"
9. **Save the deployed contract address** - you'll need it for the next step

### Alternative: Using Hardhat

1. Install Hardhat: `npm install --save-dev hardhat`
2. Create a `hardhat.config.js` file
3. Deploy using: `npx hardhat run scripts/deploy.js --network sepolia`

## Step 3: Update Environment Variables

Create or update your `.env.local` file:

```bash
# Supabase credentials (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# New: Blockchain contract address
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address_here
```

## Step 4: Update Database Schema

Run this SQL command in your Supabase SQL editor:

```sql
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS blockchain_tx_hash TEXT;

COMMENT ON COLUMN invoices.blockchain_tx_hash IS 'Stores the blockchain transaction hash when invoice is tokenized on-chain';
```

## Step 5: Get Test ETH for Sepolia Network

Before using the blockchain functionality, you need test ETH for gas fees:

1. Open MetaMask and make sure you're connected to the Sepolia test network
2. Visit a Sepolia faucet to get free test ETH:
   - https://sepoliafaucet.com/
   - https://sepolia-faucet.pk910.de/
3. Copy your wallet address from MetaMask
4. Paste your address on the faucet website and request test ETH
5. Wait for the transaction to complete (usually takes a few seconds to minutes)

## Step 6: Test the Application

1. **Start your Next.js development server:**
   ```bash
   npm run dev
   ```

2. **Test the flow:**
   - Create an invoice as an MSME user
   - Approve the invoice as a buyer user (status changes to "Acknowledged")
   - As the MSME user, click "List for sale" to tokenize the invoice on blockchain
   - Check that the status changes to "Tokenized" and blockchain transaction hash is stored
   - As an investor user, click "Invest" to purchase the tokenized invoice

## Troubleshooting Common Issues

### Issue: "Contract address not configured"
- **Solution:** Make sure you've set `NEXT_PUBLIC_CONTRACT_ADDRESS` in your `.env.local` file
- **Note:** After changing environment variables, you must restart your development server

### Issue: "MetaMask not installed"
- **Solution:** Install the MetaMask browser extension from metamask.io

### Issue: "Insufficient funds for gas"
- **Solution:** Make sure your MetaMask wallet has test ETH for gas fees
- Get test ETH from a faucet: https://sepoliafaucet.com/

### Issue: "Transaction rejected"
- **Solution:** Check that you're connected to the right network in MetaMask
- Make sure you have enough ETH for both the purchase amount and gas fees

### Issue: "Invoice must be acknowledged by buyer"
- **Solution:** The buyer must approve the invoice first before the MSME can list it for sale

## Verifying the Setup

### On the MSME Dashboard:
- You should see an option to "List for sale" when invoice status is "Acknowledged"
- After clicking, you should see MetaMask pop up for transaction confirmation
- Success message should include a transaction hash

### On the Investor Dashboard:
- Tokenized invoices should appear in the "Available for Investment" section
- The "Invest" button should trigger a MetaMask transaction
- After purchase, invoice status should change to "Sold"

## Additional Notes

1. **Security**: This implementation uses testnet addresses. For production, use mainnet addresses with proper security considerations.

2. **Gas Optimization**: The contract has been designed to minimize gas costs for common operations.

3. **Error Handling**: Comprehensive error handling has been implemented to provide clear feedback to users.

4. **IPFS Integration**: In a production environment, you would typically store invoice documents on IPFS rather than centralized storage.

5. **Event Listening**: You can enhance the application by listening to blockchain events for real-time updates.

## Testing the Smart Contract

The deployed contract supports these key functions:
- `createInvoiceNFT`: Creates an NFT representing an invoice
- `executeInvoiceSale`: Allows investors to purchase invoice NFTs
- `getInvoiceDetails`: Retrieves details about an invoice
- `getTokenIdByInvoiceId`: Maps invoice IDs to token IDs