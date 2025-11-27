# Rewardy - Product Requirements Document (PRD)

## Document Info
- **Version**: 2.1
- **Created**: November 27, 2025
- **Updated**: November 27, 2025
- **Status**: In Development - Phase 3 Complete

## Implementation Status

### Completed Features
- **Phase 1: Foundation** - 100% Complete
  - Project setup (Vite + React + Tailwind + Supabase)
  - Database schema with all tables
  - Custom authentication system (Family + Role + Password)
  - Session management with localStorage
  - Super Admin panel with family/role management
  - Printable credentials card

- **Phase 2: Core Features** - 100% Complete
  - Parent Dashboard with stats, quick actions, pending approvals
  - Child Dashboard with quests, currency display, progress
  - Observer Dashboard with permission-based UI
  - Timetable/Schedule module with weekly grid view
  - Task Management with full CRUD and approval workflow
  - Star System with balance tracking and transactions

- **Phase 3: Economy & Banking** - 90% Complete
  - Star Bank with Wallet and Savings accounts
  - Transfer functionality between accounts
  - Interest tier system (Bronze 5%, Silver 7%, Gold 10%)
  - Savings Goals with progress tracking
  - Gem currency (basic implementation)
  - Full Reward Shop with categories
  - Redemption approval workflow
  - *Deferred: Auto-approve rules, daily limits, monthly interest job*

### Remaining Phases
- **Phase 4: Gamification** - Not Started (Quests, Achievements, Streaks, Skills)
- **Phase 5: Analytics & Salary** - Not Started (Reports, Charts, Salary System)
- **Phase 6: Polish & Launch** - Not Started (PWA, Testing, Deployment)

---

## 1. Executive Summary

### 1.1 Product Overview
**Rewardy** is a multi-family web-based homeschool management and motivation platform that combines timetable scheduling, task tracking, and a gamified reward economy to make learning engaging for children while giving parents full visibility and control.

### 1.2 Goals
1. Create an engaging daily routine system for homeschooled children
2. Support multiple families with isolated data
3. Teach financial literacy through a star-based economy with savings and interest
4. Provide parents with tools to manage schedules, tasks, and rewards
5. Gamify learning through quests and achievements
6. Track progress across subjects with visual analytics

### 1.3 Target Users
- **Super Admin**: Platform administrator who onboards families
- **Primary Parent**: Main family administrator
- **Other Parent**: Secondary parent with admin access
- **Observer**: View-only access (grandparents, etc.)
- **Child**: Learner who completes tasks and earns rewards

### 1.4 Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Auth**: Custom role-based authentication (not Supabase Auth)
- **Hosting**: Netlify
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **Charts**: Recharts
- **Routing**: React Router v6

---

## 2. Authentication System

### 2.1 Overview

The system uses a **Family + Role + Password** authentication model:
- No self-registration - Super Admin onboards all families
- Each family has up to 4 roles, each with its own password
- Users login by selecting their family, role, and entering the role password

### 2.2 User Hierarchy

```
SUPER ADMIN
    │
    ├── Family: "Sharma"
    │   ├── Primary Parent (password: ****)
    │   ├── Other Parent (password: ****)
    │   ├── Observer (password: ****)
    │   └── Child (password: ****)
    │
    ├── Family: "Patel"
    │   ├── Primary Parent (password: ****)
    │   ├── Other Parent (password: ****)
    │   └── Child (password: ****)
    │
    └── Family: "Singh"
        ├── Primary Parent (password: ****)
        └── Child (password: ****)
```

### 2.3 Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         REWARDY LOGIN                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Family Name:    [  Sharma          ▼ ]  (dropdown)           │
│                                                                 │
│   Role:           [  Child           ▼ ]  (dropdown)           │
│                                                                 │
│   Password:       [  ••••••••          ]                       │
│                                                                 │
│                   [      Login      ]                           │
│                                                                 │
│   ─────────────────────────────────────                        │
│   Super Admin? [Login as Admin]                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Login Process**
```
1. User selects Family Name from dropdown (active families only)
2. User selects Role from dropdown (shows only configured roles for that family)
3. User enters Role Password
4. System validates: family + role + password combination
5. On success: Create session, redirect to role-appropriate dashboard
6. On failure: Show error "Invalid credentials"
```

