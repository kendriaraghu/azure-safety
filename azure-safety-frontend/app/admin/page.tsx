"use client";

import { useState } from "react";
import { useMetaMaskEthersSigner } from "@/hooks/useWallet";
import { useFhevm } from "@/fhevm/useFhevm";
import { useAzureSafety } from "@/hooks/useAzureSafety";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { AdminThresholdManagement } from "@/components/AdminThresholdManagement";
import { AdminAuthManagement } from "@/components/AdminAuthManagement";
import { AdminSegmentManagement } from "@/components/AdminSegmentManagement";

export default function AdminPage() {
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
    isAdmin,
    isCheckingAdmin,
    checkAdminStatus,
    setGlobalThreshold,
    setSegmentThreshold,
    addAdmin,
    removeAdmin,
    assignUserToSegment,
    getAuthorizedAdmins,
    getGlobalThreshold,
    getSegmentThreshold,
    checkThreshold,
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

  if (isCheckingAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl mb-4">Checking admin status...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4" style={{ color: "#DC3545" }}>
            Access Denied
          </h2>
          <p className="text-lg mb-4" style={{ color: "#6C757D" }}>
            You are not an authorized admin
          </p>
          <p className="text-sm mb-4" style={{ color: "#6C757D" }}>
            Your address: {accounts?.[0] || "N/A"}
          </p>
          <p className="text-sm mb-4" style={{ color: "#6C757D" }}>
            Please contact an existing admin to grant you admin privileges, or use an admin account to access this page.
          </p>
          <button
            onClick={checkAdminStatus}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90"
            style={{ backgroundColor: "#0078D4" }}
          >
            Refresh Status
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-3 bg-yellow-100 rounded-xl">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              Admin Panel
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Connected as: <span className="font-mono text-xs">{accounts?.[0] || "N/A"}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Threshold Management</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Set global or segment-level safety score thresholds
          </p>
          {contractAddress && fhevmInstance && (
            <AdminThresholdManagement
              contractAddress={contractAddress}
              instance={fhevmInstance}
              setGlobalThreshold={setGlobalThreshold}
              setSegmentThreshold={setSegmentThreshold}
              getGlobalThreshold={getGlobalThreshold}
              getSegmentThreshold={getSegmentThreshold}
              checkThreshold={checkThreshold}
              accounts={accounts}
              fhevmDecryptionSignatureStorage={fhevmDecryptionSignatureStorage}
              ethersSigner={ethersSigner}
            />
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Authorization Management</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Add or remove authorized admin addresses
          </p>
          <AdminAuthManagement
            addAdmin={addAdmin}
            removeAdmin={removeAdmin}
            getAuthorizedAdmins={getAuthorizedAdmins}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Segment Management</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Assign users to segments for score aggregation
          </p>
          <AdminSegmentManagement
            assignUserToSegment={assignUserToSegment}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Data Decryption</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Decrypt encrypted data handles (admin only)
          </p>
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
            <p className="text-xs text-indigo-800">
              💡 Use the Dashboard page to decrypt your own score. Admin decryption features are available in the Aggregation page.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg border-2 border-blue-200">
        <div className="flex items-start space-x-3 mb-4">
          <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 mb-3">Admin Information</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span>You have admin privileges and can access all admin functions</span>
              </p>
              <p className="flex items-center space-x-2">
                <span className="text-blue-600">🔑</span>
                <span>To grant admin access to other addresses, use the contract&apos;s <code className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">addAuthorizedAdmin</code> function</span>
              </p>
              <p className="flex items-center space-x-2">
                <span className="text-indigo-600">💡</span>
                <span>Initial admins are set during contract deployment. Check the deployment script for details.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

