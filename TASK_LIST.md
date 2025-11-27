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
| [x] | 1.1.1 | Initialize Vite + React project | 2 | `npm create vite@latest rewardy -- --template react` |
| [x] | 1.1.2 | Configure Tailwind CSS | 2 | Follow Tailwind + Vite guide |
| [x] | 1.1.3 | Set up project structure (folders) | 3 | See PRD Appendix A |
| [x] | 1.1.4 | Create Supabase project | 1 | supabase.com |
| [x] | 1.1.5 | Configure Supabase client | 2 | Install @supabase/supabase-js |
| [x] | 1.1.6 | Set up environment variables | 1 | .env.local |
| [x] | 1.1.7 | Configure ESLint + Prettier | 1 | |
| [x] | 1.1.8 | Set up Zustand store structure | 2 | authStore, uiStore, familyStore |
| [x] | 1.1.9 | Configure React Query | 2 | QueryClient setup |
| [x] | 1.1.10 | Create base layout components | 4 | Header, Sidebar, Container |

**Week 1 Total**: 20 hours

---

### Week 2: Database Schema
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 1.2.1 | Create super_admins table | 1 | Username + password hash |
| [x] | 1.2.2 | Create families table | 2 | family_code, display_name, timezone |
| [x] | 1.2.3 | Create family_roles table | 2 | role, role_label, password_hash |
| [x] | 1.2.4 | Create sessions table | 2 | Token-based session management |
| [x] | 1.2.5 | Create child_profiles table | 2 | Linked to family_id |
| [x] | 1.2.6 | Create all application tables | 6 | Tasks, rewards, transactions, etc. |
| [x] | 1.2.7 | Set up Row Level Security | 4 | Family-based isolation |
| [x] | 1.2.8 | Create database indexes | 2 | Performance optimization |
| [x] | 1.2.9 | Create database functions | 4 | award_stars, apply_interest, etc. |
| [x] | 1.2.10 | Seed initial super admin | 1 | First admin account |

**Week 2 Total**: 26 hours

---

### Week 3: Custom Authentication System
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 1.3.1 | Install bcryptjs for password hashing | 1 | npm install bcryptjs |
| [x] | 1.3.2 | Create auth service module | 4 | hashPassword, verifyPassword |
| [x] | 1.3.3 | Create session management utilities | 4 | Create, validate, destroy sessions |
| [x] | 1.3.4 | Build Super Admin login page | 4 | Username + Password form |
| [x] | 1.3.5 | Build Family login page | 6 | Family dropdown → Role → Password |
| [x] | 1.3.6 | Create auth context/hooks | 4 | AuthProvider, useAuth |
| [x] | 1.3.7 | Implement session persistence | 3 | localStorage + token validation |
| [x] | 1.3.8 | Create protected route wrapper | 3 | ProtectedRoute component |
| [x] | 1.3.9 | Implement role-based route guards | 3 | SuperAdmin, Parent, Observer, Child |
| [x] | 1.3.10 | Add auto-logout on session expiry | 2 | Token expiration check |

**Week 3 Total**: 34 hours

---

### Week 4: Super Admin Panel
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 1.4.1 | Create Super Admin dashboard layout | 4 | Stats + navigation |
| [x] | 1.4.2 | Build family list view | 4 | Table with all families |
| [x] | 1.4.3 | Create "Add Family" form | 4 | Family code, display name, timezone |
| [x] | 1.4.4 | Build family detail/edit page | 4 | View + modify family |
| [x] | 1.4.5 | Create role management UI | 6 | CRUD for family roles |
| [x] | 1.4.6 | Implement password reset for roles | 3 | Generate new password |
| [x] | 1.4.7 | Build child profile management | 4 | Add/edit child within family |
| [x] | 1.4.8 | Create printable credentials card | 4 | PDF generation for family |
| [x] | 1.4.9 | Add family activation toggle | 2 | Enable/disable family |
| [x] | 1.4.10 | Build Super Admin settings | 2 | Change own password |

**Week 4 Total**: 37 hours

---

## Phase 1 Checkpoint
- [x] Super Admin can log in
- [x] Super Admin can create families
- [x] Super Admin can create roles for families
- [x] Super Admin can add child profiles
- [x] Family members can log in (Family + Role + Password)
- [x] Sessions persist and auto-expire
- [x] Correct dashboard shown based on role
- [x] Database tables created with RLS
- [x] Printable credentials card works

---

