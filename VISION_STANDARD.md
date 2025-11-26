# Rewardy - Standard Version Vision

## Overview

**Rewardy** is a comprehensive homeschool management and motivation system designed to transform daily learning into an engaging adventure. It combines timetable management, task tracking, and a gamified star-based reward economy.

---

## Core Philosophy

```
"Every task is a quest. Every achievement is a treasure."
```

The system quantifies effort, rewards consistency, and teaches financial literacy through a virtual economy that mirrors real-world concepts.

---

## User Roles

### Parent Accounts (Admin)
- Full access to all features
- Can award/deduct stars
- Manage schedules and tasks
- Control reward shop
- View analytics and reports
- Approve large redemptions

### Child Account
- View daily schedule and tasks
- Mark tasks as complete (pending parent approval)
- Check star balance and history
- Browse and request rewards
- View achievements and progress
- Personalized dashboard

---

## Core Modules

### 1. Dashboard

#### Parent Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│  PARENT DASHBOARD                           👋 Welcome, Dad    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TODAY'S OVERVIEW - Monday, Nov 27                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Tasks Today  │ │ Stars Earned │ │ Pending      │            │
│  │     8/12     │ │    ⭐ 18     │ │ Approvals: 3 │            │
│  │   ████░░     │ │   Today      │ │  [Review]    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  QUICK ACTIONS                                                  │
│  [+ Add Task] [⭐ Award Stars] [📅 Edit Schedule] [🎁 Rewards] │
│                                                                 │
│  RECENT ACTIVITY                                                │
│  • Child completed "Phonics Lesson" - Pending approval           │
│  • Child requested "Extra Screen Time" (15 ⭐)                   │
│  • Morning routine completed (+2 ⭐ auto-awarded)               │
│                                                                 │
│  THIS WEEK'S PROGRESS                                           │
│  Mon ████████ 85%                                               │
│  Tue ██████░░ 60%                                               │
│  Wed ████████████ 100%                                          │
│  Thu (today)                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Child Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│  🌟 Rewardy 🌟                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│         ╭───────────────╮                                       │
│         │   Level 4     │    ⭐ 156 Stars                       │
│         │  ⚔️ APPRENTICE │    🔥 7 Day Streak!                  │
│         │   ████░░ 78%  │                                       │
│         ╰───────────────╯                                       │
│                                                                 │
│  TODAY'S QUESTS                              Nov 27             │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ ✅ Morning Routine                        +2 ⭐     │       │
│  │ 🔲 Phonics & Reading (8:00 AM)            +3 ⭐     │       │
│  │ 🔲 Writing Practice (9:00 AM)             +2 ⭐     │       │
│  │ 🔲 Math Foundations (10:00 AM)            +3 ⭐     │       │
│  │ 🔲 Creative Time (1:00 PM)                +2 ⭐     │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  ⭐ POTENTIAL STARS TODAY: 24                                   │
│                                                                 │
│  [🎁 Reward Shop]  [📊 My Progress]  [🏆 Achievements]         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. Timetable & Schedule Module

#### Features
- **Weekly Template**: Create recurring schedules for each day
- **Daily View**: See today's schedule with time blocks
- **Subject Color Coding**: Visual differentiation by subject
- **Break Management**: Scheduled breaks and free time
- **Drag & Drop Editing**: Easy schedule modifications (parent only)

#### Schedule Structure
```
DAILY ROUTINE TEMPLATE

MORNING BLOCK (6:30 AM - 12:00 PM)
├── Wake Up & Morning Routine (6:30 - 7:30)
│   └── Brush, bath, prayer, breakfast
├── Study Block 1 (8:00 - 9:00)
│   └── Core subject (Phonics/Reading)
├── Study Block 2 (9:00 - 10:00)
│   └── Writing/Language
├── Break (9:30 - 10:00)
│   └── Snack + Free play
├── Study Block 3 (10:00 - 11:00)
│   └── Mathematics
└── Study Block 4 (11:00 - 12:00)
    └── General Knowledge/Science

AFTERNOON BLOCK (12:00 PM - 4:00 PM)
├── Lunch Break (12:00 - 1:00)
├── Creative Block (1:00 - 2:00)
│   └── Art/Music/Craft
├── Physical Activity (2:00 - 3:00)
│   └── Sports/Exercise/Outdoor play
├── Independent Learning (3:00 - 4:00)
│   └── Self-chosen educational activity
└── Daily Review (4:00 - 4:30)
    └── Presentation/Discussion with parent

EVENING BLOCK (4:30 PM - 9:00 PM)
├── Free Time (4:30 - 6:00)
├── Family Time (6:00 - 7:00)
├── Dinner (7:00 - 8:00)
├── Wind Down (8:00 - 8:30)
│   └── Light reading/storytelling
└── Bedtime Routine (8:30 - 9:00)
```

