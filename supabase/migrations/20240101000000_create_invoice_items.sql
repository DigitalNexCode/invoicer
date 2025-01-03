-- Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(5, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own invoice items."
    ON public.invoice_items FOR SELECT
    USING (
        invoice_id IN (
            SELECT id FROM public.invoices
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own invoice items."
    ON public.invoice_items FOR INSERT
    WITH CHECK (
        invoice_id IN (
            SELECT id FROM public.invoices
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own invoice items."
    ON public.invoice_items FOR UPDATE
    USING (
        invoice_id IN (
            SELECT id FROM public.invoices
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        invoice_id IN (
            SELECT id FROM public.invoices
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own invoice items."
    ON public.invoice_items FOR DELETE
    USING (
        invoice_id IN (
            SELECT id FROM public.invoices
            WHERE user_id = auth.uid()
        )
    );

-- Create indexes
CREATE INDEX invoice_items_invoice_id_idx ON public.invoice_items(invoice_id); 