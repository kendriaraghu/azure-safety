"use client";

import { useMetaMaskEthersSigner } from "@/hooks/useWallet";
import { useEffect, useState } from "react";

export function WalletConnect() {
  const {
    isConnected,
    accounts,
    chainId,
    connect,
    error,
  } = useMetaMaskEthersSigner();

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="px-4 py-2 bg-gray-200 rounded-lg text-sm">
        Loading...
      </div>
    );
  }

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
        style={{ backgroundColor: "#0078D4" }}
      >
        Connect Wallet
      </button>
    );
  }

  const shortAddress = accounts?.[0]
    ? `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`
    : "Unknown";

  return (
    <div className="flex items-center space-x-4">
      <div className="text-sm">
        <div className="font-semibold">{shortAddress}</div>
        <div className="text-xs" style={{ color: "#6C757D" }}>Chain: {chainId}</div>
      </div>
      {error && (
        <div className="text-xs" style={{ color: "#DC3545" }}>
          {error.message}
        </div>
      )}
    </div>
  );
}