### 2.4 Super Admin Login

```
┌─────────────────────────────────────────────────────────────────┐
│                      SUPER ADMIN LOGIN                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Admin Username:  [  admin              ]                      │
│                                                                 │
│   Admin Password:  [  ••••••••           ]                      │
│                                                                 │
│                    [      Login      ]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 Session Management

- Sessions stored in localStorage/sessionStorage
- Session contains: family_id, role, role_label, permissions
- Session expiry: 7 days (configurable)
- Auto-logout on expiry
- "Remember me" option for longer sessions

---

## 3. User Roles & Permissions

### 3.1 Super Admin
| Permission | Access |
|------------|--------|
| Create/edit/delete families | ✅ Full |
| Create/edit/delete family roles | ✅ Full |
| Set role passwords | ✅ Full |
| View all families | ✅ Full |
| Activate/deactivate families | ✅ Full |
| View system statistics | ✅ Full |
| Access any family data | ✅ Full |

### 3.2 Primary Parent
| Permission | Access |
|------------|--------|
| View all family data | ✅ Full |
| Create/edit schedules | ✅ Full |
| Create/edit tasks | ✅ Full |
| Award/deduct stars | ✅ Full |
| Approve task completions | ✅ Full |
| Manage reward shop | ✅ Full |
| Approve reward redemptions | ✅ Full |
| View analytics | ✅ Full |
| Configure salary system | ✅ Full |
| Edit child profile | ✅ Full |

### 3.3 Other Parent
| Permission | Access |
|------------|--------|
| View all family data | ✅ Full |
| Create/edit schedules | ✅ Full |
| Create/edit tasks | ✅ Full |
| Award/deduct stars | ✅ Full |
| Approve task completions | ✅ Full |
| Manage reward shop | ✅ Full |
| Approve reward redemptions | ✅ Full |
| View analytics | ✅ Full |
| Configure salary system | ❌ No |
| Edit child profile | ✅ Full |

### 3.4 Observer
| Permission | Access |
|------------|--------|
| View child dashboard | ✅ View only |
| View tasks | ✅ View only |
| View star balance | ✅ View only |
| View achievements | ✅ View only |
| View analytics | ✅ View only |
| Award bonus stars | ✅ Limited (max 5/day) |
| Edit anything | ❌ No |

### 3.5 Child
| Permission | Access |
|------------|--------|
| View own dashboard | ✅ Full |
| View daily tasks | ✅ Full |
| Mark tasks as complete | ✅ Submit for approval |
| View star balance | ✅ Full |
| Transfer stars (wallet/savings) | ✅ Full |
| Create savings goals | ✅ Full |
| Browse reward shop | ✅ Full |
| Request rewards | ✅ Submit for approval |
| View own achievements | ✅ Full |
| View own progress | ✅ Full |

---

## 4. Database Schema

### 4.1 Core Tables

```sql
-- Super Admin (can have multiple, but typically just one)
CREATE TABLE super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Families
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_code VARCHAR(50) UNIQUE NOT NULL,  -- URL-safe identifier
    display_name VARCHAR(100) NOT NULL,       -- Display name (e.g., "The Sharma Family")
    is_active BOOLEAN DEFAULT true,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    created_by UUID REFERENCES super_admins(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Family Roles (authentication)
CREATE TABLE family_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL,               -- 'primary_parent', 'other_parent', 'observer', 'child'
    role_label VARCHAR(50) NOT NULL,         -- Display name: "Dad", "Mom", "Grandma", "Alex"
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(family_id, role)                  -- One role per type per family
);

-- Child Profile (additional details for child role)
CREATE TABLE child_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    role_id UUID REFERENCES family_roles(id) ON DELETE CASCADE,
    date_of_birth DATE,
    grade_level VARCHAR(20),
    learning_phase INTEGER DEFAULT 1,        -- 1, 2, or 3 based on age
    interests TEXT[],
    avatar_url TEXT,
    session_length_minutes INTEGER DEFAULT 25,
    break_frequency_minutes INTEGER DEFAULT 25,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(family_id)                        -- One child per family
);

