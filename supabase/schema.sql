-- =====================================================
-- REWARDY DATABASE SCHEMA
-- Version: 2.0 - Multi-Family Architecture
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. AUTHENTICATION TABLES
-- =====================================================

-- Super Admins table
CREATE TABLE IF NOT EXISTS super_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Families table
CREATE TABLE IF NOT EXISTS families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_code VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES super_admins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Family Roles table
CREATE TABLE IF NOT EXISTS family_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('primary_parent', 'other_parent', 'observer', 'child')),
    role_label VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, role)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(100) UNIQUE NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('super_admin', 'family_role')),
    user_id UUID NOT NULL,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    is_valid BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CHILD PROFILES
-- =====================================================

CREATE TABLE IF NOT EXISTS child_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    display_name VARCHAR(50) NOT NULL,
    date_of_birth DATE,
    grade VARCHAR(20),
    avatar_url VARCHAR(255),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id)  -- One child per family for now
);

-- =====================================================
-- 3. CURRENCY & BANKING
-- =====================================================

-- Currency balances
CREATE TABLE IF NOT EXISTS currency_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
    wallet_stars INTEGER DEFAULT 0 CHECK (wallet_stars >= 0),
    savings_stars INTEGER DEFAULT 0 CHECK (savings_stars >= 0),
    gems INTEGER DEFAULT 0 CHECK (gems >= 0),
    lifetime_stars_earned INTEGER DEFAULT 0,
    lifetime_gems_earned INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(child_id)
);

-- Transaction log
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
    currency_type VARCHAR(10) NOT NULL CHECK (currency_type IN ('stars', 'gems')),
    amount INTEGER NOT NULL,
    balance_type VARCHAR(10) CHECK (balance_type IN ('wallet', 'savings')),
    transaction_type VARCHAR(30) NOT NULL,
    description TEXT,
    reference_type VARCHAR(30),
    reference_id UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Savings goals
CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_amount INTEGER NOT NULL CHECK (target_amount > 0),
    current_amount INTEGER DEFAULT 0 CHECK (current_amount >= 0),
    icon VARCHAR(10),
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interest logs
CREATE TABLE IF NOT EXISTS interest_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
    balance_before INTEGER NOT NULL,
    interest_rate DECIMAL(5,4) NOT NULL,
    interest_earned INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. SCHEDULE & TASKS
-- =====================================================

-- Schedule templates
CREATE TABLE IF NOT EXISTS schedule_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedule blocks (individual time slots)
CREATE TABLE IF NOT EXISTS schedule_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES schedule_templates(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    title VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL,
    description TEXT,
    star_value INTEGER DEFAULT 1 CHECK (star_value >= 0),
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Daily tasks (generated from schedule or bonus)
CREATE TABLE IF NOT EXISTS daily_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
    schedule_block_id UUID REFERENCES schedule_blocks(id) ON DELETE SET NULL,
    task_date DATE NOT NULL,
    title VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL,
    description TEXT,
    star_value INTEGER DEFAULT 1 CHECK (star_value >= 0),
    is_mandatory BOOLEAN DEFAULT true,
    is_bonus BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'approved', 'rejected', 'skipped')),
    completed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. REWARDS
-- =====================================================

-- Reward definitions
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cost_stars INTEGER CHECK (cost_stars >= 0),
    cost_gems INTEGER CHECK (cost_gems >= 0),
    category VARCHAR(30) DEFAULT 'standard',
    icon VARCHAR(10),
    image_url VARCHAR(255),
    is_gem_exclusive BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT true,
    daily_limit INTEGER,
    total_available INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_cost CHECK (cost_stars > 0 OR cost_gems > 0)
);

-- Reward redemptions
CREATE TABLE IF NOT EXISTS redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES rewards(id) ON DELETE SET NULL,
    cost_stars INTEGER DEFAULT 0,
    cost_gems INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID,
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    notes TEXT
);

-- =====================================================
-- 6. QUESTS & ACHIEVEMENTS
-- =====================================================

