/**
 * Dashboard Page
 * Main dashboard showing balance, market overview, and recent activity
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTrading } from '../context/TradingContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { balance, selectedSymbol, setSelectedSymbol, SYNTHETIC_INDICES, loading } = useTrading();

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  if (authLoading || loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Welcome back! Here's your trading overview.</p>
        </div>

        {/* Top Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-2">Account Balance</p>
                <p className="text-3xl font-bold text-white">
                  ${balance ? balance.toFixed(2) : '0.00'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-600 bg-opacity-20 rounded-lg flex items-center justify-center">
                <DollarSign className="text-blue-400" size={24} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-2">Today's P&L</p>
                <p className="text-3xl font-bold text-green-400">+$1,250.50</p>
              </div>
              <div className="w-12 h-12 bg-green-600 bg-opacity-20 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-green-400" size={24} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-2">Win Rate</p>
                <p className="text-3xl font-bold text-white">65.2%</p>
              </div>
              <div className="w-12 h-12 bg-purple-600 bg-opacity-20 rounded-lg flex items-center justify-center">
                <Activity className="text-purple-400" size={24} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-2">Open Trades</p>
                <p className="text-3xl font-bold text-white">3</p>
              </div>
              <div className="w-12 h-12 bg-orange-600 bg-opacity-20 rounded-lg flex items-center justify-center">
                <TrendingDown className="text-orange-400" size={24} />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Market Overview */}
          <div className="lg:col-span-2">
            <Card>
              <h2 className="text-xl font-semibold text-white mb-6">Market Overview</h2>
              <div className="space-y-4">
                {SYNTHETIC_INDICES.map((index) => (
                  <div
                    key={index.code}
                    onClick={() => setSelectedSymbol(index.code)}
                    className={`p-4 rounded-lg cursor-pointer transition ${
                      selectedSymbol === index.code
                        ? 'bg-blue-600 bg-opacity-20 border border-blue-500'
                        : 'bg-slate-700 hover:bg-slate-600 border border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{index.name}</p>
                        <p className="text-sm text-gray-400">{index.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">$1,234.56</p>
                        <p className="text-sm text-green-400">+2.45%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <Card>
              <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/trading')}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Start Trading
                </Button>
                <Button
                  onClick={() => navigate('/bots')}
                  variant="secondary"
                  className="w-full"
                >
                  Run Bots
                </Button>
                <Button
                  onClick={() => navigate('/copy-trading')}
                  variant="secondary"
                  className="w-full"
                >
                  Copy Trading
                </Button>
                <Button
                  onClick={() => navigate('/ai-analysis')}
                  variant="secondary"
                  className="w-full"
                >
                  AI Analysis
                </Button>
              </div>
            </Card>

            {/* Deriv Links */}
            <Card className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Deriv Account</h3>
              <div className="space-y-2">
                <a
                  href="https://deriv.com/cashier/deposit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-gray-300 hover:text-white transition text-center"
                >
                  Deposit
                </a>
                <a
                  href="https://deriv.com/cashier/withdrawal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-gray-300 hover:text-white transition text-center"
                >
                  Withdraw
                </a>
              </div>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { time: '2 min ago', action: 'BUY', symbol: 'R_25', amount: '$500', status: 'Won', profit: '+$125' },
              { time: '15 min ago', action: 'BUY', symbol: 'R_50', amount: '$250', status: 'Lost', profit: '-$62' },
              { time: '1 hour ago', action: 'BUY', symbol: 'R_10', amount: '$100', status: 'Won', profit: '+$45' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold text-white">
                    {activity.action} {activity.symbol}
                  </p>
                  <p className="text-sm text-gray-400">{activity.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-white">{activity.amount}</p>
                  <p className={activity.status === 'Won' ? 'text-green-400' : 'text-red-400'}>
                    {activity.profit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
