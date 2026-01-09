// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SimpleInvoiceLedger
 * @dev A standalone, lightweight invoice registry. 
 * ZERO external dependencies to ensure small size and low gas.
 */
contract InvoiceLedger {
    
    // Simple event to let the frontend know an invoice is listed
    event InvoiceCreated(uint256 indexed id, string dbId, uint256 price, address owner);
    
    // Event for buying
    event InvoicePurchased(uint256 indexed id, address newOwner, uint256 price);

    struct Invoice {
        string dbId;       // The ID from Supabase
        uint256 price;     // Price in Wei
        address owner;     // Current owner (starts as MSME)
        string pdfUrl;     // Link to the document
        bool isForSale;
    }

    // Array to store all invoices
    Invoice[] public invoices;

    // Mapping to track which user owns which invoice IDs
    mapping(uint256 => address) public invoiceToOwner;

    /**
     * @dev List an invoice. 
     * Gas cost: Very Low (~100,000 gas)
     */
    function createInvoice(
        string memory _dbId, 
        uint256 _priceInWei, 
        string memory _pdfUrl
    ) public {
        // Create the invoice in memory
        Invoice memory newInvoice = Invoice({
            dbId: _dbId,
            price: _priceInWei,
            owner: msg.sender,
            pdfUrl: _pdfUrl,
            isForSale: true
        });

        // Add to storage
        invoices.push(newInvoice);
        
        uint256 newId = invoices.length - 1;
        invoiceToOwner[newId] = msg.sender;

        emit InvoiceCreated(newId, _dbId, _priceInWei, msg.sender);
    }

    /**
     * @dev Buy an invoice. 
     * Transfers ETH securely to the seller.
     */
    function buyInvoice(uint256 _id) public payable {
        require(_id < invoices.length, "Invoice does not exist");
        Invoice storage invoice = invoices[_id];
        
        require(invoice.isForSale, "Not for sale");
        require(msg.value >= invoice.price, "Not enough ETH sent");
        require(msg.sender != invoice.owner, "You already own this");

        address oldOwner = invoice.owner;

        // 1. Update ownership
        invoice.owner = msg.sender;
        invoice.isForSale = false;
        invoiceToOwner[_id] = msg.sender;

        // 2. Pay the seller
        (bool sent, ) = payable(oldOwner).call{value: msg.value}("");
        require(sent, "Failed to send Ether to seller");

        emit InvoicePurchased(_id, msg.sender, msg.value);
    }

    /**
     * @dev Fetch invoice details
     */
    function getInvoice(uint256 _id) public view returns (
        string memory dbId, 
        uint256 price, 
        address owner, 
        string memory pdfUrl, 
        bool isForSale
    ) {
        require(_id < invoices.length, "Invoice does not exist");
        Invoice memory i = invoices[_id];
        return (i.dbId, i.price, i.owner, i.pdfUrl, i.isForSale);
    }
    
    // Get total count (useful for frontend loops)
    function getInvoiceCount() public view returns (uint256) {
        return invoices.length;
    }
}