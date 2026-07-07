// Network + contract configuration.
// Fill in FACTORY_CONTRACT_ID and REGISTRY_CONTRACT_ID after running scripts/deploy.sh
export const NETWORK = {
  network: 'TESTNET',
  networkPassphrase: 'Test SDF Network ; September 2015',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  horizonUrl: 'https://horizon-testnet.stellar.org',
};

export const CONTRACTS = {
  FACTORY_CONTRACT_ID: import.meta.env.VITE_FACTORY_CONTRACT_ID || 'CA...REPLACE_AFTER_DEPLOY',
  REGISTRY_CONTRACT_ID: import.meta.env.VITE_REGISTRY_CONTRACT_ID || 'CA...REPLACE_AFTER_DEPLOY',
  TOKEN_CONTRACT_ID: import.meta.env.VITE_TOKEN_CONTRACT_ID || 'CA...REPLACE_AFTER_DEPLOY',
};
