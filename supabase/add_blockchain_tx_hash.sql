-- Add blockchain transaction hash column to invoices table
-- This column stores the transaction hash when an invoice is listed on the blockchain

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS blockchain_tx_hash TEXT;

-- Add comment to document the column
COMMENT ON COLUMN invoices.blockchain_tx_hash IS 'Stores the blockchain transaction hash when invoice is tokenized on-chain';

-- Optional: Create an index for faster lookups by transaction hash
CREATE INDEX IF NOT EXISTS idx_invoices_blockchain_tx_hash 
ON invoices(blockchain_tx_hash) 
WHERE blockchain_tx_hash IS NOT NULL;
