/**
 * CLOUD SYNC & FIREBASE REALTIME DATABASE MANAGER
 * EL FALASTENY - MULTI-DEVICE SYNC ENGINE
 */

const CLOUD_STORAGE_KEY = 'falasteny_cloud_config_v1';

// Default Firebase Configuration for EL FALASTENY
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBfvEMctdACJ9APlNFQ2MHltcCo8n9GfPg",
  authDomain: "el-falasteny.firebaseapp.com",
  databaseURL: "https://el-falasteny-default-rtdb.firebaseio.com",
  projectId: "el-falasteny",
  storageBucket: "el-falasteny.firebasestorage.app",
  messagingSenderId: "1097051175953",
  appId: "1:1097051175953:web:1d537a1f55dee17d0385b0",
  measurementId: "G-5J8P0Y933P"
};

class CloudSyncManager {
  constructor() {
    this.isCloudEnabled = false;
    this.dbRef = null;
    this.statusListeners = [];
    this.config = this.getStoredConfig() || DEFAULT_FIREBASE_CONFIG;
  }

  getStoredConfig() {
    try {
      const stored = localStorage.getItem(CLOUD_STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_FIREBASE_CONFIG;
    } catch (e) {
      return DEFAULT_FIREBASE_CONFIG;
    }
  }

  saveConfig(config) {
    localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify(config));
    this.config = config;
    return this.init();
  }

  removeConfig() {
    localStorage.removeItem(CLOUD_STORAGE_KEY);
    this.config = null;
    this.isCloudEnabled = false;
    this.notifyStatus(false);
  }

  init() {
    if (!this.config || !this.config.apiKey || !this.config.databaseURL) {
      this.isCloudEnabled = false;
      this.notifyStatus(false);
      return false;
    }

    try {
      if (!window.firebase) {
        console.warn('Firebase SDK not loaded yet');
        return false;
      }

      // Initialize Firebase App if not already initialized
      if (!firebase.apps.length) {
        firebase.initializeApp(this.config);
      }

      this.dbRef = firebase.database();
      this.isCloudEnabled = true;
      this.notifyStatus(true);
      this.startRealtimeListeners();
      return true;
    } catch (err) {
      console.error('Firebase initialization error:', err);
      this.isCloudEnabled = false;
      this.notifyStatus(false, err.message);
      return false;
    }
  }

  startRealtimeListeners() {
    if (!this.isCloudEnabled || !this.dbRef) return;

    // 1. Listen to Games (Keyed by unique ID)
    this.dbRef.ref('falasteny_games').on('value', snapshot => {
      const data = snapshot.val();
      const games = data ? (Array.isArray(data) ? data.filter(Boolean) : Object.values(data)) : [];
      localStorage.setItem('falasteny_sys_games_v1', JSON.stringify(games));
      if (window.app && typeof window.app.renderAll === 'function') {
        window.app.renderAll();
      }
    });

    // 2. Listen to Accounts (Keyed by unique ID)
    this.dbRef.ref('falasteny_accounts').on('value', snapshot => {
      const data = snapshot.val();
      const accounts = data ? (Array.isArray(data) ? data.filter(Boolean) : Object.values(data)) : [];
      localStorage.setItem('falasteny_sys_accounts_v1', JSON.stringify(accounts));
      if (window.app && typeof window.app.renderAll === 'function') {
        window.app.renderAll();
      }
    });

    // 3. Listen to History (Keyed by unique ID)
    this.dbRef.ref('falasteny_history').on('value', snapshot => {
      const data = snapshot.val();
      const history = data ? (Array.isArray(data) ? data.filter(Boolean) : Object.values(data)) : [];
      localStorage.setItem('falasteny_sys_history_v1', JSON.stringify(history));
      if (window.app && typeof window.app.renderAll === 'function') {
        window.app.renderAll();
      }
    });

    // 4. Listen to Auth
    this.dbRef.ref('falasteny_auth').on('value', snapshot => {
      const data = snapshot.val();
      if (data && data.username && data.password) {
        localStorage.setItem('falasteny_sys_auth_v1', JSON.stringify(data));
      }
    });
  }

  // Push full lists as ID-indexed objects to avoid array sparse index ghost keys
  pushGames(games) {
    if (this.isCloudEnabled && this.dbRef) {
      const obj = {};
      if (Array.isArray(games)) {
        games.forEach(g => { if (g && g.id) obj[g.id] = g; });
      }
      this.dbRef.ref('falasteny_games').set(obj);
    }
  }

  pushAccounts(accounts) {
    if (this.isCloudEnabled && this.dbRef) {
      const obj = {};
      if (Array.isArray(accounts)) {
        accounts.forEach(a => { if (a && a.id) obj[a.id] = a; });
      }
      this.dbRef.ref('falasteny_accounts').set(obj);
    }
  }

  pushHistory(history) {
    if (this.isCloudEnabled && this.dbRef) {
      const obj = {};
      if (Array.isArray(history)) {
        history.forEach(h => { if (h && h.id) obj[h.id] = h; });
      }
      this.dbRef.ref('falasteny_history').set(obj);
    }
  }

  pushAuth(auth) {
    if (this.isCloudEnabled && this.dbRef) {
      this.dbRef.ref('falasteny_auth').set(auth);
    }
  }

  // Direct specific item delete helpers
  removeAccount(accountId) {
    if (this.isCloudEnabled && this.dbRef) {
      this.dbRef.ref(`falasteny_accounts/${accountId}`).remove();
    }
  }

  removeGame(gameId) {
    if (this.isCloudEnabled && this.dbRef) {
      this.dbRef.ref(`falasteny_games/${gameId}`).remove();
    }
  }

  removeOrder(orderId) {
    if (this.isCloudEnabled && this.dbRef) {
      this.dbRef.ref(`falasteny_history/${orderId}`).remove();
    }
  }

  async uploadAllLocalToCloud() {
    if (!this.isCloudEnabled || !this.dbRef) return false;
    try {
      const games = JSON.parse(localStorage.getItem('falasteny_sys_games_v1')) || [];
      const accounts = JSON.parse(localStorage.getItem('falasteny_sys_accounts_v1')) || [];
      const history = JSON.parse(localStorage.getItem('falasteny_sys_history_v1')) || [];
      const auth = JSON.parse(localStorage.getItem('falasteny_sys_auth_v1')) || { username: 'admin', password: '123' };

      this.pushGames(games);
      this.pushAccounts(accounts);
      this.pushHistory(history);
      this.pushAuth(auth);
      return true;
    } catch (err) {
      console.error('Error uploading to cloud:', err);
      return false;
    }
  }

  onStatusChange(callback) {
    this.statusListeners.push(callback);
    callback(this.isCloudEnabled);
  }

  notifyStatus(status, error = null) {
    this.statusListeners.forEach(cb => cb(status, error));
  }
}

window.cloudSync = new CloudSyncManager();