-- Sessions (custom session management)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    role_id UUID REFERENCES family_roles(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 Application Tables

```sql
-- Schedule Templates
CREATE TABLE schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(100),
    day_of_week INTEGER,                     -- 0-6, NULL for daily
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    activity_name VARCHAR(100) NOT NULL,
    activity_type VARCHAR(30),               -- 'study', 'break', 'routine', 'creative', 'physical'
    subject VARCHAR(50),
    star_value INTEGER DEFAULT 0,
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Daily Tasks
CREATE TABLE daily_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    template_id UUID REFERENCES schedule_templates(id),
    date DATE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    task_type VARCHAR(30) DEFAULT 'scheduled',  -- 'scheduled', 'habit', 'bonus', 'quest'
    category VARCHAR(50),
    star_value INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',       -- 'pending', 'submitted', 'approved', 'rejected', 'awarded'
    submitted_at TIMESTAMP,
    completed_at TIMESTAMP,
    approved_by VARCHAR(30),                    -- Role that approved
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Currency Balances
CREATE TABLE currency_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    currency_type VARCHAR(20) NOT NULL,         -- 'stars', 'gems'
    wallet_balance INTEGER DEFAULT 0,
    savings_balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(family_id, currency_type)
);

-- Savings Goals
CREATE TABLE savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_amount INTEGER NOT NULL,
    current_amount INTEGER DEFAULT 0,
    icon VARCHAR(50) DEFAULT '🎯',
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    currency_type VARCHAR(20) NOT NULL,
    amount INTEGER NOT NULL,
    transaction_type VARCHAR(30) NOT NULL,      -- 'earn', 'spend', 'transfer_to_savings', 'transfer_to_wallet', 'interest', 'bonus', 'penalty'
    category VARCHAR(50),
    description VARCHAR(200),
    balance_after INTEGER,
    related_task_id UUID REFERENCES daily_tasks(id),
    related_goal_id UUID REFERENCES savings_goals(id),
    created_by VARCHAR(30),                     -- Role that created
    created_at TIMESTAMP DEFAULT NOW()
);

-- Rewards
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    star_cost INTEGER,
    gem_cost INTEGER,
    category VARCHAR(50) DEFAULT 'quick',       -- 'quick', 'experience', 'big', 'exclusive'
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    auto_approve BOOLEAN DEFAULT false,
    daily_limit INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Redemptions
CREATE TABLE redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES rewards(id),
    stars_spent INTEGER DEFAULT 0,
    gems_spent INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',       -- 'pending', 'approved', 'rejected', 'fulfilled'
    approved_by VARCHAR(30),
    rejection_reason TEXT,
    fulfilled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Quests
CREATE TABLE quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    quest_type VARCHAR(20) NOT NULL,            -- 'daily', 'weekly', 'subject', 'special'
    title VARCHAR(100) NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL,
    star_reward INTEGER DEFAULT 0,
    gem_reward INTEGER DEFAULT 0,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Quest Progress
CREATE TABLE quest_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',        -- 'active', 'completed', 'expired'
    completed_at TIMESTAMP,
    UNIQUE(family_id, quest_id)
);

-- Achievements
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,              -- 'streak', 'stars', 'savings', 'subject', 'special'
    badge_icon VARCHAR(50),
    criteria JSONB NOT NULL,
    gem_reward INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Family Achievements
CREATE TABLE family_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id),
    earned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(family_id, achievement_id)
);

-- Family Progress (streaks, etc.)
CREATE TABLE family_progress (
    family_id UUID PRIMARY KEY REFERENCES families(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    total_tasks_completed INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Subject Progress
CREATE TABLE subject_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    subject VARCHAR(50) NOT NULL,
    level VARCHAR(20) DEFAULT 'beginner',
    points INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(family_id, subject)
);

-- Salary Configuration
CREATE TABLE salary_config (
    family_id UUID PRIMARY KEY REFERENCES families(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    base_amount DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR',
    pay_frequency VARCHAR(20) DEFAULT 'monthly',
    save_percent INTEGER DEFAULT 50,
    spend_percent INTEGER DEFAULT 30,
    give_percent INTEGER DEFAULT 20,
    bonus_config JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Salary Records
CREATE TABLE salary_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_amount DECIMAL(10,2),
    bonus_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2),
    breakdown JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Activity Log
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    performed_by VARCHAR(30),                   -- Role
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.3 Indexes

```sql
-- Performance indexes
CREATE INDEX idx_daily_tasks_family_date ON daily_tasks(family_id, date);
CREATE INDEX idx_transactions_family ON transactions(family_id, created_at);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_activity_log_family ON activity_log(family_id, created_at);
CREATE INDEX idx_quest_progress_family ON quest_progress(family_id);
CREATE INDEX idx_family_roles_family ON family_roles(family_id);
```

### 4.4 Initial Data

```sql
-- Insert default super admin (password: "admin123" - CHANGE IN PRODUCTION!)
INSERT INTO super_admins (username, password_hash, display_name)
VALUES ('admin', '$2b$10$...hashed...', 'System Administrator');

-- Insert default achievements
INSERT INTO achievements (name, description, category, badge_icon, criteria, gem_reward, sort_order) VALUES
-- Streak achievements
('Getting Started', 'Complete a 3-day streak', 'streak', '🔥', '{"type": "streak", "value": 3}', 1, 1),
('Week Warrior', 'Complete a 7-day streak', 'streak', '🔥', '{"type": "streak", "value": 7}', 2, 2),
('Fortnight Fighter', 'Complete a 14-day streak', 'streak', '🔥', '{"type": "streak", "value": 14}', 2, 3),
('Monthly Master', 'Complete a 30-day streak', 'streak', '🔥', '{"type": "streak", "value": 30}', 3, 4),
('Streak Legend', 'Complete a 100-day streak', 'streak', '🔥', '{"type": "streak", "value": 100}', 5, 5),
-- Star achievements
('First Star', 'Earn your first star', 'stars', '⭐', '{"type": "total_stars", "value": 1}', 1, 10),
('Bright Star', 'Earn 100 total stars', 'stars', '⭐', '{"type": "total_stars", "value": 100}', 1, 11),
('Super Star', 'Earn 500 total stars', 'stars', '⭐', '{"type": "total_stars", "value": 500}', 2, 12),
('Mega Star', 'Earn 1,000 total stars', 'stars', '🌟', '{"type": "total_stars", "value": 1000}', 3, 13),
('Galaxy Master', 'Earn 10,000 total stars', 'stars', '🌟', '{"type": "total_stars", "value": 10000}', 5, 14),
-- Savings achievements
('Piggy Bank', 'Save 50 stars', 'savings', '🐷', '{"type": "savings_balance", "value": 50}', 1, 20),
('Smart Saver', 'Save 100 stars', 'savings', '🐷', '{"type": "savings_balance", "value": 100}', 2, 21),
('Banking Pro', 'Save 200 stars', 'savings', '🏦', '{"type": "savings_balance", "value": 200}', 2, 22),
('Goal Getter', 'Complete 3 savings goals', 'savings', '🎯', '{"type": "goals_completed", "value": 3}', 3, 23),
-- Special achievements
('Perfect Day', 'Complete all tasks in a day', 'special', '✨', '{"type": "perfect_day", "value": 1}', 1, 30),
('Perfect Week', 'Have 7 perfect days', 'special', '🏆', '{"type": "perfect_days", "value": 7}', 3, 31),
('Quest Champion', 'Complete 50 quests', 'special', '🎯', '{"type": "quests_completed", "value": 50}', 3, 32),
('Gem Collector', 'Earn 50 gems', 'special', '💎', '{"type": "total_gems", "value": 50}', 2, 33);
```

---

## 5. Super Admin Panel

### 5.1 Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  REWARDY ADMIN                              [Logout: admin]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OVERVIEW                                                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Families   │ │ Active     │ │ Total      │ │ Tasks      │  │
│  │     12     │ │ Today: 8   │ │ Stars: 45K │ │ Today: 156 │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│                                                                 │
│  FAMILIES                                    [+ Add Family]    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Family        │ Roles    │ Last Active │ Status │ Actions│  │
│  ├───────────────┼──────────┼─────────────┼────────┼────────┤  │
│  │ Sharma Family │ 4/4      │ 2 min ago   │ Active │ [Edit] │  │
│  │ Patel Family  │ 3/4      │ 1 hour ago  │ Active │ [Edit] │  │
│  │ Singh Family  │ 2/4      │ Yesterday   │ Active │ [Edit] │  │
│  │ Demo Family   │ 4/4      │ 3 days ago  │ Inactive│ [Edit]│  │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Add/Edit Family

```
┌─────────────────────────────────────────────────────────────────┐
│  ADD NEW FAMILY                                    [X Close]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FAMILY DETAILS                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Family Code:     [ sharma          ]  (for login)       │   │
│  │ Display Name:    [ The Sharma Family ]                  │   │
│  │ Timezone:        [ Asia/Kolkata  ▼ ]                    │   │
│  │ Status:          [●] Active  [ ] Inactive               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ROLES & PASSWORDS                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [✓] Primary Parent                                      │   │
│  │     Label: [ Dad              ]                         │   │
│  │     Password: [ ••••••••      ] [Show] [Generate]       │   │
│  │                                                         │   │
│  │ [✓] Other Parent                                        │   │
│  │     Label: [ Mom              ]                         │   │
│  │     Password: [ ••••••••      ] [Show] [Generate]       │   │
│  │                                                         │   │
│  │ [✓] Observer                                            │   │
│  │     Label: [ Grandma          ]                         │   │
│  │     Password: [ ••••••••      ] [Show] [Generate]       │   │
│  │                                                         │   │
│  │ [✓] Child                                               │   │
│  │     Label: [ Alex             ]                         │   │
│  │     Password: [ ••••••••      ] [Show] [Generate]       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  CHILD PROFILE                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Date of Birth:   [ 2019-03-15     ]                     │   │
│  │ Grade Level:     [ 1st Grade   ▼  ]                     │   │
│  │ Learning Phase:  [ Phase 1 (Star-based) ▼ ]             │   │
│  │ Interests:       [ Dinosaurs, Space, LEGO ]             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Cancel]                                    [Save Family]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Family Credentials Card (Printable)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    🌟 REWARDY LOGIN CARD 🌟                     │
│                                                                 │
│  Family: The Sharma Family                                     │
│  Website: https://rewardy.netlify.app                          │
│                                                                 │
│  ─────────────────────────────────────────────                 │
│                                                                 │
│  👨 Dad (Primary Parent)                                        │
│     Family: sharma                                              │
│     Role: Primary Parent                                        │
│     Password: parent123                                         │
│                                                                 │
│  👩 Mom (Other Parent)                                          │
│     Family: sharma                                              │
│     Role: Other Parent                                          │
│     Password: parent456                                         │
│                                                                 │
│  👴 Grandma (Observer)                                          │
│     Family: sharma                                              │
│     Role: Observer                                              │
│     Password: view789                                           │
│                                                                 │
│  👦 Alex (Child)                                                │
│     Family: sharma                                              │
│     Role: Child                                                 │
│     Password: alex2024                                          │
│                                                                 │
│  ─────────────────────────────────────────────                 │
│  Keep this card safe! 🔒                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Feature Specifications

