/**
 * Constants
 * Application-wide constants
 */

export const SYNTHETIC_INDICES = {
  R_10: { name: 'Volatility 10', multiplier: 10 },
  R_25: { name: 'Volatility 25', multiplier: 25 },
  R_50: { name: 'Volatility 50', multiplier: 50 },
  R_75: { name: 'Volatility 75', multiplier: 75 },
  R_100: { name: 'Volatility 100', multiplier: 100 },
};

export const DURATIONS = [
  { label: '15 seconds', value: '15s' },
  { label: '30 seconds', value: '30s' },
  { label: '1 minute', value: '1m' },
  { label: '5 minutes', value: '5m' },
  { label: '15 minutes', value: '15m' },
  { label: '1 hour', value: '1h' },
];

export const CONTRACT_TYPES = {
  CALL: 'CALL',
  PUT: 'PUT',
  HIGHER: 'HIGHER',
  LOWER: 'LOWER',
};

export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

export const API_ENDPOINTS = {
  DERIV_WS: 'wss://ws.derivws.com/websockets/v3',
  BALANCE: '/balance',
  PROPOSAL: '/proposal',
  BUY: '/buy',
  SELL: '/sell',
  PORTFOLIO: '/portfolio',
  TICKS: '/ticks',
  TICKS_HISTORY: '/ticks_history',
  ACTIVE_SYMBOLS: '/active_symbols',
  WEBSITE_STATUS: '/website_status',
};

export const DERIV_OAUTH_CONFIG = {
  authorize_url: 'https://oauth.deriv.com/oauth2/authorize',
  client_id: import.meta.env.VITE_DERIV_APP_ID || '332LK4VWd9A4pEEfTMn53',
  redirect_uri: window.location.origin,
  scope: 'read write',
};
