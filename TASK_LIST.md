# Rewardy - Development Task Checklist

## Quick Reference
- **Total Estimated Hours**: ~420 hours
- **Timeline**: 18 weeks
- **Start Date**: ___________
- **Target Launch**: ___________
- **Architecture**: Multi-Family with Super Admin

---

## Phase 1: Foundation (Weeks 1-4)

### Week 1: Project Setup
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 1.1.1 | Initialize Vite + React project | 2 | `npm create vite@latest rewardy -- --template react` |
| [ ] | 1.1.2 | Configure Tailwind CSS | 2 | Follow Tailwind + Vite guide |
| [ ] | 1.1.3 | Set up project structure (folders) | 3 | See PRD Appendix A |
| [ ] | 1.1.4 | Create Supabase project | 1 | supabase.com |
| [ ] | 1.1.5 | Configure Supabase client | 2 | Install @supabase/supabase-js |
| [ ] | 1.1.6 | Set up environment variables | 1 | .env.local |
| [ ] | 1.1.7 | Configure ESLint + Prettier | 1 | |
| [ ] | 1.1.8 | Set up Zustand store structure | 2 | authStore, uiStore, familyStore |
| [ ] | 1.1.9 | Configure React Query | 2 | QueryClient setup |
| [ ] | 1.1.10 | Create base layout components | 4 | Header, Sidebar, Container |

**Week 1 Total**: 20 hours

---

### Week 2: Database Schema
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 1.2.1 | Create super_admins table | 1 | Username + password hash |
| [ ] | 1.2.2 | Create families table | 2 | family_code, display_name, timezone |
| [ ] | 1.2.3 | Create family_roles table | 2 | role, role_label, password_hash |
| [ ] | 1.2.4 | Create sessions table | 2 | Token-based session management |
| [ ] | 1.2.5 | Create child_profiles table | 2 | Linked to family_id |
| [ ] | 1.2.6 | Create all application tables | 6 | Tasks, rewards, transactions, etc. |
| [ ] | 1.2.7 | Set up Row Level Security | 4 | Family-based isolation |
| [ ] | 1.2.8 | Create database indexes | 2 | Performance optimization |
| [ ] | 1.2.9 | Create database functions | 4 | award_stars, apply_interest, etc. |
| [ ] | 1.2.10 | Seed initial super admin | 1 | First admin account |

**Week 2 Total**: 26 hours

---

### Week 3: Custom Authentication System
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 1.3.1 | Install bcryptjs for password hashing | 1 | npm install bcryptjs |
| [ ] | 1.3.2 | Create auth service module | 4 | hashPassword, verifyPassword |
| [ ] | 1.3.3 | Create session management utilities | 4 | Create, validate, destroy sessions |
| [ ] | 1.3.4 | Build Super Admin login page | 4 | Username + Password form |
| [ ] | 1.3.5 | Build Family login page | 6 | Family dropdown → Role → Password |
| [ ] | 1.3.6 | Create auth context/hooks | 4 | AuthProvider, useAuth |
| [ ] | 1.3.7 | Implement session persistence | 3 | localStorage + token validation |
| [ ] | 1.3.8 | Create protected route wrapper | 3 | ProtectedRoute component |
| [ ] | 1.3.9 | Implement role-based route guards | 3 | SuperAdmin, Parent, Observer, Child |
| [ ] | 1.3.10 | Add auto-logout on session expiry | 2 | Token expiration check |

**Week 3 Total**: 34 hours

---

### Week 4: Super Admin Panel
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 1.4.1 | Create Super Admin dashboard layout | 4 | Stats + navigation |
| [ ] | 1.4.2 | Build family list view | 4 | Table with all families |
| [ ] | 1.4.3 | Create "Add Family" form | 4 | Family code, display name, timezone |
| [ ] | 1.4.4 | Build family detail/edit page | 4 | View + modify family |
| [ ] | 1.4.5 | Create role management UI | 6 | CRUD for family roles |
| [ ] | 1.4.6 | Implement password reset for roles | 3 | Generate new password |
| [ ] | 1.4.7 | Build child profile management | 4 | Add/edit child within family |
| [ ] | 1.4.8 | Create printable credentials card | 4 | PDF generation for family |
| [ ] | 1.4.9 | Add family activation toggle | 2 | Enable/disable family |
| [ ] | 1.4.10 | Build Super Admin settings | 2 | Change own password |

