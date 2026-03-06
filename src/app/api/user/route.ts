import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { TanssiProvider } from '@/lib/tanssiProvider';

// -----------------------
// Types for in-memory mode
// -----------------------

type MemoryHolding = {
  id: string;
  assetId: string;
  shares: number;
  avgPrice: number;
  name: string;
  symbol: string;
};

type MemoryTransaction = {
  id: string;
  assetId: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  txHash: string | null;
  createdAt: string;
  name: string;
  symbol: string;
};

type MemoryUser = {
  id: string;
  name: string;
  walletAddress: string;
  balance: number;
  yield: number;
  holdings: MemoryHolding[];
  transactions: MemoryTransaction[];
};

const inMemoryUsers = new Map<string, MemoryUser>();

function getOrCreateInMemoryUser(walletAddress: string): MemoryUser {
  const existing = inMemoryUsers.get(walletAddress);
  if (existing) return existing;

  const user: MemoryUser = {
    id: `mock-user-${walletAddress}`,
    name: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
    walletAddress,
    balance: 10000,
    yield: 0,
    holdings: [],
    transactions: [],
  };

  inMemoryUsers.set(walletAddress, user);
  return user;
}

// -----------------------
// Prisma-backed helpers
// -----------------------

// Get or create a user record tied to a specific wallet address
async function getOrCreateUserByWallet(walletAddress: string) {
  const existing = await prisma.user.findFirst({
    where: { walletAddress },
    include: {
      holdings: { include: { asset: true } },
      transactions: { 
        include: { asset: true },
        orderBy: { createdAt: 'desc' },
      }
    }
  });

  if (existing) return existing;

  // First-time wallet: provision a fresh account with starter balance
  return await prisma.user.create({
    data: {
      name: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      walletAddress,
      balance: 10000.0,
      yield: 0,
    },
    include: {
      holdings: { include: { asset: true } },
      transactions: { include: { asset: true } }
    }
  });
}

type UserWithRelations = NonNullable<Awaited<ReturnType<typeof getOrCreateUserByWallet>>>;

