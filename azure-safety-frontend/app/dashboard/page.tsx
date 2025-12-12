"use client";

import { ethers } from "ethers";
import { useMetaMaskEthersSigner } from "@/hooks/useWallet";
import { useFhevm } from "@/fhevm/useFhevm";
import { useAzureSafety } from "@/hooks/useAzureSafety";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";

export default function DashboardPage() {
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
    scoreHandle,
    decryptedScore,
    isRefreshing,
    isDecrypting,
    message,
    decryptScore,
    eventIds,
    userSegmentId,
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

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl mb-4">Please connect your wallet to view dashboard</p>
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Safety Score Dashboard
        </h1>
        <p className="text-gray-600">
          View and manage your encrypted safety score
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Current Safety Score</h2>
          </div>
          
          {userSegmentId !== null && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300 shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-semibold text-blue-900">
                  Assigned to Segment {userSegmentId}
                </p>
              </div>
              <p className="text-xs text-blue-700">
                Your score changes will automatically accumulate to Segment {userSegmentId}&apos;s total score
              </p>
            </div>
          )}

          {userSegmentId === null && (
            <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border-2 border-amber-300 shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-semibold text-amber-900">
                  Not Assigned to Any Segment
                </p>
              </div>
              <p className="text-xs text-amber-800">
                Please contact an admin to assign you to a segment
              </p>
            </div>
          )}
          {scoreHandle && scoreHandle !== ethers.ZeroHash ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Encrypted Score Handle
                </label>
                <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 font-mono text-xs break-all">
                  {scoreHandle}
                </div>
              </div>
              {decryptedScore !== null ? (
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p className="text-sm font-semibold text-green-800">Decrypted Score</p>
                  </div>
                  <p className="text-3xl font-bold text-green-700">{decryptedScore.toString()}</p>
                </div>
              ) : (
                <button
                  onClick={decryptScore}
                  disabled={isDecrypting || isRefreshing}
                  className="w-full px-4 py-3 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{ 
                    background: isDecrypting || isRefreshing 
                      ? "#0078D4" 
                      : "linear-gradient(135deg, #0078D4 0%, #005A9E 100%)"
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
                      <span>Decrypt Score</span>
                    </span>
                  )}
                </button>
              )}
            </div>
          ) : isRefreshing ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-gray-600">Loading score...</span>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600">No score available. Report an event to get started.</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Event History</h2>
          </div>
          {eventIds.length > 0 ? (
            <div className="space-y-3">
              {eventIds.map((eventId, index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Event ID</p>
                      <p className="text-xs font-mono text-gray-500">{eventId.toString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-600">No events yet. Report an event to get started.</p>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div
          className="mt-4 p-4 rounded-lg font-medium"
          style={{
            backgroundColor: message.includes("Error")
              ? "rgba(220, 53, 69, 0.1)"
              : message.includes("decrypted")
              ? "rgba(40, 167, 69, 0.1)"
              : "rgba(0, 120, 212, 0.1)",
            color: message.includes("Error")
              ? "#DC3545"
              : message.includes("decrypted")
              ? "#28A745"
              : "#0078D4",
            border: `1px solid ${
              message.includes("Error")
                ? "rgba(220, 53, 69, 0.3)"
                : message.includes("decrypted")
                ? "rgba(40, 167, 69, 0.3)"
                : "rgba(0, 120, 212, 0.3)"
            }`,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

