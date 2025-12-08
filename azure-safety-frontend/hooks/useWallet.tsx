"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Eip1193Provider, ethers } from "ethers";

interface ProviderConnectInfo {
  readonly chainId: string;
}

interface ProviderRpcError extends Error {
  message: string;
  code: number;
  data?: unknown;
}

type ConnectListenerFn = (connectInfo: ProviderConnectInfo) => void;
type DisconnectListenerFn = (error: ProviderRpcError) => void;
type ChainChangedListenerFn = (chainId: string) => void;
type AccountsChangedListenerFn = (accounts: string[]) => void;

type Eip1193EventMap = {
  connect: ConnectListenerFn;
  chainChanged: ChainChangedListenerFn;
  accountsChanged: AccountsChangedListenerFn;
  disconnect: DisconnectListenerFn;
};

type Eip1193EventFn = <E extends keyof Eip1193EventMap>(
  event: E,
  fn: Eip1193EventMap[E]
) => void;

interface Eip1193ProviderWithEvent extends ethers.Eip1193Provider {
  on?: Eip1193EventFn;
  off?: Eip1193EventFn;
  addListener?: Eip1193EventFn;
  removeListener?: Eip1193EventFn;
}

export interface UseMetaMaskState {
  provider: Eip1193Provider | undefined;
  chainId: number | undefined;
  accounts: string[] | undefined;
  isConnected: boolean;
  error: Error | undefined;
  connect: () => void;
}

function useMetaMaskInternal(): UseMetaMaskState {
  const [_currentProvider, _setCurrentProvider] = useState<
    Eip1193ProviderWithEvent | undefined
  >(undefined);
  const [chainId, _setChainId] = useState<number | undefined>(undefined);
  const [accounts, _setAccounts] = useState<string[] | undefined>(undefined);
  const [error, _setError] = useState<Error | undefined>(undefined);

  const connectListenerRef = useRef<ConnectListenerFn | undefined>(undefined);
  const disconnectListenerRef = useRef<DisconnectListenerFn | undefined>(
    undefined
  );
  const chainChangedListenerRef = useRef<ChainChangedListenerFn | undefined>(
    undefined
  );
  const accountsChangedListenerRef = useRef<
    AccountsChangedListenerFn | undefined
  >(undefined);

  const metaMaskProviderRef = useRef<Eip1193ProviderWithEvent | undefined>(
    undefined
  );

  const hasProvider = Boolean(_currentProvider);
  const hasAccounts = (accounts?.length ?? 0) > 0;
  const hasChain = typeof chainId === "number";

  const isConnected = hasProvider && hasAccounts && hasChain;

  const connect = useCallback(() => {
    if (!_currentProvider) {
      return;
    }

    if (accounts && accounts.length > 0) {
      return;
    }

    _currentProvider.request({ method: "eth_requestAccounts" });
  }, [_currentProvider, accounts]);

  // Silent reconnect on mount using eth_accounts
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedConnectorId = localStorage.getItem("wallet.lastConnectorId");
    const storedAccounts = localStorage.getItem("wallet.lastAccounts");
    const storedChainId = localStorage.getItem("wallet.lastChainId");

    if (storedConnectorId && storedAccounts) {
      const provider = (window as any).ethereum as Eip1193ProviderWithEvent | undefined;
      if (provider) {
        _setCurrentProvider(provider);
        metaMaskProviderRef.current = provider;

        // Silent reconnect
        provider
          .request({ method: "eth_accounts" })
          .then((accs) => {
            if (Array.isArray(accs) && accs.length > 0) {
              _setAccounts(accs as string[]);
              if (storedChainId) {
                _setChainId(Number.parseInt(storedChainId, 10));
              }
            }
          })
          .catch(() => {
            // Silent fail
          });
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const provider = (window as any).ethereum as Eip1193ProviderWithEvent | undefined;
    if (provider) {
      _setCurrentProvider(provider);
      metaMaskProviderRef.current = provider;

      // Get initial state
      provider
        .request({ method: "eth_chainId" })
        .then((id) => {
          _setChainId(Number.parseInt(id as string, 16));
        })
        .catch((e) => {
          _setError(e);
        });

      // Set up event listeners
      const handleAccountsChanged = (accs: string[]) => {
        _setAccounts(accs);
        if (accs.length > 0) {
          localStorage.setItem("wallet.lastAccounts", JSON.stringify(accs));
        } else {
          localStorage.removeItem("wallet.lastAccounts");
          localStorage.removeItem("wallet.lastChainId");
          localStorage.removeItem("wallet.connected");
        }
      };

      const handleChainChanged = (id: string) => {
        const newChainId = Number.parseInt(id, 16);
        _setChainId(newChainId);
        localStorage.setItem("wallet.lastChainId", String(newChainId));
      };

      const handleConnect = () => {
        localStorage.setItem("wallet.connected", "true");
      };

      const handleDisconnect = () => {
        localStorage.removeItem("wallet.lastAccounts");
        localStorage.removeItem("wallet.lastChainId");
        localStorage.removeItem("wallet.connected");
        _setAccounts([]);
      };

      if (provider.on) {
        provider.on("accountsChanged", handleAccountsChanged);
        provider.on("chainChanged", handleChainChanged);
        provider.on("connect", handleConnect);
        provider.on("disconnect", handleDisconnect);
      }

      accountsChangedListenerRef.current = handleAccountsChanged;
      chainChangedListenerRef.current = handleChainChanged;
      connectListenerRef.current = handleConnect;
      disconnectListenerRef.current = handleDisconnect;

      return () => {
        if (provider.off) {
          provider.off("accountsChanged", handleAccountsChanged);
          provider.off("chainChanged", handleChainChanged);
          provider.off("connect", handleConnect);
          provider.off("disconnect", handleDisconnect);
        }
      };
    }
  }, []);

  // Update localStorage when accounts change
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      localStorage.setItem("wallet.lastAccounts", JSON.stringify(accounts));
      localStorage.setItem("wallet.connected", "true");
      if (chainId) {
        localStorage.setItem("wallet.lastChainId", String(chainId));
      }
    }
  }, [accounts, chainId]);

  return {
    provider: _currentProvider,
    chainId,
    accounts,
    isConnected,
    error,
    connect,
  };
}