**Week 4 Total**: 37 hours

---

## Phase 1 Checkpoint
- [ ] Super Admin can log in
- [ ] Super Admin can create families
- [ ] Super Admin can create roles for families
- [ ] Super Admin can add child profiles
- [ ] Family members can log in (Family + Role + Password)
- [ ] Sessions persist and auto-expire
- [ ] Correct dashboard shown based on role
- [ ] Database tables created with RLS
- [ ] Printable credentials card works

---

## Phase 2: Core Features (Weeks 5-8)

### Week 5: Dashboards
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 2.1.1 | Create parent dashboard layout | 4 | Grid layout with family context |
| [ ] | 2.1.2 | Implement stats cards | 3 | Tasks, Stars, Streak, Pending |
| [ ] | 2.1.3 | Implement quick actions bar | 3 | 4 buttons |
| [ ] | 2.1.4 | Create pending approvals list | 4 | Tasks + Rewards |
| [ ] | 2.1.5 | Implement weekly progress chart | 4 | Simple bar chart |
| [ ] | 2.1.6 | Create activity feed | 3 | Last 10 items |
| [ ] | 2.1.7 | Create child dashboard layout | 4 | Card-based |
| [ ] | 2.1.8 | Implement child status header | 3 | Stars, Gems, Streak |
| [ ] | 2.1.9 | Create today's quests list | 4 | Task cards |
| [ ] | 2.1.10 | Build observer dashboard | 3 | Read-only stats view |

**Week 5 Total**: 35 hours

---

### Week 6: Timetable Module
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 2.2.1 | Create schedule template CRUD | 4 | Supabase service |
| [ ] | 2.2.2 | Build weekly timetable grid | 8 | 7 columns × time rows |
| [ ] | 2.2.3 | Implement drag-and-drop | 6 | react-dnd or similar |
| [ ] | 2.2.4 | Create schedule block editor | 4 | Modal with form |
| [ ] | 2.2.5 | Build daily view component | 4 | Timeline layout |
| [ ] | 2.2.6 | Create template selector | 4 | Pre-built options |
| [ ] | 2.2.7 | Implement copy day | 3 | Duplicate to other days |
| [ ] | 2.2.8 | Add conflict detection | 3 | Overlap warning |

**Week 6 Total**: 36 hours

---

### Week 7: Task Management
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 2.3.1 | Create daily task generation | 4 | Scheduled function |
| [ ] | 2.3.2 | Build task list (parent) | 4 | Table/list view |
| [ ] | 2.3.3 | Implement filtering/sorting | 3 | By status, date, category |
| [ ] | 2.3.4 | Create approval workflow | 4 | Approve/reject buttons |
| [ ] | 2.3.5 | Build bulk approve | 3 | Select multiple |
| [ ] | 2.3.6 | Create add bonus task form | 3 | Modal form |
| [ ] | 2.3.7 | Build task card (child) | 4 | Quest-style card |
| [ ] | 2.3.8 | Implement mark complete | 3 | Submit for approval |
| [ ] | 2.3.9 | Create task detail modal | 4 | Full info + actions |
| [ ] | 2.3.10 | Add rejection with reason | 2 | Text input |

**Week 7 Total**: 34 hours

---

### Week 8: Star System
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 2.4.1 | Create currency balance API | 3 | Get/update balance |
| [ ] | 2.4.2 | Implement award_stars function | 4 | DB function + JS |
| [ ] | 2.4.3 | Build transaction logging | 3 | Auto-log on changes |
| [ ] | 2.4.4 | Create star balance display | 2 | Reusable component |
| [ ] | 2.4.5 | Build transaction history | 4 | List with filters |
| [ ] | 2.4.6 | Parent award/deduct UI | 4 | Quick action form |
| [ ] | 2.4.7 | Create basic reward shop | 4 | Grid of rewards |
| [ ] | 2.4.8 | Build reward card | 3 | Image, cost, button |
| [ ] | 2.4.9 | Implement redemption request | 4 | Create pending record |
| [ ] | 2.4.10 | Create redemption approval | 4 | Parent workflow |

**Week 8 Total**: 35 hours

---

