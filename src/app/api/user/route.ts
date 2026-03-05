import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { TanssiProvider } from '@/lib/tanssiProvider';

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
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
    }

    const user = await getOrCreateUserByWallet(walletAddress);
    return NextResponse.json(formatUserResponse(user));
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, assetId, shares, price, walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
    }

    const user = await getOrCreateUserByWallet(walletAddress);
    const cost = price * shares;

    if (action === 'buy') {
      if (user.balance < cost) {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
      }

      // Mock integration with Tanssi testnet
      const tanssiResult = await TanssiProvider.mintFractionalAsset(assetId, shares, user.id);

      if (!tanssiResult.success) {
        return NextResponse.json({ error: "Tanssi transaction failed" }, { status: 500 });
      }

      // Decrement user balance
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

      // Save transaction
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

      // Mock integration with Tanssi testnet
      const tanssiResult = await TanssiProvider.mintFractionalAsset(assetId, shares, user.id); // Re-using mint simulate for now

      if (!tanssiResult.success) {
        return NextResponse.json({ error: "Tanssi transaction failed" }, { status: 500 });
      }

      // Increment user balance
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

      // Save transaction
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
    console.error("Error processing transaction:", error);
    return NextResponse.json({ error: "Failed to process transaction" }, { status: 500 });
  }
}