## Phase 2: Core Features (Weeks 5-8)

### Week 5: Dashboards
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 2.1.1 | Create parent dashboard layout | 4 | Grid layout with family context |
| [x] | 2.1.2 | Implement stats cards | 3 | Tasks, Stars, Streak, Pending |
| [x] | 2.1.3 | Implement quick actions bar | 3 | 4 buttons |
| [x] | 2.1.4 | Create pending approvals list | 4 | Tasks + Rewards |
| [x] | 2.1.5 | Implement weekly progress chart | 4 | Simple bar chart |
| [x] | 2.1.6 | Create activity feed | 3 | Last 10 items |
| [x] | 2.1.7 | Create child dashboard layout | 4 | Card-based |
| [x] | 2.1.8 | Implement child status header | 3 | Stars, Gems, Streak |
| [x] | 2.1.9 | Create today's quests list | 4 | Task cards |
| [x] | 2.1.10 | Build observer dashboard | 3 | Read-only stats view (permissions) |

**Week 5 Total**: 35 hours

---

### Week 6: Timetable Module
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 2.2.1 | Create schedule template CRUD | 4 | Supabase service |
| [x] | 2.2.2 | Build weekly timetable grid | 8 | 7 columns × time rows |
| [ ] | 2.2.3 | Implement drag-and-drop | 6 | react-dnd or similar (deferred) |
| [x] | 2.2.4 | Create schedule block editor | 4 | Modal with form |
| [x] | 2.2.5 | Build daily view component | 4 | Timeline layout |
| [x] | 2.2.6 | Create template selector | 4 | Pre-built options |
| [x] | 2.2.7 | Implement copy day | 3 | Duplicate to other days |
| [x] | 2.2.8 | Add conflict detection | 3 | Overlap warning |

**Week 6 Total**: 36 hours

---

### Week 7: Task Management
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 2.3.1 | Create daily task generation | 4 | Generate tasks from schedule |
| [x] | 2.3.2 | Build task list (parent) | 4 | Table/list view |
| [x] | 2.3.3 | Implement filtering/sorting | 3 | By status, date, category |
| [x] | 2.3.4 | Create approval workflow | 4 | Approve/reject buttons |
| [x] | 2.3.5 | Build bulk approve | 3 | Select multiple |
| [x] | 2.3.6 | Create add bonus task form | 3 | Modal form |
| [x] | 2.3.7 | Build task card (child) | 4 | Quest-style card |
| [x] | 2.3.8 | Implement mark complete | 3 | Submit for approval |
| [x] | 2.3.9 | Create task detail modal | 4 | Full info + actions |
| [x] | 2.3.10 | Add rejection with reason | 2 | Text input |

**Week 7 Total**: 34 hours

---

### Week 8: Star System
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 2.4.1 | Create currency balance API | 3 | Get/update balance |
| [x] | 2.4.2 | Implement award_stars function | 4 | DB function + JS |
| [x] | 2.4.3 | Build transaction logging | 3 | Auto-log on changes |
| [x] | 2.4.4 | Create star balance display | 2 | Reusable component |
| [x] | 2.4.5 | Build transaction history | 4 | List with filters |
| [x] | 2.4.6 | Parent award/deduct UI | 4 | Quick action form |
| [x] | 2.4.7 | Create basic reward shop | 4 | Grid of rewards |
| [x] | 2.4.8 | Build reward card | 3 | Image, cost, button |
| [x] | 2.4.9 | Implement redemption request | 4 | Create pending record |
| [x] | 2.4.10 | Create redemption approval | 4 | Parent workflow |

**Week 8 Total**: 35 hours

---

## Phase 2 Checkpoint
- [x] Parent dashboard shows real data
- [x] Observer dashboard shows read-only data
- [x] Child dashboard shows tasks and balance
- [x] Can create/edit schedule templates
- [x] Tasks generate from schedule
- [x] Child can mark tasks complete
- [x] Parent can approve tasks
- [x] Stars are awarded on approval
- [x] Basic reward shop works
- [x] Data properly isolated per family

---

## Phase 3: Economy & Banking (Weeks 9-11)