### 6.1 Parent Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  REWARDY                          Sharma Family    [Dad ▼]     │
├────────┬────────┬────────┬────────┬────────────────────────────┤
│ Home   │Schedule│ Tasks  │ Shop   │ Analytics                  │
├────────┴────────┴────────┴────────┴────────────────────────────┤
│                                                                 │
│  TODAY AT A GLANCE - Monday, Nov 27                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Tasks      │ │ Stars      │ │ Streak     │ │ Pending    │  │
│  │   8/12     │ │  ⭐ 18     │ │  🔥 7      │ │   3        │  │
│  │ ████████░░ │ │  today     │ │  days      │ │ approvals  │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│                                                                 │
│  QUICK ACTIONS                                                  │
│  [⭐ Award Stars] [+ Add Task] [📅 Schedule] [🎁 Rewards]      │
│                                                                 │
│  PENDING APPROVALS                                              │
│  ├── ✅ "Phonics Lesson" - submitted 10 min ago    [Approve]   │
│  ├── 🎁 "Extra Screen Time" - 15⭐ request        [Review]    │
│  └── ✅ "Morning Routine" - submitted 7:30 AM      [Approve]   │
│                                                                 │
│  THIS WEEK                                                      │
│  Mon ████████░░ 80%  ←Today                                    │
│  Tue ──────────                                                 │
│  Wed ──────────                                                 │
│  Thu ──────────                                                 │
│  Fri ──────────                                                 │
│                                                                 │
│  RECENT ACTIVITY                                                │
│  • Alex completed "Math Practice" (+3⭐) - 10 min ago          │
│  • Alex earned "Week Warrior" badge - 2 hours ago              │
│  • Morning routine completed (+2⭐) - 7:30 AM                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Child Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  🌟 REWARDY 🌟                              Good Morning, Alex! │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│      ╭─────────────────────────────────╮                        │
│      │                                 │      ⭐ 156 Stars      │
│      │      🔥 7 Day Streak!           │      💎 12 Gems        │
│      │                                 │                        │
│      │    Total Earned: 1,240 ⭐       │                        │
│      ╰─────────────────────────────────╯                        │
│                                                                 │
│  📋 TODAY'S QUESTS                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🌅 Morning Routine                              +2 ⭐   │   │
│  │    ✅ Completed!                                        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 📖 Phonics & Reading                            +3 ⭐   │   │
│  │    🔲 Ready to start                    [Start Quest]   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ✏️ Writing Practice                             +2 ⭐   │   │
│  │    🔒 Unlocks after Phonics                             │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 🔢 Math Adventure                               +3 ⭐   │   │
│  │    🔒 Unlocks later                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⭐ EARN UP TO 24 STARS TODAY!                                  │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ 🎁 Shop │ │ 🏆 Badges│ │ 🏦 Bank  │ │ 📊 Stats │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  🎯 DAILY QUEST: Complete 5 tasks → Bonus 5⭐!                 │
│  Progress: ██░░░ 1/5                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Observer Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  REWARDY                          Sharma Family  [Grandma ▼]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  👦 ALEX'S PROGRESS                                             │
│                                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Stars      │ │ Streak     │ │ Tasks      │ │ Level      │  │
│  │  ⭐ 156    │ │  🔥 7 days │ │  8/12      │ │ Beginner+  │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│                                                                 │
│  TODAY'S TASKS                                                  │
│  ├── ✅ Morning Routine - Completed                            │
│  ├── ⏳ Phonics & Reading - In progress                        │
│  ├── 🔲 Writing Practice - Pending                             │
│  └── 🔲 Math Adventure - Pending                               │
│                                                                 │
│  SEND ENCOURAGEMENT                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [⭐ Send 1-5 Bonus Stars]   (5 remaining today)        │   │
│  │                                                         │   │
│  │  Stars to send: [3]  Message: [Great job today!    ]   │   │
│  │                                                         │   │
│  │  [Send Encouragement]                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  RECENT ACHIEVEMENTS                                            │
│  • 🏆 Week Warrior - 2 hours ago                               │
│  • ⭐ Bright Star - Yesterday                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Remaining Features

