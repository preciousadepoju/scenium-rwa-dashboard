import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

// Tanssi Dancebox EVM Testnet (ContainerChain)
export const tanssiDancebox = defineChain({
  id: 5679,
  name: 'Tanssi Dancebox',
  nativeCurrency: {
    decimals: 18,
    name: 'TANSSI',
    symbol: 'TANSSI',
  },
  rpcUrls: {
    default: {
      http: ['https://fraa-dancebox-3001-rpc.a.dancebox.tanssi.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Tanssi Explorer',
      url: 'https://tanssi-evmexp.netlify.app',
    },
  },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: 'Scénium RWA Dashboard',
  // A real WalletConnect project ID is needed for WalletConnect support.
  // Get one free at https://cloud.walletconnect.com
  // MetaMask injected wallet works without it.
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [tanssiDancebox],
  ssr: true,
});
