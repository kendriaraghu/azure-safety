"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { ethers } from "ethers";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";
import { AzureSafetyABI } from "@/abi/AzureSafetyABI";
import { AzureSafetyAddresses } from "@/abi/AzureSafetyAddresses";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

export function useAzureSafety(parameters: {
  instance: FhevmInstance | undefined;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: React.RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: React.RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
  fhevmDecryptionSignatureStorage?: GenericStringStorage;
  accounts?: string[];
}) {
  const {
    instance,
    eip1193Provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    fhevmDecryptionSignatureStorage,
    accounts,
  } = parameters;

  const [isReporting, setIsReporting] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [contractAddress, setContractAddress] = useState<string | undefined>(
    undefined
  );
  const [scoreHandle, setScoreHandle] = useState<string>("");
  const [decryptedScore, setDecryptedScore] = useState<bigint | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [eventIds, setEventIds] = useState<bigint[]>([]);
  const [userSegmentId, setUserSegmentId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);

  const isReportingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const isDecryptingRef = useRef(false);
  const contractRef = useRef<ethers.Contract | undefined>(undefined);
  const readonlyContractRef = useRef<ethers.Contract | undefined>(undefined);

  // Get contract address based on chainId
  useEffect(() => {
    if (!chainId) {
      setContractAddress(undefined);
      return;
    }

    const chainIdStr = String(chainId);
    const addressInfo = AzureSafetyAddresses[chainIdStr as keyof typeof AzureSafetyAddresses];
    if (addressInfo && addressInfo.address !== "0x0000000000000000000000000000000000000000") {
      setContractAddress(addressInfo.address);
    } else {
      setContractAddress(undefined);
    }
  }, [chainId]);

  // Create contract instance (with signer)
  useEffect(() => {
    if (
      !contractAddress ||
      !ethersSigner ||
      !sameChain.current(chainId) ||
      !sameSigner.current(ethersSigner)
    ) {
      contractRef.current = undefined;
      return;
    }

    const contract = new ethers.Contract(
      contractAddress,
      AzureSafetyABI.abi,
      ethersSigner
    );
    contractRef.current = contract;
  }, [contractAddress, ethersSigner, chainId, sameChain, sameSigner]);

  // Create readonly contract instance
  useEffect(() => {
    if (!contractAddress || !ethersReadonlyProvider || !sameChain.current(chainId)) {
      readonlyContractRef.current = undefined;
      return;
    }

    const contract = new ethers.Contract(
      contractAddress,
      AzureSafetyABI.abi,
      ethersReadonlyProvider
    );
    readonlyContractRef.current = contract;
  }, [contractAddress, ethersReadonlyProvider, chainId, sameChain]);

  const reportEvent = useCallback(
    async (eventType: number, scoreChange: number) => {
      if (isReportingRef.current) {
        return;
      }

      if (
        !contractAddress ||
        !instance ||
        !ethersSigner ||
        !sameChain.current(chainId) ||
        !sameSigner.current(ethersSigner)
      ) {
        setMessage("Contract not available. Please check your connection.");
        return;
      }

      const thisContractAddress = contractAddress;
      const thisEthersSigner = ethersSigner;
      const thisChainId = chainId;
      const thisContract = contractRef.current;

      if (!thisContract) {
        setMessage("Contract instance not ready.");
        return;
      }

      isReportingRef.current = true;
      setIsReporting(true);
      setMessage("Starting encryption...");

      const run = async () => {
        // Let browser repaint before CPU-intensive encryption
        await new Promise((resolve) => setTimeout(resolve, 100));

        const isStale = () =>
          thisContractAddress !== contractAddress ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          // Create encrypted input
          const input = instance.createEncryptedInput(
            thisContractAddress as `0x${string}`,
            thisEthersSigner.address as `0x${string}`
          );

          // Encrypt score change value
          // Note: FHEVM encrypt32 handles both positive and negative values
          // The contract's FHE.add will add the value, so negative values need special handling
          // For now, we encrypt the absolute value
          const scoreChangeAbs = Math.abs(scoreChange);
          input.add32(scoreChangeAbs);

          setMessage("Encrypting score change...");

          // Encrypt (CPU-intensive)
          const enc = await input.encrypt();

          if (isStale()) {
            setMessage("Operation cancelled (state changed)");
            return;
          }

          setMessage("Calling contract...");

          // Call contract reportEvent
          // Note: The contract's reportEvent uses FHE.add, which handles both positive and negative
          // For negative values, we encrypt the absolute value, but the contract will add it
          // which effectively subtracts. However, since FHE.add always adds, we need to handle
          // negatives differently. For now, we'll encrypt the absolute value.
          // TODO: Consider modifying contract to handle negative values properly
          const tx: ethers.TransactionResponse = await thisContract.reportEvent(
            eventType,
            enc.handles[0],
            enc.inputProof
          );

          setMessage(`Waiting for transaction: ${tx.hash}...`);

          const receipt = await tx.wait();

          if (isStale()) {
            setMessage("Operation cancelled (state changed)");
            return;
          }

          setMessage(
            `Event reported successfully! Event ID: ${receipt?.logs[0]?.topics[1] || "N/A"}`
          );
        } catch (error) {
          console.error("Error reporting event:", error);
          setMessage(
            `Error: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        } finally {
          isReportingRef.current = false;
          setIsReporting(false);
        }
      };

      run();
    },
    [
      contractAddress,
      instance,
      ethersSigner,
      chainId,
      sameChain,
      sameSigner,
    ]
  );

  // Refresh score handle
  const refreshScoreHandle = useCallback(() => {
    if (isRefreshingRef.current) {
      return;
    }

    if (!contractAddress || !accounts?.[0] || !readonlyContractRef.current) {
      return;
    }

    const thisContractAddress = contractAddress;
    const thisUserAddress = accounts[0];
    const thisReadonlyContract = readonlyContractRef.current;
    const thisChainId = chainId;

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setMessage("Loading score...");

    const run = async () => {
      try {
        const handle = await thisReadonlyContract.getCurrentScore(thisUserAddress);
        
        if (!sameChain.current(thisChainId)) {
          return;
        }

        setScoreHandle(handle);
        
        // Also load event IDs
        try {
          const ids = await thisReadonlyContract.getUserEventIds(thisUserAddress);
          setEventIds(ids.map((id: bigint) => id));
        } catch (e) {
          console.error("Error loading event IDs:", e);
        }

        // Load user segment ID
        try {
          const segmentId = await thisReadonlyContract.getUserSegmentId(thisUserAddress);
          setUserSegmentId(segmentId > 0 ? Number(segmentId) : null);
        } catch (e) {
          console.error("Error loading user segment ID:", e);
          setUserSegmentId(null);
        }

        setMessage("");
      } catch (e) {
        console.error("Error loading score:", e);
        setMessage(`Error loading score: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      }
    };

    run();
  }, [contractAddress, accounts, chainId, sameChain]);

  // Auto refresh on mount and when contract address changes
  useEffect(() => {
    if (contractAddress && accounts?.[0] && !isRefreshingRef.current) {
      refreshScoreHandle();
    }
  }, [contractAddress, accounts, refreshScoreHandle]);

  // Check admin status
  const checkAdminStatus = useCallback(() => {
    if (!contractAddress || !accounts?.[0] || !readonlyContractRef.current) {
      setIsAdmin(false);
      return;
    }

    const thisContract = readonlyContractRef.current;
    const thisUserAddress = accounts[0];
    const thisChainId = chainId;

    setIsCheckingAdmin(true);

    const run = async () => {
      try {
        const adminStatus = await thisContract.isAuthorizedAdmin(thisUserAddress);
        
        if (!sameChain.current(thisChainId)) {
          return;
        }

        setIsAdmin(adminStatus);
      } catch (e) {
        console.error("Error checking admin status:", e);
        setIsAdmin(false);
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    run();
  }, [contractAddress, accounts, chainId, sameChain]);

  // Auto check admin status
  useEffect(() => {
    if (contractAddress && accounts?.[0]) {
      checkAdminStatus();
    } else {
      setIsAdmin(false);
    }
  }, [contractAddress, accounts, checkAdminStatus]);

  // Decrypt score handle
  const decryptScore = useCallback(async () => {
    if (isDecryptingRef.current || !scoreHandle || !instance || !ethersSigner || !contractAddress) {
      return;
    }

    if (scoreHandle === ethers.ZeroHash) {
      setDecryptedScore(BigInt(0));
      return;
    }

    const thisScoreHandle = scoreHandle;
    const thisContractAddress = contractAddress;
    const thisEthersSigner = ethersSigner;
    const thisChainId = chainId;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Decrypting score...");

    const run = async () => {
      try {
        if (!fhevmDecryptionSignatureStorage) {
          setMessage("Decryption signature storage not available");
          return;
        }

        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [thisContractAddress as `0x${string}`],
          thisEthersSigner,
          fhevmDecryptionSignatureStorage
        );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        if (!sameChain.current(thisChainId) || !sameSigner.current(thisEthersSigner)) {
          setMessage("State changed, ignoring decryption");
          return;
        }

        setMessage("Calling FHEVM userDecrypt...");

        const res = await instance.userDecrypt(
          [{ handle: thisScoreHandle, contractAddress: thisContractAddress as `0x${string}` }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        if (!sameChain.current(thisChainId) || !sameSigner.current(thisEthersSigner)) {
          setMessage("State changed, ignoring decryption result");
          return;
        }

        const clearValue = res[thisScoreHandle];
        const scoreValue = typeof clearValue === "bigint" ? clearValue : BigInt(clearValue);
        setDecryptedScore(scoreValue);
        setMessage(`Score decrypted: ${scoreValue.toString()}`);
      } catch (e) {
        console.error("Error decrypting score:", e);
        setMessage(`Error decrypting: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [scoreHandle, instance, ethersSigner, contractAddress, chainId, sameChain, sameSigner, fhevmDecryptionSignatureStorage]);

  // Aggregate scores
  const aggregateScores = useCallback(async (segmentIds: number[]): Promise<string> => {
    if (!contractAddress || !ethersSigner || !sameChain.current(chainId) || !sameSigner.current(ethersSigner)) {
      setMessage("Error: Contract not available");
      return "";
    }

    const thisContract = contractRef.current;
    if (!thisContract) {
      setMessage("Error: Contract instance not ready");
      return "";
    }

    try {
      setMessage("Calculating aggregate...");
      
      // IMPORTANT: We must use an actual transaction call (not staticCall) because
      // aggregateScores needs to execute FHE.allow() to authorize admins to decrypt.
      // staticCall doesn't execute state changes, so authorization won't happen.
      // 
      // Strategy: Send actual transaction to execute authorization, then use staticCall
      // to get the handle (authorization will be in effect after transaction confirms).
      const tx: ethers.TransactionResponse = await thisContract.aggregateScores(segmentIds);
      
      setMessage(`Waiting for transaction: ${tx.hash}...`);
      
      // Wait for transaction to be mined (this executes FHE.allow() authorization)
      const receipt = await tx.wait();
      
      if (!sameChain.current(chainId) || !sameSigner.current(ethersSigner)) {
        setMessage("Operation cancelled (state changed)");
        return "";
      }
      
      // Get the aggregate handle from the event
      // Look for AggregateCalculated event in the receipt
      let result = "";
      if (receipt && receipt.logs) {
        const eventInterface = new ethers.Interface(AzureSafetyABI.abi);
        for (const log of receipt.logs) {
          try {
            const parsedLog = eventInterface.parseLog(log);
            if (parsedLog && parsedLog.name === "AggregateCalculated") {
              // aggregateHandle is the second argument (index 1)
              result = parsedLog.args[1]; // aggregateHandle
              break;
            }
          } catch (e) {
            // Not the event we're looking for, continue
            continue;
          }
        }
      }
      
      // Fallback: if we didn't find the event, use staticCall
      if (!result || result === "" || result === ethers.ZeroHash) {
        setMessage("Getting aggregate handle...");
        const staticCallResult = await thisContract.aggregateScores.staticCall(segmentIds);
        result = staticCallResult;
      }
      
      setMessage("Aggregate calculated successfully");
      
      // Result should be a bytes32 (hex string)
      let handleStr = "";
      if (typeof result === "string") {
        handleStr = result;
      } else if (ethers.isHexString(result)) {
        handleStr = result;
      } else if (result && typeof result === "object") {
        // Check for ethers v6 format
        const resultObj = result as any;
        if (resultObj._hex) {
          handleStr = resultObj._hex;
        } else if (typeof resultObj.toString === "function") {
          const str = resultObj.toString();
          if (str !== "[object Object]" && ethers.isHexString(str)) {
            handleStr = str;
          } else if (str !== "[object Object]") {
            // Try to parse as hex
            try {
              if (ethers.isHexString("0x" + str)) {
                handleStr = "0x" + str;
              } else {
                handleStr = str;
              }
            } catch {
              handleStr = str;
            }
          }
        }
      }
      
      // Ensure it's a valid hex string (bytes32 format)
      if (!handleStr) {
        console.error("Empty handle result");
        setMessage("Error: Failed to get aggregate handle");
        return "";
      }
      
      // Validate it's a hex string
      if (!ethers.isHexString(handleStr)) {
        // Try to fix it
        if (handleStr.startsWith("0x")) {
          // Already has 0x prefix, might be valid
        } else {
          // Try adding 0x prefix
          try {
            const testHex = "0x" + handleStr;
            if (ethers.isHexString(testHex)) {
              handleStr = testHex;
            }
          } catch {
            console.error("Invalid handle format:", handleStr);
            setMessage("Error: Invalid handle format");
            return "";
          }
        }
      }
      
      // Ensure it's a valid bytes32 format (66 characters: 0x + 64 hex chars)
      // euint32 is encoded as bytes32 in Solidity
      if (handleStr.length > 66) {
        // If longer than 66, take the first 66 characters (the actual bytes32)
        console.warn("Handle length is longer than 66 characters, truncating:", handleStr.length);
        handleStr = handleStr.substring(0, 66);
      } else if (handleStr.length < 66 && handleStr.startsWith("0x")) {
        // If shorter than 66, pad with zeros
        const hexPart = handleStr.substring(2);
        handleStr = "0x" + hexPart.padStart(64, "0");
      } else if (!handleStr.startsWith("0x")) {
        // If missing 0x prefix, add it and pad
        handleStr = "0x" + handleStr.padStart(64, "0");
      }
      
      // Final validation
      if (handleStr.length !== 66 || !ethers.isHexString(handleStr)) {
        console.error("Invalid handle format after processing:", handleStr);
        setMessage("Error: Invalid handle format");
        return "";
      }
      
      return handleStr;
    } catch (e: any) {
      let errorMsg = "Unknown error";
      if (e instanceof Error) {
        errorMsg = e.message;
        // Check for specific error messages
        if (errorMsg.includes("execution reverted")) {
          if (errorMsg.includes("No segments provided")) {
            errorMsg = "Please select at least one segment";
          } else {
            errorMsg = "Aggregation failed. The selected segments may not have scores yet. Please ensure users have reported events and been assigned to segments.";
          }
        }
      }
      setMessage(`Error: ${errorMsg}`);
      console.error("Aggregate scores error:", e);
      return "";
    }
  }, [contractAddress, ethersSigner, chainId, sameChain, sameSigner]);

  // Decrypt aggregate handle (admin only)
  const decryptAggregateHandle = useCallback(async (handle: string): Promise<bigint | null> => {
    if (isDecryptingRef.current || !handle || !instance || !ethersSigner || !contractAddress) {
      return null;
    }

    if (handle === ethers.ZeroHash || handle === "") {
      return BigInt(0);
    }

    const thisHandle = handle;
    const thisContractAddress = contractAddress;
    const thisEthersSigner = ethersSigner;
    const thisChainId = chainId;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Decrypting aggregate score...");

    const run = async () => {
      try {
        if (!fhevmDecryptionSignatureStorage) {
          setMessage("Decryption signature storage not available");
          return null;
        }

        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [thisContractAddress as `0x${string}`],
          thisEthersSigner,
          fhevmDecryptionSignatureStorage
        );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return null;
        }

        if (!sameChain.current(thisChainId) || !sameSigner.current(thisEthersSigner)) {
          setMessage("State changed, ignoring decryption");
          return null;
        }

        setMessage("Calling FHEVM userDecrypt...");

        const res = await instance.userDecrypt(
          [{ handle: thisHandle, contractAddress: thisContractAddress as `0x${string}` }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        if (!sameChain.current(thisChainId) || !sameSigner.current(thisEthersSigner)) {
          setMessage("State changed, ignoring decryption result");
          return null;
        }

        const clearValue = res[thisHandle];
        const aggregateValue = typeof clearValue === "bigint" ? clearValue : BigInt(clearValue);
        setMessage(`Aggregate score decrypted: ${aggregateValue.toString()}`);
        return aggregateValue;
      } catch (e) {
        console.error("Error decrypting aggregate handle:", e);
        setMessage(`Error decrypting: ${e instanceof Error ? e.message : "Unknown error"}`);
        return null;
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    return await run();
  }, [instance, ethersSigner, contractAddress, chainId, sameChain, sameSigner, fhevmDecryptionSignatureStorage]);

  // Admin functions
  const adminFunctions = useAdminFunctions({
    contractAddress,
    instance,
    ethersSigner,
    chainId,
    sameChain,
    sameSigner,
    ethersReadonlyProvider,
  });

  return {
    contractAddress,
    isReporting,
    message,
    reportEvent,
    scoreHandle,
    decryptedScore,
    isRefreshing,
    isDecrypting,
    refreshScoreHandle,
    decryptScore,
    aggregateScores,
    eventIds,
    userSegmentId,
    isAdmin,
    isCheckingAdmin,
    checkAdminStatus,
    // Admin functions
    ...adminFunctions,
    // Decrypt aggregate handle (for admins)
    decryptAggregateHandle,
  };
}

// Admin management functions
function useAdminFunctions(parameters: {
  contractAddress: string | undefined;
  instance: FhevmInstance | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  chainId: number | undefined;
  sameChain: React.RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: React.RefObject<(ethersSigner: ethers.JsonRpcSigner | undefined) => boolean>;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
}): {
  setGlobalThreshold: (threshold: number) => Promise<boolean>;
  setSegmentThreshold: (segmentId: number, threshold: number) => Promise<boolean>;
  addAdmin: (adminAddress: string) => Promise<boolean>;
  removeAdmin: (adminAddress: string) => Promise<boolean>;
  assignUserToSegment: (userAddress: string, segmentId: number) => Promise<boolean>;
  getAuthorizedAdmins: () => Promise<string[]>;
  getGlobalThreshold: () => Promise<string | null>;
  getSegmentThreshold: (segmentId: number) => Promise<string | null>;
  checkThreshold: (userAddress: string, useGlobal: boolean) => Promise<string | null>;
} {
  const {
    contractAddress,
    instance,
    ethersSigner,
    chainId,
    sameChain,
    sameSigner,
    ethersReadonlyProvider,
  } = parameters;

  const contractRef = useRef<ethers.Contract | undefined>(undefined);
  const readonlyContractRef = useRef<ethers.Contract | undefined>(undefined);

  // Create contract instances
  useEffect(() => {
    if (!contractAddress) {
      contractRef.current = undefined;
      readonlyContractRef.current = undefined;
      return;
    }

    if (ethersSigner && sameChain.current(chainId) && sameSigner.current(ethersSigner)) {
      contractRef.current = new ethers.Contract(
        contractAddress,
        AzureSafetyABI.abi,
        ethersSigner
      );
    }

    if (ethersReadonlyProvider && sameChain.current(chainId)) {
      readonlyContractRef.current = new ethers.Contract(
        contractAddress,
        AzureSafetyABI.abi,
        ethersReadonlyProvider
      );
    }
  }, [contractAddress, ethersSigner, ethersReadonlyProvider, chainId, sameChain, sameSigner]);

  // Set global threshold
  const setGlobalThreshold = useCallback(async (threshold: number): Promise<boolean> => {
    if (!contractAddress || !instance || !ethersSigner || !sameChain.current(chainId) || !sameSigner.current(ethersSigner)) {
      return false;
    }

    const thisContract = contractRef.current;
    if (!thisContract) return false;

    try {
      const input = instance.createEncryptedInput(
        contractAddress as `0x${string}`,
        ethersSigner.address as `0x${string}`
      );
      input.add32(threshold);
      const enc = await input.encrypt();

      const tx = await thisContract.setGlobalThreshold(enc.handles[0], enc.inputProof);
      await tx.wait();
      return true;
    } catch (e) {
      console.error("Error setting global threshold:", e);
      return false;
    }
  }, [contractAddress, instance, ethersSigner, chainId, sameChain, sameSigner]);

  // Set segment threshold
  const setSegmentThreshold = useCallback(async (segmentId: number, threshold: number): Promise<boolean> => {
    if (!contractAddress || !instance || !ethersSigner || !sameChain.current(chainId) || !sameSigner.current(ethersSigner)) {
      return false;
    }

    const thisContract = contractRef.current;
    if (!thisContract) return false;

    try {
      const input = instance.createEncryptedInput(
        contractAddress as `0x${string}`,
        ethersSigner.address as `0x${string}`
      );
      input.add32(threshold);
      const enc = await input.encrypt();

      const tx = await thisContract.setSegmentThreshold(segmentId, enc.handles[0], enc.inputProof);
      await tx.wait();
      return true;
    } catch (e) {
      console.error("Error setting segment threshold:", e);
      return false;
    }
  }, [contractAddress, instance, ethersSigner, chainId, sameChain, sameSigner]);

  // Add admin
  const addAdmin = useCallback(async (adminAddress: string): Promise<boolean> => {
    if (!contractAddress || !ethersSigner || !sameChain.current(chainId) || !sameSigner.current(ethersSigner)) {
      return false;
    }

    const thisContract = contractRef.current;
    if (!thisContract) return false;

    try {
      const tx = await thisContract.addAuthorizedAdmin(adminAddress);
      await tx.wait();
      return true;
    } catch (e) {
      console.error("Error adding admin:", e);
      return false;
    }
  }, [contractAddress, ethersSigner, chainId, sameChain, sameSigner]);

  // Remove admin
  const removeAdmin = useCallback(async (adminAddress: string): Promise<boolean> => {
    if (!contractAddress || !ethersSigner || !sameChain.current(chainId) || !sameSigner.current(ethersSigner)) {
      return false;
    }

    const thisContract = contractRef.current;
    if (!thisContract) return false;

    try {
      const tx = await thisContract.removeAuthorizedAdmin(adminAddress);
      await tx.wait();
      return true;
    } catch (e) {
      console.error("Error removing admin:", e);
      return false;
    }
  }, [contractAddress, ethersSigner, chainId, sameChain, sameSigner]);

  // Assign user to segment
  const assignUserToSegment = useCallback(async (userAddress: string, segmentId: number): Promise<boolean> => {
    if (!contractAddress || !ethersSigner || !sameChain.current(chainId) || !sameSigner.current(ethersSigner)) {
      return false;
    }

    const thisContract = contractRef.current;
    if (!thisContract) return false;

    try {
      const tx = await thisContract.assignUserToSegment(userAddress, segmentId);
      await tx.wait();
      return true;
    } catch (e) {
      console.error("Error assigning user to segment:", e);
      return false;
    }
  }, [contractAddress, ethersSigner, chainId, sameChain, sameSigner]);

  // Get authorized admins
  const getAuthorizedAdmins = useCallback(async (): Promise<string[]> => {
    if (!contractAddress || !readonlyContractRef.current) {
      return [];
    }

    const thisContract = readonlyContractRef.current;
    try {
      const admins = await thisContract.getAuthorizedAdmins();
      return admins;
    } catch (e) {
      console.error("Error getting authorized admins:", e);
      return [];
    }
  }, [contractAddress]);

  // Get global threshold
  const getGlobalThreshold = useCallback(async (): Promise<string | null> => {
    if (!contractAddress || !readonlyContractRef.current) {
      return null;
    }

    const thisContract = readonlyContractRef.current;
    try {
      const threshold = await thisContract.getGlobalThreshold();
      // Check if threshold is uninitialized (bytes32(0))
      if (threshold === ethers.ZeroHash) {
        return null;
      }
      return threshold;
    } catch (e) {
      console.error("Error getting global threshold:", e);
      return null;
    }
  }, [contractAddress]);

  // Get segment threshold
  const getSegmentThreshold = useCallback(async (segmentId: number): Promise<string | null> => {
    if (!contractAddress || !readonlyContractRef.current) {
      return null;
    }

    const thisContract = readonlyContractRef.current;
    try {
      const threshold = await thisContract.getSegmentThreshold(segmentId);
      // Check if threshold is uninitialized (bytes32(0))
      if (threshold === ethers.ZeroHash) {
        return null;
      }
      return threshold;
    } catch (e) {
      console.error("Error getting segment threshold:", e);
      return null;
    }
  }, [contractAddress]);

  // Check threshold (returns encrypted boolean)
  const checkThreshold = useCallback(async (
    userAddress: string,
    useGlobal: boolean
  ): Promise<string | null> => {
    if (!contractAddress || !ethersSigner || !sameChain.current(chainId) || !sameSigner.current(ethersSigner)) {
      return null;
    }

    const thisContract = contractRef.current;
    if (!thisContract) return null;

    try {
      // checkThreshold is a nonpayable function (not view), so we need to send a transaction
      // to execute FHE.allow() authorization. We'll send the transaction and then use staticCall
      // to get the return value (authorization will be in effect after transaction confirms).
      const tx: ethers.TransactionResponse = await thisContract.checkThreshold(userAddress, useGlobal);
      
      // Wait for transaction to be mined (this executes FHE.allow() authorization)
      const receipt = await tx.wait();
      
      if (!sameChain.current(chainId) || !sameSigner.current(ethersSigner)) {
        return null;
      }
      
      // Now get the result using staticCall (authorization is already in effect)
      const result = await thisContract.checkThreshold.staticCall(userAddress, useGlobal);
      
      // Debug: log the actual result to understand its format
      console.log("checkThreshold raw result:", result);
      console.log("checkThreshold result type:", typeof result);
      console.log("checkThreshold result keys:", result && typeof result === "object" ? Object.keys(result) : "N/A");
      
      // Convert result to string format (handle ethers v6 format)
      let handleStr = "";
      
      // Handle null/undefined
      if (result === null || result === undefined) {
        console.error("checkThreshold returned null or undefined");
        return null;
      }
      
      // Handle string
      if (typeof result === "string") {
        handleStr = result;
      } 
      // Handle hex string check
      else if (ethers.isHexString(result)) {
        handleStr = result;
      } 
      // Handle object (ethers v6 format)
      else if (result && typeof result === "object") {
        // Check for ethers v6 format with _hex property
        if (result._hex !== undefined) {
          handleStr = result._hex;
        }
        // Check for other possible properties
        else if (result.value !== undefined) {
          // Try to convert value to hex string
          if (typeof result.value === "string") {
            handleStr = result.value;
          } else if (typeof result.value === "bigint" || typeof result.value === "number") {
            // Convert number/bigint to hex
            handleStr = "0x" + BigInt(result.value).toString(16).padStart(64, "0");
          }
        }
        // Try toString method
        else if (typeof result.toString === "function") {
          const str = result.toString();
          console.log("checkThreshold toString result:", str);
          if (str !== "[object Object]" && ethers.isHexString(str)) {
            handleStr = str;
          } else if (str !== "[object Object]" && str.length > 0) {
            // Try to parse as hex
            try {
              if (ethers.isHexString("0x" + str)) {
                handleStr = "0x" + str;
              } else if (ethers.isHexString(str)) {
                handleStr = str;
              } else {
                // Try to convert to hex if it's a number string
                const num = BigInt(str);
                handleStr = "0x" + num.toString(16).padStart(64, "0");
              }
            } catch {
              console.error("Failed to parse toString result:", str);
              handleStr = str;
            }
          }
        }
        // Last resort: try JSON.stringify to see what we have
        else {
          console.error("Unknown result format:", JSON.stringify(result));
        }
      }
      
      // Ensure it's a valid hex string (bytes32 format)
      if (!handleStr) {
        console.error("Empty handle result from checkThreshold. Raw result:", result);
        console.error("Result type:", typeof result);
        if (result && typeof result === "object") {
          console.error("Result properties:", Object.keys(result));
        }
        return null;
      }
      
      console.log("checkThreshold handleStr after conversion:", handleStr);
      
      // Validate it's a hex string
      if (!ethers.isHexString(handleStr)) {
        // Try to fix it
        if (handleStr.startsWith("0x")) {
          // Already has 0x prefix, might be valid
        } else {
          // Try adding 0x prefix
          try {
            const testHex = "0x" + handleStr;
            if (ethers.isHexString(testHex)) {
              handleStr = testHex;
            }
          } catch {
            console.error("Invalid handle format:", handleStr);
            return null;
          }
        }
      }
      
      // Ensure it's a valid bytes32 format (66 characters: 0x + 64 hex chars)
      // ebool is encoded as bytes32 in Solidity
      if (handleStr.length > 66) {
        // If longer than 66, take the first 66 characters
        handleStr = handleStr.substring(0, 66);
      } else if (handleStr.length < 66 && handleStr.startsWith("0x")) {
        // If shorter than 66, pad with zeros
        const hexPart = handleStr.substring(2);
        handleStr = "0x" + hexPart.padStart(64, "0");
      } else if (!handleStr.startsWith("0x")) {
        // If missing 0x prefix, add it and pad
        handleStr = "0x" + handleStr.padStart(64, "0");
      }
      
      // Final validation
      if (handleStr.length !== 66 || !ethers.isHexString(handleStr)) {
        console.error("Invalid handle format after processing:", handleStr);
        return null;
      }
      
      return handleStr;
    } catch (e) {
      console.error("Error checking threshold:", e);
      return null;
    }
  }, [contractAddress, ethersSigner, chainId, sameChain, sameSigner]);

  return {
    setGlobalThreshold,
    setSegmentThreshold,
    addAdmin,
    removeAdmin,
    assignUserToSegment,
    getAuthorizedAdmins,
    getGlobalThreshold,
    getSegmentThreshold,
    checkThreshold,
  };
}

