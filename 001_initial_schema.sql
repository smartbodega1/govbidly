-- ============================================================
-- GovDeal Finder — Database Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Contracts table (cached from sam.gov)
-- ============================================================
CREATE TABLE contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  notice_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  sol_number TEXT,
  department TEXT,
  sub_tier TEXT,
  office TEXT,
  posted_date DATE NOT NULL,
  response_deadline TIMESTAMPTZ,
  type TEXT NOT NULL DEFAULT 'Unknown',
  set_aside TEXT,
  naics_code TEXT,
  naics_description TEXT,
  classification_code TEXT,
  place_of_performance_state TEXT,
  place_of_performance_city TEXT,
  award_amount NUMERIC,
  point_of_contact_name TEXT,
  point_of_contact_email TEXT,
  link TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast filtering
CREATE INDEX idx_contracts_posted_date ON contracts(posted_date DESC);
CREATE INDEX idx_contracts_state ON contracts(place_of_performance_state);
CREATE INDEX idx_contracts_naics ON contracts(naics_code);
CREATE INDEX idx_contracts_set_aside ON contracts(set_aside);
CREATE INDEX idx_contracts_type ON contracts(type);
CREATE INDEX idx_contracts_active ON contracts(active);
CREATE INDEX idx_contracts_deadline ON contracts(response_deadline);
CREATE INDEX idx_contracts_amount ON contracts(award_amount);

-- Full-text search index
ALTER TABLE contracts ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(department, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(naics_description, '')), 'C')
  ) STORED;

CREATE INDEX idx_contracts_fts ON contracts USING GIN(fts);

-- ============================================================
-- User profiles (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro', 'agency')),
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('trialing', 'active', 'canceled', 'past_due', 'inactive')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  trial_ends_at TIMESTAMPTZ,
  searches_today INTEGER DEFAULT 0,
  searches_reset_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX idx_profiles_subscription ON profiles(subscription_tier, subscription_status);

-- ============================================================
-- Saved searches
-- ============================================================
CREATE TABLE saved_searches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  alert_enabled BOOLEAN DEFAULT false,
  alert_frequency TEXT DEFAULT 'daily' CHECK (alert_frequency IN ('daily', 'weekly')),
  last_alerted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_alerts ON saved_searches(alert_enabled, alert_frequency);

-- ============================================================
-- Alert log
-- ============================================================
CREATE TABLE alert_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  saved_search_id UUID REFERENCES saved_searches(id) ON DELETE CASCADE NOT NULL,
  contract_ids TEXT[] DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT false
);

CREATE INDEX idx_alert_logs_user ON alert_logs(user_id);

-- ============================================================
-- Email waitlist (pre-launch)
-- ============================================================
CREATE TABLE waitlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'landing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Sync log (track sam.gov data pulls)
-- ============================================================
CREATE TABLE sync_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_fetched INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;

-- Contracts are publicly readable
CREATE POLICY "Contracts are viewable by everyone" ON contracts
  FOR SELECT USING (true);

-- Profiles: users can only see/edit their own
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Saved searches: users own their searches
CREATE POLICY "Users can CRUD own saved searches" ON saved_searches
  FOR ALL USING (auth.uid() = user_id);

-- Alert logs: users see their own
CREATE POLICY "Users can view own alerts" ON alert_logs
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- Functions
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NOW() + INTERVAL '5 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Reset daily search count
CREATE OR REPLACE FUNCTION reset_daily_searches()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET searches_today = 0, searches_reset_at = CURRENT_DATE
  WHERE searches_reset_at < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
