"use client";

import { useState } from "react";
import { useMetaMaskEthersSigner } from "@/hooks/useWallet";
import { useFhevm } from "@/fhevm/useFhevm";
import { useAzureSafety } from "@/hooks/useAzureSafety";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";

export default function ReportPage() {
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

  const [eventType, setEventType] = useState<number>(0);
  const [scoreChange, setScoreChange] = useState<string>("");
  const [location, setLocation] = useState<string>("");

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
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const { isReporting, message, reportEvent, contractAddress, userSegmentId } = useAzureSafety({
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

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl mb-4">Please connect your wallet to report events</p>
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
        <p className="text-xl mb-4 text-error">
          Contract not deployed on this network. Please switch to a supported network.
        </p>
        <p className="text-sm text-gray-600">Chain ID: {chainId}</p>
      </div>
    );
  }

  if (fhevmStatus === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl mb-4 text-error">
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

  const handleSubmit = async () => {
    if (!scoreChange) {
      return;
    }

    const scoreChangeNum = Number.parseInt(scoreChange, 10);
    if (Number.isNaN(scoreChangeNum) || scoreChangeNum < -100 || scoreChangeNum > 100) {
      return;
    }

    await reportEvent(eventType, scoreChangeNum);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          Report Safety Event
        </h1>
        <p className="text-gray-600">
          Submit encrypted safety events with score changes. All data is protected using FHEVM.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
        {userSegmentId !== null && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 border-blue-300 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">
                  Assigned to Segment {userSegmentId}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Your reported events will automatically accumulate to Segment {userSegmentId}&apos;s total score
                </p>
              </div>
            </div>
          </div>
        )}

        {userSegmentId === null && (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-100 rounded-xl border-2 border-amber-300 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  Not Assigned to Any Segment
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Please contact an admin to assign you to a segment in the Admin Panel. Your events will only accumulate to segment scores after assignment.
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-3 text-gray-700">
            Event Type
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(Number(e.target.value))}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          >
            <option value={0}>Safety Equipment Check</option>
            <option value={1}>Violation</option>
            <option value={2}>Inspection</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-3 text-gray-700">
            Score Change (-100 to +100)
          </label>
          <input
            type="number"
            value={scoreChange}
            onChange={(e) => setScoreChange(e.target.value)}
            min="-100"
            max="100"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Enter score change (positive for bonus, negative for penalty)"
          />
          <p className="text-xs text-gray-500 mt-2">
            Positive values add points, negative values deduct points
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-3 text-gray-700">
            Location (Optional)
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Enter location description"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isReporting || !scoreChange || fhevmStatus !== "ready"}
          className="w-full px-6 py-4 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ 
            backgroundColor: "#0078D4",
            background: isReporting || !scoreChange || fhevmStatus !== "ready" 
              ? "#0078D4" 
              : "linear-gradient(135deg, #0078D4 0%, #005A9E 100%)"
          }}
        >
          {isReporting ? (
            <span className="flex items-center justify-center space-x-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Submitting...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Submit Encrypted Event</span>
            </span>
          )}
        </button>

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