#### Database Schema
```sql
CREATE TABLE schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id),
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    activity_name VARCHAR(100) NOT NULL,
    activity_type VARCHAR(50), -- 'study', 'break', 'routine', 'creative', 'physical'
    subject VARCHAR(50),
    description TEXT,
    star_value INTEGER DEFAULT 0,
    color VARCHAR(7), -- hex color
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE daily_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES users(id),
    template_id UUID REFERENCES schedule_templates(id),
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped'
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    stars_awarded INTEGER DEFAULT 0,
    notes TEXT
);
```

---

### 3. Task Management

#### Task Types
1. **Scheduled Tasks**: Auto-generated from timetable
2. **One-time Tasks**: Ad-hoc assignments
3. **Recurring Tasks**: Daily habits (making bed, brushing teeth)
4. **Bonus Tasks**: Extra credit opportunities

#### Task Categories & Star Values
```
STUDY TASKS
├── Phonics lesson completion .............. 1-2 ⭐
├── Reading practice (per 15 min) .......... 1 ⭐
├── Writing exercise ....................... 2 ⭐
├── Math worksheet ......................... 2-3 ⭐
├── Science experiment ..................... 3-5 ⭐
└── Weekly presentation .................... 5 ⭐

BEHAVIOR & HABITS
├── Morning routine (complete) ............. 2 ⭐
├── Making bed ............................. 1 ⭐
├── Brushing teeth (2x daily) .............. 1 ⭐
├── Tidying room ........................... 2 ⭐
├── Screen-free focus during study ......... 2 ⭐
└── Helping with household chores .......... 1-3 ⭐

BONUS CATEGORIES
├── Learning something new independently ... 3 ⭐
├── Teaching concept to others ............. 3 ⭐
├── Extra reading .......................... 2 ⭐
├── Creative project ....................... 2-5 ⭐
└── Acts of kindness ....................... 1-2 ⭐
```

#### Task Workflow
```
┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐
│  PENDING │ -> │ SUBMITTED │ -> │ APPROVED │ -> │ AWARDED  │
└──────────┘    └───────────┘    └──────────┘    └──────────┘
     │               │                │               │
   Child          Child           Parent          System
   sees         completes        reviews        adds stars
   task           task          & approves      to balance
```

---

### 4. Star Economy System

#### Star Bank Features
- **Balance Tracking**: Real-time star balance
- **Transaction History**: Complete ledger of all earnings/spending
- **Interest System**: Earn bonus stars for saving
- **Categories**: Track earnings by category

#### Interest Mechanics
```
SAVINGS INTEREST (Monthly)

Tier 1: 0-50 stars saved    → 5% bonus
Tier 2: 51-100 stars saved  → 7% bonus
Tier 3: 101-200 stars saved → 10% bonus
Tier 4: 200+ stars saved    → 12% bonus

Example:
- Child has 150 stars saved at month end
- Tier 3 applies: 150 × 10% = 15 bonus stars
- New balance: 165 stars
```

#### Star Ledger View
```
┌─────────────────────────────────────────────────────────────────┐
│  ⭐ STAR LEDGER                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Current Balance: ⭐ 156                                        │
├─────────────────────────────────────────────────────────────────┤
│  DATE       │ DESCRIPTION              │ AMOUNT │ BALANCE      │
│─────────────│──────────────────────────│────────│──────────────│
│  Nov 27     │ Morning Routine          │ +2     │ 156          │
│  Nov 27     │ Phonics Lesson           │ +3     │ 154          │
│  Nov 26     │ Reward: Screen Time      │ -15    │ 151          │
│  Nov 26     │ Math Excellence          │ +5     │ 166          │
│  Nov 26     │ Helped with dishes       │ +2     │ 161          │
│  Nov 25     │ Monthly Interest Bonus   │ +12    │ 159          │
│  ...        │ ...                      │ ...    │ ...          │
└─────────────────────────────────────────────────────────────────┘
```

#### Database Schema
```sql
CREATE TABLE star_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES users(id),
    amount INTEGER NOT NULL, -- positive for earning, negative for spending
    transaction_type VARCHAR(30) NOT NULL, -- 'task_completion', 'bonus', 'interest', 'redemption', 'adjustment'
    category VARCHAR(50), -- 'study', 'behavior', 'bonus', 'savings'
    description VARCHAR(200),
    balance_after INTEGER NOT NULL,
    related_task_id UUID REFERENCES tasks(id),
    related_redemption_id UUID REFERENCES redemptions(id),
    awarded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE star_balance (
    child_id UUID PRIMARY KEY REFERENCES users(id),
    current_balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 5. Reward Shop

#### Reward Categories
```
INSTANT REWARDS (10-30 ⭐)
├── Favorite snack ........................ 10 ⭐
├── 30 min extra screen time .............. 15 ⭐
├── Choose dinner menu .................... 15 ⭐
├── Stay up 30 min late ................... 20 ⭐
├── Small toy/stationery .................. 25 ⭐
└── New storybook ......................... 30 ⭐