## Phase 2 Checkpoint
- [ ] Parent dashboard shows real data
- [ ] Observer dashboard shows read-only data
- [ ] Child dashboard shows tasks and balance
- [ ] Can create/edit schedule templates
- [ ] Tasks generate from schedule
- [ ] Child can mark tasks complete
- [ ] Parent can approve tasks
- [ ] Stars are awarded on approval
- [ ] Basic reward shop works
- [ ] Data properly isolated per family

---

## Phase 3: Economy & Banking (Weeks 9-11)

### Week 9: Savings & Interest
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 3.1.1 | Build star bank UI | 6 | Wallet + Savings + Goals |
| [ ] | 3.1.2 | Implement wallet/savings transfer | 4 | Two-way transfer |
| [ ] | 3.1.3 | Create transfer modal | 3 | Amount input |
| [ ] | 3.1.4 | Build interest calculation | 4 | Tiered rates |
| [ ] | 3.1.5 | Create interest tier display | 2 | Current tier + next |
| [ ] | 3.1.6 | Implement monthly interest job | 4 | Manual trigger or cron |
| [ ] | 3.1.7 | Add interest celebration | 3 | Animation + notification |

**Week 9 Total**: 26 hours

---

### Week 10: Goal Jars & Gems
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 3.2.1 | Create savings goals CRUD | 4 | API + hooks |
| [ ] | 3.2.2 | Build goal jar UI | 4 | Card with progress |
| [ ] | 3.2.3 | Implement add to goal | 3 | Transfer from wallet |
| [ ] | 3.2.4 | Create goal progress display | 3 | Progress bar + % |
| [ ] | 3.2.5 | Add goal completion celebration | 2 | Animation |
| [ ] | 3.2.6 | Implement gem currency | 4 | Parallel to stars |
| [ ] | 3.2.7 | Create gem balance display | 2 | Purple theme |
| [ ] | 3.2.8 | Build gem transactions | 3 | Same pattern as stars |

**Week 10 Total**: 25 hours

---

### Week 11: Full Reward Shop
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 3.3.1 | Create reward management UI | 6 | Parent CRUD |
| [ ] | 3.3.2 | Build add/edit reward form | 4 | Full form |
| [ ] | 3.3.3 | Implement categories/filtering | 3 | Quick/Experience/Big |
| [ ] | 3.3.4 | Create gem exclusives section | 3 | Separate tab |
| [ ] | 3.3.5 | Build redemption history (parent) | 3 | All redemptions |
| [ ] | 3.3.6 | Build redemption history (child) | 3 | Own redemptions |
| [ ] | 3.3.7 | Implement auto-approve rules | 4 | Config + logic |
| [ ] | 3.3.8 | Add daily limit enforcement | 2 | Check before allow |
| [ ] | 3.3.9 | Create fulfilled confirmation | 2 | Mark as fulfilled |

**Week 11 Total**: 30 hours

---

## Phase 3 Checkpoint
- [ ] Star bank shows wallet + savings
- [ ] Can transfer between wallet/savings
- [ ] Interest calculates correctly
- [ ] Goal jars can be created
- [ ] Can add stars to goals
- [ ] Gems work as premium currency
- [ ] Reward shop fully functional
- [ ] Auto-approve works for small rewards

---

## Phase 4: Gamification (Weeks 12-14)

### Week 12: Quest System
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 4.1.1 | Create quest data structure | 3 | Schema + types |
| [ ] | 4.1.2 | Implement daily quest generation | 4 | "Complete X tasks" |
| [ ] | 4.1.3 | Create weekly quest generation | 4 | "Earn X stars" |
| [ ] | 4.1.4 | Build quest progress tracking | 4 | Update on events |
| [ ] | 4.1.5 | Create quest card component | 4 | Progress + rewards |
| [ ] | 4.1.6 | Build quests list page | 4 | Active + completed |
| [ ] | 4.1.7 | Implement completion rewards | 4 | Stars + gems |
| [ ] | 4.1.8 | Add quest expiration | 3 | Auto-expire old quests |

**Week 12 Total**: 30 hours

---

