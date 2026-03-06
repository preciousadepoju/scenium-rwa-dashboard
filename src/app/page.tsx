"use client";

import { useEffect, useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useStore, type Asset, type Holding, type Transaction } from "@/store/useStore";
import {
  Wallet,
  TrendingUp,
  Landmark,
  Building2,
  Gem,
  ArrowRightLeft,
  Loader2,
  CheckCircle2,
  LayoutDashboard,
  Store,
  History,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";

// ─── Connect Screen ──────────────────────────────────────────
function ConnectScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] text-zinc-100 selection:bg-emerald-500/30">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-8"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <Gem size={40} fill="currentColor" />
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight">Scénium</h1>
            <p className="mt-2 text-lg text-zinc-400">Real World Asset Dashboard</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {["Tokenized Real Estate", "Private Credit", "Digital Bonds"].map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-zinc-300"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="flex w-80 flex-col items-center gap-5 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Connect your wallet</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Access your personalised RWA portfolio on Tanssi Dancebox Testnet.
            </p>
          </div>
          <ConnectButton />
        </div>

        <p className="text-xs text-zinc-600">
          Powered by Tanssi Network · EVM Testnet
        </p>
      </motion.div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────
export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { user, assets, loading, fetchUser, fetchAssets, buyAsset, sellAsset } = useStore();
  const [activeTab, setActiveTab] = useState<"portfolio" | "transactions" | "marketplace">("portfolio");
  const [processingAssetId, setProcessingAssetId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<{title: string, hash?: string} | null>(null);

  // Fetch user data whenever the connected wallet changes
  useEffect(() => {
    if (isConnected && address) {
      fetchUser(address);
      fetchAssets();
    }
  }, [isConnected, address, fetchUser, fetchAssets]);

  const showToast = (title: string, hash?: string) => {
    setSuccessMsg({ title, hash });
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleBuy = async (asset: Asset) => {
    if (!address) return;
    setProcessingAssetId(`buy-${asset.id}`);
    const { success, txHash } = await buyAsset(asset.id, 10, asset.name, asset.symbol, asset.price, address);
    setProcessingAssetId(null);

    if (success) {
      showToast(`Successfully purchased 10 shares of ${asset.symbol}`, txHash);
    }
  };

  const handleSell = async (asset: Pick<Asset, "id" | "name" | "symbol" | "price">, holdingShares: number) => {
    if (!address) return;
    setProcessingAssetId(`sell-${asset.id}`);
    // Sell all for the demo
    const sharesToSell = holdingShares;
    const { success, txHash } = await sellAsset(asset.id, sharesToSell, asset.name, asset.symbol, asset.price, address);
    setProcessingAssetId(null);

    if (success) {
      showToast(`Successfully sold ${sharesToSell} shares of ${asset.symbol}`, txHash);
    }
  };

  const chartData = useMemo(() => {
    if (!user) return [];
    const baseValue = 10000;
    const portfolioValue = user.holdings.reduce((acc, curr) => acc + curr.shares * curr.avgPrice, 0);
    const totalValue = user.balance + portfolioValue;
    
    // Generate a semi-dynamic chart that ends exactly at the current total value
    const data = [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    
    for(let i=0; i<months.length; i++) {
      if (i === months.length - 1) {
        data.push({ name: months[i], value: parseFloat(totalValue.toFixed(2)) });
      } else {
        // Linearly interpolate with some random noise towards the final value
        const progress = (i) / (months.length - 1);
        const target = baseValue + (totalValue - baseValue) * progress;
        // Use pseudo-random deterministic noise to respect React hook purity
        const noise = (((i * 9301 + 49297) % 233280) / 233280 - 0.5) * 500 * progress; 
        data.push({ name: months[i], value: parseFloat((target + noise).toFixed(2)) });
      }
    }
    return data;
  }, [user]);

  if (!isConnected) return <ConnectScreen />;

  if (!user && loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Connecting...";

  const portfolioValue =
    user?.holdings.reduce((acc, curr) => acc + curr.shares * curr.avgPrice, 0) || 0;

  const totalValue = (user?.balance || 0) + portfolioValue;
  const totalYield = totalValue - 10000; // Starter balance was 10000
  const isYieldPositive = totalYield >= 0;
  const rwaAllocation = totalValue > 0 ? (portfolioValue / totalValue) * 100 : 0;

  return (
    <div className="flex min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-emerald-500/30">

      {/* Sidebar */}
      <aside className="hidden w-64 border-r border-white/10 bg-black/50 md:flex flex-col backdrop-blur-md z-10 shrink-0">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500">
            <Gem size={20} fill="currentColor" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Scénium</span>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          <p className="px-3 pb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Menu
          </p>
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              activeTab === "portfolio"
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            }`}
          >
            <LayoutDashboard size={18} />
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              activeTab === "transactions"
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            }`}
          >
            <History size={18} />
            History
          </button>
          <button
            onClick={() => setActiveTab("marketplace")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              activeTab === "marketplace"
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            }`}
          >
            <Store size={18} />
            Marketplace
          </button>
        </nav>

        <div className="border-t border-white/10 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 font-bold text-black border-2 border-[#09090b]">
              {address?.charAt(2).toUpperCase() || "U"}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-zinc-100">{user?.name || shortAddress}</span>
              <span className="truncate text-xs text-zinc-500 font-mono">{shortAddress}</span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-zinc-300 tracking-wide">Tanssi Testnet</span>
            </div>
            <span className="text-[10px] font-semibold uppercase text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Connected</span>
          </div>
          <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="none" />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Success Toast */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: -20, x: "-50%" }}
              className="absolute top-6 left-1/2 z-50 flex flex-col items-center gap-1 rounded-2xl border border-emerald-500/20 bg-black/80 p-4 text-emerald-400 backdrop-blur-xl shadow-2xl"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} />
                <span className="text-sm font-medium">{successMsg.title}</span>
              </div>
              {successMsg.hash && (
                <a 
                  href={`https://tanssi-evmexp.netlify.app/tx/${successMsg.hash}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs font-mono text-emerald-500/70 hover:text-emerald-400 underline decoration-dotted transition-colors"
                >
                  Tx: {successMsg.hash}
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <header className="flex flex-col gap-3 md:flex-row h-auto md:h-20 shrink-0 md:items-center md:justify-between border-b border-white/10 bg-black/20 px-4 md:px-8 py-3 md:py-0 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight capitalize">
              {activeTab === 'portfolio' ? 'Portfolio Overview' : activeTab}
            </h1>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-emerald-400">
              Available Cash: ${(user?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Mobile tab switcher */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setActiveTab("portfolio")}
              className={`flex-1 rounded-full px-3 py-2 text-xs font-medium border transition-colors ${
                activeTab === "portfolio"
                  ? "bg-emerald-500 text-black border-emerald-500"
                  : "border-white/10 text-zinc-300 bg-black/40"
              }`}
            >
              Portfolio
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`flex-1 rounded-full px-3 py-2 text-xs font-medium border transition-colors ${
                activeTab === "transactions"
                  ? "bg-emerald-500 text-black border-emerald-500"
                  : "border-white/10 text-zinc-300 bg-black/40"
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab("marketplace")}
              className={`flex-1 rounded-full px-3 py-2 text-xs font-medium border transition-colors ${
                activeTab === "marketplace"
                  ? "bg-emerald-500 text-black border-emerald-500"
                  : "border-white/10 text-zinc-300 bg-black/40"
              }`}
            >
              Market
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full">
          <div className="mx-auto max-w-6xl px-4 md:px-8 py-6 md:py-8">

            {/* PORTFOLIO TAB */}
            {activeTab === "portfolio" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-3">
                  <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Wallet size={18} />
                      <span className="text-sm font-medium">Total Account Value</span>
                    </div>
                    <span className="text-3xl md:text-4xl font-bold tracking-tight">
                      ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Building2 size={18} />
                      <span className="text-sm font-medium">Asset Portfolio</span>
                    </div>
                    <span className="text-3xl md:text-4xl font-bold tracking-tight">
                      ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className={`flex flex-col gap-4 rounded-2xl border ${isYieldPositive ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-zinc-500/20 bg-zinc-500/5'} p-6 backdrop-blur-sm relative overflow-hidden`}>
                    <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full ${isYieldPositive ? 'bg-emerald-500/20' : 'bg-zinc-500/20'} blur-2xl`} />
                    <div className={`flex items-center gap-2 ${isYieldPositive ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      <TrendingUp size={18} />
                      <span className="text-sm font-medium">Total P/L</span>
                    </div>
                    <span className={`text-3xl md:text-4xl font-bold tracking-tight ${isYieldPositive ? 'text-emerald-500' : 'text-zinc-300'}`}>
                      {isYieldPositive ? '+' : ''}${totalYield.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:col-span-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <TrendingUp size={18} />
                        <span className="text-sm font-medium">RWA Allocation</span>
                      </div>
                      <span className="text-sm text-zinc-400">Share of account invested in tokenised RWAs</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, rwaAllocation))}%` }}
                        />
                      </div>
                      <span className="text-xl md:text-2xl font-semibold">{rwaAllocation.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Chart & Holdings Grid */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                  {/* Chart Section */}
                  <div className="col-span-1 flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm lg:col-span-2">
                    <h2 className="text-lg font-semibold tracking-tight">Performance History</h2>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis domain={['dataMin - 100', 'dataMax + 100']} stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Math.round(value)}`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                            itemStyle={{ color: '#10b981' }}
                            formatter={(value: unknown) => [`$${Number(value).toFixed(2)}`, "Value"]}
                          />
                          <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Current Holdings */}
                  <div className="col-span-1 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm h-full max-h-[460px]">
                  <h2 className="text-lg font-semibold tracking-tight">Your Holdings</h2>
                  {!user || user.holdings.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-zinc-500 py-12">
                        <Landmark size={32} />
                        <span className="text-sm">No assets yet.</span>
                        <button
                          onClick={() => setActiveTab("marketplace")}
                          className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
                        >
                          Browse Marketplace &rarr;
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                        {user.holdings.map((h: Holding) => (
                          <div key={h.id} className="group flex flex-col gap-3 rounded-xl border border-white/5 bg-black/20 p-4 transition-all hover:bg-black/40">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-medium text-zinc-200 leading-tight">{h.name}</h3>
                                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                                  <span className="font-mono bg-white/5 px-1 py-0.5 rounded text-[10px]">{h.symbol}</span>
                                  <span>{h.shares} Shares @ ${h.avgPrice.toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="block font-medium text-emerald-400">
                                  ${(h.shares * h.avgPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                            <button
                               onClick={() => handleSell({ id: h.assetId, name: h.name, symbol: h.symbol, price: h.avgPrice }, h.shares)}
                               disabled={processingAssetId === `sell-${h.assetId}`}
                               className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 py-2 text-xs font-semibold text-red-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/20 focus:opacity-100 disabled:opacity-50"
                            >
                              {processingAssetId === `sell-${h.assetId}` ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                "Sell Position"
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TRANSACTIONS TAB */}
            {activeTab === "transactions" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                {!user || !user.transactions || user.transactions.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-zinc-500 py-24">
                    <History size={32} />
                    <span className="text-sm">No transactions yet.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {user.transactions.map((tx: Transaction) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${tx.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {tx.type === 'BUY' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold uppercase ${tx.type === 'BUY' ? 'text-emerald-500' : 'text-red-500'}`}>{tx.type}</span>
                              <span className="font-medium text-zinc-100">{tx.name}</span>
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              {new Date(tx.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block font-medium text-zinc-200">{tx.shares} Shares</span>
                          <span className="text-xs text-zinc-500">@ ${tx.price.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* MARKETPLACE TAB */}
            {activeTab === "marketplace" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {assets.map((asset) => (
                    <div key={asset.id} className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-emerald-500/50 hover:bg-white/[0.07] hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                      <div className="flex items-start justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-black text-emerald-400 border border-emerald-500/20">
                          {asset.type === "Real Estate" ? <Building2 size={22} /> : asset.type === "Fund" ? <Landmark size={22} /> : <TrendingUp size={22} />}
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-300 border border-white/5">
                          {asset.type}
                        </span>
                      </div>

                      <div className="mt-2 min-h-[90px]">
                        <h3 className="line-clamp-2 text-xl font-semibold text-zinc-100 leading-tight">{asset.name}</h3>
                        <p className="mt-1 text-xs font-mono text-emerald-500">{asset.symbol}</p>
                        <p className="mt-3 text-sm text-zinc-400 line-clamp-3 leading-relaxed">
                          {asset.description || "Fractionalised real world asset on the Tanssi Dancebox network."}
                        </p>
                      </div>

                      <div className="mt-auto pt-5 border-t border-white/10">
                        <div className="flex items-end justify-between mb-5">
                          <div>
                            <span className="block text-xs uppercase tracking-wider text-zinc-500 mb-1">Price / Share</span>
                            <span className="text-2xl font-bold text-emerald-400">${asset.price.toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-xs uppercase tracking-wider text-zinc-500 mb-1">Available</span>
                            <span className="text-sm font-medium text-zinc-300">{asset.availableShares.toLocaleString()} / {asset.totalShares.toLocaleString()}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleBuy(asset)}
                          disabled={processingAssetId === `buy-${asset.id}` || (user?.balance || 0) < asset.price * 10}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-black transition-all hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 disabled:hover:scale-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:shadow-none"
                        >
                          {processingAssetId === `buy-${asset.id}` ? (
                            <div className="flex items-center gap-2">
                              <Loader2 size={18} className="animate-spin" />
                              Processing tx...
                            </div>
                          ) : (
                            <>
                              <ArrowRightLeft size={18} />
                              Buy 10 Shares
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </main>
      
      {/* Required for the custom scrollbar on holdings list */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
