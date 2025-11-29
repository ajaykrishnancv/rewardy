-- Add missing columns to rewards table

-- auto_approve: When true, purchases are automatically approved without parent approval
ALTER TABLE rewards
ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN DEFAULT false;

-- stock_quantity: Limited stock for rewards (null = unlimited)
ALTER TABLE rewards
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT NULL;
