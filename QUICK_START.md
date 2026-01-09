# Quick Start Guide - Blockchain Integration

## Current Issue: "Nothing happens when clicking List for Sale"

This is likely because the blockchain smart contract is not deployed yet. Here's what you need to do:

## Step 1: Install Web3 Package
```bash
npm install web3
```

## Step 2: Add Database Column
Run this SQL in your Supabase SQL Editor:
```sql
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS blockchain_tx_hash TEXT;
```

## Step 3: Deploy Smart Contract

### Option A: Quick Deploy with Remix (Recommended)

1. **Install MetaMask**
   - Go to https://metamask.io/download/
   - Install the browser extension
   - Create or import a wallet

2. **Get Test ETH**
   - Switch MetaMask to Sepolia Testnet
   - Go to https://sepoliafaucet.com
   - Enter your wallet address and get free test ETH

3. **Deploy Contract**
   - Open https://remix.ethereum.org
   - Create new file: `InvoiceMarketplace.sol`
   - Copy the contract code from `contracts/InvoiceMarketplace.sol`
   - Click "Solidity Compiler" → Select version 0.8.0+ → Compile
   - Click "Deploy & Run" → Environment: "Injected Provider - MetaMask"
   - Click "Deploy" → Confirm in MetaMask
   - **Copy the deployed contract address**

## Step 4: Configure Environment Variables

Create or update `.env.local` in your project root:
```bash
# Your existing Supabase config
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Add this - paste your deployed contract address
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddressHere
```

## Step 5: Restart Development Server
```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

## Testing the Integration

1. **Create Invoice as MSME**
   - Login as MSME user
   - Upload invoice details

2. **Approve as Buyer**
   - Login as Buyer user
   - Approve the invoice (status → Acknowledged)

3. **List on Blockchain as MSME**
   - Login as MSME
   - Click "List for sale" button
   - Check browser console for logs (F12 → Console)
   - MetaMask popup should appear
   - Confirm transaction

## Troubleshooting

### "Nothing happens" - Check Console Logs
Press F12 → Console tab, then click "List for sale". You'll see logs like:
- `handleListForSale called with:` - Function was triggered
- `Invoice data:` - Shows invoice status
- `Contract address:` - Shows if contract is configured

### Common Issues:

**"Smart contract not configured"**
- ✅ Solution: Add `NEXT_PUBLIC_CONTRACT_ADDRESS` to `.env.local`
- ✅ Restart dev server after adding

**"MetaMask is not installed"**
- ✅ Solution: Install MetaMask browser extension
- ✅ Refresh page after installation

**"Invoice must be acknowledged by buyer"**
- ✅ Solution: Login as Buyer and approve the invoice first
- ✅ Status should be "Acknowledged" (blue badge)

**"Please connect your MetaMask wallet"**
- ✅ Solution: Click MetaMask extension → Connect to site
- ✅ Refresh the page

**"Insufficient ETH for gas fees"**
- ✅ Solution: Get test ETH from faucet
- ✅ URL: https://sepoliafaucet.com

**"Transaction failed" or "User denied"**
- ✅ Solution: Check you have enough test ETH
- ✅ Try again and approve in MetaMask

## Verify Everything Works

1. Check browser console - should see detailed logs
2. Check MetaMask - should prompt for transaction
3. Check message display - should show progress/errors
4. Check invoice status - should change to "Tokenized" after success

## For Testing Without Blockchain (Temporary)

If you want to test the UI without deploying the contract, you can temporarily comment out the blockchain call:

In `src/app/dashboard/msme/page.js`, find this line (around line 221):
```javascript
const txReceipt = await listInvoiceOnChain(invoiceId, listedPrice);
```

Temporarily replace with:
```javascript
// Temporary mock for testing
const txReceipt = { 
  transactionHash: '0x' + Math.random().toString(36).substring(2, 15)
};
```

**Remember to remove this mock after deploying the real contract!**
