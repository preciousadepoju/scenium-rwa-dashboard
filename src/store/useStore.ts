import { create } from 'zustand';

export interface Holding {
  id: string;
  assetId: string;
  shares: number;
  avgPrice: number;
  name: string;
  symbol: string;
}

export interface Transaction {
  id: string;
  assetId: string;
  type: string; // "BUY" | "SELL"
  shares: number;
  price: number;
  txHash: string | null;
  createdAt: string;
  name: string;
  symbol: string;
}

export interface UserState {
  id: string;
  name: string;
  walletAddress: string;
  balance: number;
  holdings: Holding[];
  transactions: Transaction[];
  yield: number;
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: string;
  description: string | null;
  price: number;
  availableShares: number;
  totalShares: number;
}

interface StoreState {
  user: UserState | null;
  assets: Asset[];
  loading: boolean;
  setUser: (user: UserState) => void;
  fetchUser: (walletAddress: string) => Promise<void>;
  fetchAssets: () => Promise<void>;
  buyAsset: (assetId: string, shares: number, assetName: string, assetSymbol: string, price: number, walletAddress: string) => Promise<{success: boolean, txHash?: string}>;
  sellAsset: (assetId: string, shares: number, assetName: string, assetSymbol: string, price: number, walletAddress: string) => Promise<{success: boolean, txHash?: string}>;
}

export const useStore = create<StoreState>((set, get) => ({
  user: null,
  assets: [],
  loading: false,

  setUser: (user) => set({ user }),

  fetchAssets: async () => {
    try {
      const res = await fetch('/api/assets');
      if (res.ok) {
        const data = await res.json();
        set({ assets: data });
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  },

  fetchUser: async (walletAddress: string) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/user?walletAddress=${encodeURIComponent(walletAddress)}`);
      if (res.ok) {
        const data = await res.json();
        set({ user: data });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      set({ loading: false });
    }
  },

  buyAsset: async (assetId, shares, name, symbol, price, walletAddress) => {
    const { user } = get();
    if (!user) return { success: false };
    
    const cost = price * shares;
    if (user.balance < cost) {
      alert("Insufficient balance!");
      return { success: false };
    }

    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'buy', assetId, shares, price, name, symbol, walletAddress })
      });
      
      if (res.ok) {
        const result = await res.json();
        set({ user: result.user });
        return { success: true, txHash: result.txHash };
      }
    } catch (error) {
      console.error('Error buying asset:', error);
    }
    return { success: false };
  },

  sellAsset: async (assetId, shares, name, symbol, price, walletAddress) => {
    const { user } = get();
    if (!user) return { success: false };

    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sell', assetId, shares, price, name, symbol, walletAddress })
      });
      
      if (res.ok) {
        const result = await res.json();
        set({ user: result.user });
        return { success: true, txHash: result.txHash };
      }
    } catch (error) {
      console.error('Error selling asset:', error);
    }
    return { success: false };
  }
}));
