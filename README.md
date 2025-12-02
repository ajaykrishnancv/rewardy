# Rewardy

A gamified homeschool management and motivation platform that transforms daily learning into an engaging adventure.

## Overview

Rewardy is a multi-family web-based homeschool management system designed to create engaging daily routines for homeschooled children. It combines task management with gamification elements like quests, achievements, and a virtual economy to teach financial literacy while keeping kids motivated.

## Features

### For Parents/Guardians

- **Dashboard Overview** - Real-time stats on child activity, task completions, currency earned, and pending approvals
- **Schedule Management** - Weekly grid view with time slots and recurring task templates
- **Task Management** - Create, edit, and manage daily tasks across categories (academic, chores, health, creative, social)
- **Task Approval Workflow** - Review and approve/reject completed tasks with optional feedback
- **Reward Shop Management** - Create rewards with star/gem costs, set daily limits and categories
- **Redemption Approvals** - Review and approve reward redemptions
- **Analytics Dashboard** - Visual charts and reports on task completion, streaks, and progress
- **Settings & Challenges** - Configure daily/weekly quests, manage salary system, create custom challenges
- **Manual Star Awards** - Award bonus stars for special achievements

### For Children

- **Home Dashboard** - View daily tasks, active quests, recent achievements, and currency balance
- **Quests/Challenges** - Daily and weekly quests with progress tracking (Task Tackler, Star Hunter, Weekly Warrior)
- **Shop/Rewards** - Browse and redeem rewards using earned stars or gems
- **Star Bank** - Complete banking system featuring:
  - Wallet vs. Savings account management
  - Transfer between accounts
  - Interest tier system (Bronze 5%, Silver 7%, Gold 10%)
  - Savings goals with progress tracking
  - Full transaction history
- **Achievements/Badges** - Unlock achievements across categories (Beginner, Intermediate, Advanced, Streaks, Economy)
- **Skills/Progress** - Track skill progression across subjects with 10 levels (Beginner to Legend)

### For Super Admins

- **Family Management** - Create and manage multiple families with unique codes
- **Role/Password Management** - Manage up to 4 roles per family with secure password handling
- **Credentials Management** - Generate and print credential cards for families
- **Platform Settings** - Configure platform-wide settings

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 19, Vite 5 |
| Styling | Tailwind CSS 3 |
| State Management | Zustand |
| Routing | React Router v7 |
| Charts | Recharts |
| Backend/Database | Supabase (PostgreSQL) |
| Authentication | Custom role-based auth with bcrypt |
| PWA | Vite PWA Plugin, Workbox |
| Notifications | React Hot Toast |
| Deployment | Netlify |

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account and project

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/rewardy.git
   cd rewardy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**

   Run the schema in your Supabase SQL editor:
   ```bash
   # The schema file is located at:
   supabase/schema.sql
   ```

   Then run any migrations in order from:
   ```bash
   supabase/migrations/
   ```

5. **Create a Super Admin**

   Insert a super admin record in your Supabase dashboard or via SQL:
   ```sql
   INSERT INTO super_admins (username, password_hash)
   VALUES ('admin', '$2a$10$...'); -- Use bcrypt to hash your password
   ```

## Running the App

### Development
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Project Structure

```
src/
├── pages/
│   ├── auth/           # Login pages
│   ├── admin/          # Super admin pages
│   ├── parent/         # Parent dashboard pages
│   └── child/          # Child dashboard pages
├── components/         # Reusable components
├── layouts/            # Page layouts (Auth, Dashboard, Admin)
├── stores/             # Zustand state stores
├── services/           # Business logic (gamification, etc.)
├── lib/                # Utilities (Supabase client)
├── App.jsx             # Main routing
└── index.css           # Global styles

supabase/
├── schema.sql          # Database schema
└── migrations/         # Database migrations

public/
├── icons/              # PWA icons
└── _redirects          # Netlify routing config
```

## User Roles

| Role | Access Level |
|------|--------------|
| Super Admin | Full platform access, family management |
| Primary Parent | Full family access, all management features |
| Other Parent | Full family access, management features |
| Observer | View-only access (for grandparents, etc.) |
| Child | Task completion, shop, bank, achievements |

## PWA Features

Rewardy is a Progressive Web App with:
- Offline support via service workers
- Installable on mobile and desktop
- Network-first caching for API calls
- Auto-updates when new versions are deployed
- Standalone app mode when installed

## Deployment

### Netlify (Recommended)

1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard
5. Deploy!

The `_redirects` file in `public/` handles SPA routing automatically.

### Other Platforms

The app can be deployed to any static hosting platform that supports SPA routing:
- Vercel
- Cloudflare Pages
- GitHub Pages (with custom 404.html)

## Database Schema

Key tables include:
- `families` - Family accounts
- `family_roles` - User roles per family
- `child_profiles` - Child information
- `currency_balances` - Wallet and savings
- `daily_tasks` - Task assignments
- `rewards` / `redemptions` - Reward system
- `quests` / `achievements` - Gamification
- `skill_progress` - Learning progress
- `streaks` - Streak tracking

See `supabase/schema.sql` for the complete schema.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and feature requests, please open an issue on GitHub.