All other features (Timetable, Tasks, Economy, Rewards, Quests, Achievements, Skills, Analytics, Salary) remain the same as in PRD v1.0, with the following changes:

1. **User references** → Now use `family_id` instead of `user_id` or `child_id`
2. **Approval tracking** → Uses role name string instead of user UUID
3. **Activity logging** → Tracks which role performed actions
4. **Family isolation** → All queries filtered by `family_id`

---

## 8. Development Task List

### Phase 1: Foundation (Weeks 1-3)

#### Week 1: Project Setup
| ID | Task | Hours |
|:---|:-----|:-----:|
| 1.1.1 | Initialize Vite + React project | 2 |
| 1.1.2 | Configure Tailwind CSS | 2 |
| 1.1.3 | Set up project structure | 3 |
| 1.1.4 | Create Supabase project | 1 |
| 1.1.5 | Configure Supabase client | 2 |
| 1.1.6 | Set up environment variables | 1 |
| 1.1.7 | Configure ESLint + Prettier | 1 |
| 1.1.8 | Set up Zustand stores | 2 |
| 1.1.9 | Configure React Query | 2 |
| 1.1.10 | Create base layout components | 4 |

#### Week 2: Database & Custom Auth
| ID | Task | Hours |
|:---|:-----|:-----:|
| 1.2.1 | Create all database tables | 4 |
| 1.2.2 | Create indexes | 1 |
| 1.2.3 | Seed achievements data | 2 |
| 1.2.4 | Create password hashing utilities | 2 |
| 1.2.5 | Build login API (family + role + password) | 4 |
| 1.2.6 | Build session management | 4 |
| 1.2.7 | Create auth context/hooks | 3 |
| 1.2.8 | Build family login page | 4 |
| 1.2.9 | Build Super Admin login page | 3 |
| 1.2.10 | Implement role-based routing | 3 |

