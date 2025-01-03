-- Remove the client_phone column if it exists
ALTER TABLE public.invoices
DROP COLUMN IF EXISTS client_phone;

-- Ensure all necessary columns are present
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS client_id UUID,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS client_email TEXT,
ADD COLUMN IF NOT EXISTS client_company TEXT,
ADD COLUMN IF NOT EXISTS number TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT,
ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS items JSONB,
ADD COLUMN IF NOT EXISTS total DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS company_details TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS logo TEXT;

-- Add any missing constraints
ALTER TABLE public.invoices
ADD CONSTRAINT invoices_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

