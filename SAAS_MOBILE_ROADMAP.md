# Rewardy - SaaS & Mobile App Conversion Roadmap

> This document outlines the plan to convert Rewardy into a SaaS product with a React Native mobile app.

---

## Table of Contents
1. [Current App Status](#current-app-status)
2. [SaaS Conversion](#part-1-saas-conversion)
3. [React Native Mobile App](#part-2-react-native-mobile-app)
4. [Implementation Roadmap](#part-3-implementation-roadmap)
5. [Database Changes](#database-changes-for-saas)
6. [Cost Estimates](#cost-estimates)

---

## Current App Status

| Aspect | Status | Details |
|--------|--------|---------|
| **Core Features** | Complete | Tasks, rewards, banking, quests, achievements |
| **Multi-Family** | Ready | Family isolation already implemented |
| **Authentication** | Custom | Token-based with bcrypt (not Supabase Auth) |
| **PWA** | Working | Offline support, installable |
| **Database** | Solid | 25+ tables, well-structured |

### Tech Stack
- Frontend: React 19, Vite 5, Tailwind CSS 3
- State: Zustand, React Query
- Backend: Supabase (PostgreSQL)
- Auth: Custom bcrypt-based
- PWA: Vite PWA Plugin, Workbox

---

## Part 1: SaaS Conversion

### What's Already Ready
- Multi-family data isolation (each family is a "tenant")
- Role-based permissions (5 roles with 11 permissions)
- Family-level settings (timezone, time format, etc.)
- Activity logging foundation

### What's Missing for SaaS

#### 1. Subscription & Billing Tables
```sql
-- Subscription Plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    features JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Family Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active', -- active, cancelled, past_due, trialing
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    stripe_invoice_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Methods
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255),
    card_brand VARCHAR(20),
    card_last4 VARCHAR(4),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Usage Limits by Plan
```javascript
const PLAN_LIMITS = {
  free: {
    max_children: 1,
    max_rewards: 5,
    max_custom_quests: 0,
    analytics_days: 7,
    custom_branding: false,
    priority_support: false
  },
  family: {
    max_children: 3,
    max_rewards: 25,
    max_custom_quests: 10,
    analytics_days: 30,
    custom_branding: false,
    priority_support: false
  },
  premium: {
    max_children: 5,
    max_rewards: 100,
    max_custom_quests: 50,
    analytics_days: 365,
    custom_branding: true,
    priority_support: true
  },
  school: {
    max_children: -1, // unlimited
    max_rewards: -1,
    max_custom_quests: -1,
    analytics_days: -1,
    custom_branding: true,
    priority_support: true,
    api_access: true,
    white_label: true
  }
};
```

#### 3. Security Hardening - RLS Policies
```sql
-- Enable RLS on all tables
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Create function to get current user's family
CREATE OR REPLACE FUNCTION get_current_family_id()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_family_id', true)::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example RLS policy for families
CREATE POLICY "Users can only access their own family"
ON families FOR ALL
USING (id = get_current_family_id());

-- Example RLS policy for child data
CREATE POLICY "Users can only access children in their family"
ON child_profiles FOR ALL
USING (family_id = get_current_family_id());

-- Repeat similar policies for all tables...
```

#### 4. Stripe Integration Code
```javascript
// src/lib/stripe.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCustomer(family) {
  return await stripe.customers.create({
    email: family.email,
    metadata: { family_id: family.id }
  });
}

export async function createSubscription(customerId, priceId) {
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent']
  });
}

export async function cancelSubscription(subscriptionId) {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
}

// Webhook handler for subscription events
export async function handleWebhook(event) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await updateSubscriptionInDB(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await deactivateSubscription(event.data.object);
      break;
    case 'invoice.paid':
      await recordPayment(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handleFailedPayment(event.data.object);
      break;
  }
}
```

### Recommended SaaS Pricing Tiers

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | 1 child, basic tasks, 5 rewards, 7-day analytics |
| **Family** | $9.99/mo | 3 children, unlimited tasks, 25 rewards, 30-day analytics |
| **Premium** | $19.99/mo | 5 children, advanced quests, custom branding, priority support |
| **School** | Custom | Unlimited, white-label, API access, dedicated support |

---

## Part 2: React Native Mobile App

### Code Reusability Analysis

#### 100% Reusable (Direct Copy)
```
src/
├── services/gamificationService.js  ✅ (774 lines - all business logic)
├── lib/timeSettings.js              ✅ (150 lines - pure utilities)
└── stores/ (with minor changes)
    ├── authStore.js                 ✅ (change localStorage to AsyncStorage)
    └── uiStore.js                   ✅ (80% reusable)
```

#### Needs Replacement
| Web Technology | React Native Replacement |
|----------------|-------------------------|
| `localStorage` | `@react-native-async-storage/async-storage` |
| `window.speechSynthesis` | `expo-speech` |
| React Router | `@react-navigation/native` |
| Tailwind CSS | `nativewind` or `StyleSheet` |
| Recharts | `react-native-chart-kit` |
| Web modals | React Native `Modal` |
| `navigator.onLine` | `@react-native-community/netinfo` |

### Recommended React Native Stack

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "react-native": "0.73.x",

    "// Navigation": "",
    "@react-navigation/native": "^6.x",
    "@react-navigation/bottom-tabs": "^6.x",
    "@react-navigation/native-stack": "^6.x",
    "react-native-screens": "~3.29.0",
    "react-native-safe-area-context": "4.8.2",

    "// State & Data": "",
    "zustand": "^5.x",
    "@tanstack/react-query": "^5.x",
    "@supabase/supabase-js": "^2.x",

    "// UI & Styling": "",
    "nativewind": "^4.x",
    "tailwindcss": "^3.x",
    "react-native-reanimated": "~3.6.0",

    "// Features": "",
    "expo-speech": "~12.0.0",
    "@react-native-async-storage/async-storage": "^1.x",
    "react-native-chart-kit": "^6.x",
    "@react-native-community/netinfo": "^11.x",

    "// Notifications": "",
    "expo-notifications": "~0.27.0",

    "// Auth": "",
    "expo-local-authentication": "~14.0.0"
  }
}
```

### Mobile App Project Structure

```
rewardy-mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── _layout.tsx
│   ├── (parent)/
│   │   ├── dashboard.tsx
│   │   ├── tasks.tsx
│   │   ├── schedule.tsx
│   │   ├── rewards.tsx
│   │   ├── analytics.tsx
│   │   ├── settings.tsx
│   │   └── _layout.tsx
│   ├── (child)/
│   │   ├── dashboard.tsx
│   │   ├── quests.tsx
│   │   ├── shop.tsx
│   │   ├── bank.tsx
│   │   ├── achievements.tsx
│   │   ├── skills.tsx
│   │   └── _layout.tsx
│   ├── _layout.tsx
│   └── index.tsx
├── src/
│   ├── components/               # Native UI components
│   │   ├── TaskCard.tsx
│   │   ├── QuestProgress.tsx
│   │   ├── CurrencyBadge.tsx
│   │   ├── TTSButton.tsx
│   │   └── ...
│   ├── services/                 # COPY FROM WEB
│   │   └── gamificationService.js
│   ├── stores/                   # COPY FROM WEB (adapt storage)
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   ├── lib/                      # COPY FROM WEB
│   │   ├── supabase.ts
│   │   └── timeSettings.ts
│   ├── hooks/                    # Shared custom hooks
│   │   ├── useAuth.ts
│   │   ├── useTasks.ts
│   │   └── useQuests.ts
│   └── utils/                    # Utility functions
│       ├── storage.ts            # AsyncStorage wrapper
│       └── notifications.ts
├── assets/
│   ├── images/
│   └── fonts/
├── app.json                      # Expo config
├── tailwind.config.js            # NativeWind config
├── babel.config.js
├── tsconfig.json
└── package.json
```

### Storage Adapter (Replace localStorage)

```typescript
// src/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async getItem(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  async clear(): Promise<void> {
    await AsyncStorage.clear();
  }
};
```

### TTS Button for Mobile

```typescript
// src/components/TTSButton.tsx
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';

interface TTSButtonProps {
  text: string;
  size?: 'small' | 'normal';
}

export function TTSButton({ text, size = 'normal' }: TTSButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = async () => {
    if (isSpeaking) {
      await Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      await Speech.speak(text, {
        language: 'en-US',
        pitch: 1.5,  // Higher pitch for girl voice
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  return (
    <TouchableOpacity
      onPress={handleSpeak}
      style={[
        styles.button,
        size === 'small' ? styles.small : styles.normal,
        isSpeaking ? styles.speaking : styles.idle
      ]}
    >
      <Text style={styles.icon}>{isSpeaking ? '⏹️' : '🔊'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  small: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  normal: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  idle: {
    backgroundColor: '#f97316', // orange-500
  },
  speaking: {
    backgroundColor: '#6b7280', // gray-500
  },
  icon: {
    fontSize: 18,
  },
});
```

### Mobile-Specific Features to Add

#### 1. Push Notifications
```typescript
// src/utils/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export async function scheduleTaskReminder(task: Task) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time for a task! 📋",
      body: task.title,
      data: { taskId: task.id },
    },
    trigger: {
      date: new Date(task.scheduled_time),
    },
  });
}
```

#### 2. Biometric Authentication
```typescript
// src/utils/biometrics.ts
import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticateWithBiometrics(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Login to Rewardy',
    fallbackLabel: 'Use password',
  });

  return result.success;
}
```

#### 3. Offline Support with SQLite
```typescript
// For offline-first architecture
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('rewardy.db');

export function initializeLocalDB() {
  db.transaction(tx => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS pending_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT,
        operation TEXT,
        data TEXT,
        created_at TEXT
      )
    `);
  });
}
```

---

## Part 3: Implementation Roadmap

### Phase 1: SaaS Foundation (2-3 weeks)
- [ ] Add subscription tables to database
- [ ] Implement Stripe integration
- [ ] Create pricing page component
- [ ] Add usage limits by plan
- [ ] Implement RLS policies for security
- [ ] Add proper error tracking (Sentry)
- [ ] Create admin dashboard for tenant management

### Phase 2: Mobile App MVP (4-6 weeks)
- [ ] Set up Expo project with TypeScript
- [ ] Configure NativeWind for styling
- [ ] Copy reusable code (services, stores, lib)
- [ ] Implement React Navigation structure
- [ ] Build child screens first (simpler UI)
  - [ ] Child Dashboard
  - [ ] Quests Page
  - [ ] Shop Page
  - [ ] Bank Page
  - [ ] Achievements Page
  - [ ] Skills Page
- [ ] Implement expo-speech for TTS
- [ ] Build parent screens
  - [ ] Parent Dashboard
  - [ ] Tasks Page
  - [ ] Schedule Page
  - [ ] Rewards Page
  - [ ] Analytics Page
  - [ ] Settings Page
- [ ] Add push notifications

### Phase 3: Polish & Launch (2-3 weeks)
- [ ] App Store submission preparation
  - [ ] Screenshots
  - [ ] App description
  - [ ] Privacy policy
- [ ] Play Store submission preparation
- [ ] Beta testing with TestFlight / Internal Testing
- [ ] Bug fixes and performance optimization
- [ ] Landing page for SaaS marketing
- [ ] Documentation and help center

### Phase 4: Growth Features (Ongoing)
- [ ] Multiple children per family
- [ ] Family sharing / co-parent invite
- [ ] In-app purchases
- [ ] Widgets (iOS/Android)
- [ ] Apple Watch / Wear OS companion
- [ ] AI-powered task suggestions
- [ ] Integration with educational platforms

---

## Database Changes for SaaS

### New Tables Summary
```sql
-- 1. subscription_plans - Define available plans
-- 2. subscriptions - Track family subscriptions
-- 3. invoices - Billing history
-- 4. payment_methods - Stored payment info
-- 5. usage_tracking - Monitor feature usage for limits
-- 6. feature_flags - A/B testing and gradual rollouts
```

### Migration Script
```sql
-- Run this after implementing billing
-- migrations/add_saas_tables.sql

