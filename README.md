## Scénium – Real World Asset Dashboard

Scénium is a Next.js–based dashboard for exploring tokenized **Real World Assets (RWAs)** on the **Tanssi Dancebox EVM testnet**.  
Connect your wallet, browse curated RWA markets, and track your mock portfolio performance with a modern, responsive UI.

---

### Features

- **Wallet connection**
  - **RainbowKit + wagmi** wallet connector.
  - Configured for **Tanssi Dancebox (id 5679)** EVM testnet.
- **RWA marketplace**
  - **Card-based marketplace** of tokenized RWAs (real estate, funds, tokenized stocks).
  - Per-asset details: type, description, price/share, available vs total shares.
  - One-click action: **Buy 10 shares** (mocked on-chain via `TanssiProvider`).
- **Portfolio analytics**
  - **Total account value**, **asset portfolio value**, and **P/L** vs a $10,000 starting balance.
  - **Performance history chart** (Recharts) that reacts to your current portfolio.
  - **Holdings list** with per-asset value and quick “Sell position” actions.
  - **RWA Allocation** bar showing the percentage of your account invested in RWAs.
- **Transaction history**
  - Timeline of **BUY / SELL** events with timestamps, prices, and share counts.
- **Responsive design**
  - Desktop sidebar navigation.
  - Mobile-friendly header with tab switcher (Portfolio / History / Market).
  - Optimized layout for phones, tablets, and large screens.
- **Data backends**
  - **Primary**: PostgreSQL (e.g. Supabase) via Prisma.
  - **Fallback**: In-memory demo store if the database is not configured or Prisma fails, so the app still works in demos.

---

### Tech stack

- **Frontend**
  - **Next.js 16** (App Router, TypeScript).
  - **React 19**, **Tailwind CSS 4**.
  - **RainbowKit**, **wagmi**, **viem** (wallet + chain integration).
  - **Recharts** for charts.
  - **Zustand** for client-side state.
- **Backend**
  - **Prisma** ORM with PostgreSQL.
  - API routes under `src/app/api` for `assets` and `user`.
- **Web3 / testnet**
  - Custom **Tanssi Dancebox** chain configuration.
  - Mock on-chain interactions via `TanssiProvider`.

---

### Getting started (local)

- **Prerequisites**
  - **Node.js 18+**
  - A **PostgreSQL** instance (local or cloud, e.g. Supabase).

- **Install dependencies**

```bash
npm install
# or
yarn install
```

- **Configure environment**

Create a `.env` file in the project root:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_walletconnect_project_id"
```

Notes:

- **DATABASE_URL** and **DIRECT_URL** should match your Postgres/Supabase connection strings.
- If `DATABASE_URL` is **omitted or invalid**, the app automatically falls back to **in-memory demo mode**:
  - Assets and user portfolio are not persisted, but the UI and flows still work.

- **Run database migrations / generate client**

If you plan to use a real DB:

```bash
npx prisma migrate deploy
npx prisma generate
```

(Optional) Seed demo assets into your database:

```bash
node prisma/seed.js
```

- **Start the dev server**

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

---

### Usage

- **Connect a wallet**
  - Use the Connect button on the landing screen (RainbowKit modal).
  - Make sure your wallet is on **Tanssi Dancebox** or a compatible test network.

- **Explore tabs**
  - **Portfolio**: overview, chart, holdings list, RWA Allocation.
  - **History**: chronological list of BUY/SELL transactions.
  - **Marketplace**: available RWA assets with buy actions.
  - On **mobile**, tab navigation is in the **header** as three buttons:
    - Portfolio / History / Market.

- **Buying & selling**
  - Buying or selling triggers a mock call to `TanssiProvider.mintFractionalAsset`, which:
    - Simulates a network delay.
    - Returns a fake transaction hash used for the explorer link.
  - User balance, holdings, and transactions are updated either:
    - In **Postgres** via Prisma, or
    - In **in-memory state** (demo mode), depending on env configuration.

---

### Deployment (Vercel)

- **Environment variables (recommended for full persistence)**

In your Vercel project settings, set:

- **`DATABASE_URL`** – Postgres/Supabase pgbouncer URL.
- **`DIRECT_URL`** – Direct Postgres URL.
- **`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`** – WalletConnect project ID (for full wallet support).

If these DB variables are **missing or misconfigured**:

- `/api/assets` and `/api/user` will **automatically fall back** to:
  - Static demo assets (for the marketplace).
  - Per-session in-memory users (portfolio + history still function, but are not persistent).

- **Build & deploy**

Deploy as a standard Next.js 16 app; no extra build steps are required beyond:

```bash
npm run build
```

(Vercel runs this automatically.)

---

### Key files

- **UI**
  - `src/app/page.tsx` – main dashboard (tabs, charts, marketplace, layout).
  - `src/app/layout.tsx` – root layout and `Web3Provider`.
  - `src/components/Web3Provider.tsx` – wagmi + RainbowKit + React Query providers.
- **State & config**
  - `src/store/useStore.ts` – Zustand store (user, assets, actions).
  - `src/lib/wagmiConfig.ts` – Tanssi Dancebox chain + wagmi config.
  - `src/lib/tanssiProvider.ts` – mock on-chain interactions.
- **Backend**
  - `src/app/api/assets/route.ts` – assets API with DB + fallback demo assets.
  - `src/app/api/user/route.ts` – user/portfolio API with DB + in-memory fallback.
  - `prisma/schema.prisma` – Prisma schema (User, Asset, Holding, Transaction).
  - `prisma/seed.js` – seed script for demo assets.

---

### Development notes

- **Logs**
  - Tanssi mock logs (`TanssiProvider`) are suppressed in production to keep logs clean.
- **Demo vs production**
  - For **hackathons / demos**, you can run without a DB and rely on the built-in in-memory mode.
  - For **production-like use**, configure Postgres and run migrations so user state is persisted.

---

### Contributing

- **Code style**
  - TypeScript + ESLint (`npm run lint`).
- **Suggestions**
  - Open issues or PRs to:
    - Add new RWA asset types.
    - Improve analytics (e.g. risk metrics, yield curves, chain data).
    - Enhance mobile UX further.

---

### License

This project is provided as-is for demo and educational purposes.  
Adapt the license section here to match your actual licensing choice (MIT, Apache-2.0, proprietary, etc.).