### Week 13: Achievement System
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 4.2.1 | Seed achievement definitions | 3 | ~30 achievements |
| [ ] | 4.2.2 | Build achievement checking | 6 | Event-triggered |
| [ ] | 4.2.3 | Create achievement badge | 3 | Icon + name + status |
| [ ] | 4.2.4 | Build achievements page | 4 | Grid of badges |
| [ ] | 4.2.5 | Implement unlock flow | 4 | Award gems + notify |
| [ ] | 4.2.6 | Create celebration animation | 4 | Confetti/particles |
| [ ] | 4.2.7 | Add achievement notifications | 2 | Toast + sound |
| [ ] | 4.2.8 | Build achievements overview | 3 | Parent view |

**Week 13 Total**: 29 hours

---

### Week 14: Streaks & Skills
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 4.3.1 | Implement streak tracking | 4 | Daily check |
| [ ] | 4.3.2 | Create streak display | 3 | Fire icon + count |
| [ ] | 4.3.3 | Add streak milestones | 3 | 7, 14, 30, 100 days |
| [ ] | 4.3.4 | Build subject progress tracking | 4 | Points per subject |
| [ ] | 4.3.5 | Create skill level display | 3 | Progress bar + level |
| [ ] | 4.3.6 | Build skills overview page | 4 | All subjects |
| [ ] | 4.3.7 | Implement level up notifications | 2 | Toast |
| [ ] | 4.3.8 | Add subject mastery badges | 3 | Per-subject achievements |

**Week 14 Total**: 26 hours

---

## Phase 4 Checkpoint
- [ ] Daily quests generate and track
- [ ] Weekly quests work
- [ ] Quest completion awards rewards
- [ ] Achievements unlock on criteria
- [ ] Achievement celebration shows
- [ ] Streak tracks correctly
- [ ] Skills progress per subject
- [ ] Level up notifications work

---

## Phase 5: Analytics & Salary (Weeks 15-17)

### Week 15: Analytics Dashboard
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 5.1.1 | Set up Recharts | 2 | npm install |
| [ ] | 5.1.2 | Build daily stars chart | 4 | Bar chart |
| [ ] | 5.1.3 | Create subject breakdown | 4 | Horizontal bars |
| [ ] | 5.1.4 | Build completion rate display | 3 | % with comparison |
| [ ] | 5.1.5 | Create analytics page layout | 4 | Cards + charts |
| [ ] | 5.1.6 | Implement date range selector | 3 | This week/month |
| [ ] | 5.1.7 | Add vs previous period | 4 | Calculate diff |
| [ ] | 5.1.8 | Build streak/achievement summary | 3 | Quick stats |

**Week 15 Total**: 27 hours

---

### Week 16: Reports
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 5.2.1 | Create report data aggregation | 4 | Weekly summary |
| [ ] | 5.2.2 | Build weekly report UI | 6 | Printable layout |
| [ ] | 5.2.3 | Implement report generation | 4 | On-demand |
| [ ] | 5.2.4 | Create export to PDF | 4 | html2pdf or similar |
| [ ] | 5.2.5 | Build historical reports list | 3 | Past reports |
| [ ] | 5.2.6 | Add observer report access | 2 | Read-only reports |

**Week 16 Total**: 23 hours

---

### Week 17: Salary System
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 5.3.1 | Create salary config UI | 4 | Settings form |
| [ ] | 5.3.2 | Build salary calculation | 4 | Base + bonuses |
| [ ] | 5.3.3 | Create salary dashboard | 6 | Current + breakdown |
| [ ] | 5.3.4 | Implement budget allocation | 4 | Save/Spend/Give |
| [ ] | 5.3.5 | Build salary history | 3 | Past payments |
| [ ] | 5.3.6 | Add payment tracking | 3 | Mark as paid |
| [ ] | 5.3.7 | Create salary goals | 3 | Big purchase targets |

**Week 17 Total**: 27 hours

---

## Phase 5 Checkpoint
- [ ] Analytics page shows real charts
- [ ] Date range selection works
- [ ] Weekly report generates
- [ ] Observer can view reports
- [ ] Salary config can be set
- [ ] Salary calculates with bonuses
- [ ] Budget allocation displays

---

## Phase 6: Polish & Launch (Week 18)

