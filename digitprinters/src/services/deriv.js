/**
 * Deriv WebSocket Service
 * Handles connection, reconnection, and communication with Deriv API
 */

class DerivWebSocket {
  constructor(appId) {
    this.appId = appId;
    this.ws = null;
    this.messageId = 1;
    this.listeners = {};
    this.pendingRequests = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.isIntentionallyClosed = false;
  }

  /**
   * Connect to Deriv WebSocket
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('✅ Connected to Deriv WebSocket');
          this.reconnectAttempts = 0;
          this.isIntentionallyClosed = false;
          this.emit('connected', { timestamp: new Date() });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (err) {
            console.error('Error parsing message:', err);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket Error:', error);
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔌 Disconnected from Deriv WebSocket');
          this.emit('disconnected', { timestamp: new Date() });
          if (!this.isIntentionallyClosed) {
            this.attemptReconnect();
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Handle incoming messages from Deriv
   */
  handleMessage(data) {
    // Handle responses to pending requests
    if (data.req_id && this.pendingRequests[data.req_id]) {
      const callback = this.pendingRequests[data.req_id];
      delete this.pendingRequests[data.req_id];
      callback(data);
      return;
    }

    // Handle subscriptions (push updates)
    if (data.subscription) {
      this.emit(`subscribe:${data.subscription.id}`, data);
    }

    // Emit generic message event
    this.emit('message', data);
  }

  /**
   * Send a request to Deriv API
   */
  async send(request, timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      const reqId = this.messageId++;
      const messageWithId = { ...request, req_id: reqId };

      // Set up timeout
      const timeoutId = setTimeout(() => {
        delete this.pendingRequests[reqId];
        reject(new Error(`Request timeout for ${request.type}`));
      }, timeout);

      // Set up callback
      this.pendingRequests[reqId] = (response) => {
        clearTimeout(timeoutId);
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response);
        }
      };

      try {
        this.ws.send(JSON.stringify(messageWithId));
      } catch (err) {
        clearTimeout(timeoutId);
        delete this.pendingRequests[reqId];
        reject(err);
      }
    });
  }

  /**
   * Subscribe to stream updates
   */
  subscribe(type, params, callback) {
    const request = {
      [type]: 1,
      ...params,
      subscribe: 1,
    };

    this.send(request)
      .then((response) => {
        if (response.subscription) {
          const subscriptionId = response.subscription.id;
          this.on(`subscribe:${subscriptionId}`, callback);
          return subscriptionId;
        }
      })
      .catch((err) => {
        console.error(`Error subscribing to ${type}:`, err);
      });
  }

  /**
   * Get website status
   */
  async getWebsiteStatus() {
    return this.send({ website_status: 1 });
  }

  /**
   * Get active symbols/markets
   */
  async getActiveSymbols(market = 'synthetic_index') {
    return this.send({
      active_symbols: 'brief',
      product_type: market,
    });
  }

  /**
   * Subscribe to live ticks for a symbol
   */
  subscribeTicks(symbol, callback) {
    const request = {
      ticks: symbol,
      subscribe: 1,
    };

    const subscriptionId = `ticks_${symbol}_${Date.now()}`;
    this.send(request)
      .then(() => {
        this.on('message', (data) => {
          if (data.tick && data.tick.symbol === symbol) {
            callback(data.tick);
          }
        });
      })
      .catch((err) => console.error('Error subscribing to ticks:', err));

    return subscriptionId;
  }

  /**
   * Get contract proposal
   */
  async getProposal(proposal) {
    return this.send({
      proposal: 1,
      ...proposal,
    });
  }

  /**
   * Buy a contract
   */
  async buyContract(contractProposal) {
    return this.send({
      buy: contractProposal.contract_id,
      price: contractProposal.ask_price,
    });
  }

  /**
   * Get user account balance
   */
  async getBalance() {
    return this.send({ balance: 1, subscribe: 1 });
  }

  /**
   * Get open contracts
   */
  async getOpenContracts() {
    return this.send({ portfolio: 1, subscribe: 1 });
  }

  /**
   * Sell/Close a contract
   */
  async sellContract(contractId, price) {
    return this.send({
      sell: contractId,
      price: price,
    });
  }

  /**
   * Get historical ticks for charting
   */
  async getHistoricalTicks(symbol, granularity = 60, count = 100) {
    return this.send({
      ticks_history: symbol,
      adjust_start_time: 1,
      count: count,
      granularity: granularity,
      style: 'candles',
      subscribe: 1,
    });
  }

  /**
   * Attempt to reconnect
   */
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );
      setTimeout(() => {
        this.connect().catch((err) => {
          console.error('Reconnection failed:', err);
        });
      }, this.reconnectDelay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.emit('max_reconnect_attempts_reached');
    }
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    };
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
    }
  }

  /**
   * Check connection status
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let derivInstance = null;

export const initDeriv = (appId) => {
  derivInstance = new DerivWebSocket(appId);
  return derivInstance;
};

export const getDeriv = () => {
  if (!derivInstance) {
    throw new Error('Deriv not initialized. Call initDeriv first.');
  }
  return derivInstance;
};

export default DerivWebSocket;
