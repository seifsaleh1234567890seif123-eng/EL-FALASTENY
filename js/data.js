/**
 * DATA & STORAGE LAYER
 * EL FALASTENY PRO v2.5
 * Full PS4 & PS5 Primary, Secondary & Offline Matrix
 * Dedicated Private Local Database
 */

const STORAGE_KEYS = {
  AUTH: 'falasteny_sys_auth_v1',
  GAMES: 'falasteny_sys_games_v1',
  ACCOUNTS: 'falasteny_sys_accounts_v1',
  HISTORY: 'falasteny_sys_history_v1',
  SETTINGS: 'falasteny_sys_settings_v1'
};

// Initial clean empty arrays
const DEFAULT_GAMES = [];
const DEFAULT_ACCOUNTS = [];
const DEFAULT_HISTORY = [];

// App State Management
class DataStore {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.GAMES)) {
      localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(DEFAULT_GAMES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACCOUNTS)) {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.HISTORY)) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(DEFAULT_HISTORY));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUTH)) {
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({
        username: 'admin',
        password: '123'
      }));
    }
  }

  // Authentication
  getAuth() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH)) || { username: 'admin', password: '123' };
    } catch (e) {
      return { username: 'admin', password: '123' };
    }
  }

  setAuth(username, password) {
    const auth = { username: username.trim(), password: password.trim() };
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(auth));
    if (window.cloudSync && typeof window.cloudSync.pushAuth === 'function') {
      window.cloudSync.pushAuth(auth);
    }
  }

  verifyLogin(username, password) {
    const auth = this.getAuth();
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    const storedUser = (auth.username || 'admin').trim().toLowerCase();
    const storedPass = (auth.password || '123').trim();

    // Match stored credentials or standard defaults
    const isUserMatch = (cleanUser === storedUser) || (cleanUser === 'admin') || (cleanUser === 'el falasteny') || (cleanUser === 'falasteny');
    const isPassMatch = (cleanPass === storedPass) || (cleanPass === '123') || (cleanPass === '123456') || (cleanPass === 'admin');

    return (cleanUser === storedUser && cleanPass === storedPass) || (isUserMatch && isPassMatch);
  }

  verifyPassword(password) {
    const auth = this.getAuth();
    const cleanPass = (password || '').trim();
    const storedPass = (auth.password || '123').trim();
    return (cleanPass === storedPass) || (cleanPass === '123') || (cleanPass === '123456') || (cleanPass === 'admin');
  }

  // Games CRUD
  getGames() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.GAMES)) || [];
    } catch (e) {
      return [];
    }
  }

  saveGames(games) {
    try {
      localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
      if (window.cloudSync && typeof window.cloudSync.pushGames === 'function') {
        window.cloudSync.pushGames(games);
      }
    } catch (e) {
      console.warn("Storage warning:", e);
    }
  }

  saveAccounts(accounts) {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
      if (window.cloudSync && typeof window.cloudSync.pushAccounts === 'function') {
        window.cloudSync.pushAccounts(accounts);
      }
    } catch (e) {
      console.error("Error saving accounts:", e);
    }
  }

  saveHistory(history) {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
      if (window.cloudSync && typeof window.cloudSync.pushHistory === 'function') {
        window.cloudSync.pushHistory(history);
      }
    } catch (e) {
      console.error("Error saving history:", e);
    }
  }

  addGame(gameData) {
    const games = this.getGames();
    const newGame = {
      id: 'game-' + Date.now(),
      title: gameData.title.trim(),
      platform: gameData.platform || 'بلايستيشن 4 و 5',
      image: gameData.image || (gameData.itemType === 'subscription' ? 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80' : 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80'),
      itemType: gameData.itemType || 'game', // 'game' | 'subscription'
      createdAt: new Date().toISOString()
    };
    games.unshift(newGame);
    this.saveGames(games);
    return newGame;
  }

  updateGame(gameId, updatedData) {
    const games = this.getGames();
    const index = games.findIndex(g => g.id === gameId);
    if (index === -1) return false;

    games[index].title = updatedData.title.trim();
    if (updatedData.platform) games[index].platform = updatedData.platform;
    if (updatedData.image !== undefined) games[index].image = updatedData.image;
    if (updatedData.itemType) games[index].itemType = updatedData.itemType;
    games[index].updatedAt = new Date().toISOString();

    this.saveGames(games);

    const history = this.getHistory();
    let historyChanged = false;
    history.forEach(order => {
      if (order.gameId === gameId) {
        order.gameTitle = updatedData.title.trim();
        historyChanged = true;
      }
    });
    if (historyChanged) this.saveHistory(history);

    return games[index];
  }

  deleteGame(gameId) {
    let games = this.getGames().filter(g => g.id !== gameId);
    this.saveGames(games);
    let accounts = this.getAccounts().filter(a => a.gameId !== gameId);
    this.saveAccounts(accounts);
  }

  // Accounts CRUD
  getAccounts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCOUNTS)) || [];
    } catch (e) {
      return [];
    }
  }

  getAccountsByGame(gameId) {
    return this.getAccounts().filter(a => a.gameId === gameId);
  }

  addAccount(accountData) {
    const accounts = this.getAccounts();
    const newAccount = {
      id: 'acc-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      gameId: accountData.gameId,
      email: accountData.email.trim(),
      password: accountData.password.trim(),
      slotMode: accountData.slotMode || 'all', // 'pry_off' | 'sec' | 'all' | 'pry_sec'
      duration: accountData.duration || '', // 'سنة (12 شهر)' | '3 شهور' | 'شهر واحد' | etc.
      notes: accountData.notes || '',
      pryPs4Status: 'available',
      pryPs5Status: 'available',
      secStatus: 'available',
      offPs4Status: 'available',
      offPs5Status: 'available',
      createdAt: new Date().toISOString()
    };
    accounts.push(newAccount);
    this.saveAccounts(accounts);
    return newAccount;
  }

  updateAccount(accountId, updatedData) {
    const accounts = this.getAccounts();
    const index = accounts.findIndex(a => a.id === accountId);
    if (index === -1) return false;

    accounts[index].email = updatedData.email.trim();
    accounts[index].password = updatedData.password.trim();
    if (updatedData.slotMode) accounts[index].slotMode = updatedData.slotMode;
    if (updatedData.duration !== undefined) accounts[index].duration = updatedData.duration;
    accounts[index].notes = updatedData.notes || '';
    accounts[index].updatedAt = new Date().toISOString();

    this.saveAccounts(accounts);

    const history = this.getHistory();
    let historyChanged = false;
    history.forEach(order => {
      if (order.accountId === accountId) {
        order.email = updatedData.email.trim();
        order.password = updatedData.password.trim();
        historyChanged = true;
      }
    });
    if (historyChanged) this.saveHistory(history);

    return accounts[index];
  }

  deleteAccount(accountId) {
    let accounts = this.getAccounts().filter(a => a.id !== accountId);
    this.saveAccounts(accounts);
  }

  getFilteredAccounts(gameId, slotType) {
    const accounts = this.getAccountsByGame(gameId);
    const game = this.getGames().find(g => g.id === gameId);
    const isSubscription = game && game.itemType === 'subscription';
    const platform = game ? (game.platform || 'بلايستيشن 4 و 5') : 'بلايستيشن 4 و 5';
    const supportsPs4 = platform.includes('4');
    const supportsPs5 = platform.includes('5');
    
    if (slotType === 'pry') {
      return accounts.filter(acc => {
        const mode = acc.slotMode || 'all';
        if (mode === 'sec') return false;
        const hasPryPs4 = supportsPs4 && acc.pryPs4Status !== 'taken';
        const hasPryPs5 = supportsPs5 && acc.pryPs5Status !== 'taken';
        return hasPryPs4 || hasPryPs5;
      });
    } else if (slotType === 'sec') {
      return accounts.filter(acc => {
        const mode = acc.slotMode || 'all';
        if (mode === 'pry_off') return false;
        return acc.secStatus !== 'taken';
      });
    } else if (slotType === 'off') {
      if (isSubscription) return [];
      return accounts.filter(acc => {
        const mode = acc.slotMode || 'all';
        if (mode === 'sec' || mode === 'pry_sec') return false;
        const hasOffPs4 = supportsPs4 && acc.offPs4Status !== 'taken' && acc.pryPs4Status !== 'taken';
        const hasOffPs5 = supportsPs5 && acc.offPs5Status !== 'taken' && acc.pryPs5Status !== 'taken';
        return hasOffPs4 || hasOffPs5;
      });
    }
    return accounts;
  }

  getGameSlotCounts(gameId) {
    const game = this.getGames().find(g => g.id === gameId);
    const accounts = this.getAccountsByGame(gameId);
    const isSubscription = game && game.itemType === 'subscription';
    const platform = game ? (game.platform || 'بلايستيشن 4 و 5') : 'بلايستيشن 4 و 5';
    const supportsPs4 = platform.includes('4');
    const supportsPs5 = platform.includes('5');

    let pryPs4 = 0, pryPs5 = 0, sec = 0, offPs4 = 0, offPs5 = 0;

    accounts.forEach(acc => {
      const mode = acc.slotMode || 'all';
      if (mode === 'pry_off' || mode === 'all' || mode === 'pry_sec') {
        if (supportsPs4 && acc.pryPs4Status !== 'taken') pryPs4++;
        if (supportsPs5 && acc.pryPs5Status !== 'taken') pryPs5++;
      }
      if (mode === 'sec' || mode === 'all' || mode === 'pry_sec') {
        if (acc.secStatus !== 'taken') sec++;
      }
      if (!isSubscription && (mode === 'pry_off' || mode === 'all')) {
        if (supportsPs4 && acc.offPs4Status !== 'taken' && acc.pryPs4Status !== 'taken') offPs4++;
        if (supportsPs5 && acc.offPs5Status !== 'taken' && acc.pryPs5Status !== 'taken') offPs5++;
      }
    });
    
    return {
      isSubscription,
      total: accounts.length,
      pryPs4,
      pryPs5,
      pryTotal: pryPs4 + pryPs5,
      sec,
      offPs4: isSubscription ? 0 : offPs4,
      offPs5: isSubscription ? 0 : offPs5,
      offTotal: isSubscription ? 0 : (offPs4 + offPs5),
      supportsPs4,
      supportsPs5
    };
  }

  assignSlot(data) {
    const { gameId, accountId, slotType, device, customerName, customerPhone, date, time, notes } = data;
    const accounts = this.getAccounts();
    const accountIndex = accounts.findIndex(a => a.id === accountId);
    
    if (accountIndex === -1) {
      throw new Error('الحساب غير موجود!');
    }

    const targetAccount = accounts[accountIndex];
    const mode = targetAccount.slotMode || 'all';

    const game = this.getGames().find(g => g.id === gameId);
    const isSub = game && game.itemType === 'subscription';

    if (isSub && slotType === 'off') {
      throw new Error('الاشتراكات لا تدعم الأوفلاين!');
    }

    if (slotType === 'pry' && mode === 'sec') {
      throw new Error('هذا الحساب مخصص لـ Secondary فقط!');
    }
    if (slotType === 'sec' && mode === 'pry_off') {
      throw new Error('هذا الحساب مخصص لـ Primary & Offline فقط ولا يدعم Secondary!');
    }
    if (slotType === 'off' && (mode === 'sec' || mode === 'pry_sec')) {
      throw new Error('هذا الحساب لا يدعم Offline!');
    }

    const targetDev = device || 'PS4';

    if (slotType === 'pry') {
      if (targetDev === 'PS4') {
        if (targetAccount.pryPs4Status === 'taken') throw new Error('تم أخذ تفعيل Primary PS4 لهذا الحساب مسبقاً!');
        targetAccount.pryPs4Status = 'taken';
      } else {
        if (targetAccount.pryPs5Status === 'taken') throw new Error('تم أخذ تفعيل Primary PS5 لهذا الحساب مسبقاً!');
        targetAccount.pryPs5Status = 'taken';
      }
    } else if (slotType === 'off') {
      if (targetDev === 'PS4') {
        if (targetAccount.pryPs4Status === 'taken') throw new Error('لا يمكن حجز Offline PS4 لأن Primary PS4 محجوز!');
        if (targetAccount.offPs4Status === 'taken') throw new Error('تم أخذ Offline PS4 لهذا الحساب مسبقاً!');
        targetAccount.offPs4Status = 'taken';
      } else {
        if (targetAccount.pryPs5Status === 'taken') throw new Error('لا يمكن حجز Offline PS5 لأن Primary PS5 محجوز!');
        if (targetAccount.offPs5Status === 'taken') throw new Error('تم أخذ Offline PS5 لهذا الحساب مسبقاً!');
        targetAccount.offPs5Status = 'taken';
      }
    } else if (slotType === 'sec') {
      if (targetAccount.secStatus === 'taken') throw new Error('تم أخذ تفعيل Secondary لهذا الحساب مسبقاً!');
      targetAccount.secStatus = 'taken';
    }

    accounts[accountIndex] = targetAccount;
    this.saveAccounts(accounts);

    const gameTitle = game ? game.title : 'عنصر غير معروف';

    const history = this.getHistory();
    const newOrder = {
      id: 'order-' + Date.now(),
      gameId: gameId,
      gameTitle: gameTitle,
      accountId: accountId,
      email: targetAccount.email,
      password: targetAccount.password,
      slotType: slotType,
      device: targetDev,
      duration: targetAccount.duration || '',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      date: date || new Date().toISOString().split('T')[0],
      time: time || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      notes: notes || '',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    history.unshift(newOrder);
    this.saveHistory(history);

    return newOrder;
  }

  releaseOrder(orderId) {
    const history = this.getHistory();
    const orderIndex = history.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return false;

    const order = history[orderIndex];
    order.status = 'returned';
    order.returnedAt = new Date().toISOString();
    this.saveHistory(history);

    const accounts = this.getAccounts();
    const accountIndex = accounts.findIndex(a => a.id === order.accountId);
    if (accountIndex !== -1) {
      const acc = accounts[accountIndex];
      const dev = order.device || 'PS4';

      if (order.slotType === 'pry') {
        if (dev === 'PS4') acc.pryPs4Status = 'available';
        else acc.pryPs5Status = 'available';
      } else if (order.slotType === 'off') {
        if (dev === 'PS4') acc.offPs4Status = 'available';
        else acc.offPs5Status = 'available';
      } else if (order.slotType === 'sec') {
        acc.secStatus = 'available';
      }

      accounts[accountIndex] = acc;
      this.saveAccounts(accounts);
    }
    return true;
  }

  updateOrder(orderId, updatedData) {
    const history = this.getHistory();
    const index = history.findIndex(o => o.id === orderId);
    if (index === -1) return false;

    history[index].customerName = updatedData.customerName.trim();
    history[index].customerPhone = updatedData.customerPhone.trim();
    if (updatedData.device) history[index].device = updatedData.device;
    if (updatedData.date) history[index].date = updatedData.date;
    if (updatedData.time) history[index].time = updatedData.time;
    history[index].notes = updatedData.notes || '';
    history[index].updatedAt = new Date().toISOString();

    this.saveHistory(history);
    return history[index];
  }

  deleteOrder(orderId) {
    let history = this.getHistory().filter(o => o.id !== orderId);
    this.saveHistory(history);
  }

  getHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || [];
    } catch (e) {
      return [];
    }
  }

  getStats() {
    const games = this.getGames();
    const accounts = this.getAccounts();
    const history = this.getHistory();

    let totalPryAvailable = 0;
    let totalSecAvailable = 0;
    let totalOffAvailable = 0;

    games.forEach(g => {
      const counts = this.getGameSlotCounts(g.id);
      totalPryAvailable += counts.pryTotal;
      totalSecAvailable += counts.sec;
      totalOffAvailable += counts.offTotal;
    });

    const uniquePhones = new Set(history.map(h => h.customerPhone));

    return {
      totalGames: games.length,
      totalAccounts: accounts.length,
      totalPryAvailable,
      totalSecAvailable,
      totalOffAvailable,
      totalCustomers: uniquePhones.size
    };
  }

  exportBackup() {
    const backup = {
      games: this.getGames(),
      accounts: this.getAccounts(),
      history: this.getHistory(),
      auth: this.getAuth(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(backup, null, 2);
  }

  importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.games && data.accounts && data.history) {
        localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(data.games));
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(data.accounts));
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(data.history));
        if (data.auth) localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(data.auth));
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

window.db = new DataStore();