-- Insert default plans
INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, features, limits) VALUES
('Free', 'free', 0, 0,
  '{"tasks": true, "basic_rewards": true}',
  '{"max_children": 1, "max_rewards": 5, "analytics_days": 7}'
),
('Family', 'family', 9.99, 99.99,
  '{"tasks": true, "rewards": true, "analytics": true, "quests": true}',
  '{"max_children": 3, "max_rewards": 25, "analytics_days": 30}'
),
('Premium', 'premium', 19.99, 199.99,
  '{"tasks": true, "rewards": true, "analytics": true, "quests": true, "custom_branding": true}',
  '{"max_children": 5, "max_rewards": 100, "analytics_days": 365}'
);

-- Add subscription_id to families
ALTER TABLE families ADD COLUMN subscription_id UUID REFERENCES subscriptions(id);
```

---

## Cost Estimates

### Monthly Operating Costs

| Service | Free Tier | With Users |
|---------|-----------|------------|
| Supabase | Free (500MB) | $25/mo (8GB) |
| Stripe | 2.9% + $0.30/txn | Variable |
| Expo EAS Build | Free (30 builds) | $99/mo |
| Sentry | Free (5K events) | $26/mo |
| **Total** | ~$0 | ~$150/mo |

### One-Time Costs

| Item | Cost |
|------|------|
| Apple Developer Account | $99/year |
| Google Play Developer | $25 (one-time) |
| Domain name | ~$12/year |
| Logo/Branding (optional) | $50-500 |

### Revenue Projections

| Users | Free | Family ($10) | Premium ($20) | Monthly Revenue |
|-------|------|--------------|---------------|-----------------|
| 100 | 70 | 25 | 5 | $350 |
| 500 | 350 | 120 | 30 | $1,800 |
| 1,000 | 700 | 240 | 60 | $3,600 |
| 5,000 | 3,500 | 1,200 | 300 | $18,000 |

---

## Quick Start Commands

### Setting Up React Native Project
```bash
# Create Expo project
npx create-expo-app rewardy-mobile -t expo-template-blank-typescript

