"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useMetaMaskEthersSigner } from "@/hooks/useWallet";
import { useFhevm } from "@/fhevm/useFhevm";
import { useAzureSafety } from "@/hooks/useAzureSafety";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";

export default function AggregationPage() {
  const {
    isConnected,
    connect,
    accounts,
    ethersSigner,
    chainId,
    provider,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();

  // FHEVM instance
  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  // Azure Safety contract interaction
  const {
    contractAddress,
    message,
    aggregateScores,
    isAdmin,
    decryptAggregateHandle,
    isDecrypting,
  } = useAzureSafety({
    instance: fhevmInstance,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    fhevmDecryptionSignatureStorage,
    accounts,
  });

  const [selectedSegments, setSelectedSegments] = useState<number[]>([]);
  const [aggregateHandle, setAggregateHandle] = useState<string>("");
  const [decryptedAggregate, setDecryptedAggregate] = useState<bigint | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl mb-4">Please connect your wallet</p>
        <button
          onClick={connect}
          className="px-6 py-3 text-white rounded-lg hover:opacity-90"
          style={{ backgroundColor: "#0078D4" }}
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (!contractAddress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl mb-4" style={{ color: "#DC3545" }}>
          Contract not deployed on this network. Please switch to a supported network.
        </p>
        <p className="text-sm" style={{ color: "#6C757D" }}>Chain ID: {chainId}</p>
      </div>
    );
  }

  if (fhevmStatus === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl mb-4" style={{ color: "#DC3545" }}>
          FHEVM Error: {fhevmError?.message || "Unknown error"}
        </p>
      </div>
    );
  }

  if (fhevmStatus !== "ready") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl mb-4">
          {fhevmStatus === "loading" ? "Loading FHEVM..." : "Initializing FHEVM..."}
        </p>
      </div>
    );
  }

  const handleCalculate = async () => {
    if (selectedSegments.length === 0) {
      return;
    }

    setIsCalculating(true);
    try {
      const handle = await aggregateScores(selectedSegments);
      console.log("Received handle from aggregateScores:", handle, "Type:", typeof handle);
      
      // Ensure handle is a string before setting
      let handleStr = "";
      if (typeof handle === "string") {
        handleStr = handle;
      } else if (handle && typeof handle === "object") {
        // If it's still an object, try to extract string value
        const handleObj = handle as any;
        if (handleObj._hex) {
          handleStr = handleObj._hex;
        } else if (typeof handleObj.toString === "function") {
          const str = handleObj.toString();
          if (str !== "[object Object]") {
            handleStr = str;
          }
        }
      } else {
        handleStr = String(handle);
      }
      
      if (handleStr && handleStr !== "" && handleStr !== ethers.ZeroHash && handleStr !== "[object Object]") {
        setAggregateHandle(handleStr);
      } else {
        setAggregateHandle("");
      }
    } catch (error) {
      console.error("Error calculating aggregate:", error);
      // Error message is already set by aggregateScores
      setAggregateHandle("");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Score Aggregation
        </h1>
        <p className="text-gray-600">
          Calculate encrypted aggregate scores from multiple construction segments
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border-2 border-blue-200 shadow-sm">
          <div className="flex items-start space-x-3 mb-4">
            <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold mb-3 text-gray-800">What is a Segment?</h2>
              <ul className="text-sm space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span><strong>Segments</strong> are used to group construction sites/teams for management (e.g., Segment 1 = Site A, Segment 2 = Site B)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Admins can assign users to different segments (in Admin Panel)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>When users in a segment report safety events, the segment&apos;s score automatically accumulates</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Aggregation calculates the sum of scores from multiple segments for comparison and supervision</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Each segment can have an independent threshold (set in Admin Panel)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-3 text-gray-700">
            Select Segments to Aggregate
          </label>
          <p className="text-xs text-gray-500 mb-4">
            Select the segments you want to aggregate. The system will calculate the sum of scores from these segments.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((segmentId) => (
              <label 
                key={segmentId} 
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all transform hover:scale-105 ${
                  selectedSegments.includes(segmentId)
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-600 text-white shadow-lg"
                    : "bg-gray-50 border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSegments.includes(segmentId)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSegments([...selectedSegments, segmentId]);
                    } else {
                      setSelectedSegments(
                        selectedSegments.filter((id) => id !== segmentId)
                      );
                    }
                  }}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-2 ${
                  selectedSegments.includes(segmentId) ? "bg-white text-blue-600" : "bg-gray-200"
                }`}>
                  {selectedSegments.includes(segmentId) && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="font-semibold text-sm">Segment {segmentId}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleCalculate}
          disabled={isCalculating || selectedSegments.length === 0 || fhevmStatus !== "ready"}
          className="w-full px-6 py-4 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ 
            background: isCalculating || selectedSegments.length === 0 || fhevmStatus !== "ready"
              ? "#0078D4" 
              : "linear-gradient(135deg, #0078D4 0%, #005A9E 100%)"
          }}
        >
          {isCalculating ? (
            <span className="flex items-center justify-center space-x-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Calculating...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Calculate Aggregate</span>
            </span>
          )}
        </button>

        {aggregateHandle && aggregateHandle !== ethers.ZeroHash && aggregateHandle !== "" && (
          <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-300 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-700">
                Aggregate Score Handle (Encrypted)
              </label>
              <div className="font-mono text-xs break-all p-4 bg-white rounded-xl border-2 border-gray-200 shadow-inner">
                {(() => {
                  // Ensure handle is always displayed as a string
                  let handleStr = "";
                  if (typeof aggregateHandle === "string") {
                    handleStr = aggregateHandle;
                  } else if (aggregateHandle && typeof aggregateHandle === "object") {
                    const handleObj = aggregateHandle as any;
                    if (handleObj._hex) {
                      handleStr = handleObj._hex;
                    } else if (handleObj.toString && typeof handleObj.toString === "function") {
                      const str = handleObj.toString();
                      if (str !== "[object Object]") {
                        handleStr = str;
                      }
                    } else {
                      handleStr = String(aggregateHandle);
                    }
                  } else {
                    handleStr = String(aggregateHandle);
                  }
                  
                  // Ensure it's exactly 66 characters (bytes32 format: 0x + 64 hex chars)
                  if (handleStr && handleStr.startsWith("0x")) {
                    if (handleStr.length > 66) {
                      // Truncate to 66 characters (take first 66 chars)
                      handleStr = handleStr.substring(0, 66);
                    } else if (handleStr.length < 66) {
                      // Pad with zeros
                      const hexPart = handleStr.substring(2);
                      handleStr = "0x" + hexPart.padStart(64, "0");
                    }
                  }
                  
                  return handleStr;
                })()}
              </div>
            </div>

            {decryptedAggregate !== null ? (
              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 shadow-sm">
                <div className="flex items-center space-x-2 mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <p className="text-sm font-semibold text-green-800">
                    Decrypted Aggregate Score
                  </p>
                </div>
                <p className="text-4xl font-bold text-green-700">
                  {decryptedAggregate.toString()}
                </p>
              </div>
            ) : isAdmin ? (
              <button
                onClick={async () => {
                  if (!aggregateHandle) return;
                  const result = await decryptAggregateHandle(aggregateHandle);
                  if (result !== null) {
                    setDecryptedAggregate(result);
                  }
                }}
                disabled={isDecrypting || !fhevmInstance}
                className="w-full px-4 py-3 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                style={{ 
                  background: isDecrypting || !fhevmInstance
                    ? "#28A745" 
                    : "linear-gradient(135deg, #28A745 0%, #1e7e34 100%)"
                }}
              >
                {isDecrypting ? (
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Decrypting...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Decrypt Aggregate Score (Admin Only)</span>
                  </span>
                )}
              </button>
            ) : (
              <div className="p-5 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border-2 border-amber-300 shadow-sm">
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900 mb-2">
                      Why is this encrypted?
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      FHEVM uses Fully Homomorphic Encryption to protect data privacy. The score is encrypted on-chain, 
                      and only authorized admins can decrypt it. This ensures privacy while allowing encrypted computations.
                    </p>
                    <p className="text-xs text-amber-800 mt-2 font-medium">
                      💡 Contact an admin to decrypt and view the actual aggregate score.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {message && (
          <div
            className="p-4 rounded-lg font-medium"
            style={{
              backgroundColor: message.includes("Error")
                ? "rgba(220, 53, 69, 0.1)"
                : message.includes("successfully")
                ? "rgba(40, 167, 69, 0.1)"
                : "rgba(0, 120, 212, 0.1)",
              color: message.includes("Error")
                ? "#DC3545"
                : message.includes("successfully")
                ? "#28A745"
                : "#0078D4",
              border: `1px solid ${
                message.includes("Error")
                  ? "rgba(220, 53, 69, 0.3)"
                  : message.includes("successfully")
                  ? "rgba(40, 167, 69, 0.3)"
                  : "rgba(0, 120, 212, 0.3)"
              }`,
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

