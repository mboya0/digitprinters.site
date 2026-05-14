/**
 * Trading Context
 * Manages core trading state, open contracts, and live market data.
 */

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSymbols } from '../hooks/useSymbols';

const TradingContext = createContext(null);

export const TradingProvider = ({ children }) => {
  const { deriv, status: derivStatus, error: derivError } = useAuth();
  const { symbols: activeSymbols, loading: symbolsLoading, error: symbolsError, refreshSymbols } = useSymbols();
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState(60);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [websiteStatus, setWebsiteStatus] = useState(null);

  useEffect(() => {
    if (activeSymbols.length && !selectedSymbol) {
      setSelectedSymbol(activeSymbols[0].symbol);
    }
  }, [activeSymbols, selectedSymbol]);

  const fetchBalance = useCallback(async () => {
    if (!deriv || !deriv.isConnected()) return;

    try {
      const response = await deriv.getBalance();
      setBalance(response.balance?.balance || 0);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError(err.message || 'Balance request failed');
    }
  }, [deriv]);

  useEffect(() => {
    if (!deriv || !deriv.isConnected()) return;

    setLoading(true);
    fetchBalance();
    const refresh = setInterval(fetchBalance, 30000);

    return () => clearInterval(refresh);
  }, [deriv, fetchBalance]);

  useEffect(() => {
    if (!deriv || !deriv.isConnected()) return;

    deriv
      .getWebsiteStatus()
      .then((response) => setWebsiteStatus(response.website_status || null))
      .catch((err) => setError(err.message || 'Unable to fetch website status'));
  }, [deriv]);

  useEffect(() => {
    setError(derivError || symbolsError || null);
    setLoading(derivStatus === 'connecting' || symbolsLoading);
  }, [derivError, symbolsError, derivStatus, symbolsLoading]);

  const requestProposal = useCallback(
    async ({ symbol, amount, duration, durationUnit, contractType }) => {
      if (!deriv || !deriv.isConnected()) {
        throw new Error('Deriv is not connected');
      }

      return deriv.getProposal({
        amount,
        basis: 'stake',
        contract_type: contractType,
        currency: 'USD',
        duration,
        duration_unit: durationUnit,
        symbol,
      });
    },
    [deriv]
  );

  const buyContract = useCallback(
    async (contractProposal) => {
      if (!deriv || !deriv.isConnected()) {
        throw new Error('Deriv is not connected');
      }

      const response = await deriv.buyContract(contractProposal);
      await fetchBalance();
      return response;
    },
    [deriv, fetchBalance]
  );

  const syntheticIndices = useMemo(
    () => activeSymbols.map((item) => ({ code: item.symbol, name: item.name })),
    [activeSymbols]
  );

  return (
    <TradingContext.Provider
      value={{
        balance,
        activeSymbols,
        syntheticIndices,
        selectedSymbol,
        selectedTimeframe,
        loading,
        error,
        websiteStatus,
        derivStatus,
        setSelectedSymbol,
        setSelectedTimeframe,
        fetchBalance,
        refreshSymbols,
        requestProposal,
        buyContract,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within TradingProvider');
  }
  return context;
};