### Week 9: Savings & Interest
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 3.1.1 | Build star bank UI | 6 | Wallet + Savings + Goals |
| [x] | 3.1.2 | Implement wallet/savings transfer | 4 | Two-way transfer |
| [x] | 3.1.3 | Create transfer modal | 3 | Amount input |
| [x] | 3.1.4 | Build interest calculation | 4 | Tiered rates (5%, 7%, 10%) |
| [x] | 3.1.5 | Create interest tier display | 2 | Current tier + next |
| [x] | 3.1.6 | Implement monthly interest job | 4 | Manual trigger with collect button |
| [x] | 3.1.7 | Add interest celebration | 3 | Animation + notification |

**Week 9 Total**: 26 hours

---

### Week 10: Goal Jars & Gems
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 3.2.1 | Create savings goals CRUD | 4 | API + hooks |
| [x] | 3.2.2 | Build goal jar UI | 4 | Card with progress |
| [x] | 3.2.3 | Implement add to goal | 3 | Transfer from wallet |
| [x] | 3.2.4 | Create goal progress display | 3 | Progress bar + % |
| [x] | 3.2.5 | Add goal completion celebration | 2 | Animation + modal |
| [x] | 3.2.6 | Implement gem currency | 4 | Parallel to stars (basic) |
| [x] | 3.2.7 | Create gem balance display | 2 | Purple theme |
| [x] | 3.2.8 | Build gem transactions | 3 | Same pattern as stars |

**Week 10 Total**: 25 hours

---

### Week 11: Full Reward Shop
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 3.3.1 | Create reward management UI | 6 | Parent CRUD |
| [x] | 3.3.2 | Build add/edit reward form | 4 | Full form |
| [x] | 3.3.3 | Implement categories/filtering | 3 | Quick/Experience/Big |
| [x] | 3.3.4 | Create gem exclusives section | 3 | Separate tab |
| [x] | 3.3.5 | Build redemption history (parent) | 3 | All redemptions |
| [x] | 3.3.6 | Build redemption history (child) | 3 | Own redemptions (pending) |
| [x] | 3.3.7 | Implement auto-approve rules | 4 | Config + logic |
| [x] | 3.3.8 | Add daily limit enforcement | 2 | Check before allow |
| [x] | 3.3.9 | Create fulfilled confirmation | 2 | Mark as fulfilled |

**Week 11 Total**: 30 hours

---

## Phase 3 Checkpoint
- [x] Star bank shows wallet + savings
- [x] Can transfer between wallet/savings
- [x] Interest calculates correctly
- [x] Goal jars can be created
- [x] Can add stars to goals
- [x] Gems work as premium currency
- [x] Reward shop fully functional
- [x] Auto-approve works for rewards

---

## Phase 4: Gamification (Weeks 12-14)

### Week 12: Quest System
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 4.1.1 | Create quest data structure | 3 | Schema + types |
| [x] | 4.1.2 | Implement daily quest generation | 4 | "Complete X tasks" |
| [x] | 4.1.3 | Create weekly quest generation | 4 | "Earn X stars" |
| [x] | 4.1.4 | Build quest progress tracking | 4 | Update on events |
| [x] | 4.1.5 | Create quest card component | 4 | Progress + rewards |
| [x] | 4.1.6 | Build quests list page | 4 | Active + completed |
| [x] | 4.1.7 | Implement completion rewards | 4 | Stars + gems |
| [x] | 4.1.8 | Add quest expiration | 3 | Auto-expire old quests |

**Week 12 Total**: 30 hours

---

### Week 13: Achievement System
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 4.2.1 | Seed achievement definitions | 3 | ~30 achievements |
| [x] | 4.2.2 | Build achievement checking | 6 | Event-triggered |
| [x] | 4.2.3 | Create achievement badge | 3 | Icon + name + status |
| [x] | 4.2.4 | Build achievements page | 4 | Grid of badges |
| [x] | 4.2.5 | Implement unlock flow | 4 | Award gems + notify |
| [x] | 4.2.6 | Create celebration animation | 4 | Confetti/particles |
| [x] | 4.2.7 | Add achievement notifications | 2 | Toast + sound |
| [x] | 4.2.8 | Build achievements overview | 3 | Parent view |

**Week 13 Total**: 29 hours

---

### Week 14: Streaks & Skills
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 4.3.1 | Implement streak tracking | 4 | Daily check |
| [x] | 4.3.2 | Create streak display | 3 | Fire icon + count |
| [x] | 4.3.3 | Add streak milestones | 3 | 7, 14, 30, 100 days |
| [x] | 4.3.4 | Build subject progress tracking | 4 | Points per subject |
| [x] | 4.3.5 | Create skill level display | 3 | Progress bar + level |
| [x] | 4.3.6 | Build skills overview page | 4 | All subjects |
| [x] | 4.3.7 | Implement level up notifications | 2 | Toast |
| [x] | 4.3.8 | Add subject mastery badges | 3 | Per-subject achievements |

