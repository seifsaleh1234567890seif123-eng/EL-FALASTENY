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

    // 1. Listen to Games
    this.dbRef.ref('falasteny_games').on('value', snapshot => {
      const data = snapshot.val();
      if (data !== null && data !== undefined) {
        const games = Array.isArray(data) ? data : Object.values(data);
        localStorage.setItem('falasteny_sys_games_v1', JSON.stringify(games));
        if (window.app && typeof window.app.renderAll === 'function') {
          window.app.renderAll();
        }
      }
    });

    // 2. Listen to Accounts
    this.dbRef.ref('falasteny_accounts').on('value', snapshot => {
      const data = snapshot.val();
      if (data !== null && data !== undefined) {
        const accounts = Array.isArray(data) ? data : Object.values(data);
        localStorage.setItem('falasteny_sys_accounts_v1', JSON.stringify(accounts));
        if (window.app && typeof window.app.renderAll === 'function') {
          window.app.renderAll();
        }
      }
    });

    // 3. Listen to History
    this.dbRef.ref('falasteny_history').on('value', snapshot => {
      const data = snapshot.val();
      if (data !== null && data !== undefined) {
        const history = Array.isArray(data) ? data : Object.values(data);
        localStorage.setItem('falasteny_sys_history_v1', JSON.stringify(history));
        if (window.app && typeof window.app.renderAll === 'function') {
          window.app.renderAll();
        }
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

  // Push local changes to cloud
  pushGames(games) {
    if (this.isCloudEnabled && this.dbRef) {
      this.dbRef.ref('falasteny_games').set(games);
    }
  }

  pushAccounts(accounts) {
    if (this.isCloudEnabled && this.dbRef) {
      this.dbRef.ref('falasteny_accounts').set(accounts);
    }
  }

  pushHistory(history) {
    if (this.isCloudEnabled && this.dbRef) {
      this.dbRef.ref('falasteny_history').set(history);
    }
  }

  pushAuth(auth) {
    if (this.isCloudEnabled && this.dbRef) {
      this.dbRef.ref('falasteny_auth').set(auth);
    }
  }

  async uploadAllLocalToCloud() {
    if (!this.isCloudEnabled || !this.dbRef) return false;
    try {
      const games = JSON.parse(localStorage.getItem('falasteny_sys_games_v1')) || [];
      const accounts = JSON.parse(localStorage.getItem('falasteny_sys_accounts_v1')) || [];
      const history = JSON.parse(localStorage.getItem('falasteny_sys_history_v1')) || [];
      const auth = JSON.parse(localStorage.getItem('falasteny_sys_auth_v1')) || { username: 'admin', password: '123' };

      await this.dbRef.ref('falasteny_games').set(games);
      await this.dbRef.ref('falasteny_accounts').set(accounts);
      await this.dbRef.ref('falasteny_history').set(history);
      await this.dbRef.ref('falasteny_auth').set(auth);
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
