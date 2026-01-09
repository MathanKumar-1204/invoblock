import Web3 from "web3";

// 1. YOUR CONTRACT ADDRESS
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS; 

// 2. SEPOLIA CHAIN ID (Hexadecimal)
const SEPOLIA_CHAIN_ID = "0xaa36a7"; 

// 3. ABI
const ABI = [
	{
		"inputs": [
			{ "internalType": "uint256", "name": "_id", "type": "uint256" }
		],
		"name": "buyInvoice",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{ "internalType": "string", "name": "_dbId", "type": "string" },
			{ "internalType": "uint256", "name": "_priceInWei", "type": "uint256" },
			{ "internalType": "string", "name": "_pdfUrl", "type": "string" }
		],
		"name": "createInvoice",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{ "internalType": "uint256", "name": "_id", "type": "uint256" }
		],
		"name": "getInvoice",
		"outputs": [
			{ "internalType": "string", "name": "dbId", "type": "string" },
			{ "internalType": "uint256", "name": "price", "type": "uint256" },
			{ "internalType": "address", "name": "owner", "type": "address" },
			{ "internalType": "string", "name": "pdfUrl", "type": "string" },
			{ "internalType": "bool", "name": "isForSale", "type": "bool" }
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getInvoiceCount",
		"outputs": [
			{ "internalType": "uint256", "name": "", "type": "uint256" }
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{ "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
			{ "indexed": false, "internalType": "string", "name": "dbId", "type": "string" },
			{ "indexed": false, "internalType": "uint256", "name": "price", "type": "uint256" },
			{ "indexed": false, "internalType": "address", "name": "owner", "type": "address" }
		],
		"name": "InvoiceCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{ "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
			{ "indexed": false, "internalType": "address", "name": "newOwner", "type": "address" },
			{ "indexed": false, "internalType": "uint256", "name": "price", "type": "uint256" }
		],
		"name": "InvoicePurchased",
		"type": "event"
	}
];

export const isMetaMaskInstalled = () => {
  return typeof window !== "undefined" && window.ethereum !== undefined;
};

export const getConnectedWallet = async () => {
  if (!isMetaMaskInstalled()) return null;
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    return accounts[0];
  } catch (error) {
    console.error("User denied account access");
    return null;
  }
};

/**
 * NEW FUNCTION: Forces MetaMask to switch to Sepolia
 */
const switchToSepolia = async () => {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID }], // 11155111 in hex
    });
  } catch (error) {
    // This error code means Sepolia hasn't been added to MetaMask yet
    if (error.code === 4902) {
      alert("Please add the Sepolia Testnet to your MetaMask!");
    }
    throw error;
  }
};

// In lib/contractUtils.js

export const listInvoiceOnChain = async (invoiceId, listedPriceInEth, pdfUrl) => {
  if (!isMetaMaskInstalled()) throw new Error("MetaMask is not installed");

  await switchToSepolia();

  const web3 = new Web3(window.ethereum);
  const contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
  const account = await getConnectedWallet();

  const priceInWei = web3.utils.toWei(listedPriceInEth.toString(), "ether");
  const validPdfUrl = pdfUrl || "";

  try {
    console.log("Creating Invoice on Sepolia:", { invoiceId, priceInWei, validPdfUrl });
    
    // --- UPDATED SECTION ---
    const tx = await contract.methods
      .createInvoice(invoiceId, priceInWei, validPdfUrl)
      .send({ 
        from: account,
        // REMOVED "gas: 300000" 
        // We let MetaMask estimate it automatically. 
        // If you MUST set a limit, set it to 3000000 (3 million) just to be safe.
      });
    // -----------------------
    
    return tx;
  } catch (error) {
    console.error("Blockchain error:", error);
    throw error;
  }
};

// Add this to your existing contractUtils.js
// Add this to lib/contractUtils.js

// In lib/contractUtils.js

export const purchaseInvoiceOnChain = async (tokenId, listedPriceInEth) => {
  if (!isMetaMaskInstalled()) throw new Error("MetaMask is not installed");

  // Switch to Sepolia
  if (window.ethereum) { 
      try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: "0xaa36a7" }], 
        });
      } catch (e) {
          console.error("Could not switch network:", e);
      }
  }

  const web3 = new Web3(window.ethereum);
  const contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
  const account = await getConnectedWallet();
  const priceInWei = web3.utils.toWei(listedPriceInEth.toString(), "ether");

  try {
    console.log(`Purchasing Token ID: ${tokenId} for ${priceInWei} Wei`);

    const tx = await contract.methods
      .buyInvoice(tokenId) 
      .send({ 
        from: account,
        value: priceInWei,
        gas: 500000 // <--- FIX: Explicitly set a safe gas limit (300k-500k is usually enough)
      });
    
    return tx;
  } catch (error) {
    console.error("Purchase error details:", error);
    // If it fails here, it usually means the Token ID doesn't exist on the blockchain
    throw new Error("Transaction reverted. Check if Invoice ID exists on-chain.");
  }
};