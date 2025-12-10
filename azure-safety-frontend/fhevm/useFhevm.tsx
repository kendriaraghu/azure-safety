"use client";

import { ethers } from "ethers";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FhevmInstance } from "./fhevmTypes";
import { createFhevmInstance } from "./internal/fhevm";
import { FhevmAbortError } from "./internal/fhevm";

export type FhevmGoState = "idle" | "loading" | "ready" | "error";

export function useFhevm(parameters: {
  provider: string | ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  enabled?: boolean;
  initialMockChains?: Readonly<Record<number, string>>;
}): {
  instance: FhevmInstance | undefined;
  refresh: () => void;
  error: Error | undefined;
  status: FhevmGoState;
} {
  const { provider, chainId, initialMockChains, enabled = true } = parameters;

  const [instance, _setInstance] = useState<FhevmInstance | undefined>(
    undefined
  );
  const [status, _setStatus] = useState<FhevmGoState>("idle");
  const [error, _setError] = useState<Error | undefined>(undefined);
  const [_isRunning, _setIsRunning] = useState<boolean>(enabled);
  const [_providerChanged, _setProviderChanged] = useState<number>(0);
  const _abortControllerRef = useRef<AbortController | null>(null);
  const _providerRef = useRef<string | ethers.Eip1193Provider | undefined>(
    provider
  );
  const _chainIdRef = useRef<number | undefined>(chainId);
  const _mockChainsRef = useRef<Record<number, string> | undefined>(
    initialMockChains
  );

  const refresh = useCallback(() => {
    if (_abortControllerRef.current) {
      _providerRef.current = undefined;
      _chainIdRef.current = undefined;
      _abortControllerRef.current.abort();
      _abortControllerRef.current = null;
    }

    _providerRef.current = provider;
    _chainIdRef.current = chainId;

    _setInstance(undefined);
    _setError(undefined);
    _setStatus("idle");

    if (provider !== undefined) {
      _setProviderChanged((prev) => prev + 1);
    }
  }, [provider, chainId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    _setIsRunning(enabled);
  }, [enabled]);

  useEffect(() => {
    if (_isRunning === false) {
      if (_abortControllerRef.current) {
        _abortControllerRef.current.abort();
        _abortControllerRef.current = null;
      }
      _setInstance(undefined);
      _setError(undefined);
      _setStatus("idle");
      return;
    }

    if (_isRunning === true) {
      if (_providerRef.current === undefined) {
        _setInstance(undefined);
        _setError(undefined);
        _setStatus("idle");
        return;
      }

      // Abort any existing creation attempt before starting a new one
      if (_abortControllerRef.current) {
        _abortControllerRef.current.abort();
      }
      _abortControllerRef.current = new AbortController();

      _setStatus("loading");
      _setError(undefined);

      const thisSignal = _abortControllerRef.current.signal;
      const thisProvider = _providerRef.current;
      const thisChainId = _chainIdRef.current;
      const thisRpcUrlsByChainId = _mockChainsRef.current;

      createFhevmInstance({
        signal: thisSignal,
        provider: thisProvider,
        mockChains: thisRpcUrlsByChainId,
        onStatusChange: (s) =>
          console.log(`[useFhevm] status changed: ${s}`),
      })
        .then((i) => {
          console.log(`[useFhevm] instance created!`);
          if (thisSignal.aborted) {
            console.log(`[useFhevm] instance creation aborted (ignoring)`);
            return;
          }

          if (thisProvider !== _providerRef.current || thisChainId !== _chainIdRef.current) {
            console.log(`[useFhevm] provider/chainId changed (ignoring)`);
            return;
          }

          _setInstance(i);
          _setError(undefined);
          _setStatus("ready");
        })
        .catch((e) => {
          // Ignore abort errors - they're expected when provider/chainId changes
          if (thisSignal.aborted || e?.name === "FhevmAbortError" || (e && e.constructor && e.constructor.name === "FhevmAbortError")) {
            console.log(`[useFhevm] operation cancelled (expected)`);
            return;
          }

          // Only set error if provider/chainId hasn't changed
          if (thisProvider !== _providerRef.current || thisChainId !== _chainIdRef.current) {
            console.log(`[useFhevm] provider/chainId changed during error (ignoring)`);
            return;
          }

          console.error(`[useFhevm] error:`, e);
          _setInstance(undefined);
          _setError(e);
          _setStatus("error");
        });
    }
  }, [_isRunning, _providerChanged]);

  return { instance, refresh, error, status };
}

