/**
 * Trading Page
 * Main trading interface with charts and trading controls
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTrading } from '../context/TradingContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';

export default function Trading() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { 
    balance, 
    selectedSymbol, 
    setSelectedSymbol, 
    SYNTHETIC_INDICES, 
    loading 
  } = useTrading();

  const [amount, setAmount] = useState('10');
  const [duration, setDuration] = useState('1m');
  const [contractType, setContractType] = useState('CALL');
  const [showChart, setShowChart] = useState(true);
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleBuyCall = () => {
    console.log('Buy CALL:', { symbol: selectedSymbol, amount, duration, type: 'CALL' });
  };

  const handleBuySell = () => {
    console.log('Buy PUT:', { symbol: selectedSymbol, amount, duration, type: 'PUT' });
  };

  if (authLoading || loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">DTrader</h1>
          <p className="text-gray-400">Trade synthetic indices with advanced tools</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2">
            <Card>
              {/* Chart Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedSymbol}
                      onChange={(e) => setSelectedSymbol(e.target.value)}
                      className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      {SYNTHETIC_INDICES.map((idx) => (
                        <option key={idx.code} value={idx.code}>
                          {idx.name} ({idx.code})
                        </option>
                      ))}
                    </select>
                    <div className="text-2xl font-bold text-white">$1,234.56</div>
                    <div className="text-green-400 font-semibold">+2.45%</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm">
                    1m
                  </button>
                  <button className="px-3 py-2 bg-blue-600 rounded text-white text-sm">
                    5m
                  </button>
                  <button className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm">
                    15m
                  </button>
                  <button className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm">
                    1h
                  </button>
                </div>
              </div>

              {/* Chart Placeholder */}
              <div
                ref={chartContainerRef}
                className="w-full h-96 bg-slate-800 rounded border border-slate-700 flex items-center justify-center mb-4"
              >
                <div className="text-center">
                  <div className="text-gray-400 mb-4">TradingView Lightweight Charts</div>
                  <div className="flex items-end justify-center gap-1 h-32">
                    {[40, 45, 50, 48, 55, 60, 58, 65, 62, 70, 68, 75, 72, 80].map((h, i) => (
                      <div
                        key={i}
                        className="w-2 bg-gradient-to-t from-green-500 to-green-400 rounded-t"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Technical Indicators */}
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-slate-700 rounded p-3">
                  <p className="text-gray-400 text-xs">RSI(14)</p>
                  <p className="text-white font-semibold">65.4</p>
                </div>
                <div className="bg-slate-700 rounded p-3">
                  <p className="text-gray-400 text-xs">MACD</p>
                  <p className="text-green-400 font-semibold">Bullish</p>
                </div>
                <div className="bg-slate-700 rounded p-3">
                  <p className="text-gray-400 text-xs">MA(20)</p>
                  <p className="text-white font-semibold">$1,230</p>
                </div>
                <div className="bg-slate-700 rounded p-3">
                  <p className="text-gray-400 text-xs">Support</p>
                  <p className="text-white font-semibold">$1,200</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Trading Panel */}
          <div>
            <Card className="sticky top-24">
              <h2 className="text-2xl font-bold text-white mb-6">Place Trade</h2>

              {/* Balance Display */}
              <div className="bg-slate-700 rounded p-3 mb-6">
                <p className="text-gray-400 text-sm mb-1">Balance</p>
                <p className="text-2xl font-bold text-white">${balance ? balance.toFixed(2) : '0.00'}</p>
              </div>

              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Amount ($)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  max={balance}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Duration Select */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="15s">15 seconds</option>
                  <option value="30s">30 seconds</option>
                  <option value="1m">1 minute</option>
                  <option value="5m">5 minutes</option>
                  <option value="15m">15 minutes</option>
                  <option value="1h">1 hour</option>
                </select>
              </div>

              {/* Contract Type */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Contract Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setContractType('CALL')}
                    className={`p-3 rounded font-semibold transition ${
                      contractType === 'CALL'
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    <TrendingUp size={18} className="mx-auto mb-1" />
                    UP
                  </button>
                  <button
                    onClick={() => setContractType('PUT')}
                    className={`p-3 rounded font-semibold transition ${
                      contractType === 'PUT'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    <TrendingDown size={18} className="mx-auto mb-1" />
                    DOWN
                  </button>
                </div>
              </div>

              {/* Trade Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleBuyCall}
                  className="w-full bg-green-600 hover:bg-green-700 py-3 text-lg font-semibold"
                >
                  BUY UP
                </Button>
                <Button
                  onClick={handleBuySell}
                  className="w-full bg-red-600 hover:bg-red-700 py-3 text-lg font-semibold"
                >
                  BUY DOWN
                </Button>
              </div>

              {/* Trade Info */}
              <div className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Potential Profit:</span>
                  <span className="text-green-400 font-semibold">
                    +${(parseFloat(amount) * 0.8).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payout:</span>
                  <span className="text-white font-semibold">
                    ${(parseFloat(amount) * 1.8).toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
