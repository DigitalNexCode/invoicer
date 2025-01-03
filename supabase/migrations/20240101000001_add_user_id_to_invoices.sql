-- Add user_id column to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update existing invoices to set user_id from auth.uid() if available
UPDATE public.invoices
SET user_id = auth.uid()
WHERE user_id IS NULL;

-- Make user_id NOT NULL after updating existing records
ALTER TABLE public.invoices
ALTER COLUMN user_id SET NOT NULL;

-- Enable RLS on invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invoices
CREATE POLICY "Users can view their own invoices."
    ON public.invoices FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own invoices."
    ON public.invoices FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own invoices."
    ON public.invoices FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own invoices."
    ON public.invoices FOR DELETE
    USING (user_id = auth.uid()); 