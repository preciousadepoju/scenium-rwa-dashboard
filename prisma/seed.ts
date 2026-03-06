const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log(`Start seeding...`)
  
  // Clear existing assets if any
  await prisma.asset.deleteMany({})

  const assets = [
    {
      name: "Tanssi HQ Building",
      symbol: "TN-HQ",
      type: "Real Estate",
      description: "Fractionalized ownership of the Tanssi Network Developer HQ in Berlin, offering steady tokenized rental yield.",
      price: 15.50,
      availableShares: 50000,
      totalShares: 100000,
    },
    {
      name: "Polkadot Ecosystem Fund",
      symbol: "DOT-YLD",
      type: "Fund",
      description: "A diversified proxy fund investing in high-performing DOT parachain tokens and yielding staking rewards.",
      price: 10.00,
      availableShares: 25000,
      totalShares: 25000,
    },
    {
      name: "US Treasury Bill token",
      symbol: "USTB",
      type: "Private Credit",
      description: "Short-term US government debt tokenized on the Tanssi network, offering stable, low-risk yield.",
      price: 1.05,
      availableShares: 1000000,
      totalShares: 1000000,
    }
  ]

  for (const a of assets) {
    const asset = await prisma.asset.create({
      data: a,
    })
    console.log(`Created asset with id: ${asset.id}`)
  }
  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