**Week 14 Total**: 26 hours

---

## Phase 4 Checkpoint
- [x] Daily quests generate and track
- [x] Weekly quests work
- [x] Quest completion awards rewards
- [x] Achievements unlock on criteria
- [x] Achievement celebration shows
- [x] Streak tracks correctly
- [x] Skills progress per subject
- [x] Level up notifications work

---

## Phase 5: Analytics & Salary (Weeks 15-17)

### Week 15: Analytics Dashboard
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 5.1.1 | Set up Recharts | 2 | npm install |
| [x] | 5.1.2 | Build daily stars chart | 4 | Bar chart |
| [x] | 5.1.3 | Create subject breakdown | 4 | Pie chart |
| [x] | 5.1.4 | Build completion rate display | 3 | % with comparison |
| [x] | 5.1.5 | Create analytics page layout | 4 | Cards + charts |
| [x] | 5.1.6 | Implement date range selector | 3 | This week/month |
| [x] | 5.1.7 | Add vs previous period | 4 | Calculate diff |
| [x] | 5.1.8 | Build streak/achievement summary | 3 | Quick stats |

**Week 15 Total**: 27 hours

---

### Week 16: Reports
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 5.2.1 | Create report data aggregation | 4 | Weekly summary |
| [x] | 5.2.2 | Build weekly report UI | 6 | In analytics page |
| [x] | 5.2.3 | Implement report generation | 4 | On-demand |
| [ ] | 5.2.4 | Create export to PDF | 4 | Deferred |
| [x] | 5.2.5 | Build historical reports list | 3 | In salary history |
| [x] | 5.2.6 | Add observer report access | 2 | Read-only reports |

**Week 16 Total**: 23 hours

---

### Week 17: Salary System
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 5.3.1 | Create salary config UI | 4 | Settings form |
| [x] | 5.3.2 | Build salary calculation | 4 | Base + bonuses |
| [x] | 5.3.3 | Create salary dashboard | 6 | Current + breakdown |
| [x] | 5.3.4 | Implement budget allocation | 4 | In config preview |
| [x] | 5.3.5 | Build salary history | 3 | Past payments |
| [x] | 5.3.6 | Add payment tracking | 3 | Mark as paid |
| [x] | 5.3.7 | Create salary goals | 3 | Integrated with savings goals |

**Week 17 Total**: 27 hours

---

## Phase 5 Checkpoint
- [x] Analytics page shows real charts
- [x] Date range selection works
- [x] Weekly report generates
- [x] Observer can view reports
- [x] Salary config can be set
- [x] Salary calculates with bonuses
- [x] Payment tracking works

---

## Phase 6: Polish & Launch (Week 18)

### Week 18: PWA, Testing & Deployment
| Done | ID | Task | Hours | Notes |
|:----:|:---|:-----|:-----:|:------|
| [x] | 6.1.1 | Configure service worker | 4 | vite-plugin-pwa |
| [x] | 6.1.2 | Create app manifest | 2 | Icons, name, colors |
| [x] | 6.1.3 | Add install prompt | 2 | BeforeInstallPrompt |
| [x] | 6.1.4 | Implement offline detection | 2 | Show banner |
| [ ] | 6.1.5 | Performance audit | 4 | Run Lighthouse |
| [x] | 6.1.6 | Optimize bundle size | 4 | Code splitting |
| [x] | 6.1.7 | Add loading states | 4 | Skeletons |
| [x] | 6.1.8 | Implement error boundaries | 3 | Catch errors |
| [x] | 6.1.9 | Add toast notifications | 3 | Success/error feedback |
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
*Version: 2.4 - Phase 6 In Progress*

## Progress Summary
- **Phase 1**: 40/40 tasks complete (100%)
- **Phase 2**: 39/40 tasks complete (98%) - Only drag-and-drop deferred
- **Phase 3**: 25/25 tasks complete (100%)
- **Phase 4**: 24/24 tasks complete (100%)
- **Phase 5**: 20/21 tasks complete (95%) - PDF export deferred
- **Phase 6**: 8/16 tasks complete (50%) - PWA, error handling, loading states, toast done
- **Overall**: ~94% complete (156/166 tasks)