#### Week 3: Super Admin Panel
| ID | Task | Hours |
|:---|:-----|:-----:|
| 1.3.1 | Create Super Admin layout | 3 |
| 1.3.2 | Build admin dashboard | 4 |
| 1.3.3 | Create family list view | 4 |
| 1.3.4 | Build add family form | 6 |
| 1.3.5 | Build edit family form | 4 |
| 1.3.6 | Implement role/password management | 4 |
| 1.3.7 | Create credentials card (printable) | 3 |
| 1.3.8 | Add family activation/deactivation | 2 |

### Phase 2-6: Same as before
(Dashboard, Timetable, Tasks, Economy, Gamification, Analytics, Polish)

See TASK_LIST.md for complete breakdown.

---

## 9. API Endpoints

### Authentication
```
POST /api/auth/login
Body: { family_code, role, password }
Response: { session_token, family, role, permissions, expires_at }

POST /api/auth/admin-login
Body: { username, password }
Response: { session_token, admin, expires_at }

POST /api/auth/logout
Headers: { Authorization: Bearer <token> }
Response: { success: true }

GET /api/auth/session
Headers: { Authorization: Bearer <token> }
Response: { family, role, permissions }
```

### Super Admin
```
GET /api/admin/families
POST /api/admin/families
PUT /api/admin/families/:id
DELETE /api/admin/families/:id

GET /api/admin/families/:id/roles
PUT /api/admin/families/:id/roles/:role
POST /api/admin/families/:id/roles/:role/reset-password
```

