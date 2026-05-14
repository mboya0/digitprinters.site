const DERIV_APP_ID = '332LK4VWd9A4pEEfTMn53';
const DERIV_WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`;

class DerivWebSocket {
  constructor(url = DERIV_WS_URL) {
    this.url = url;
    this.ws = null;
    this.messageId = 1;
    this.listeners = {};
    this.pendingRequests = {};
    this.subscriptions = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 7;
    this.reconnectDelay = 2000;
    this.isIntentionallyClosed = false;
    this.status = 'disconnected';
  }

  connect() {
    if (this.isConnected()) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.status = 'connecting';
        this.emit('status', this.status);

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.status = 'connected';
          this.reconnectAttempts = 0;
          this.isIntentionallyClosed = false;
          this.emit('connected');
          this.emit('status', this.status);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (err) {
            this.emit('error', err);
          }
        };

        this.ws.onerror = (error) => {
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.status = 'disconnected';
          this.emit('disconnected');
          this.emit('status', this.status);
          if (!this.isIntentionallyClosed) {
            this.attemptReconnect();
          }
        };
      } catch (err) {
        this.status = 'error';
        this.emit('status', this.status);
        reject(err);
      }
    });
  }

  handleMessage(data) {
    if (data.req_id && this.pendingRequests[data.req_id]) {
      const callback = this.pendingRequests[data.req_id];
      delete this.pendingRequests[data.req_id];
      callback(data);
      return;
    }

    if (data.subscription && data.subscription.id) {
      this.emit(`subscription:${data.subscription.id}`, data);
    }

    if (data.tick && data.tick.symbol) {
      this.emit(`tick:${data.tick.symbol}`, data.tick);
    }

    this.emit('message', data);
  }

  async send(request, timeout = 15000) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('WebSocket is not connected'));
    }

    return new Promise((resolve, reject) => {
      const reqId = this.messageId++;
      const payload = { ...request, req_id: reqId };

      const timeoutId = setTimeout(() => {
        delete this.pendingRequests[reqId];
        reject(new Error(`Request timeout for ${JSON.stringify(request)}`));
      }, timeout);

      this.pendingRequests[reqId] = (response) => {
        clearTimeout(timeoutId);
        if (response.error) {
          reject(new Error(response.error.message || 'Deriv request error'));
        } else {
          resolve(response);
        }
      };

      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        clearTimeout(timeoutId);
        delete this.pendingRequests[reqId];
        reject(err);
      }
    });
  }

  async subscribeTicks(symbol, callback) {
    if (!symbol) {
      throw new Error('Symbol is required for tick subscription');
    }

    const handler = (tick) => callback(tick);
    const unsubscribeEvent = this.on(`tick:${symbol}`, handler);

    const response = await this.send({ ticks: symbol, subscribe: 1 });
    const subscriptionId = response.subscription?.id;

    if (subscriptionId) {
      this.subscriptions[subscriptionId] = unsubscribeEvent;
    }

    return () => {
      unsubscribeEvent();
      if (subscriptionId) {
        delete this.subscriptions[subscriptionId];
        this.send({ forget: subscriptionId }).catch(() => {});
      }
    };
  }

  async getWebsiteStatus() {
    return this.send({ website_status: 1 });
  }

  async getActiveSymbols(market = 'synthetic_index') {
    return this.send({ active_symbols: 'brief', product_type: market });
  }

  async getBalance() {
    return this.send({ balance: 1 });
  }

  async getProposal(proposal) {
    return this.send({ proposal: 1, ...proposal });
  }

  async buyContract(contractProposal) {
    return this.send({ buy: contractProposal.contract_id, price: contractProposal.ask_price });
  }

  async getHistoricalCandles(symbol, granularity = 60, count = 80) {
    return this.send({
      ticks_history: symbol,
      adjust_start_time: 1,
      count,
      granularity,
      style: 'candles',
    });
  }

  async getOpenContracts() {
    return this.send({ portfolio: 1 });
  }

  async sellContract(contractId, price) {
    return this.send({ sell: contractId, price });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new Error('Maximum reconnect attempts reached'));
      return;
    }

    this.reconnectAttempts += 1;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    setTimeout(() => {
      this.connect().catch((err) => this.emit('error', err));
    }, delay);
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    return () => {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    };
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(data));
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    Object.values(this.subscriptions).forEach((unsubscribe) => unsubscribe?.());
    this.subscriptions = {};
    if (this.ws) {
      this.ws.close();
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

let derivInstance = null;
export const initDeriv = () => {
  if (!derivInstance) {
    derivInstance = new DerivWebSocket();
  }
  return derivInstance;
};

export const getDeriv = () => {
  if (!derivInstance) {
    throw new Error('Deriv not initialized. Call initDeriv first.');
  }
  return derivInstance;
};

export default DerivWebSocket;