cd rewardy-mobile

# Install core dependencies
npx expo install @supabase/supabase-js zustand @tanstack/react-query

# Install navigation
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context

# Install UI/features
npx expo install expo-speech @react-native-async-storage/async-storage
npx expo install react-native-chart-kit react-native-svg
npx expo install expo-notifications expo-local-authentication

# Install NativeWind (Tailwind for RN)
npm install nativewind tailwindcss
npx tailwindcss init

# Copy reusable code from web app
mkdir -p src/services src/lib src/stores
cp ../Rewardy/src/services/gamificationService.js src/services/
cp ../Rewardy/src/lib/timeSettings.js src/lib/
cp ../Rewardy/src/stores/*.js src/stores/
```

### Starting Development
```bash
# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Build for production
eas build --platform all
```

---

## Notes & Considerations

### Security Checklist Before Launch
- [ ] Implement proper RLS policies in Supabase
- [ ] Add rate limiting on auth endpoints
- [ ] Move sensitive config to environment variables
- [ ] Implement proper session refresh logic
- [ ] Add CSRF protection for web app
- [ ] Security audit of payment flow

### Performance Considerations
- [ ] Implement pagination for large lists
- [ ] Add React Query caching strategies
- [ ] Lazy load screens/components
- [ ] Optimize images and assets
- [ ] Monitor bundle size

### Legal Requirements
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] COPPA compliance (children's data)
- [ ] GDPR compliance (if EU users)
- [ ] Data deletion procedures

---

*Last Updated: December 2024*
*Version: 1.0*