### Family Data (all require family session)
```
GET /api/family/dashboard
GET /api/family/tasks?date=YYYY-MM-DD
POST /api/family/tasks
PUT /api/family/tasks/:id
...etc (same endpoints, family-scoped)
```

---

## 10. Security Considerations

### Password Storage
- Use bcrypt with salt rounds = 10
- Never store plain text passwords
- Hash on server side only

### Session Security
- Generate cryptographically secure session tokens
- Store hashed tokens in database
- Set appropriate expiry times
- Validate token on every request

### Data Isolation
- All queries must include family_id filter
- Validate family_id matches session
- Super Admin has override access

### Rate Limiting
- Login attempts: 5 per minute per IP
- API calls: 100 per minute per family

---

## 11. File Structure

```
src/
├── components/
│   ├── ui/                 # Base UI components
│   ├── layout/             # Layout components
│   │   ├── ParentLayout.jsx
│   │   ├── ChildLayout.jsx
│   │   ├── ObserverLayout.jsx
│   │   └── AdminLayout.jsx
│   ├── auth/               # Login components
│   ├── admin/              # Super Admin components
│   ├── dashboard/
│   ├── tasks/
│   ├── economy/
│   ├── schedule/
│   ├── gamification/
│   └── analytics/
├── pages/
│   ├── Login.jsx
│   ├── AdminLogin.jsx
│   ├── admin/
│   │   ├── Dashboard.jsx
│   │   ├── Families.jsx
│   │   └── FamilyForm.jsx
│   ├── parent/
│   ├── child/
│   └── observer/
├── hooks/
│   ├── useAuth.js
│   ├── useFamily.js
│   ├── useTasks.js
│   └── ...
├── stores/
│   ├── authStore.js
│   └── uiStore.js
├── services/
│   ├── supabase.js
│   ├── auth.js
│   ├── families.js
│   └── ...
├── utils/
│   ├── password.js
│   ├── session.js
│   └── ...
└── constants/
    ├── roles.js
    ├── permissions.js
    └── ...
```

---

## 12. Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# App
VITE_APP_NAME=Rewardy
VITE_SESSION_EXPIRY_DAYS=7

# Super Admin (for initial setup only, remove after)
VITE_INITIAL_ADMIN_USERNAME=admin
VITE_INITIAL_ADMIN_PASSWORD=changeme123
```

---

*Document Version: 2.0*
*Last Updated: November 27, 2025*