EXPERIENCE REWARDS (50-100 ⭐)
├── Trip to park .......................... 50 ⭐
├── Movie night (child's choice) .......... 50 ⭐
├── Pizza/favorite food night ............. 60 ⭐
├── Friend playdate ....................... 75 ⭐
├── Ice cream outing ...................... 40 ⭐
└── Small LEGO set ........................ 100 ⭐

BIG REWARDS (150+ ⭐)
├── Zoo/Aquarium visit .................... 150 ⭐
├── New video game ........................ 200 ⭐
├── Large toy ............................. 250 ⭐
├── Theme park visit ...................... 500 ⭐
├── Special day trip ...................... 400 ⭐
└── Big wishlist item ..................... 500+ ⭐

CUSTOM REWARDS
└── Parents can add custom rewards with any star value
```

#### Redemption Workflow
```
Child browses shop
        │
        ▼
Child selects reward
        │
        ▼
┌───────────────────┐
│ Stars sufficient? │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │           │
   Yes          No
    │           │
    ▼           ▼
Request      Show "Save X more
 sent        stars to unlock"
    │
    ▼
Parent reviews
    │
    ▼
┌───────────────┐
│   Approved?   │
└───────┬───────┘
        │
  ┌─────┴─────┐
  │           │
 Yes          No
  │           │
  ▼           ▼
Stars       Notify child
deducted    (with reason)
  │
  ▼
Reward marked
as "Redeemed"
```

---

### 6. Achievements & Gamification

#### Achievement Categories
```
CONSISTENCY BADGES
🔥 First Streak (3 days)
🔥 Week Warrior (7 days)
🔥 Fortnight Fighter (14 days)
🔥 Monthly Master (30 days)
🔥 Century Champion (100 days)

STAR MILESTONES
⭐ Rising Star (50 total stars)
⭐ Bright Star (100 total stars)
⭐ Super Star (250 total stars)
⭐ Mega Star (500 total stars)
⭐ Ultra Star (1000 total stars)

SAVINGS BADGES
💰 First Saver (save 20 stars)
💰 Piggy Bank Pro (save 50 stars)
💰 Savings Superstar (save 100 stars)
💰 Investment Genius (save 200 stars)

SUBJECT MASTERY
📖 Reading Rookie → Reader → Bookworm → Literature Legend
✏️ Writing Beginner → Writer → Author → Wordsmith
🔢 Math Starter → Calculator → Mathematician → Number Ninja
🎨 Art Apprentice → Artist → Creator → Masterpiece Maker

BEHAVIOR BADGES
🤝 Helper (10 helping tasks)
😊 Kindness King (20 acts of kindness)
🎯 Focus Champion (complete week without distractions)
🌟 Perfect Day (all tasks completed)
🏆 Perfect Week (7 perfect days)
```

#### Level System
```
LEVEL PROGRESSION

Level 1:  Beginner        (0-100 XP)
Level 2:  Learner         (101-250 XP)
Level 3:  Explorer        (251-500 XP)
Level 4:  Apprentice      (501-1000 XP)
Level 5:  Achiever        (1001-1750 XP)
Level 6:  Champion        (1751-2750 XP)
Level 7:  Master          (2751-4000 XP)
Level 8:  Expert          (4001-5500 XP)
Level 9:  Legend          (5501-7500 XP)
Level 10: Ultimate Star   (7500+ XP)

XP EARNING:
- 1 star earned = 1 XP
- Achievement unlocked = 10-50 XP
- Streak milestone = 25 XP
- Perfect day = 15 XP bonus
- Perfect week = 100 XP bonus
```

---

### 7. Salary System (Phase 2-3)

#### Monthly Salary Calculation
```
BASE SALARY COMPONENTS

For Ages 10-12 (Phase 2):
├── Base monthly salary: ₹200
├── Task completion bonus: up to ₹50
│   └── 90-100% completion = ₹50
│   └── 80-89% completion = ₹30
│   └── 70-79% completion = ₹15
├── Star bonus: up to ₹30
│   └── 200+ stars = ₹30
│   └── 150-199 stars = ₹20
│   └── 100-149 stars = ₹10
└── Behavior bonus: up to ₹20
    └── No penalties = ₹20

MAXIMUM MONTHLY: ₹300
```

#### Budget Allocation
```
RECOMMENDED SPLIT

┌─────────────────────────────────────┐
│  MONTHLY SALARY: ₹270               │
├─────────────────────────────────────┤
│                                     │
│  💾 SAVE (50%)                      │
│  ████████████████████  ₹135         │
│  → Goes to savings jar              │
│  → Goal: Tablet (₹2000)             │
│                                     │
│  🛒 SPEND (30%)                     │
│  ████████████          ₹81          │
│  → Available for small purchases    │
│                                     │
│  ❤️ DONATE/INVEST (20%)             │
│  ████████              ₹54          │
│  → Charity or project investment    │
│                                     │
└─────────────────────────────────────┘
```

---

### 8. Analytics & Reports

#### Parent Analytics Dashboard
```
WEEKLY REPORT

Task Completion Rate:      87% ████████░░
Star Earning Trend:        ↑ 12% vs last week
Most Productive Day:       Wednesday
Struggling Subject:        Math (needs attention)
Streak Status:             🔥 12 days

TOP ACHIEVEMENTS THIS WEEK
• Completed all reading tasks
• Earned "Focus Champion" badge
• Saved 45 stars (didn't spend any!)

AREAS FOR IMPROVEMENT
• Math tasks taking longer than scheduled
• Afternoon focus dropping
• Bedtime routine inconsistent
```

#### Progress Charts
- Daily star earnings (bar chart)
- Weekly task completion (line chart)
- Subject progress (radar chart)
- Savings growth over time (area chart)
- Streak calendar (heat map)

---

## Technical Architecture

### Tech Stack
```
FRONTEND
├── React 18 (UI framework)
├── Vite (build tool)
├── React Router v6 (navigation)
├── Tailwind CSS (styling)
├── Zustand (state management)
├── React Query (data fetching)
├── Recharts (analytics charts)
└── Framer Motion (animations)

BACKEND (Supabase)
├── PostgreSQL (database)
├── Row Level Security (data isolation)
├── Auth (email/password login)
├── Realtime (live updates)
└── Storage (avatars, images)

HOSTING
├── Netlify (static hosting)
├── Automatic deployments
└── Custom domain support
```

### Database Schema Overview
```
users
├── id, email, name, role, avatar_url, family_id

families
├── id, name, created_at

schedule_templates
├── id, family_id, day_of_week, times, activity, stars

daily_schedule
├── id, child_id, template_id, date, status

tasks
├── id, child_id, title, category, star_value, status

star_ledger
├── id, child_id, amount, type, description, balance

star_balance
├── child_id, current_balance, total_earned, streak

rewards
├── id, family_id, name, star_cost, category

redemptions
├── id, child_id, reward_id, status, approved_by

achievements
├── id, name, description, criteria, badge_icon

user_achievements
├── user_id, achievement_id, earned_at

salary_records
├── id, child_id, month, base, bonus, total
```

---

## UI/UX Guidelines

### Child Interface
- **Large touch targets** (minimum 48px)
- **Bright, cheerful colors** (but not overwhelming)
- **Playful illustrations** and character mascot
- **Sound effects** for positive reinforcement
- **Simple navigation** (max 3 taps to any feature)
- **Visual progress** everywhere (bars, stars, animations)
- **Celebration animations** for achievements

### Parent Interface
- **Clean, professional** design
- **Quick actions** prominently placed
- **Data-dense** where appropriate
- **Mobile-responsive** (works on phone)
- **Batch operations** (approve multiple tasks)
- **Notification center** for pending items

### Color Palette
```
Primary:    #6366F1 (Indigo - trust, wisdom)
Secondary:  #F59E0B (Amber - energy, stars)
Success:    #10B981 (Emerald - completion)
Warning:    #F97316 (Orange - attention)
Danger:     #EF4444 (Red - penalties)
Background: #F8FAFC (Light gray)
Text:       #1E293B (Dark slate)
```

---

## Deployment Checklist

### Netlify Setup
1. Connect GChildb repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Environment variables for Supabase

### Supabase Setup
1. Create project
2. Set up authentication
3. Create database tables
4. Configure Row Level Security
5. Set up realtime subscriptions

### PWA Configuration
1. Service worker for offline
2. App manifest for installation
3. Icons for all platforms

---

## Future Enhancements (Not in Standard)
- Multi-child support
- Curriculum integration
- AI recommendations
- Voice commands
- AR achievements
- Social features

---

*Version 1.0 - Standard Edition*
*Designed for the Child Homeschool Journey*