const MetaMaskContext = createContext<UseMetaMaskState | undefined>(undefined);

export const MetaMaskProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const props = useMetaMaskInternal();
  return (
    <MetaMaskContext.Provider value={props}>
      {children}
    </MetaMaskContext.Provider>
  );
};

export function useMetaMask() {
  const context = useContext(MetaMaskContext);
  if (context === undefined) {
    throw new Error("useMetaMask must be used within a MetaMaskProvider");
  }
  return context;
}

export interface UseMetaMaskEthersSignerState {
  provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  accounts: string[] | undefined;
  isConnected: boolean;
  error: Error | undefined;
  connect: () => void;
  sameChain: React.RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: React.RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
  ethersBrowserProvider: ethers.BrowserProvider | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  initialMockChains: Readonly<Record<number, string>> | undefined;
}

function useMetaMaskEthersSignerInternal(parameters: {
  initialMockChains?: Readonly<Record<number, string>>;
}): UseMetaMaskEthersSignerState {
  const { initialMockChains } = parameters;
  const { provider, chainId, accounts, isConnected, connect, error } = useMetaMask();
  const [ethersSigner, setEthersSigner] = useState<
    ethers.JsonRpcSigner | undefined
  >(undefined);
  const [ethersBrowserProvider, setEthersBrowserProvider] = useState<
    ethers.BrowserProvider | undefined
  >(undefined);
  const [ethersReadonlyProvider, setEthersReadonlyProvider] = useState<
    ethers.ContractRunner | undefined
  >(undefined);

  const chainIdRef = useRef<number | undefined>(chainId);
  const ethersSignerRef = useRef<ethers.JsonRpcSigner | undefined>(undefined);

  const sameChain = useRef((chainId: number | undefined) => {
    return chainId === chainIdRef.current;
  });

  const sameSigner = useRef(
    (ethersSigner: ethers.JsonRpcSigner | undefined) => {
      return ethersSigner === ethersSignerRef.current;
    }
  );

  useEffect(() => {
    chainIdRef.current = chainId;
  }, [chainId]);

  useEffect(() => {
    if (
      !provider ||
      !chainId ||
      !isConnected ||
      !accounts ||
      accounts.length === 0
    ) {
      ethersSignerRef.current = undefined;
      setEthersSigner(undefined);
      setEthersBrowserProvider(undefined);
      setEthersReadonlyProvider(undefined);
      return;
    }

    const bp: ethers.BrowserProvider = new ethers.BrowserProvider(provider);
    let rop: ethers.ContractRunner = bp;
    const rpcUrl: string | undefined = initialMockChains?.[chainId];
    if (rpcUrl) {
      rop = new ethers.JsonRpcProvider(rpcUrl);
    }

    const s = new ethers.JsonRpcSigner(bp, accounts[0]);
    ethersSignerRef.current = s;
    setEthersSigner(s);
    setEthersBrowserProvider(bp);
    setEthersReadonlyProvider(rop);
  }, [provider, chainId, isConnected, accounts, initialMockChains]);

  return {
    sameChain,
    sameSigner,
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersBrowserProvider,
    ethersReadonlyProvider,
    ethersSigner,
    error,
    initialMockChains,
  };
}

const MetaMaskEthersSignerContext = createContext<
  UseMetaMaskEthersSignerState | undefined
>(undefined);

interface MetaMaskEthersSignerProviderProps {
  children: ReactNode;
  initialMockChains: Readonly<Record<number, string>>;
}

export const MetaMaskEthersSignerProvider: React.FC<MetaMaskEthersSignerProviderProps> = ({
  children,
  initialMockChains,
}) => {
  const props = useMetaMaskEthersSignerInternal({ initialMockChains });
  return (
    <MetaMaskEthersSignerContext.Provider value={props}>
      {children}
    </MetaMaskEthersSignerContext.Provider>
  );
};

export function useMetaMaskEthersSigner() {
  const context = useContext(MetaMaskEthersSignerContext);
  if (context === undefined) {
    throw new Error(
      "useMetaMaskEthersSigner must be used within a MetaMaskEthersSignerProvider"
    );
  }
  return context;
}

