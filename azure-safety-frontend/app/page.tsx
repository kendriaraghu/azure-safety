"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
        <div className="max-w-6xl w-full space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <div className="inline-block p-4 bg-white rounded-2xl shadow-lg mb-4">
              <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Azure Safety
            </h1>
            <p className="text-2xl text-gray-700 font-medium">
              Construction Site Encrypted Safety Score System
            </p>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powered by FHEVM - Fully Homomorphic Encryption for privacy-preserving on-chain computations
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 gap-6 mt-16">
            <div className="group p-8 bg-white rounded-2xl shadow-lg border-2 border-blue-200 hover:border-blue-400 transition-all transform hover:scale-105 hover:shadow-2xl">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Encrypted Event Reporting
                </h2>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Report safety events with encrypted score changes. All data is protected using FHEVM, ensuring privacy while maintaining transparency.
              </p>
              <Link
                href="/report"
                className="inline-flex items-center space-x-2 px-6 py-3 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                style={{ 
                  background: "linear-gradient(135deg, #0078D4 0%, #005A9E 100%)"
                }}
              >
                <span>Report Event</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            <div className="group p-8 bg-white rounded-2xl shadow-lg border-2 border-orange-200 hover:border-orange-400 transition-all transform hover:scale-105 hover:shadow-2xl">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Score Dashboard
                </h2>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                View your encrypted safety score and decrypt it with proper authorization. Track your safety performance over time.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center space-x-2 px-6 py-3 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                style={{ 
                  background: "linear-gradient(135deg, #FF6B35 0%, #CC4A1F 100%)"
                }}
              >
                <span>View Dashboard</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            <div className="group p-8 bg-white rounded-2xl shadow-lg border-2 border-green-200 hover:border-green-400 transition-all transform hover:scale-105 hover:shadow-2xl">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Score Aggregation
                </h2>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Aggregate safety scores from multiple construction segments using encrypted computation. Compare and supervise across sites.
              </p>
              <Link
                href="/aggregation"
                className="inline-flex items-center space-x-2 px-6 py-3 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                style={{ 
                  background: "linear-gradient(135deg, #28A745 0%, #1e7e34 100%)"
                }}
              >
                <span>Aggregate Scores</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            <div className="group p-8 bg-white rounded-2xl shadow-lg border-2 border-yellow-200 hover:border-yellow-400 transition-all transform hover:scale-105 hover:shadow-2xl">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Admin Panel
                </h2>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Manage thresholds, authorizations, and decrypt data. Full administrative control for authorized admins only.
              </p>
              <Link
                href="/admin"
                className="inline-flex items-center space-x-2 px-6 py-3 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                style={{ 
                  background: "linear-gradient(135deg, #FFC107 0%, #CC9900 100%)"
                }}
              >
                <span>Admin Panel</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Footer Section */}
          <div className="mt-16 text-center p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-lg font-semibold text-gray-800">
                Built with FHEVM
              </p>
            </div>
            <p className="text-gray-600 mb-2">
              Fully Homomorphic Encryption Virtual Machine
            </p>
            <p className="text-sm text-gray-500">
              All safety scores and events are encrypted on-chain. Only authorized parties can decrypt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

