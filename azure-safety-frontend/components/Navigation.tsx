"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnect } from "./WalletConnect";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/report", label: "Event Report" },
    { href: "/dashboard", label: "Score Dashboard" },
    { href: "/aggregation", label: "Aggregation" },
    { href: "/admin", label: "Admin Panel" },
  ];

  return (
    <nav className="bg-white border-b-2 border-gray-200 shadow-md sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Azure Safety
              </span>
            </Link>
            <div className="hidden md:flex space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    pathname === item.href
                      ? "text-white shadow-lg transform scale-105"
                      : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                  }`}
                  style={
                    pathname === item.href
                      ? { 
                          background: "linear-gradient(135deg, #0078D4 0%, #005A9E 100%)"
                        }
                      : {}
                  }
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <WalletConnect />
        </div>
      </div>
    </nav>
  );
}

