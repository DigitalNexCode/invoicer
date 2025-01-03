-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    company TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create invoices table with a single foreign key
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL,
    client_name TEXT NOT NULL,
    number TEXT UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE
);

-- Update invoices table
ALTER TABLE public.invoices
DROP COLUMN IF EXISTS client_email,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT,
ADD COLUMN IF NOT EXISTS items JSONB,
ADD COLUMN IF NOT EXISTS total DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS client_company TEXT;

-- Create quotes table with a single foreign key
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL,
    client_name TEXT NOT NULL,
    number TEXT UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT quotes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE
);

-- Update quotes table
ALTER TABLE public.quotes
DROP COLUMN IF EXISTS client_email,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT,
ADD COLUMN IF NOT EXISTS items JSONB,
ADD COLUMN IF NOT EXISTS total DECIMAL(10, 2);

-- Create profiles table with trigger
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    name TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create a trigger to create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