-- Quest definitions (daily/weekly challenges)
CREATE TABLE IF NOT EXISTS quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
    quest_type VARCHAR(20) NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'special')),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    reward_stars INTEGER DEFAULT 0,
    reward_gems INTEGER DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievement definitions
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    category VARCHAR(30),
    criteria JSONB NOT NULL,
    reward_gems INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unlocked achievements
CREATE TABLE IF NOT EXISTS unlocked_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(child_id, achievement_id)
);

-- =====================================================
-- 7. SKILLS & PROGRESS
-- =====================================================

-- Subject/Skill definitions
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(10),
    color VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Skill progress
CREATE TABLE IF NOT EXISTS skill_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(child_id, subject_id)
);

-- =====================================================
-- 8. STREAKS
-- =====================================================

CREATE TABLE IF NOT EXISTS streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
    streak_type VARCHAR(20) DEFAULT 'daily',
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(child_id, streak_type)
);

-- =====================================================
-- 9. SALARY SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS salary_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    base_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    pay_frequency VARCHAR(20) DEFAULT 'weekly',
    bonus_rules JSONB DEFAULT '[]',
    deduction_rules JSONB DEFAULT '[]',
    budget_allocations JSONB DEFAULT '{"save": 30, "spend": 50, "give": 20}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id)
);

