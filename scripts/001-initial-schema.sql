-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE transaction_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');
CREATE TYPE transaction_type AS ENUM ('SEND', 'RECEIVE', 'PAYMENT_LINK', 'BILL_PAYMENT');
CREATE TYPE notification_type AS ENUM ('TRANSACTION', 'PAYMENT_REQUEST', 'SECURITY', 'SYSTEM');
CREATE TYPE account_type AS ENUM ('SAVINGS', 'CHECKING', 'CREDIT');

-- Users table (extends auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    country_code TEXT DEFAULT 'IN',
    preferred_language TEXT DEFAULT 'en',
    preferred_currency TEXT DEFAULT 'INR',
    is_verified BOOLEAN DEFAULT FALSE,
    biometric_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank accounts table
CREATE TABLE public.bank_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ifsc_code TEXT, -- For Indian banks
    routing_number TEXT, -- For US banks
    account_type account_type DEFAULT 'SAVINGS',
    balance DECIMAL(15,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'INR',
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- UPI IDs table
CREATE TABLE public.upi_ids (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    upi_id TEXT UNIQUE NOT NULL,
    provider TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transaction_id TEXT UNIQUE NOT NULL,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    receiver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    exchange_rate DECIMAL(10,6),
    converted_amount DECIMAL(15,2),
    transaction_type transaction_type NOT NULL,
    status transaction_status DEFAULT 'PENDING',
    payment_method TEXT DEFAULT 'UPI',
    gateway_transaction_id TEXT,
    gateway_response JSONB,
    note TEXT,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment links table
CREATE TABLE public.payment_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    link_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    is_fixed_amount BOOLEAN DEFAULT TRUE,
    min_amount DECIMAL(15,2),
    max_amount DECIMAL(15,2),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    max_usage INTEGER,
    success_url TEXT,
    cancel_url TEXT,
    webhook_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment link transactions table
CREATE TABLE public.payment_link_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    payment_link_id UUID REFERENCES public.payment_links(id) ON DELETE CASCADE NOT NULL,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
    payer_email TEXT,
    payer_name TEXT,
    payer_phone TEXT,
    amount_paid DECIMAL(15,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status transaction_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions table for device management
CREATE TABLE public.user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Biometric tokens table
CREATE TABLE public.biometric_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    device_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    public_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exchange rates table
CREATE TABLE public.exchange_rates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate DECIMAL(10,6) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_currency, to_currency)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_bank_accounts_user_id ON public.bank_accounts(user_id);
CREATE INDEX idx_upi_ids_user_id ON public.upi_ids(user_id);
CREATE INDEX idx_upi_ids_upi_id ON public.upi_ids(upi_id);
CREATE INDEX idx_transactions_sender_id ON public.transactions(sender_id);
CREATE INDEX idx_transactions_receiver_id ON public.transactions(receiver_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX idx_payment_links_user_id ON public.payment_links(user_id);
CREATE INDEX idx_payment_links_link_id ON public.payment_links(link_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_biometric_tokens_user_id ON public.biometric_tokens(user_id);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_upi_ids_updated_at BEFORE UPDATE ON public.upi_ids FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_links_updated_at BEFORE UPDATE ON public.payment_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
