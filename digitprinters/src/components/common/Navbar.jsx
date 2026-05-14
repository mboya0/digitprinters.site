/**
 * Navbar Component
 */

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, LogOut, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">D</span>
            </div>
            <span className="text-xl font-bold text-white">DigitPrinters</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {isAuthenticated && (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-300 hover:text-white transition"
                >
                  Dashboard
                </Link>
                <Link to="/trading" className="text-gray-300 hover:text-white transition">
                  Trading
                </Link>
                <Link to="/bots" className="text-gray-300 hover:text-white transition">
                  Bots
                </Link>
                <Link
                  to="/copy-trading"
                  className="text-gray-300 hover:text-white transition"
                >
                  Copy Trading
                </Link>
                <Link to="/ai-analysis" className="text-gray-300 hover:text-white transition">
                  AI Analysis
                </Link>
              </>
            )}
          </div>

          {/* Right side items */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-300">{user?.email}</span>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition"
              >
                <LogIn size={18} />
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-300 hover:text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {isAuthenticated && (
              <>
                <Link
                  to="/dashboard"
                  className="block px-4 py-2 text-gray-300 hover:bg-slate-800 rounded"
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/trading"
                  className="block px-4 py-2 text-gray-300 hover:bg-slate-800 rounded"
                  onClick={() => setIsOpen(false)}
                >
                  Trading
                </Link>
                <Link
                  to="/bots"
                  className="block px-4 py-2 text-gray-300 hover:bg-slate-800 rounded"
                  onClick={() => setIsOpen(false)}
                >
                  Bots
                </Link>
                <Link
                  to="/copy-trading"
                  className="block px-4 py-2 text-gray-300 hover:bg-slate-800 rounded"
                  onClick={() => setIsOpen(false)}
                >
                  Copy Trading
                </Link>
                <Link
                  to="/ai-analysis"
                  className="block px-4 py-2 text-gray-300 hover:bg-slate-800 rounded"
                  onClick={() => setIsOpen(false)}
                >
                  AI Analysis
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-red-400 hover:bg-slate-800 rounded"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
