import { useCallback, useEffect, useState } from 'react';
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
} from '@creit.tech/stellar-wallets-kit';
import { NETWORK } from '../contracts/config';

let kitInstance = null;

function getKit() {
  if (!kitInstance) {
    kitInstance = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: undefined,
      modules: allowAllModules(),
    });
  }
  return kitInstance;
}

/**
 * Wallet connection + signing hook. Wraps Stellar Wallets Kit so components
 * never touch the underlying provider directly.
 */
export function useWallet() {
  const [address, setAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const [balance, setBalance] = useState(null);

  const refreshBalance = useCallback(async () => {
    if (!address) {
      setBalance(null);
      return;
    }
    try {
      const response = await fetch(`${NETWORK.horizonUrl}/accounts/${address}`);
      if (!response.ok) return;
      const data = await response.json();
      const native = data.balances.find((b) => b.asset_type === 'native');
      if (native) setBalance(Number(native.balance).toFixed(2));
    } catch (err) {
      console.error('Failed to fetch balance', err);
    }
  }, [address]);

  useEffect(() => {
    const saved = localStorage.getItem('gatefold:lastAddress');
    if (saved) setAddress(saved);
  }, []);

  useEffect(() => {
    refreshBalance();
    // Refresh periodically just in case
    const interval = setInterval(refreshBalance, 30000);
    return () => clearInterval(interval);
  }, [address, refreshBalance]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const kit = getKit();
      await kit.openModal({
        onWalletSelected: async (option) => {
          kit.setWallet(option.id);
          const { address: addr } = await kit.getAddress();
          setAddress(addr);
          localStorage.setItem('gatefold:lastAddress', addr);
        },
      });
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance(null);
    localStorage.removeItem('gatefold:lastAddress');
  }, []);

  const signTransaction = useCallback(async (xdr) => {
    const kit = getKit();
    const { signedTxXdr } = await kit.signTransaction(xdr, {
      networkPassphrase: NETWORK.networkPassphrase,
      address,
    });
    return signedTxXdr;
  }, [address]);

  return { address, balance, connecting, error, connect, disconnect, signTransaction, refreshBalance, isConnected: !!address };
}
