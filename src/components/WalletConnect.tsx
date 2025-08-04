'use client';

import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useAccount, useDisconnect } from "wagmi";

export default function WalletConnect() {
  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <button
        onClick={login}
        style={{
          padding: '0.75rem 1.5rem',
          background: 'rgba(255,255,255,0.95)',
          border: 'none',
          borderRadius: '12px',
          fontWeight: '600',
          color: '#333',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        🌐 Connect Abstract Wallet
      </button>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      background: 'rgba(255,255,255,0.95)',
      padding: '0.75rem 1.5rem',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ 
          fontWeight: '600', 
          color: '#333',
          fontSize: '0.9rem'
        }}>
          {formatAddress(address!)}
        </div>
        <div style={{ 
          fontSize: '0.8rem', 
          color: '#10B981',
          fontWeight: '600'
        }}>
          Connected ✅
        </div>
      </div>
      <button
        onClick={() => disconnect()}
        style={{
          background: '#EF4444',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '0.25rem 0.5rem',
          fontSize: '0.8rem',
          cursor: 'pointer'
        }}
      >
        Disconnect
      </button>
    </div>
  );
}