CREATE TABLE IF NOT EXISTS salary_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_amount DECIMAL(10,2) NOT NULL,
    bonus_amount DECIMAL(10,2) DEFAULT 0,
    deduction_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL,
    breakdown JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. ACTIVITY LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    child_id UUID REFERENCES child_profiles(id) ON DELETE SET NULL,
    actor_role VARCHAR(30),
    action_type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token) WHERE is_valid = true;
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at) WHERE is_valid = true;
CREATE INDEX IF NOT EXISTS idx_family_roles_family ON family_roles(family_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_child_date ON daily_tasks(child_id, task_date);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_status ON daily_tasks(status);
CREATE INDEX IF NOT EXISTS idx_transactions_child ON transactions(child_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_child ON redemptions(child_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON redemptions(status);
CREATE INDEX IF NOT EXISTS idx_quests_child_dates ON quests(child_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_activity_log_family ON activity_log(family_id, created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE unlocked_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated access (we'll use application-level auth)
-- These policies allow the anon key to access data - we control access via application code

CREATE POLICY "Allow all access to families" ON families FOR ALL USING (true);
CREATE POLICY "Allow all access to family_roles" ON family_roles FOR ALL USING (true);
CREATE POLICY "Allow all access to sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all access to super_admins" ON super_admins FOR ALL USING (true);
CREATE POLICY "Allow all access to child_profiles" ON child_profiles FOR ALL USING (true);
CREATE POLICY "Allow all access to currency_balances" ON currency_balances FOR ALL USING (true);
CREATE POLICY "Allow all access to transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all access to savings_goals" ON savings_goals FOR ALL USING (true);
CREATE POLICY "Allow all access to interest_logs" ON interest_logs FOR ALL USING (true);
CREATE POLICY "Allow all access to schedule_templates" ON schedule_templates FOR ALL USING (true);
CREATE POLICY "Allow all access to schedule_blocks" ON schedule_blocks FOR ALL USING (true);
CREATE POLICY "Allow all access to daily_tasks" ON daily_tasks FOR ALL USING (true);
CREATE POLICY "Allow all access to rewards" ON rewards FOR ALL USING (true);
CREATE POLICY "Allow all access to redemptions" ON redemptions FOR ALL USING (true);
CREATE POLICY "Allow all access to quests" ON quests FOR ALL USING (true);
CREATE POLICY "Allow all access to achievements" ON achievements FOR ALL USING (true);
CREATE POLICY "Allow all access to unlocked_achievements" ON unlocked_achievements FOR ALL USING (true);
CREATE POLICY "Allow all access to subjects" ON subjects FOR ALL USING (true);
CREATE POLICY "Allow all access to skill_progress" ON skill_progress FOR ALL USING (true);
CREATE POLICY "Allow all access to streaks" ON streaks FOR ALL USING (true);
CREATE POLICY "Allow all access to salary_config" ON salary_config FOR ALL USING (true);
CREATE POLICY "Allow all access to salary_payments" ON salary_payments FOR ALL USING (true);
CREATE POLICY "Allow all access to activity_log" ON activity_log FOR ALL USING (true);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to award stars
CREATE OR REPLACE FUNCTION award_stars(
    p_child_id UUID,
    p_amount INTEGER,
    p_to_wallet BOOLEAN DEFAULT true,
    p_description TEXT DEFAULT NULL,
    p_reference_type VARCHAR(30) DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    IF p_to_wallet THEN
        UPDATE currency_balances
        SET wallet_stars = wallet_stars + p_amount,
            lifetime_stars_earned = CASE WHEN p_amount > 0 THEN lifetime_stars_earned + p_amount ELSE lifetime_stars_earned END,
            updated_at = NOW()
        WHERE child_id = p_child_id
        RETURNING wallet_stars INTO v_new_balance;
    ELSE
        UPDATE currency_balances
        SET savings_stars = savings_stars + p_amount,
            updated_at = NOW()
        WHERE child_id = p_child_id
        RETURNING savings_stars INTO v_new_balance;
    END IF;

    -- Log transaction
    INSERT INTO transactions (child_id, currency_type, amount, balance_type, transaction_type, description, reference_type, reference_id)
    VALUES (p_child_id, 'stars', p_amount, CASE WHEN p_to_wallet THEN 'wallet' ELSE 'savings' END,
            CASE WHEN p_amount > 0 THEN 'credit' ELSE 'debit' END, p_description, p_reference_type, p_reference_id);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to award gems
CREATE OR REPLACE FUNCTION award_gems(
    p_child_id UUID,
    p_amount INTEGER,
    p_description TEXT DEFAULT NULL,
    p_reference_type VARCHAR(30) DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    UPDATE currency_balances
    SET gems = gems + p_amount,
        lifetime_gems_earned = CASE WHEN p_amount > 0 THEN lifetime_gems_earned + p_amount ELSE lifetime_gems_earned END,
        updated_at = NOW()
    WHERE child_id = p_child_id
    RETURNING gems INTO v_new_balance;

    -- Log transaction
    INSERT INTO transactions (child_id, currency_type, amount, transaction_type, description, reference_type, reference_id)
    VALUES (p_child_id, 'gems', p_amount, CASE WHEN p_amount > 0 THEN 'credit' ELSE 'debit' END,
            p_description, p_reference_type, p_reference_id);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to transfer between wallet and savings
CREATE OR REPLACE FUNCTION transfer_stars(
    p_child_id UUID,
    p_amount INTEGER,
    p_to_savings BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_to_savings THEN
        -- Check wallet has enough
        IF (SELECT wallet_stars FROM currency_balances WHERE child_id = p_child_id) < p_amount THEN
            RETURN false;
        END IF;

        UPDATE currency_balances
        SET wallet_stars = wallet_stars - p_amount,
            savings_stars = savings_stars + p_amount,
            updated_at = NOW()
        WHERE child_id = p_child_id;
    ELSE
        -- Check savings has enough
        IF (SELECT savings_stars FROM currency_balances WHERE child_id = p_child_id) < p_amount THEN
            RETURN false;
        END IF;

        UPDATE currency_balances
        SET savings_stars = savings_stars - p_amount,
            wallet_stars = wallet_stars + p_amount,
            updated_at = NOW()
        WHERE child_id = p_child_id;
    END IF;

    -- Log both sides of transfer
    INSERT INTO transactions (child_id, currency_type, amount, balance_type, transaction_type, description)
    VALUES
        (p_child_id, 'stars', -p_amount, CASE WHEN p_to_savings THEN 'wallet' ELSE 'savings' END, 'transfer_out', 'Transfer'),
        (p_child_id, 'stars', p_amount, CASE WHEN p_to_savings THEN 'savings' ELSE 'wallet' END, 'transfer_in', 'Transfer');

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to apply monthly interest
CREATE OR REPLACE FUNCTION apply_monthly_interest(p_child_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_balance INTEGER;
    v_rate DECIMAL(5,4);
    v_interest INTEGER;
BEGIN
    SELECT savings_stars INTO v_balance FROM currency_balances WHERE child_id = p_child_id;

    -- Tiered interest rates
    IF v_balance >= 500 THEN
        v_rate := 0.10; -- 10%
    ELSIF v_balance >= 100 THEN
        v_rate := 0.07; -- 7%
    ELSE
        v_rate := 0.05; -- 5%
    END IF;

    v_interest := FLOOR(v_balance * v_rate);

    IF v_interest > 0 THEN
        UPDATE currency_balances
        SET savings_stars = savings_stars + v_interest,
            updated_at = NOW()
        WHERE child_id = p_child_id;

        -- Log interest
        INSERT INTO interest_logs (child_id, balance_before, interest_rate, interest_earned, balance_after)
        VALUES (p_child_id, v_balance, v_rate, v_interest, v_balance + v_interest);

        INSERT INTO transactions (child_id, currency_type, amount, balance_type, transaction_type, description)
        VALUES (p_child_id, 'stars', v_interest, 'savings', 'interest', 'Monthly interest');
    END IF;

    RETURN v_interest;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA - Initial Super Admin
-- Password: admin123 (you should change this!)
-- =====================================================

-- The hash below is for 'admin123' - CHANGE THIS IN PRODUCTION!
INSERT INTO super_admins (username, password_hash)
VALUES ('admin', '$2a$10$rQEY7FQhJJ.hEVqJFqFZQeKL8qzXqX7yqQ.ysqFZBWQGvQk9J7zXe')
ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- SEED DATA - Default Achievements
-- =====================================================

INSERT INTO achievements (code, name, description, icon, category, criteria, reward_gems, sort_order) VALUES
('first_star', 'First Star', 'Earn your very first star', '⭐', 'beginner', '{"type": "stars_earned", "value": 1}', 1, 1),
('star_collector_10', 'Star Collector', 'Earn 10 stars total', '🌟', 'beginner', '{"type": "stars_earned", "value": 10}', 2, 2),
('star_collector_100', 'Star Master', 'Earn 100 stars total', '✨', 'intermediate', '{"type": "stars_earned", "value": 100}', 5, 3),
('first_task', 'First Quest', 'Complete your first task', '📋', 'beginner', '{"type": "tasks_completed", "value": 1}', 1, 4),
('task_warrior_10', 'Task Warrior', 'Complete 10 tasks', '⚔️', 'beginner', '{"type": "tasks_completed", "value": 10}', 2, 5),
('task_master_50', 'Task Master', 'Complete 50 tasks', '🗡️', 'intermediate', '{"type": "tasks_completed", "value": 50}', 5, 6),
('streak_7', 'Week Warrior', '7 day streak', '🔥', 'streak', '{"type": "streak", "value": 7}', 3, 7),
('streak_30', 'Monthly Champion', '30 day streak', '💪', 'streak', '{"type": "streak", "value": 30}', 10, 8),
('saver_100', 'Smart Saver', 'Save 100 stars in savings', '🏦', 'economy', '{"type": "savings", "value": 100}', 3, 9),
('saver_500', 'Bank Boss', 'Save 500 stars in savings', '💰', 'economy', '{"type": "savings", "value": 500}', 10, 10),
('first_reward', 'First Treat', 'Redeem your first reward', '🎁', 'rewards', '{"type": "rewards_redeemed", "value": 1}', 1, 11),
('goal_achiever', 'Goal Getter', 'Complete a savings goal', '🎯', 'economy', '{"type": "goals_completed", "value": 1}', 5, 12)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- DONE!
-- =====================================================
