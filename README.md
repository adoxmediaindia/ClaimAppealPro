# ClaimAppealPro 🚀

**ClaimAppealPro** is an enterprise-grade, HIPAA-compliant SaaS platform engineered for healthcare providers, medical billing specialists, and clinical operations teams. It automates the extraction, processing, and legal AI generation of medical claim denial appeals to maximize reimbursement rates and reduce administrative overhead.

---

## 🌟 Key Features

* 🔐 **Secure Authentication & RBAC**: Supabase Auth integration supporting standard email/password authentication, Google OAuth 2.0, multi-tenant session management, and granular Role-Based Access Control (`USER`, `ADMIN`).
* 📄 **Intelligent OCR Engine**: Multi-stage document parsing utilizing **Mistral OCR** for high-accuracy medical record extraction with a local **Tesseract.js** fallback pipeline.
* 🤖 **AI-Powered Clinical Appeal Generation**: Integrates **OpenAI GPT-4o-mini** to analyze denial codes, insurance guidelines, and patient chart notes to generate persuasive, evidence-based appeal letters.
* ✍️ **Interactive Rich-Text Editor & Version Control**: Multi-version letter editing with complete history tracking (`AppealVersion`), snapshot comparisons, and manual override fields.
* 📄 **Pixel-Perfect PDF Export Engine**: Server-side PDF generation using **Puppeteer** with customized CMS-1500 and professional clinical layout templates.
* 💳 **Stripe Billing & Subscription Gates**: Fully integrated subscription tiers (`Free`, `Pro`, `Enterprise`) managed via Stripe Checkout, Customer Portal, and verified webhook callbacks.
* 🛡️ **Enterprise Security & Audit Logging**: Automatic audit trail generation (`AuditLog`), sliding-window rate limiting middleware, IP tracking, and DOMPurify XSS sanitization.
* ⚡ **Offline & Test Mode Resiliency**: Built-in mock database state layer (`mock_db_state.json`) and mock JWT token handlers for offline development and Playwright E2E testing.

---

## 🛠️ Tech Stack

* **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Actions, React 19)
* **Language**: [TypeScript 5.4](https://www.typescriptlang.org/)
* **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) via [Prisma ORM 5.12](https://www.prisma.io/)
* **Authentication**: [Supabase Auth](https://supabase.com/docs/guides/auth) (`@supabase/ssr`)
* **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/)
* **AI & Document Intelligence**: [OpenAI API](https://platform.openai.com/), [Mistral AI OCR](https://mistral.ai/), [Tesseract.js](https://tesseract.projectnaptha.com/)
* **PDF Processing**: [Puppeteer](https://pptr.dev/)
* **Payments**: [Stripe API](https://stripe.com/docs/api)
* **Logging**: [Pino Logger](https://getpino.io/)
* **Form Validation**: [React Hook Form](https://react-hook-form.com/), [Zod 3.22](https://zod.dev/)

---

## 📂 Project Structure

```
ClaimAppealPro/
├── prisma/
│   ├── schema.prisma        # Database schema definitions and relations
│   └── seed.ts              # System feature flags seeding script
├── public/                  # Static assets and media
├── src/
│   ├── app/                 # Next.js 15 App Router pages and Server Actions
│   │   ├── (auth)/          # Authentication routes (login, register, reset-password)
│   │   ├── (dashboard)/     # Protected application routes (dashboard, appeals, billing, admin)
│   │   ├── actions/         # Server Actions (auth, ocr, ai, pdf, billing, admin, support)
│   │   └── api/             # Webhook handlers and system health endpoints
│   ├── components/          # Reusable UI primitives and domain features
│   │   ├── shared/          # Complex feature components (OcrReviewForm, AiAppealView)
│   │   └── ui/              # Radix UI / Shadcn styled atomic components
│   ├── config/              # Zod environment variable validation & app config
│   ├── lib/                 # Service clients (Prisma, Supabase, OpenAI, Stripe, Pino, OCR, PDF)
│   └── middleware.ts        # Next.js Edge Middleware for auth protection & rate limiting
├── tests/
│   ├── e2e/                 # Playwright end-to-end integration tests
│   └── unit/                # Vitest unit test suites
├── docker-compose.yml       # Local PostgreSQL & Redis developer services
└── package.json             # Dependencies and npm scripts
```

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js**: `v20.x` or higher
* **npm**: `v10.x` or higher
* **Docker** (Optional for local database setup)

### 2. Installation & Setup

Clone the repository and install dependencies:
```bash
git clone https://github.com/your-org/claim-appeal-pro.git
cd claim-appeal-pro
npm install
```

### 3. Environment Variables Configuration
Duplicate `.env.example` to `.env` and supply your API keys:
```bash
cp .env.example .env
```

Ensure your `.env` contains:
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/claimappealpro?schema=public"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Integrations
OPENAI_API_KEY="sk-proj-your-key"
STRIPE_SECRET_KEY="sk_test_your-key"
STRIPE_WEBHOOK_SECRET="whsec_your-secret"
RESEND_API_KEY="re_your-key"

# App Settings
APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 4. Local Database Initialization
Start local PostgreSQL and Redis containers via Docker:
```bash
docker-compose up -d
```

Run database migrations and seed system configuration flags:
```bash
npx prisma migrate dev
npm run db:seed
```

### 5. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Launches Next.js development server with hot-reloading |
| `npm run build` | Compiles production-optimized build bundle |
| `npm run start` | Boots Next.js production server |
| `npm run lint` | Evaluates ESLint static analysis rules |
| `npm run prisma:generate` | Re-generates Prisma Client TypeScript bindings |
| `npm run prisma:migrate` | Executes database migrations against target database |
| `npm run prisma:studio` | Launches interactive database browser GUI |
| `npm run db:seed` | Populates database with feature flags |

---

## 🌐 Deployment Overview

### Deployment Options
* **Vercel (Recommended)**: Ideal for Next.js App Router, Server Actions, and Supabase integration.
* **Docker / VPS (AWS / DigitalOcean)**: Supported via custom container builds with Puppeteer Chromium dependencies pre-installed.

### Build Verification
Before deploying to production, execute a local verification build:
```bash
npm run build
```

---

## 🔒 Security & HIPAA Compliance

* **Data Encryption**: Strict SSL transport encryption enforcement with HSTS headers.
* **XSS Safeguards**: Rich-text HTML inputs sanitized using `isomorphic-dompurify`.
* **Database Isolation**: Soft deletes (`deletedAt`) implemented across sensitive patient models (`Appeal`, `Profile`, `File`).
* **Auditability**: Automated tracking of administrative actions, billing events, and document generation via `AuditLog`.

---

## 📄 License
This project is proprietary software. All rights reserved.
