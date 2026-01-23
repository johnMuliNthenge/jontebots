-- Create app role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'subscriber');

-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'suspended', 'expired');

-- Create trading mode enum
CREATE TYPE public.trading_mode AS ENUM ('demo', 'live');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'subscriber',
    UNIQUE (user_id, role)
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    status subscription_status NOT NULL DEFAULT 'active',
    activation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create MT5 connections table (credentials encrypted at rest by Supabase)
CREATE TABLE public.mt5_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    mt5_login TEXT NOT NULL,
    mt5_password TEXT NOT NULL,
    mt5_server TEXT NOT NULL,
    trading_mode trading_mode NOT NULL DEFAULT 'demo',
    is_connected BOOLEAN NOT NULL DEFAULT false,
    last_connected_at TIMESTAMP WITH TIME ZONE,
    account_balance DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trading configurations table
CREATE TABLE public.trading_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    take_profit_usd DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    stop_loss_usd DECIMAL(10, 2),
    is_trading_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trades table for history
CREATE TABLE public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    trade_type TEXT NOT NULL,
    entry_price DECIMAL(15, 5) NOT NULL,
    exit_price DECIMAL(15, 5),
    lot_size DECIMAL(10, 4) NOT NULL,
    take_profit_usd DECIMAL(10, 2) NOT NULL,
    stop_loss_usd DECIMAL(10, 2),
    profit_loss DECIMAL(15, 2),
    status TEXT NOT NULL DEFAULT 'open',
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mt5_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to check if user subscription is active
CREATE OR REPLACE FUNCTION public.is_subscription_active(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.subscriptions
        WHERE user_id = _user_id
          AND status = 'active'
          AND expiry_date > now()
    )
$$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mt5_connections_updated_at
    BEFORE UPDATE ON public.mt5_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trading_configs_updated_at
    BEFORE UPDATE ON public.trading_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
    ON public.subscriptions FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage subscriptions"
    ON public.subscriptions FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for mt5_connections
CREATE POLICY "Users can view their own MT5 connection"
    ON public.mt5_connections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own MT5 connection"
    ON public.mt5_connections FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all MT5 connections"
    ON public.mt5_connections FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for trading_configs
CREATE POLICY "Users can view their own trading config"
    ON public.trading_configs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own trading config"
    ON public.trading_configs FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all trading configs"
    ON public.trading_configs FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for trades
CREATE POLICY "Users can view their own trades"
    ON public.trades FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades"
    ON public.trades FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all trades"
    ON public.trades FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    
    -- Create default subscription
    INSERT INTO public.subscriptions (user_id, status, activation_date, expiry_date)
    VALUES (NEW.id, 'active', now(), now() + INTERVAL '30 days');
    
    -- Assign subscriber role by default
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'subscriber');
    
    -- Create default trading config
    INSERT INTO public.trading_configs (user_id, take_profit_usd, is_trading_enabled)
    VALUES (NEW.id, 5.00, false);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();