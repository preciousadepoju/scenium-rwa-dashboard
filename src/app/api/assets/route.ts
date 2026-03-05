import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    let assets = await prisma.asset.findMany();
    
    // If no assets exist or if they are missing descriptions, re-seed basic demo assets
    if (assets.length === 0 || !assets[0].description) {
      await prisma.transaction.deleteMany(); // Clear dependent transactions
      await prisma.holding.deleteMany(); // Clear dependent holdings
      await prisma.asset.deleteMany(); // Wipe old assets
      await prisma.asset.createMany({
        data: [
          { name: "Luxury Apartment in Paris", symbol: "PAR-LUX-1", type: "Real Estate", description: "Fractional ownership of a premium 3-bedroom apartment located in the 8th arrondissement. High rental yield with seasonal tourists.", price: 50.00, availableShares: 1000, totalShares: 10000 },
          { name: "Tanssi Network Private Equity Fund", symbol: "TPEF", type: "Fund", description: "Venture fund providing early-stage capital to infrastructure projects building on Tanssi Network's AppChain ecosystem.", price: 120.50, availableShares: 500, totalShares: 2000 },
          { name: "Apple Inc. (Tokenized)", symbol: "AAPL-T", type: "Stock", description: "Tokenized representation of Apple Inc. stock, fully backed 1:1 by traditional equity held in insured institutional custody.", price: 185.00, availableShares: 5000, totalShares: 50000 },
          { name: "Commercial Plaza NY", symbol: "NY-PLAZA", type: "Real Estate", description: "Premium commercial space in Manhattan with multi-year leases to anchor corporate tenants. Income distributed quarterly.", price: 25.00, availableShares: 10000, totalShares: 100000 },
        ]
      });
      assets = await prisma.asset.findMany();
    }
    
    return NextResponse.json(assets);
  } catch (error) {
    console.error("Error fetching assets:", error);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}
 