function formatUserResponse(user: UserWithRelations) {
  return {
    ...user,
    holdings: user.holdings.map((h) => ({
      ...h,
      name: h.asset.name,
      symbol: h.asset.symbol
    })),
    transactions: user.transactions.map((t) => ({
      ...t,
      name: t.asset.name,
      symbol: t.asset.symbol
    }))
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
  }

  // If DATABASE_URL isn't configured, use in-memory user store
  if (!process.env.DATABASE_URL) {
    const user = getOrCreateInMemoryUser(walletAddress);
    return NextResponse.json(user);
  }

  try {
    const user = await getOrCreateUserByWallet(walletAddress);
    return NextResponse.json(formatUserResponse(user));
  } catch (error) {
    console.error("Error fetching user, falling back to in-memory store:", error);
    const user = getOrCreateInMemoryUser(walletAddress);
    return NextResponse.json(user);
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action, assetId, shares, price, walletAddress, name, symbol } = body;

  if (!walletAddress) {
    return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
  }

  const cost = price * shares;

  async function handleInMemory() {
    const user = getOrCreateInMemoryUser(walletAddress);

    if (action === 'buy') {
      if (user.balance < cost) {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
      }

      const tanssiResult = await TanssiProvider.mintFractionalAsset(assetId, shares, user.id);
      if (!tanssiResult.success) {
        return NextResponse.json({ error: "Tanssi transaction failed" }, { status: 500 });
      }

      user.balance -= cost;

      const existingHolding = user.holdings.find(h => h.assetId === assetId);
      if (existingHolding) {
        const newTotalShares = existingHolding.shares + shares;
        const newTotalCost = (existingHolding.shares * existingHolding.avgPrice) + cost;
        existingHolding.shares = newTotalShares;
        existingHolding.avgPrice = newTotalCost / newTotalShares;
      } else {
        user.holdings.push({
          id: `holding-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          assetId,
          shares,
          avgPrice: price,
          name,
          symbol,
        });
      }

      const tx: MemoryTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        assetId,
        type: 'BUY',
        shares,
        price,
        txHash: tanssiResult.txHash,
        createdAt: new Date().toISOString(),
        name,
        symbol,
      };
      user.transactions.unshift(tx);

      return NextResponse.json({ user, txHash: tanssiResult.txHash });
    }

    if (action === 'sell') {
      const existingHolding = user.holdings.find(h => h.assetId === assetId);
      if (!existingHolding || existingHolding.shares < shares) {
        return NextResponse.json({ error: "Insufficient shares" }, { status: 400 });
      }

      const tanssiResult = await TanssiProvider.mintFractionalAsset(assetId, shares, user.id);
      if (!tanssiResult.success) {
        return NextResponse.json({ error: "Tanssi transaction failed" }, { status: 500 });
      }

      user.balance += cost;
      existingHolding.shares -= shares;
      if (existingHolding.shares === 0) {
        user.holdings = user.holdings.filter(h => h.id !== existingHolding.id);
      }

      const tx: MemoryTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        assetId,
        type: 'SELL',
        shares,
        price,
        txHash: tanssiResult.txHash,
        createdAt: new Date().toISOString(),
        name,
        symbol,
      };
      user.transactions.unshift(tx);

      return NextResponse.json({ user, txHash: tanssiResult.txHash });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // If DATABASE_URL is not set, always use in-memory mode
  if (!process.env.DATABASE_URL) {
    return handleInMemory();
  }

  // Try Prisma-backed implementation; on failure, fall back to in-memory
  try {
    const user = await getOrCreateUserByWallet(walletAddress);

    if (action === 'buy') {
      if (user.balance < cost) {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
      }

      const tanssiResult = await TanssiProvider.mintFractionalAsset(assetId, shares, user.id);

      if (!tanssiResult.success) {
        return NextResponse.json({ error: "Tanssi transaction failed" }, { status: 500 });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { balance: user.balance - cost }
      });

      const existingHolding = user.holdings.find(h => h.assetId === assetId);

      if (existingHolding) {
        const newTotalShares = existingHolding.shares + shares;
        const newTotalCost = (existingHolding.shares * existingHolding.avgPrice) + cost;
        const newAvgPrice = newTotalCost / newTotalShares;

        await prisma.holding.update({
          where: { id: existingHolding.id },
          data: { shares: newTotalShares, avgPrice: newAvgPrice }
        });
      } else {
        await prisma.holding.create({
          data: {
            userId: user.id,
            assetId,
            shares,
            avgPrice: price
          }
        });
      }

      await prisma.transaction.create({
        data: {
          userId: user.id,
          assetId,
          type: "BUY",
          shares,
          price,
          txHash: tanssiResult.txHash
        }
      });

      const updatedUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { 
          holdings: { include: { asset: true } },
          transactions: { include: { asset: true }, orderBy: { createdAt: 'desc' } }
        }
      });

      return NextResponse.json({ user: formatUserResponse(updatedUser), txHash: tanssiResult.txHash });
    }

    if (action === 'sell') {
      const existingHolding = user.holdings.find(h => h.assetId === assetId);

      if (!existingHolding || existingHolding.shares < shares) {
        return NextResponse.json({ error: "Insufficient shares" }, { status: 400 });
      }

      const tanssiResult = await TanssiProvider.mintFractionalAsset(assetId, shares, user.id); // Re-using mint simulate for now

      if (!tanssiResult.success) {
        return NextResponse.json({ error: "Tanssi transaction failed" }, { status: 500 });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { balance: user.balance + cost }
      });

      const newShares = existingHolding.shares - shares;
      
      if (newShares === 0) {
        await prisma.holding.delete({
          where: { id: existingHolding.id }
        });
      } else {
        await prisma.holding.update({
          where: { id: existingHolding.id },
          data: { shares: newShares }
        });
      }

      await prisma.transaction.create({
        data: {
          userId: user.id,
          assetId,
          type: "SELL",
          shares,
          price,
          txHash: tanssiResult.txHash
        }
      });

      const updatedUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { 
          holdings: { include: { asset: true } },
          transactions: { include: { asset: true }, orderBy: { createdAt: 'desc' } }
        }
      });

      return NextResponse.json({ user: formatUserResponse(updatedUser), txHash: tanssiResult.txHash });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Prisma transaction failed, falling back to in-memory mode:", error);
    return handleInMemory();
  }
}