### Week 18: PWA, Testing & Deployment
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [ ] | 6.1.1 | Configure service worker | 4 | vite-plugin-pwa |
| [ ] | 6.1.2 | Create app manifest | 2 | Icons, name, colors |
| [ ] | 6.1.3 | Add install prompt | 2 | BeforeInstallPrompt |
| [ ] | 6.1.4 | Implement offline detection | 2 | Show banner |
| [ ] | 6.1.5 | Performance audit | 4 | Run Lighthouse |
| [ ] | 6.1.6 | Optimize bundle size | 4 | Code splitting |
| [ ] | 6.1.7 | Add loading states | 4 | Skeletons |
| [ ] | 6.1.8 | Implement error boundaries | 3 | Catch errors |
| [ ] | 6.1.9 | Add toast notifications | 3 | Success/error feedback |
| [ ] | 6.1.10 | End-to-end testing | 8 | All user flows |
| [ ] | 6.1.11 | Bug fixes | 6 | From testing |
| [ ] | 6.1.12 | Cross-browser testing | 3 | Chrome, Safari, Firefox |
| [ ] | 6.1.13 | Mobile testing | 3 | iOS, Android |
| [ ] | 6.1.14 | Configure Netlify | 2 | Build settings |
| [ ] | 6.1.15 | Create production env | 2 | Supabase prod |
| [ ] | 6.1.16 | Final deployment | 2 | Deploy to prod |

**Week 18 Total**: 54 hours

---

## Launch Checklist

### Pre-Launch
- [ ] Super Admin panel fully functional
- [ ] All family roles can log in
- [ ] All core features working
- [ ] No critical bugs
- [ ] Performance score > 80
- [ ] Mobile responsive
- [ ] Error handling in place
- [ ] Loading states for all async operations
- [ ] Data isolation verified between families

### Launch Day
- [ ] Deploy to production
- [ ] Verify all features work
- [ ] Create first family via Super Admin
- [ ] Set up all roles for family
- [ ] Generate and print credentials card
- [ ] Set up initial schedule
- [ ] Add rewards to shop
- [ ] Test full task flow

### Post-Launch
- [ ] Monitor for errors
- [ ] Gather feedback
- [ ] Plan iteration

---

## Summary by Phase

| Phase | Weeks | Hours | Description |
|:------|:-----:|:-----:|:------------|
| 1. Foundation | 1-4 | 117 | Setup, Database, Auth, Super Admin |
| 2. Core Features | 5-8 | 140 | Dashboards, Timetable, Tasks, Stars |
| 3. Economy | 9-11 | 81 | Banking, Goals, Rewards |
| 4. Gamification | 12-14 | 85 | Quests, Achievements, Skills |
| 5. Analytics | 15-17 | 77 | Reports, Salary |
| 6. Polish | 18 | 54 | PWA, Testing, Launch |
| **TOTAL** | **18** | **~554** | |

---

## Role Permission Reference

| Feature | Super Admin | Primary Parent | Other Parent | Observer | Child |
|:--------|:-----------:|:--------------:|:------------:|:--------:|:-----:|
| Manage Families | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create/Edit Roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Schedule | ❌ | ✅ | ✅ | ❌ | ❌ |
| Approve Tasks | ❌ | ✅ | ✅ | ❌ | ❌ |
| Award Stars/Gems | ❌ | ✅ | ✅ | ❌ | ❌ |
| Manage Rewards | ❌ | ✅ | ✅ | ❌ | ❌ |
| Approve Redemptions | ❌ | ✅ | ✅ | ❌ | ❌ |
| View Analytics | ❌ | ✅ | ✅ | ✅ | ❌ |
| Salary Config | ❌ | ✅ | ❌ | ❌ | ❌ |
| Complete Tasks | ❌ | ❌ | ❌ | ❌ | ✅ |
| Redeem Rewards | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage Banking | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Notes

### Getting Started
1. Create Supabase account and project
2. Run `npm create vite@latest rewardy -- --template react`
3. Follow Week 1 tasks in order
4. Create initial Super Admin account manually in DB

### Daily Standup Questions
- What did I complete yesterday?
- What will I work on today?
- Any blockers?

### Weekly Review
- Tasks completed vs planned
- Hours spent vs estimated
- Blockers encountered
- Next week priorities

### Multi-Family Testing
- Test data isolation between families
- Verify role permissions work correctly
- Test credential card generation
- Verify session management across roles

---

*Last Updated: November 27, 2025*
*Version: 2.0 - Multi-Family Architecture*
