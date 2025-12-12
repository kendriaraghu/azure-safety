"use client";

import { useState } from "react";
import { ethers } from "ethers";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import type { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import type { JsonRpcSigner } from "ethers";

interface AdminThresholdManagementProps {
  contractAddress: string;
  instance: FhevmInstance | undefined;
  setGlobalThreshold: (threshold: number) => Promise<boolean>;
  setSegmentThreshold: (segmentId: number, threshold: number) => Promise<boolean>;
  getGlobalThreshold: () => Promise<string | null>;
  getSegmentThreshold: (segmentId: number) => Promise<string | null>;
  checkThreshold: (userAddress: string, useGlobal: boolean) => Promise<string | null>;
  accounts?: string[];
  fhevmDecryptionSignatureStorage?: GenericStringStorage;
  ethersSigner?: JsonRpcSigner;
}

export function AdminThresholdManagement({
  contractAddress,
  instance,
  setGlobalThreshold,
  setSegmentThreshold,
  getGlobalThreshold,
  getSegmentThreshold,
  checkThreshold,
  accounts,
  fhevmDecryptionSignatureStorage,
  ethersSigner,
}: AdminThresholdManagementProps) {
  const [globalThreshold, setGlobalThresholdValue] = useState<string>("");
  const [segmentId, setSegmentId] = useState<string>("");
  const [segmentThreshold, setSegmentThresholdValue] = useState<string>("");
  const [isSettingGlobal, setIsSettingGlobal] = useState(false);
  const [isSettingSegment, setIsSettingSegment] = useState(false);
  const [message, setMessage] = useState<string>("");
  
  // View threshold states
  const [viewGlobalThreshold, setViewGlobalThreshold] = useState<bigint | null>(null);
  const [viewSegmentId, setViewSegmentId] = useState<string>("");
  const [viewSegmentThreshold, setViewSegmentThreshold] = useState<bigint | null>(null);
  const [isViewingGlobal, setIsViewingGlobal] = useState(false);
  const [isViewingSegment, setIsViewingSegment] = useState(false);
  
  // Check threshold states
  const [checkUserAddress, setCheckUserAddress] = useState<string>("");
  const [useGlobalForCheck, setUseGlobalForCheck] = useState<boolean>(true);
  const [isBelowThreshold, setIsBelowThreshold] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleSetGlobal = async () => {
    const value = Number.parseInt(globalThreshold, 10);
    if (Number.isNaN(value) || value < 0) {
      setMessage("Error: Please enter a valid positive number");
      return;
    }

    setIsSettingGlobal(true);
    setMessage("Setting global threshold...");
    const success = await setGlobalThreshold(value);
    setIsSettingGlobal(false);
    if (success) {
      setMessage("Global threshold set successfully!");
      setGlobalThresholdValue("");
    } else {
      setMessage("Error: Failed to set global threshold");
    }
  };

  const handleSetSegment = async () => {
    const segId = Number.parseInt(segmentId, 10);
    const value = Number.parseInt(segmentThreshold, 10);
    if (Number.isNaN(segId) || segId < 1 || segId > 5) {
      setMessage("Error: Segment ID must be between 1 and 5");
      return;
    }
    if (Number.isNaN(value) || value < 0) {
      setMessage("Error: Please enter a valid positive number");
      return;
    }

    setIsSettingSegment(true);
    setMessage(`Setting threshold for segment ${segId}...`);
    const success = await setSegmentThreshold(segId, value);
    setIsSettingSegment(false);
    if (success) {
      setMessage(`Segment ${segId} threshold set successfully!`);
      setSegmentId("");
      setSegmentThresholdValue("");
    } else {
      setMessage("Error: Failed to set segment threshold");
    }
  };

  const handleViewGlobalThreshold = async () => {
    if (!instance || !ethersSigner || !fhevmDecryptionSignatureStorage) {
      setMessage("Error: FHEVM instance or signer not available");
      return;
    }

    setIsViewingGlobal(true);
    setMessage("Loading global threshold...");
    try {
      const handle = await getGlobalThreshold();
      if (!handle || handle === ethers.ZeroHash) {
        setMessage("No global threshold set");
        setViewGlobalThreshold(null);
        return;
      }

      const sig = await FhevmDecryptionSignature.loadOrSign(
        instance,
        [contractAddress as `0x${string}`],
        ethersSigner,
        fhevmDecryptionSignatureStorage
      );

      if (!sig) {
        setMessage("Error: Unable to build decryption signature");
        return;
      }

      const res = await instance.userDecrypt(
        [{ handle, contractAddress: contractAddress as `0x${string}` }],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      const decryptedValue = res[handle];
      setViewGlobalThreshold(typeof decryptedValue === "bigint" ? decryptedValue : BigInt(decryptedValue));
      setMessage("Global threshold loaded successfully");
    } catch (e) {
      console.error("Error viewing global threshold:", e);
      setMessage(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setIsViewingGlobal(false);
    }
  };

  const handleViewSegmentThreshold = async () => {
    if (!instance || !ethersSigner || !fhevmDecryptionSignatureStorage) {
      setMessage("Error: FHEVM instance or signer not available");
      return;
    }

    const segId = Number.parseInt(viewSegmentId, 10);
    if (Number.isNaN(segId) || segId < 1 || segId > 5) {
      setMessage("Error: Segment ID must be between 1 and 5");
      return;
    }

    setIsViewingSegment(true);
    setMessage(`Loading threshold for segment ${segId}...`);
    try {
      const handle = await getSegmentThreshold(segId);
      if (!handle || handle === ethers.ZeroHash) {
        setMessage(`No threshold set for segment ${segId}`);
        setViewSegmentThreshold(null);
        return;
      }

      const sig = await FhevmDecryptionSignature.loadOrSign(
        instance,
        [contractAddress as `0x${string}`],
        ethersSigner,
        fhevmDecryptionSignatureStorage
      );

      if (!sig) {
        setMessage("Error: Unable to build decryption signature");
        return;
      }

      const res = await instance.userDecrypt(
        [{ handle, contractAddress: contractAddress as `0x${string}` }],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      const decryptedValue = res[handle];
      setViewSegmentThreshold(typeof decryptedValue === "bigint" ? decryptedValue : BigInt(decryptedValue));
      setMessage(`Segment ${segId} threshold loaded successfully`);
    } catch (e) {
      console.error("Error viewing segment threshold:", e);
      setMessage(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setIsViewingSegment(false);
    }
  };

  const handleCheckThreshold = async () => {
    if (!instance || !ethersSigner || !fhevmDecryptionSignatureStorage || !checkUserAddress) {
      setMessage("Error: Missing required information");
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(checkUserAddress)) {
      setMessage("Error: Please enter a valid Ethereum address");
      return;
    }

    setIsChecking(true);
    setMessage("Checking threshold...");
    try {
      // First, verify that threshold is set
      if (useGlobalForCheck) {
        const globalThresholdHandle = await getGlobalThreshold();
        if (!globalThresholdHandle || globalThresholdHandle === ethers.ZeroHash) {
          setMessage("Error: Global threshold is not set. Please set a global threshold first.");
          setIsChecking(false);
          return;
        }
      } else {
        // For segment threshold, we need to check if user is assigned to a segment
        // and if that segment has a threshold set
        // Note: The contract will check if user is assigned, but we can provide better error message
        // by checking segment threshold first (we don't know which segment the user is in)
        // Actually, we can't check this easily without knowing the segment ID
        // So we'll let the contract handle the error and provide a better message
      }

      const resultHandle = await checkThreshold(checkUserAddress, useGlobalForCheck);
      if (!resultHandle || resultHandle === ethers.ZeroHash) {
        setMessage("Error: Failed to check threshold. Make sure the threshold is set and user is assigned to a segment (if using segment threshold).");
        setIsChecking(false);
        return;
      }

      const sig = await FhevmDecryptionSignature.loadOrSign(
        instance,
        [contractAddress as `0x${string}`],
        ethersSigner,
        fhevmDecryptionSignatureStorage
      );

      if (!sig) {
        setMessage("Error: Unable to build decryption signature");
        return;
      }

      const res = await instance.userDecrypt(
        [{ handle: resultHandle, contractAddress: contractAddress as `0x${string}` }],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      // ebool decryption returns 0 or 1
      const isBelow = res[resultHandle] === BigInt(1);
      setIsBelowThreshold(isBelow);
      setMessage(isBelow ? "User score is below threshold" : "User score is above or equal to threshold");
    } catch (e) {
      console.error("Error checking threshold:", e);
      let errorMessage = "Unknown error";
      if (e instanceof Error) {
        errorMessage = e.message;
        // Provide more helpful error messages
        if (errorMessage.includes("User not assigned to segment")) {
          errorMessage = "Error: User is not assigned to any segment. Please assign the user to a segment first, or use global threshold.";
        } else if (errorMessage.includes("execution reverted")) {
          errorMessage = "Error: Threshold check failed. Possible reasons: 1) Threshold not set, 2) User not assigned to segment (if using segment threshold), 3) Threshold not initialized properly.";
        }
      }
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white rounded-lg border">
        <h3 className="font-semibold mb-3">Global Threshold</h3>
        <div className="space-y-3">
          <input
            type="number"
            value={globalThreshold}
            onChange={(e) => setGlobalThresholdValue(e.target.value)}
            placeholder="Enter threshold value"
            min="0"
            className="w-full px-3 py-2 border rounded-lg"
            disabled={isSettingGlobal || !instance}
          />
          <button
            onClick={handleSetGlobal}
            disabled={isSettingGlobal || !globalThreshold || !instance}
            className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#0078D4" }}
          >
            {isSettingGlobal ? "Setting..." : "Set Global Threshold"}
          </button>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg border">
        <h3 className="font-semibold mb-3">Segment Threshold</h3>
        <div className="space-y-3">
          <input
            type="number"
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
            placeholder="Segment ID (1-5)"
            min="1"
            max="5"
            className="w-full px-3 py-2 border rounded-lg"
            disabled={isSettingSegment || !instance}
          />
          <input
            type="number"
            value={segmentThreshold}
            onChange={(e) => setSegmentThresholdValue(e.target.value)}
            placeholder="Enter threshold value"
            min="0"
            className="w-full px-3 py-2 border rounded-lg"
            disabled={isSettingSegment || !instance}
          />
          <button
            onClick={handleSetSegment}
            disabled={isSettingSegment || !segmentId || !segmentThreshold || !instance}
            className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#0078D4" }}
          >
            {isSettingSegment ? "Setting..." : "Set Segment Threshold"}
          </button>
        </div>
      </div>

      {/* View Thresholds Section */}
      <div className="p-4 bg-white rounded-lg border">
        <h3 className="font-semibold mb-3">View Thresholds</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <button
                onClick={handleViewGlobalThreshold}
                disabled={isViewingGlobal || !instance || !ethersSigner}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
                style={{ backgroundColor: "#0078D4" }}
              >
                {isViewingGlobal ? "Loading..." : "View Global Threshold"}
              </button>
              {viewGlobalThreshold !== null && (
                <span className="text-lg font-bold" style={{ color: "#0078D4" }}>
                  {viewGlobalThreshold.toString()}
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="number"
                value={viewSegmentId}
                onChange={(e) => setViewSegmentId(e.target.value)}
                placeholder="Segment ID (1-5)"
                min="1"
                max="5"
                className="px-3 py-2 border rounded-lg w-32"
                disabled={isViewingSegment || !instance}
              />
              <button
                onClick={handleViewSegmentThreshold}
                disabled={isViewingSegment || !viewSegmentId || !instance || !ethersSigner}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
                style={{ backgroundColor: "#0078D4" }}
              >
                {isViewingSegment ? "Loading..." : "View Segment Threshold"}
              </button>
              {viewSegmentThreshold !== null && (
                <span className="text-lg font-bold" style={{ color: "#0078D4" }}>
                  {viewSegmentThreshold.toString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Check Threshold Section */}
      <div className="p-4 bg-white rounded-lg border">
        <h3 className="font-semibold mb-3">Check Threshold Status</h3>
        <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-800 mb-2">
            <strong>Note:</strong> Before checking threshold, make sure:
          </p>
          <ul className="text-xs text-amber-800 list-disc list-inside mt-1 space-y-1">
            <li>If using global threshold: Global threshold must be set</li>
            <li>If using segment threshold: User must be assigned to a segment AND that segment&apos;s threshold must be set</li>
            <li>User should have reported at least one event (or score will be treated as 0)</li>
          </ul>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            value={checkUserAddress}
            onChange={(e) => setCheckUserAddress(e.target.value)}
            placeholder="User address (0x...)"
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            disabled={isChecking || !instance}
          />
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={useGlobalForCheck}
              onChange={(e) => setUseGlobalForCheck(e.target.checked)}
              disabled={isChecking || !instance}
              className="w-4 h-4"
            />
            <label className="text-sm">Use global threshold (uncheck for segment threshold)</label>
          </div>
          <button
            onClick={handleCheckThreshold}
            disabled={isChecking || !checkUserAddress || !instance || !ethersSigner}
            className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#FF6B35" }}
          >
            {isChecking ? "Checking..." : "Check Threshold"}
          </button>
          {isBelowThreshold !== null && (
            <div
              className="p-3 rounded-lg font-medium"
              style={{
                backgroundColor: isBelowThreshold
                  ? "rgba(220, 53, 69, 0.1)"
                  : "rgba(40, 167, 69, 0.1)",
                color: isBelowThreshold ? "#DC3545" : "#28A745",
                border: `1px solid ${isBelowThreshold ? "rgba(220, 53, 69, 0.3)" : "rgba(40, 167, 69, 0.3)"}`,
              }}
            >
              {isBelowThreshold ? "⚠️ Score is BELOW threshold" : "✅ Score is ABOVE or EQUAL to threshold"}
            </div>
          )}
        </div>
      </div>

      {message && (
        <div
          className="p-3 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: message.includes("Error")
              ? "rgba(220, 53, 69, 0.1)"
              : "rgba(40, 167, 69, 0.1)",
            color: message.includes("Error")
              ? "#DC3545"
              : "#28A745",
            border: `1px solid ${message.includes("Error") ? "rgba(220, 53, 69, 0.3)" : "rgba(40, 167, 69, 0.3)"}`,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

