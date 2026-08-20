/**
 * MAIN CONTROLLER & APPLICATION LOGIC
 * EL FALASTENY PRO v2.5
 * Full PS4 / PS5 Primary & Offline Management + Unlimited Storage Optimizer
 */

class AppController {
  constructor() {
    this.currentTab = 'games';
    this.currentSlotGameId = null;
    this.currentSlotType = null;
    this.lastOrderReceipt = null;

    // Slot filter for games grid ('all' | 'pry' | 'sec' | 'off')
    this.currentGameSlotFilter = 'all';

    // Action password callback
    this.pendingPasswordCallback = null;

    // Image upload states
    this.uploadedGameImageBase64 = null;
    this.uploadedEditGameImageBase64 = null;

    this.init();
  }

  async init() {
    this.checkSession();
    this.setupEventListeners();
    await this.optimizeExistingImages();
    this.initCloudSyncUI();
    this.renderAll();
  }

  // ================= STORAGE / IMAGE OPTIMIZER (UNLIMITED CAPACITY) =================
  // Compress images to lightweight (~20KB) so the user can add hundreds of games without hitting browser quota
  compressImageFile(file, maxWidth = 380, maxHeight = 520, quality = 0.78) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  // Auto-compress existing oversized images on startup
  async optimizeExistingImages() {
    try {
      const games = window.db.getGames();
      let changed = false;
      for (let g of games) {
        if (g.image && g.image.startsWith('data:image') && g.image.length > 90000) {
          const compressed = await this.compressDataUrl(g.image);
          if (compressed && compressed.length < g.image.length) {
            g.image = compressed;
            changed = true;
          }
        }
      }
      if (changed) {
        window.db.saveGames(games);
      }
    } catch (err) {
      console.warn("Image optimization notice:", err);
    }
  }

  compressDataUrl(dataUrl, maxWidth = 380, maxHeight = 520, quality = 0.78) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  // ================= AUTHENTICATION =================
  checkSession() {
    const isLogged = sessionStorage.getItem('is_logged_in');
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');
    const currentUsernameDisplay = document.getElementById('currentUsernameDisplay');

    if (isLogged === 'true') {
      loginScreen.classList.add('hidden');
      mainApp.classList.remove('hidden');
      const auth = window.db.getAuth();
      if (currentUsernameDisplay) currentUsernameDisplay.innerText = auth.username;
    } else {
      loginScreen.classList.remove('hidden');
      mainApp.classList.add('hidden');
    }
  }

  setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('loginUsername').value;
        const pass = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');

        if (window.db.verifyLogin(user, pass)) {
          sessionStorage.setItem('is_logged_in', 'true');
          errorDiv.classList.add('hidden');
          this.checkSession();
          this.showToast('تم تسجيل الدخول بنجاح! مرحباً بك في EL FALASTENY 🚀', 'success');
          this.renderAll();
        } else {
          errorDiv.classList.remove('hidden');
          this.showToast('اسم المستخدم أو كلمة المرور غير صحيحة!', 'error');
        }
      });
    }

    const assignDateInput = document.getElementById('assignDate');
    const assignTimeInput = document.getElementById('assignTime');
    if (assignDateInput) assignDateInput.value = new Date().toISOString().split('T')[0];
    if (assignTimeInput) assignTimeInput.value = new Date().toTimeString().slice(0, 5);

    // Debounced search for super smooth 120 FPS typing on mobile phones
    const searchGames = document.getElementById('searchGamesInput');
    if (searchGames) {
      searchGames.addEventListener('input', this.debounce(() => this.renderGames(), 120));
    }

    const searchHistory = document.getElementById('searchHistoryInput');
    if (searchHistory) {
      searchHistory.addEventListener('input', this.debounce(() => this.renderHistory(), 120));
    }
  }

  debounce(func, wait = 120) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  logout() {
    sessionStorage.removeItem('is_logged_in');
    this.checkSession();
    this.showToast('تم تسجيل الخروج بنجاح', 'info');
  }

  handleUpdateAuth(e) {
    e.preventDefault();
    const currentPass = document.getElementById('currentAuthPassword').value;
    const newUser = document.getElementById('newAuthUsername').value;
    const newPass = document.getElementById('newAuthPassword').value;

    if (!currentPass || !newUser.trim() || !newPass.trim()) {
      this.showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    if (!window.db.verifyPassword(currentPass)) {
      this.showToast('كلمة المرور الحالية غير صحيحة! لا يمكن التعديل.', 'error');
      return;
    }

    window.db.setAuth(newUser, newPass);
    this.showToast('تم تحديث اسم المستخدم وكلمة المرور بنجاح! 🔒', 'success');
    document.getElementById('currentUsernameDisplay').innerText = newUser;
    e.target.reset();
  }

  // ================= EGYPTIAN PHONE VALIDATOR =================
  validateEgyptianPhone(phone) {
    const clean = phone.trim();
    if (clean.startsWith('01')) {
      if (!/^01[0-9]{9}$/.test(clean)) {
        return 'رقم الهاتف المصري الذي يبدأ بـ 01 يجب أن يتكون من 11 رقماً بالضبط (مثال: 01012345678)';
      }
    }
    return null;
  }

  // ================= PASSWORD CONFIRMATION MODAL HELPER =================
  promptActionPassword(title, desc, onAuthorizedCallback) {
    this.pendingPasswordCallback = onAuthorizedCallback;
    document.getElementById('actionPasswordTitle').innerHTML = `
      <i data-lucide="lock" class="w-4 h-4 text-cyan-400"></i>
      <span>${title}</span>
    `;
    document.getElementById('actionPasswordDesc').innerText = desc || "يرجى كتابة كلمة مرور تسجيل الدخول لتأكيد هذا الإجراء:";
    document.getElementById('actionPasswordInput').value = '';
    document.getElementById('actionPasswordModal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
    setTimeout(() => {
      document.getElementById('actionPasswordInput').focus();
    }, 100);
  }

  handleVerifyActionPassword(e) {
    e.preventDefault();
    const pass = document.getElementById('actionPasswordInput').value;

    if (!window.db.verifyPassword(pass)) {
      this.showToast('كلمة المرور غير صحيحة! تم إلغاء العملية.', 'error');
      return;
    }

    this.closeModals();
    if (typeof this.pendingPasswordCallback === 'function') {
      const cb = this.pendingPasswordCallback;
      this.pendingPasswordCallback = null;
      cb();
    }
  }

  // ================= TABS NAVIGATION =================
  switchTab(tabName) {
    this.currentTab = tabName;

    document.getElementById('tabGames').classList.toggle('hidden', tabName !== 'games');
    document.getElementById('tabHistory').classList.toggle('hidden', tabName !== 'history');
    document.getElementById('tabSettings').classList.toggle('hidden', tabName !== 'settings');

    // Desktop Tab Buttons
    const navGamesBtn = document.getElementById('navGamesBtn');
    const navHistoryBtn = document.getElementById('navHistoryBtn');
    const navSettingsBtn = document.getElementById('navSettingsBtn');

    [navGamesBtn, navHistoryBtn, navSettingsBtn].forEach(btn => {
      if (btn) btn.className = "nav-tab px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 text-slate-300 hover:text-white hover:bg-white/5 transition";
    });

    // Mobile Bottom Nav Buttons
    const mobGames = document.getElementById('mobileNavGames');
    const mobHistory = document.getElementById('mobileNavHistory');
    const mobSettings = document.getElementById('mobileNavSettings');

    [mobGames, mobHistory, mobSettings].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });

    if (tabName === 'games') {
      if (navGamesBtn) navGamesBtn.className = "nav-tab active px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-black shadow-md";
      if (mobGames) mobGames.classList.add('active');
      this.renderGames();
    } else if (tabName === 'history') {
      if (navHistoryBtn) navHistoryBtn.className = "nav-tab active px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-black shadow-md";
      if (mobHistory) mobHistory.classList.add('active');
      this.renderHistory();
    } else if (tabName === 'settings') {
      if (navSettingsBtn) navSettingsBtn.className = "nav-tab active px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-black shadow-md";
      if (mobSettings) mobSettings.classList.add('active');
    }

    this.renderStats();
    if (window.lucide) lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ================= STATS & GAMES SLOT FILTERING =================
  setGameSlotFilter(slotType) {
    this.currentGameSlotFilter = slotType;
    if (this.currentTab !== 'games') {
      this.switchTab('games');
    } else {
      this.renderStats();
      this.renderGames();
    }
  }

  renderStats() {
    const stats = window.db.getStats();
    document.getElementById('statTotalGames').innerText = stats.totalGames;
    const elTotalAccounts = document.getElementById('statTotalAccounts');
    if (elTotalAccounts) elTotalAccounts.innerText = stats.totalAccounts;
    document.getElementById('statPryAvailable').innerText = stats.totalPryAvailable;
    document.getElementById('statSecAvailable').innerText = stats.totalSecAvailable;
    document.getElementById('statOffAvailable').innerText = stats.totalOffAvailable;

    const cardAll = document.getElementById('statCardAll');
    const cardPry = document.getElementById('statCardPry');
    const cardSec = document.getElementById('statCardSec');
    const cardOff = document.getElementById('statCardOff');

    [cardAll, cardPry, cardSec, cardOff].forEach(c => {
      if (c) c.classList.remove('ring-2', 'ring-cyan-400', 'ring-emerald-400', 'ring-blue-400', 'ring-amber-400');
    });

    if (this.currentGameSlotFilter === 'pry' && cardPry) {
      cardPry.classList.add('ring-2', 'ring-emerald-400');
    } else if (this.currentGameSlotFilter === 'sec' && cardSec) {
      cardSec.classList.add('ring-2', 'ring-blue-400');
    } else if (this.currentGameSlotFilter === 'off' && cardOff) {
      cardOff.classList.add('ring-2', 'ring-amber-400');
    } else if (cardAll) {
      cardAll.classList.add('ring-2', 'ring-cyan-400');
    }
  }

  // ================= RENDER GAMES =================
  renderGames() {
    const container = document.getElementById('gamesGrid');
    const filterBanner = document.getElementById('activeSlotFilterBanner');
    const filterText = document.getElementById('activeSlotFilterText');
    const query = (document.getElementById('searchGamesInput')?.value || '').toLowerCase().trim();
    let games = window.db.getGames();

    if (query) {
      games = games.filter(g => g.title.toLowerCase().includes(query) || (g.platform && g.platform.toLowerCase().includes(query)));
    }

    if (this.currentGameSlotFilter === 'pry') {
      games = games.filter(g => window.db.getGameSlotCounts(g.id).pryTotal > 0);
      if (filterBanner && filterText) {
        filterBanner.className = "glass-panel p-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 flex items-center justify-between gap-3";
        filterText.innerHTML = `
          <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i>
          <span class="text-slate-200">عرض الألعاب المتاح بها تفعيل:</span>
          <span class="badge-pry px-2.5 py-0.5 rounded-full text-xs font-black">Primary (Pry)</span>
          <span class="text-slate-400 text-xs">(${games.length} لعبة)</span>
        `;
        filterBanner.classList.remove('hidden');
      }
    } else if (this.currentGameSlotFilter === 'sec') {
      games = games.filter(g => window.db.getGameSlotCounts(g.id).sec > 0);
      if (filterBanner && filterText) {
        filterBanner.className = "glass-panel p-3.5 rounded-2xl border border-blue-500/40 bg-blue-950/20 flex items-center justify-between gap-3";
        filterText.innerHTML = `
          <i data-lucide="users" class="w-4 h-4 text-blue-400"></i>
          <span class="text-slate-200">عرض الألعاب المتاح بها حسابات:</span>
          <span class="badge-sec px-2.5 py-0.5 rounded-full text-xs font-black">Secondary (Sec)</span>
          <span class="text-slate-400 text-xs">(${games.length} لعبة)</span>
        `;
        filterBanner.classList.remove('hidden');
      }
    } else if (this.currentGameSlotFilter === 'off') {
      games = games.filter(g => window.db.getGameSlotCounts(g.id).offTotal > 0);
      if (filterBanner && filterText) {
        filterBanner.className = "glass-panel p-3.5 rounded-2xl border border-amber-500/40 bg-amber-950/20 flex items-center justify-between gap-3";
        filterText.innerHTML = `
          <i data-lucide="wifi-off" class="w-4 h-4 text-amber-400"></i>
          <span class="text-slate-200">عرض الألعاب المتاح بها تفعيل:</span>
          <span class="badge-off px-2.5 py-0.5 rounded-full text-xs font-black">Offline (Off)</span>
          <span class="text-slate-400 text-xs">(${games.length} لعبة)</span>
        `;
        filterBanner.classList.remove('hidden');
      }
    } else {
      if (filterBanner) filterBanner.classList.add('hidden');
    }

    if (games.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center glass-panel rounded-3xl">
          <i data-lucide="gamepad-2" class="w-12 h-12 text-slate-500 mx-auto mb-3"></i>
          <h3 class="text-base font-bold text-slate-300">لا توجد ألعاب مطابقة</h3>
          <p class="text-xs text-slate-500 mt-1">
            ${this.currentGameSlotFilter !== 'all' ? 'لا توجد ألعاب متوفر بها هذه الفئة حالياً. اضغط على "عرض الكل" بالأعلى.' : 'اضغط على زر "إضافة لعبة جديدة" لبدء إضافة أي عدد من الألعاب.'}
          </p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = games.map(game => {
      const counts = window.db.getGameSlotCounts(game.id);

      let prySubtitle = '';
      if (counts.supportsPs4 && counts.supportsPs5) {
        prySubtitle = `PS4: <b class="text-emerald-300">${counts.pryPs4}</b> | PS5: <b class="text-emerald-300">${counts.pryPs5}</b>`;
      } else if (counts.supportsPs4) {
        prySubtitle = `PS4: <b class="text-emerald-300">${counts.pryPs4}</b>`;
      } else {
        prySubtitle = `PS5: <b class="text-emerald-300">${counts.pryPs5}</b>`;
      }

      let offSubtitle = '';
      if (counts.supportsPs4 && counts.supportsPs5) {
        offSubtitle = `PS4: <b class="text-amber-300">${counts.offPs4}</b> | PS5: <b class="text-amber-300">${counts.offPs5}</b>`;
      } else if (counts.supportsPs4) {
        offSubtitle = `PS4: <b class="text-amber-300">${counts.offPs4}</b>`;
      } else {
        offSubtitle = `PS5: <b class="text-amber-300">${counts.offPs5}</b>`;
      }

      const isSub = game.itemType === 'subscription';

      return `
        <div class="game-card glass-panel rounded-3xl overflow-hidden flex flex-col group ${isSub ? 'border-purple-500/30' : 'border-cyan-500/20'}">
          <!-- Game Header / Poster (Fully Visible & Lazy Loaded) -->
          <div class="relative h-56 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-[#0a0b10] flex items-center justify-center p-2">
            <img src="${game.image}" alt="${game.title}" 
                 loading="lazy" decoding="async"
                 onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=75'"
                 class="max-w-full max-h-full object-contain drop-shadow-2xl group-hover:scale-105 transition duration-300">
            
            <div class="absolute inset-0 bg-gradient-to-t from-[#0a0b10] via-transparent to-black/30 pointer-events-none"></div>

            <div class="absolute top-3 right-3 flex items-center gap-1.5 z-10">
              <span class="${isSub ? 'bg-purple-500/25 border-purple-400/40 text-purple-300' : 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'} border px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow backdrop-blur-md">
                <i data-lucide="${isSub ? 'crown' : 'gamepad-2'}" class="w-3 h-3"></i>
                <span>${isSub ? 'اشتراك' : 'لعبة'}</span>
              </span>
              <span class="bg-black/75 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-300 shadow">
                ${game.platform || 'بلايستيشن 4 و 5'}
              </span>
            </div>

            <!-- Action buttons (Edit & Delete Game) -->
            <div class="absolute top-3 left-3 flex items-center gap-1.5 z-10">
              <button onclick="app.openEditGameModal('${game.id}')" 
                      title="تعديل البيانات والغلاف"
                      class="w-8 h-8 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/30 text-cyan-300 flex items-center justify-center transition">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              </button>

              <button onclick="app.handleDeleteGame('${game.id}', '${game.title}')" 
                      title="حذف (يتطلب كلمة المرور)"
                      class="w-8 h-8 rounded-full bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/30 text-rose-300 flex items-center justify-center transition">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <!-- Game Title -->
            <div class="absolute bottom-2.5 right-3 left-3 z-10">
              <h3 class="text-base font-black text-white leading-tight drop-shadow-md truncate">${game.title}</h3>
            </div>
          </div>

          <!-- Slots Badges & Action Buttons -->
          <div class="p-4 flex-1 flex flex-col justify-between space-y-4">
            
            <div>
              <div class="text-[11px] font-bold text-slate-400 mb-2 flex items-center justify-between">
                <span>الفئات المتاحة للحجز والتفعيل:</span>
                <span class="text-[10px] ${isSub ? 'text-purple-400' : 'text-cyan-400'}">اضغط للعرض</span>
              </div>

              <div class="grid ${isSub ? 'grid-cols-2' : 'grid-cols-3'} gap-2">
                
                <!-- Primary (Pry) Button -->
                <button onclick="app.openSlotModal('${game.id}', 'pry')"
                        class="p-2 rounded-2xl border flex flex-col items-center justify-center transition ${counts.pryTotal > 0 ? 'badge-pry hover:scale-105' : 'bg-slate-900/50 border-white/5 opacity-50 cursor-not-allowed'}">
                  <span class="text-[11px] font-black uppercase">Primary</span>
                  <div class="text-[10px] font-bold mt-0.5 font-mono leading-tight">
                    ${prySubtitle}
                  </div>
                  <span class="text-[9px] mt-0.5 ${counts.pryTotal > 0 ? 'text-emerald-300' : 'text-slate-500'}">
                    ${counts.pryTotal > 0 ? 'متاح للتفعيل' : 'غير متوفر'}
                  </span>
                </button>

                <!-- Secondary (Sec) Button -->
                <button onclick="app.openSlotModal('${game.id}', 'sec')"
                        class="p-2 rounded-2xl border flex flex-col items-center justify-center transition ${counts.sec > 0 ? 'badge-sec hover:scale-105' : 'bg-slate-900/50 border-white/5 opacity-50 cursor-not-allowed'}">
                  <span class="text-[11px] font-black uppercase">Secondary</span>
                  <div class="text-xs font-bold mt-0.5 flex items-center gap-1 font-mono">
                    <span class="text-[10px]">Sec:</span>
                    <span class="text-sm font-black text-blue-300">${counts.sec}</span>
                  </div>
                  <span class="text-[9px] mt-0.5 ${counts.sec > 0 ? 'text-blue-300' : 'text-slate-500'}">
                    ${counts.sec > 0 ? 'متاح الآن' : 'غير متوفر'}
                  </span>
                </button>

                ${!isSub ? `
                <!-- Offline (Off) Button (Games Only) -->
                <button onclick="app.openSlotModal('${game.id}', 'off')"
                        class="p-2 rounded-2xl border flex flex-col items-center justify-center transition ${counts.offTotal > 0 ? 'badge-off hover:scale-105' : 'bg-slate-900/50 border-white/5 opacity-50 cursor-not-allowed'}">
                  <span class="text-[11px] font-black uppercase">Offline</span>
                  <div class="text-[10px] font-bold mt-0.5 font-mono leading-tight">
                    ${offSubtitle}
                  </div>
                  <span class="text-[9px] mt-0.5 ${counts.offTotal > 0 ? 'text-amber-300' : 'text-slate-500'}">
                    ${counts.offTotal > 0 ? 'متاح للأوفلاين' : 'غير متوفر'}
                  </span>
                </button>
                ` : ''}

              </div>
            </div>

            <!-- Card Bottom Actions -->
            <div class="pt-2 border-t border-white/5 flex items-center gap-2">
              <button onclick="app.openAddAccountModal('${game.id}', '${game.title}')"
                      class="flex-1 py-2.5 rounded-xl text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 flex items-center justify-center gap-1.5 transition">
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span>إضافة إيميل</span>
              </button>

              <button onclick="app.openSlotModal('${game.id}', 'all')"
                      class="px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-800 border border-white/10 text-slate-300 flex items-center justify-center gap-1 transition" title="عرض وتعديل كل الحسابات">
                <i data-lucide="list" class="w-4 h-4"></i>
              </button>
            </div>

          </div>
        </div>
      `;
    }).join('');

    if (window.lucide && container) lucide.createIcons({ root: container });
  }

  // ================= SLOT ACCOUNTS MODAL =================
  openSlotModal(gameId, slotType) {
    this.currentSlotGameId = gameId;
    this.currentSlotType = slotType;

    const game = window.db.getGames().find(g => g.id === gameId);
    if (!game) return;

    const modal = document.getElementById('slotAccountsModal');
    const title = document.getElementById('slotModalGameTitle');
    const badge = document.getElementById('slotModalBadge');
    const desc = document.getElementById('slotModalDescription');
    const list = document.getElementById('slotAccountsList');
    const countText = document.getElementById('slotAccountsCountText');

    const platform = game.platform || 'بلايستيشن 4 و 5';
    const supportsPs4 = platform.includes('4');
    const supportsPs5 = platform.includes('5');

    title.innerText = game.title;

    if (slotType === 'pry') {
      badge.className = "badge-pry text-xs font-bold px-3 py-1 rounded-full";
      badge.innerText = "Primary (Pry)";
      desc.innerText = "يعرض الحسابات المتاح تفعيلها Primary (على PS4 أو PS5)";
    } else if (slotType === 'sec') {
      badge.className = "badge-sec text-xs font-bold px-3 py-1 rounded-full";
      badge.innerText = "Secondary (Sec)";
      desc.innerText = "يعرض فقط الإيميلات المتاحة للحجز كـ Secondary";
    } else if (slotType === 'off') {
      badge.className = "badge-off text-xs font-bold px-3 py-1 rounded-full";
      badge.innerText = "Offline (Off)";
      desc.innerText = "يعرض الحسابات المتاحة للأوفلاين (يستثنى منها أي جهاز أُخذ كـ Primary)";
    } else {
      badge.className = "bg-slate-700 text-white text-xs font-bold px-3 py-1 rounded-full";
      badge.innerText = "جميع الحسابات المسجلة";
      desc.innerText = "قائمة بجميع الإيميلات المسجلة مع تفاصيل تفعيل PS4 و PS5 وإمكانية التعديل أو المسح";
    }

    let accounts = (slotType === 'all') ? window.db.getAccountsByGame(gameId) : window.db.getFilteredAccounts(gameId, slotType);

    countText.innerText = `عدد الحسابات في هذه القائمة: ${accounts.length}`;

    if (accounts.length === 0) {
      list.innerHTML = `
        <div class="py-12 text-center bg-slate-900/60 rounded-2xl border border-white/5">
          <i data-lucide="inbox" class="w-10 h-10 text-slate-500 mx-auto mb-2"></i>
          <p class="text-xs font-bold text-slate-400">لا توجد حسابات متاحة حالياً لهذه الفئة!</p>
          <p class="text-[11px] text-slate-500 mt-1">يمكنك إضافة إيميل جديد لهذه اللعبة في أي وقت.</p>
        </div>
      `;
    } else {
      list.innerHTML = accounts.map((acc, index) => {
        const mode = acc.slotMode || 'all';
        const isPryPs4Taken = acc.pryPs4Status === 'taken';
        const isPryPs5Taken = acc.pryPs5Status === 'taken';
        const isSecTaken = acc.secStatus === 'taken';
        const isOffPs4Taken = acc.offPs4Status === 'taken';
        const isOffPs5Taken = acc.offPs5Status === 'taken';

        const isSubscription = game.itemType === 'subscription';

        let modeBadge = '';
        if (mode === 'pry_sec') {
          modeBadge = '<span class="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-bold">Pry + Sec</span>';
        } else if (mode === 'pry_off') {
          modeBadge = '<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">Pry & Off</span>';
        } else if (mode === 'sec') {
          modeBadge = '<span class="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold">Sec فقط</span>';
        } else {
          modeBadge = '<span class="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] font-bold">Pry + Sec + Off</span>';
        }

        let durationBadge = '';
        if (acc.duration || isSubscription) {
          durationBadge = `<span class="bg-purple-500/25 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> <span>${acc.duration || 'سنة (12 شهر)'}</span></span>`;
        }

        const canPryPs4 = supportsPs4 && (mode === 'pry_off' || mode === 'all' || mode === 'pry_sec') && !isPryPs4Taken;
        const canPryPs5 = supportsPs5 && (mode === 'pry_off' || mode === 'all' || mode === 'pry_sec') && !isPryPs5Taken;
        const canSec = (mode === 'sec' || mode === 'all' || mode === 'pry_sec') && !isSecTaken;
        const canOffPs4 = !isSubscription && supportsPs4 && (mode === 'pry_off' || mode === 'all') && !isOffPs4Taken && !isPryPs4Taken;
        const canOffPs5 = !isSubscription && supportsPs5 && (mode === 'pry_off' || mode === 'all') && !isOffPs5Taken && !isPryPs5Taken;

        let remainingSummary = [];
        if (supportsPs4 && mode !== 'sec') {
          if (!isPryPs4Taken) remainingSummary.push('<span class="text-emerald-400 font-bold">PS4 متاح Primary</span>');
          else remainingSummary.push('<span class="text-rose-400 font-bold">PS4 محجوز Primary</span>');
        }
        if (supportsPs5 && mode !== 'sec') {
          if (!isPryPs5Taken) remainingSummary.push('<span class="text-emerald-400 font-bold">PS5 متاح Primary</span>');
          else remainingSummary.push('<span class="text-rose-400 font-bold">PS5 محجوز Primary</span>');
        }
        if (mode !== 'pry_off') {
          if (!isSecTaken) remainingSummary.push('<span class="text-blue-400 font-bold">Sec متاح</span>');
          else remainingSummary.push('<span class="text-slate-500 font-bold">Sec محجوز</span>');
        }

        return `
          <div class="glass-panel p-4 rounded-2xl border border-white/10 space-y-3 relative group">
            
            <!-- Email & Pass Row -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs text-slate-400 font-mono">#${index + 1}</span>
                  <span class="text-sm font-bold text-cyan-300 font-mono tracking-wide select-all" dir="ltr">${acc.email}</span>
                  <button onclick="app.copyToClipboard('${acc.email}', 'تم نسخ الإيميل!')" class="text-slate-400 hover:text-cyan-300 p-1" title="نسخ الإيميل">
                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                  </button>
                  ${modeBadge}
                  ${durationBadge}

                  <!-- EDIT BUTTON (Password Protected) -->
                  <button onclick="app.requestEditAccount('${acc.id}')" class="text-slate-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition" title="تعديل بيانات الحساب">
                    <i data-lucide="edit" class="w-3 h-3 text-amber-400"></i>
                    <span>تعديل</span>
                  </button>

                  <!-- DELETE BUTTON (Password Protected + Confirmation Alert) -->
                  <button onclick="app.requestDeleteAccount('${acc.id}')" class="text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition" title="مسح الإيميل نهائياً">
                    <i data-lucide="trash-2" class="w-3 h-3 text-rose-400"></i>
                    <span>مسح</span>
                  </button>
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-400 font-sans">كلمة السر:</span>
                  <span id="passSpan_${acc.id}" class="text-xs font-bold text-white font-mono bg-slate-950/80 px-2 py-0.5 rounded border border-white/10" dir="ltr">••••••••</span>
                  <button onclick="app.togglePassword('${acc.id}', '${acc.password}')" class="text-slate-400 hover:text-white p-1" title="إظهار/إخفاء">
                    <i id="passIcon_${acc.id}" data-lucide="eye" class="w-3.5 h-3.5"></i>
                  </button>
                  <button onclick="app.copyToClipboard('${acc.password}', 'تم نسخ كلمة المرور!')" class="text-slate-400 hover:text-cyan-300 p-1" title="نسخ الباسورد">
                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>

              <!-- Action Buttons with Granular Console Booking -->
              <div class="flex items-center gap-1.5 flex-wrap">
                ${slotType === 'pry' ? `
                  ${canPryPs4 ? `<button onclick="app.openAssignModal('${game.id}', '${acc.id}', 'pry', 'PS4')" class="btn-cyber-primary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow">صرف Pry PS4</button>` : ''}
                  ${canPryPs5 ? `<button onclick="app.openAssignModal('${game.id}', '${acc.id}', 'pry', 'PS5')" class="btn-cyber-primary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow">صرف Pry PS5</button>` : ''}
                ` : slotType === 'sec' ? `
                  ${canSec ? `<button onclick="app.openAssignModal('${game.id}', '${acc.id}', 'sec')" class="badge-sec px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow">صرف Secondary</button>` : ''}
                ` : slotType === 'off' ? `
                  ${canOffPs4 ? `<button onclick="app.openAssignModal('${game.id}', '${acc.id}', 'off', 'PS4')" class="badge-off px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow">صرف Off PS4</button>` : ''}
                  ${canOffPs5 ? `<button onclick="app.openAssignModal('${game.id}', '${acc.id}', 'off', 'PS5')" class="badge-off px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow">صرف Off PS5</button>` : ''}
                ` : `
                  ${canPryPs4 ? `<button onclick="app.openAssignModal('${game.id}', '${acc.id}', 'pry', 'PS4')" class="badge-pry px-2.5 py-1 rounded-lg text-[10px] font-bold">Pry PS4</button>` : ''}
                  ${canPryPs5 ? `<button onclick="app.openAssignModal('${game.id}', '${acc.id}', 'pry', 'PS5')" class="badge-pry px-2.5 py-1 rounded-lg text-[10px] font-bold">Pry PS5</button>` : ''}
                  ${canSec ? `<button onclick="app.openAssignModal('${game.id}', '${acc.id}', 'sec')" class="badge-sec px-2.5 py-1 rounded-lg text-[10px] font-bold">Sec</button>` : ''}
                  ${canOffPs4 ? `<button onclick="app.openAssignModal('${game.id}', '${acc.id}', 'off', 'PS4')" class="badge-off px-2.5 py-1 rounded-lg text-[10px] font-bold">Off PS4</button>` : ''}
                  ${canOffPs5 ? `<button onclick="app.openAssignModal('${game.id}', '${acc.id}', 'off', 'PS5')" class="badge-off px-2.5 py-1 rounded-lg text-[10px] font-bold">Off PS5</button>` : ''}
                `}
              </div>
            </div>

            <!-- Detailed Console Status Matrix -->
            <div class="bg-slate-900/90 p-2.5 rounded-xl border border-white/5 text-[11px] space-y-1.5">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <span class="text-slate-400 font-semibold">حالة تفعيل الأجهزة:</span>
                <div class="flex items-center gap-2 flex-wrap">
                  ${remainingSummary.join(' | ')}
                </div>
              </div>

              ${acc.notes ? `
                <div class="pt-1 border-t border-white/5 text-slate-400 flex items-center justify-between">
                  <span><i data-lucide="info" class="w-3 h-3 inline ml-1 text-cyan-400"></i> ${acc.notes}</span>
                </div>
              ` : ''}
            </div>

          </div>
        `;
      }).join('');
    }

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  // Open modal showing ALL accounts across all games in the system
  openAllSystemAccountsModal() {
    const modal = document.getElementById('slotAccountsModal');
    const title = document.getElementById('slotModalGameTitle');
    const badge = document.getElementById('slotModalBadge');
    const desc = document.getElementById('slotModalDescription');
    const list = document.getElementById('slotAccountsList');
    const countText = document.getElementById('slotAccountsCountText');

    title.innerText = "جميع إيميلات وحسابات النظام";
    badge.className = "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold px-3 py-1 rounded-full";
    badge.innerText = "كافة الألعاب";
    desc.innerText = "عرض شامل لجميع الإيميلات المسجلة في النظام مع تفاصيل وحالة كل لعبة";

    const allAccounts = window.db.getAccounts();
    const games = window.db.getGames();
    const gamesMap = {};
    games.forEach(g => gamesMap[g.id] = g);

    countText.innerText = `إجمالي عدد الحسابات: ${allAccounts.length}`;

    if (allAccounts.length === 0) {
      list.innerHTML = `
        <div class="py-12 text-center bg-slate-900/60 rounded-2xl border border-white/5">
          <i data-lucide="mail-x" class="w-10 h-10 text-slate-500 mx-auto mb-2"></i>
          <p class="text-xs font-bold text-slate-400">لا توجد أي إيميلات مسجلة في النظام حتى الآن!</p>
          <p class="text-[11px] text-slate-500 mt-1">اضغط على زر "إضافة إيميل" أسفل أي لعبة للبدء.</p>
        </div>
      `;
    } else {
      list.innerHTML = allAccounts.map((acc, index) => {
        const game = gamesMap[acc.gameId] || { title: 'لعبة مجهولة', platform: 'بلايستيشن 4 و 5' };
        const mode = acc.slotMode || 'all';
        const isPryPs4Taken = acc.pryPs4Status === 'taken';
        const isPryPs5Taken = acc.pryPs5Status === 'taken';
        const isSecTaken = acc.secStatus === 'taken';

        let modeBadge = '';
        if (mode === 'pry_off') modeBadge = '<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">Pry & Off</span>';
        else if (mode === 'sec') modeBadge = '<span class="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold">Sec فقط</span>';
        else modeBadge = '<span class="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] font-bold">Pry+Sec+Off</span>';

        return `
          <div class="glass-panel p-4 rounded-2xl border border-white/10 space-y-3 relative group">
            <div class="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">🎮 ${game.title}</span>
                ${modeBadge}
              </div>
              <span class="text-xs text-slate-500 font-mono">#${index + 1}</span>
            </div>

            <!-- Email & Pass Row -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="space-y-1 font-mono" dir="ltr">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-black text-white select-all">${acc.email}</span>
                  <button onclick="app.copyToClipboard('${acc.email}', 'تم نسخ الإيميل')" class="text-slate-400 hover:text-cyan-300 p-1" title="نسخ الإيميل">
                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
                <div class="flex items-center gap-2 text-xs text-slate-300">
                  <span class="text-slate-500 font-sans">Pass:</span>
                  <span id="passSpan_${acc.id}" class="font-bold select-all">••••••••</span>
                  <button onclick="app.togglePassword('${acc.id}', '${acc.password}')" class="text-slate-400 hover:text-cyan-300 p-1" title="إظهار/إخفاء">
                    <i id="passIcon_${acc.id}" data-lucide="eye" class="w-3.5 h-3.5"></i>
                  </button>
                  <button onclick="app.copyToClipboard('${acc.password}', 'تم نسخ كلمة المرور')" class="text-slate-400 hover:text-cyan-300 p-1" title="نسخ الباسورد">
                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center gap-2">
                <button onclick="app.openEditAccountModal('${acc.id}')"
                        class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 flex items-center gap-1 border border-white/10 transition">
                  <i data-lucide="edit-2" class="w-3.5 h-3.5 text-cyan-400"></i>
                  <span>تعديل</span>
                </button>
                <button onclick="app.requestDeleteAccount('${acc.id}')"
                        class="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center gap-1 border border-rose-500/30 transition">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  <span>مسح</span>
                </button>
              </div>
            </div>

            <!-- Status Details -->
            <div class="text-xs pt-2 border-t border-white/5 flex items-center justify-between text-slate-400">
              <div class="flex items-center gap-2">
                <span>PS4 Pry: <b class="${isPryPs4Taken ? 'text-rose-400' : 'text-emerald-400'}">${isPryPs4Taken ? 'محجوز' : 'متاح'}</b></span>
                <span>|</span>
                <span>PS5 Pry: <b class="${isPryPs5Taken ? 'text-rose-400' : 'text-emerald-400'}">${isPryPs5Taken ? 'محجوز' : 'متاح'}</b></span>
                <span>|</span>
                <span>Sec: <b class="${isSecTaken ? 'text-slate-500' : 'text-blue-400'}">${isSecTaken ? 'محجوز' : 'متاح'}</b></span>
              </div>
              ${acc.notes ? `<span class="text-[11px] text-slate-400 truncate max-w-[150px]">📝 ${acc.notes}</span>` : ''}
            </div>

          </div>
        `;
      }).join('');
    }

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  togglePassword(accId, realPass) {
    const span = document.getElementById(`passSpan_${accId}`);
    const icon = document.getElementById(`passIcon_${accId}`);
    if (!span) return;

    if (span.innerText === '••••••••') {
      span.innerText = realPass;
      if (icon) icon.setAttribute('data-lucide', 'eye-off');
    } else {
      span.innerText = '••••••••';
      if (icon) icon.setAttribute('data-lucide', 'eye');
    }
    if (window.lucide) lucide.createIcons();
  }

  // ================= ADD / EDIT GAME =================
  openAddGameModal() {
    document.getElementById('addGameForm').reset();
    this.uploadedGameImageBase64 = null;
    this.clearGameImagePreview('add');
    document.getElementById('addGameModal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  openEditGameModal(gameId) {
    const game = window.db.getGames().find(g => g.id === gameId);
    if (!game) return;

    document.getElementById('editGameId').value = game.id;
    document.getElementById('editGameTitleInput').value = game.title;
    document.getElementById('editGamePlatformInput').value = game.platform || 'بلايستيشن 4 و 5';
    document.getElementById('editGameImageInput').value = game.image.startsWith('data:') ? '' : game.image;

    const itemType = game.itemType || 'game';
    const radio = document.querySelector(`input[name="editGameItemType"][value="${itemType}"]`);
    if (radio) radio.checked = true;

    this.uploadedEditGameImageBase64 = game.image;
    this.showGameImagePreview(game.image, 'الصورة الحالية', 'edit');

    document.getElementById('editGameModal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  handleSaveEditedGame(e) {
    e.preventDefault();
    const gameId = document.getElementById('editGameId').value;
    const title = document.getElementById('editGameTitleInput').value.trim();
    const platform = document.getElementById('editGamePlatformInput').value;
    const urlInput = document.getElementById('editGameImageInput').value.trim();
    const editItemTypeRadio = document.querySelector('input[name="editGameItemType"]:checked');
    const itemType = editItemTypeRadio ? editItemTypeRadio.value : 'game';
    const image = this.uploadedEditGameImageBase64 || urlInput || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80';

    if (!title) {
      this.showToast('يرجى كتابة الاسم', 'error');
      return;
    }

    window.db.updateGame(gameId, { title, platform, image, itemType });
    this.closeModals();
    this.showToast(`تم حفظ تعديلات "${title}" بنجاح! 🎉`, 'success');
    this.renderAll();
  }

  async handleGameFileSelect(e, mode = 'add') {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast('يرجى اختيار ملف صورة صالح!', 'error');
      return;
    }

    // Automatically compress image file before using
    const compressedBase64 = await this.compressImageFile(file);

    if (mode === 'add') {
      this.uploadedGameImageBase64 = compressedBase64;
      document.getElementById('gameImageInput').value = '';
      this.showGameImagePreview(this.uploadedGameImageBase64, file.name, 'add');
    } else {
      this.uploadedEditGameImageBase64 = compressedBase64;
      document.getElementById('editGameImageInput').value = '';
      this.showGameImagePreview(this.uploadedEditGameImageBase64, file.name, 'edit');
    }
  }

  handleGameImagePreview(url, mode = 'add') {
    if (url.trim()) {
      if (mode === 'add') {
        this.uploadedGameImageBase64 = null;
        this.showGameImagePreview(url.trim(), 'رابط إنترنت', 'add');
      } else {
        this.uploadedEditGameImageBase64 = null;
        this.showGameImagePreview(url.trim(), 'رابط إنترنت', 'edit');
      }
    } else {
      this.clearGameImagePreview(mode);
    }
  }

  showGameImagePreview(src, labelText = '', mode = 'add') {
    const prefix = mode === 'add' ? 'game' : 'editGame';
    const wrap = document.getElementById(`${prefix}ImagePreviewWrap`);
    const img = document.getElementById(`${prefix}ImagePreview`);
    const label = document.getElementById(`${prefix}UploadLabel`);
    if (wrap && img) {
      img.src = src;
      wrap.classList.remove('hidden');
    }
    if (label && labelText) {
      label.innerText = labelText.length > 20 ? labelText.slice(0, 18) + '...' : labelText;
    }
    if (window.lucide) lucide.createIcons();
  }

  clearGameImagePreview(mode = 'add') {
    const prefix = mode === 'add' ? 'game' : 'editGame';
    if (mode === 'add') this.uploadedGameImageBase64 = null;
    else this.uploadedEditGameImageBase64 = null;

    const wrap = document.getElementById(`${prefix}ImagePreviewWrap`);
    const img = document.getElementById(`${prefix}ImagePreview`);
    const label = document.getElementById(`${prefix}UploadLabel`);
    const fileInput = document.getElementById(`${prefix}ImageFileInput`);
    if (wrap) wrap.classList.add('hidden');
    if (img) img.src = '';
    if (label) label.innerText = mode === 'add' ? 'اختر صورة من جهازك (PC)' : 'اختر صورة جديدة من جهازك';
    if (fileInput) fileInput.value = '';
  }

  handleAddGame(e) {
    e.preventDefault();
    const title = document.getElementById('gameTitleInput').value.trim();
    const platform = document.getElementById('gamePlatformInput').value;
    const urlInput = document.getElementById('gameImageInput').value.trim();
    const itemTypeRadio = document.querySelector('input[name="addGameItemType"]:checked');
    const itemType = itemTypeRadio ? itemTypeRadio.value : 'game';
    const image = this.uploadedGameImageBase64 || urlInput || (itemType === 'subscription' ? 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80' : 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80');

    if (!title) {
      this.showToast('يرجى كتابة الاسم', 'error');
      return;
    }

    window.db.addGame({ title, platform, image, itemType });
    this.closeModals();
    this.showToast(`تمت إضافة ${itemType === 'subscription' ? 'اشتراك' : 'لعبة'} "${title}" بنجاح! 🎉`, 'success');
    this.renderAll();
  }

  handleDeleteGame(gameId, gameTitle) {
    this.promptActionPassword(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف "${gameTitle}" وجميع الحسابات المرتبطة نهائياً؟ يرجى إدخال كلمة مرور تسجيل الدخول:`,
      () => {
        const confirmDelete = confirm(`⚠️ تأكيد نهائي:\nهل أنت متأكد من مسح "${gameTitle}" وكافة حساباتها نهائياً؟\n\nاضغط [موافق] للمسح أو [إلغاء] للتراجع.`);
        if (confirmDelete) {
          window.db.deleteGame(gameId);
          this.showToast(`تم حذف "${gameTitle}" بنجاح`, 'info');
          this.renderAll();
        } else {
          this.showToast('تم إلغاء عملية الحذف', 'info');
        }
      }
    );
  }

  // ================= ADD / EDIT / DELETE ACCOUNT =================
  openAddAccountModal(gameId, gameTitle) {
    document.getElementById('addAccountForm').reset();
    document.getElementById('addAccountGameId').value = gameId;
    document.getElementById('addAccountGameName').innerText = gameTitle;
    
    const game = window.db.getGames().find(g => g.id === gameId);
    const isSub = game && game.itemType === 'subscription';

    const optAll = document.getElementById('optAll');
    const optPryOff = document.getElementById('optPryOff');
    const optPrySec = document.getElementById('optPrySec');
    const optSecOnly = document.getElementById('optSecOnly');
    const accDurationWrap = document.getElementById('accDurationWrap');

    if (isSub) {
      if (accDurationWrap) accDurationWrap.classList.remove('hidden');
      if (optAll) optAll.style.display = 'none';
      if (optPryOff) optPryOff.style.display = 'none';
      if (optPrySec) {
        optPrySec.style.display = 'block';
        const prySecInput = optPrySec.querySelector('input');
        if (prySecInput) prySecInput.checked = true;
      }
    } else {
      if (accDurationWrap) accDurationWrap.classList.add('hidden');
      if (optAll) optAll.style.display = 'block';
      if (optPryOff) optPryOff.style.display = 'block';
      if (optPrySec) optPrySec.style.display = 'block';
      const allInput = optAll?.querySelector('input');
      if (allInput) allInput.checked = true;
    }

    document.getElementById('addAccountModal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  handleAddAccount(e) {
    e.preventDefault();
    const gameId = document.getElementById('addAccountGameId').value;
    const email = document.getElementById('accEmailInput').value.trim();
    const password = document.getElementById('accPasswordInput').value.trim();
    const notes = document.getElementById('accNotesInput').value.trim();
    const slotMode = document.querySelector('input[name="accSlotMode"]:checked')?.value || 'all';

    const game = window.db.getGames().find(g => g.id === gameId);
    const isSub = game && game.itemType === 'subscription';
    const durationRadio = document.querySelector('input[name="accDurationRadio"]:checked');
    const duration = isSub ? (durationRadio?.value || 'سنة (12 شهر)') : '';

    if (!email || !password) {
      this.showToast('يرجى ملء الإيميل وكلمة السر', 'error');
      return;
    }

    window.db.addAccount({ gameId, email, password, slotMode, duration, notes });
    this.closeModals();
    this.showToast('تمت إضافة الإيميل بنجاح إلى ' + (isSub ? 'الاشتراك! 👑' : 'اللعبة! 🔑'), 'success');
    this.renderAll();
  }

  requestEditAccount(accId) {
    const acc = window.db.getAccounts().find(a => a.id === accId);
    if (!acc) return;

    this.promptActionPassword(
      'تأكيد تعديل بيانات الحساب',
      'يجب إدخال كلمة مرور تسجيل الدخول لتعديل الإيميل أو الباسورد:',
      () => {
        this.openEditAccountModal(acc);
      }
    );
  }

  openEditAccountModal(acc) {
    const game = window.db.getGames().find(g => g.id === acc.gameId);
    const isSub = game && game.itemType === 'subscription';

    document.getElementById('editAccountId').value = acc.id;
    document.getElementById('editAccountGameName').innerText = game ? game.title : 'تعديل الحساب';
    document.getElementById('editAccEmailInput').value = acc.email;
    document.getElementById('editAccPasswordInput').value = acc.password;
    document.getElementById('editAccNotesInput').value = acc.notes || '';

    const editDurationWrap = document.getElementById('editAccDurationWrap');
    if (isSub) {
      if (editDurationWrap) editDurationWrap.classList.remove('hidden');
      const curDuration = acc.duration || 'سنة (12 شهر)';
      const dRadio = document.querySelector(`input[name="editAccDurationRadio"][value="${curDuration}"]`);
      if (dRadio) dRadio.checked = true;
    } else {
      if (editDurationWrap) editDurationWrap.classList.add('hidden');
    }

    const mode = acc.slotMode || 'all';
    const targetRadio = document.querySelector(`input[name="editAccSlotMode"][value="${mode}"]`);
    if (targetRadio) targetRadio.checked = true;

    document.getElementById('editAccountModal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  handleSaveEditedAccount(e) {
    e.preventDefault();
    const accId = document.getElementById('editAccountId').value;
    const email = document.getElementById('editAccEmailInput').value.trim();
    const password = document.getElementById('editAccPasswordInput').value.trim();
    const notes = document.getElementById('editAccNotesInput').value.trim();
    const slotMode = document.querySelector('input[name="editAccSlotMode"]:checked')?.value || 'all';

    const acc = window.db.getAccounts().find(a => a.id === accId);
    const game = acc ? window.db.getGames().find(g => g.id === acc.gameId) : null;
    const isSub = game && game.itemType === 'subscription';
    const dRadio = document.querySelector('input[name="editAccDurationRadio"]:checked');
    const duration = isSub ? (dRadio?.value || 'سنة (12 شهر)') : '';

    if (!email || !password) {
      this.showToast('يرجى ملء الإيميل وكلمة السر', 'error');
      return;
    }

    window.db.updateAccount(accId, { email, password, slotMode, duration, notes });
    this.closeModals();
    this.showToast('تم تحديث بيانات الحساب بنجاح! ✏️', 'success');

    if (this.currentSlotGameId && this.currentSlotType) {
      this.openSlotModal(this.currentSlotGameId, this.currentSlotType);
    }
    this.renderAll();
  }

  // Password-Protected Deletion with Final Confirmation Alert (Yes/No)
  requestDeleteAccount(accId) {
    const acc = window.db.getAccounts().find(a => a.id === accId);
    if (!acc) return;
    const emailName = acc.email;

    this.promptActionPassword(
      'تأكيد كلمة المرور لمسح الإيميل',
      `يرجى إدخال كلمة مرور تسجيل الدخول أولاً لتأكيد طلب مسح الإيميل (${emailName}):`,
      () => {
        // Step 2: Final confirmation alert (Yes/No)
        const confirmDelete = confirm(`⚠️ تأكيد نهائي:\n\nهل أنت متأكد من مسح الإيميل التالي نهائياً؟\n📧 ${emailName}\n\n- اضغط [موافق / OK] لتأكيد المسح.\n- اضغط [إلغاء / Cancel] للتراجع والاحتفاظ بالإيميل.`);
        
        if (confirmDelete) {
          window.db.deleteAccount(accId);
          this.showToast(`تم مسح الإيميل (${emailName}) بنجاح 🗑️`, 'info');
          if (this.currentSlotGameId && this.currentSlotType) {
            this.openSlotModal(this.currentSlotGameId, this.currentSlotType);
          }
          this.renderAll();
        } else {
          this.showToast('تم إلغاء المسح والاحتفاظ بالإيميل بنجاح 👍', 'info');
        }
      }
    );
  }

  // ================= ASSIGN TO CUSTOMER MODAL =================
  openAssignModal(gameId, accountId, slotType, presetDevice = null) {
    const game = window.db.getGames().find(g => g.id === gameId);
    const acc = window.db.getAccounts().find(a => a.id === accountId);
    if (!game || !acc) return;

    const platform = game.platform || 'بلايستيشن 4 و 5';
    const supportsPs4 = platform.includes('4');
    const supportsPs5 = platform.includes('5');

    const elGameId = document.getElementById('assignGameId');
    const elAccId = document.getElementById('assignAccountId');
    const elSlotType = document.getElementById('assignSlotType');
    const elGameTitle = document.getElementById('assignGameTitle');
    const elEmailText = document.getElementById('assignEmailText');

    if (elGameId) elGameId.value = gameId;
    if (elAccId) elAccId.value = accountId;
    if (elSlotType) elSlotType.value = slotType;
    if (elGameTitle) elGameTitle.innerText = game.title;
    if (elEmailText) elEmailText.innerText = acc.email;

    // Device container & radios
    const devWrap = document.getElementById('assignDeviceWrap');
    const labelPs4 = document.getElementById('labelDevPs4');
    const labelPs5 = document.getElementById('labelDevPs5');
    const ps4Radio = document.querySelector('input[name="assignDevice"][value="PS4"]') || document.querySelector('input[name="assignDeviceRadio"][value="PS4"]');
    const ps5Radio = document.querySelector('input[name="assignDevice"][value="PS5"]') || document.querySelector('input[name="assignDeviceRadio"][value="PS5"]');

    if (slotType === 'sec' || game.itemType === 'subscription') {
      // Secondary or generic subscription doesn't strictly require console slot split
      if (devWrap) devWrap.style.display = 'block';
    } else {
      if (devWrap) devWrap.style.display = 'block';
    }

    if (labelPs4) labelPs4.style.display = supportsPs4 ? 'block' : 'none';
    if (labelPs5) labelPs5.style.display = supportsPs5 ? 'block' : 'none';

    if (presetDevice === 'PS5' || (!supportsPs4 && supportsPs5)) {
      if (ps5Radio) ps5Radio.checked = true;
    } else {
      if (ps4Radio) ps4Radio.checked = true;
    }

    const slotBadge = document.getElementById('assignSlotTypeBadge') || document.getElementById('assignSlotBadge');
    if (slotBadge) {
      if (slotType === 'pry') {
        slotBadge.className = "badge-pry px-3 py-0.5 rounded-full font-bold text-xs";
        slotBadge.innerText = presetDevice ? `Primary (${presetDevice})` : "Primary (Pry)";
      } else if (slotType === 'sec') {
        slotBadge.className = "badge-sec px-3 py-0.5 rounded-full font-bold text-xs";
        slotBadge.innerText = "Secondary (Sec)";
      } else {
        slotBadge.className = "badge-off px-3 py-0.5 rounded-full font-bold text-xs";
        slotBadge.innerText = presetDevice ? `Offline (${presetDevice})` : "Offline (Off)";
      }
    }

    const durationBadge = document.getElementById('assignDurationBadge');
    if (durationBadge) {
      if (acc.duration || game.itemType === 'subscription') {
        durationBadge.innerText = acc.duration || 'سنة (12 شهر)';
        durationBadge.classList.remove('hidden');
      } else {
        durationBadge.classList.add('hidden');
      }
    }

    const custName = document.getElementById('assignCustomerName');
    const custPhone = document.getElementById('assignCustomerPhone');
    const custDate = document.getElementById('assignDate');
    const custTime = document.getElementById('assignTime');
    const custNotes = document.getElementById('assignNotes');

    if (custName) custName.value = '';
    if (custPhone) custPhone.value = '';
    if (custDate) custDate.value = new Date().toISOString().split('T')[0];
    if (custTime) custTime.value = new Date().toTimeString().slice(0, 5);
    if (custNotes) custNotes.value = '';

    const modal = document.getElementById('assignModal');
    if (modal) modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  handleConfirmAssign(e) {
    this.handleConfirmAssignment(e);
  }

  handleConfirmAssignment(e) {
    e.preventDefault();
    const gameId = document.getElementById('assignGameId').value;
    const accountId = document.getElementById('assignAccountId').value;
    const slotType = document.getElementById('assignSlotType').value;
    const deviceRadio = document.querySelector('input[name="assignDevice"]:checked') || document.querySelector('input[name="assignDeviceRadio"]:checked');
    const device = deviceRadio ? deviceRadio.value : 'PS4';
    const customerName = (document.getElementById('assignCustomerName')?.value || '').trim();
    const customerPhone = (document.getElementById('assignCustomerPhone')?.value || '').trim();
    const date = document.getElementById('assignDate')?.value || new Date().toISOString().split('T')[0];
    const time = document.getElementById('assignTime')?.value || '';
    const notes = (document.getElementById('assignNotes')?.value || '').trim();

    if (!customerName || !customerPhone) {
      this.showToast('يرجى كتابة اسم العميل ورقم الهاتف', 'error');
      return;
    }

    const phoneErr = this.validateEgyptianPhone(customerPhone);
    if (phoneErr) {
      this.showToast(phoneErr, 'error');
      return;
    }

    try {
      const order = window.db.assignSlot({
        gameId,
        accountId,
        slotType,
        device,
        customerName,
        customerPhone,
        date,
        time,
        notes
      });

      this.closeModals();
      this.showToast(`تم تسليم الحساب للعميل ${customerName} بنجاح! 🎉`, 'success');
      this.openReceiptModal(order);
      this.renderAll();
    } catch (err) {
      this.showToast(err.message || 'حدث خطأ أثناء صرف الحساب', 'error');
    }
  }

  // ================= EDIT ORDER / CUSTOMER =================
  requestEditOrder(orderId) {
    const history = window.db.getHistory();
    const order = history.find(o => o.id === orderId);
    if (!order) return;

    this.promptActionPassword(
      'تأكيد تعديل بيانات العميل / العملية',
      'يجب إدخال كلمة مرور تسجيل الدخول لتعديل اسم أو رقم هاتف العميل:',
      () => {
        this.openEditOrderModal(order);
      }
    );
  }

  openEditOrderModal(order) {
    document.getElementById('editOrderId').value = order.id;
    document.getElementById('editOrderGameTitle').innerText = `${order.gameTitle} (${order.slotType.toUpperCase()})`;
    document.getElementById('editOrderCustomerName').value = order.customerName;
    document.getElementById('editOrderCustomerPhone').value = order.customerPhone;
    document.getElementById('editOrderDevice').value = order.device || 'PS4';
    document.getElementById('editOrderDate').value = order.date;
    document.getElementById('editOrderTime').value = order.time || '';
    document.getElementById('editOrderNotes').value = order.notes || '';

    document.getElementById('editOrderModal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  handleSaveEditedOrder(e) {
    e.preventDefault();
    const orderId = document.getElementById('editOrderId').value;
    const customerName = document.getElementById('editOrderCustomerName').value.trim();
    const customerPhone = document.getElementById('editOrderCustomerPhone').value.trim();
    const device = document.getElementById('editOrderDevice').value;
    const date = document.getElementById('editOrderDate').value;
    const time = document.getElementById('editOrderTime').value;
    const notes = document.getElementById('editOrderNotes').value.trim();

    if (!customerName || !customerPhone || !date) {
      this.showToast('يرجى ملء اسم العميل ورقم الهاتف والتاريخ', 'error');
      return;
    }

    const phoneErr = this.validateEgyptianPhone(customerPhone);
    if (phoneErr) {
      this.showToast(phoneErr, 'error');
      return;
    }

    window.db.updateOrder(orderId, { customerName, customerPhone, device, date, time, notes });
    this.closeModals();
    this.showToast('تم حفظ تعديلات العميل والعملية بنجاح! ✏️', 'success');
    this.renderAll();
  }

  // ================= RECEIPT / WHATSAPP MODAL =================
  openReceiptModal(order) {
    this.lastOrderReceipt = order;
    const box = document.getElementById('visualReceiptCard');
    const textarea = document.getElementById('receiptWhatsappText');

    const slotBase = order.slotType === 'pry' ? 'Primary (أساسي)' : (order.slotType === 'sec' ? 'Secondary (ثانوي)' : 'Offline (أوفلاين)');
    const deviceTag = order.device ? `[PlayStation ${order.device}]` : '';
    const durationInfo = order.duration ? `<div class="col-span-2"><span class="text-slate-400 font-bold">مدة الاشتراك:</span> <b class="text-purple-300 font-bold">${order.duration}</b></div>` : '';

    if (box) {
      box.innerHTML = `
        <div class="text-center font-black text-sm text-cyan-300 border-b border-white/10 pb-2 mb-2 flex items-center justify-center gap-1.5">
          <i data-lucide="sparkles" class="w-4 h-4 text-cyan-400"></i>
          <span>EL FALASTENY | تفاصيل استلام الحساب</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <div><span class="text-slate-400 font-bold">العميل:</span> <b class="text-white">${order.customerName}</b></div>
          <div><span class="text-slate-400 font-bold">الهاتف:</span> <b class="text-cyan-300 font-mono" dir="ltr">${order.customerPhone}</b></div>
          <div><span class="text-slate-400 font-bold">العنصر:</span> <b class="text-white">${order.gameTitle}</b></div>
          <div><span class="text-slate-400 font-bold">النوع:</span> <b class="text-emerald-400">${slotBase} ${deviceTag}</b></div>
          ${durationInfo}
        </div>
        <div class="bg-black/60 p-2.5 rounded-xl border border-white/10 my-2 space-y-1 font-mono text-[11px]" dir="ltr">
          <div class="flex items-center justify-between"><span class="text-slate-400 font-sans">Email:</span> <span class="text-cyan-300 font-bold select-all">${order.email}</span></div>
        </div>
        <div class="text-[10px] text-slate-400 flex items-center justify-between pt-1">
          <span>التاريخ: ${order.date} (${order.time || ''})</span>
          ${order.notes ? `<span class="text-amber-300 font-bold truncate max-w-[180px]">📝 ${order.notes}</span>` : ''}
        </div>
      `;
    }

    const durationLine = order.duration ? `⏳ *مدة الاشتراك:* ${order.duration}\n` : '';
    const whatsappMessage = 
`🎮 *EL FALASTENY | تفاصيل استلام الحساب* 🎮
━━━━━━━━━━━━━━━━━━━━
👤 *العميل:* ${order.customerName}
🕹 *العنصر:* ${order.gameTitle}
🏷 *النوع والجهاز:* ${slotBase} ${deviceTag}
${durationLine}📅 *تاريخ الاستلام:* ${order.date} ${order.time ? `(${order.time})` : ''}
━━━━━━━━━━━━━━━━━━━━
📧 *البريد الإلكتروني:* ${order.email}
${order.notes ? `📝 *ملاحظات:* ${order.notes}\n` : ''}━━━━━━━━━━━━━━━━━━━━
شكراً لتعاملك مع EL FALASTENY! نتمنى لك تجربة ممتعة 🔥`;

    if (textarea) textarea.value = whatsappMessage;

    document.getElementById('receiptModal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  copyWhatsappMessage() {
    const textarea = document.getElementById('receiptWhatsappText');
    if (textarea && textarea.value) {
      this.copyToClipboard(textarea.value, 'تم نسخ رسالة الواتساب الجاهزة للعميل! 📲');
    }
  }

  openWhatsappDirect() {
    if (!this.lastOrderReceipt) return;
    const phone = (this.lastOrderReceipt.customerPhone || '').replace(/\D/g, '');
    let cleanPhone = phone;
    if (cleanPhone.startsWith('01')) {
      cleanPhone = '20' + cleanPhone.substring(1);
    }
    const text = encodeURIComponent(document.getElementById('receiptWhatsappText')?.value || '');
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  }

  // ================= HISTORY & SEARCH =================
  clearHistoryFilters() {
    const sInput = document.getElementById('searchHistoryInput');
    const dInput = document.getElementById('filterHistoryDate');
    const slotF = document.getElementById('filterHistorySlot');
    const statF = document.getElementById('filterHistoryStatus');
    if (sInput) sInput.value = '';
    if (dInput) dInput.value = '';
    if (slotF) slotF.value = 'all';
    if (statF) statF.value = 'all';
    this.renderHistory();
  }

  renderHistory() {
    const tableBody = document.getElementById('historyTableBody');
    const badge = document.getElementById('historyCountBadge');
    const searchInput = (document.getElementById('searchHistoryInput')?.value || '').toLowerCase().trim();
    const dateFilter = document.getElementById('filterHistoryDate')?.value || '';
    const slotFilter = document.getElementById('filterHistorySlot')?.value || 'all';
    const statusFilter = document.getElementById('filterHistoryStatus')?.value || 'all';
    const summaryCard = document.getElementById('customerSummaryCard');

    let history = window.db.getHistory();

    if (dateFilter) {
      history = history.filter(h => h.date === dateFilter);
    }
    if (slotFilter !== 'all') {
      history = history.filter(h => h.slotType === slotFilter);
    }
    if (statusFilter !== 'all') {
      history = history.filter(h => h.status === statusFilter);
    }

    if (searchInput) {
      history = history.filter(h => 
        h.customerName.toLowerCase().includes(searchInput) ||
        h.customerPhone.includes(searchInput) ||
        h.gameTitle.toLowerCase().includes(searchInput) ||
        h.email.toLowerCase().includes(searchInput) ||
        (h.date && h.date.includes(searchInput)) ||
        (h.time && h.time.includes(searchInput)) ||
        (h.duration && h.duration.toLowerCase().includes(searchInput))
      );
    }

    badge.innerText = history.length;

    if (searchInput && history.length > 0) {
      const activeCount = history.filter(h => h.status === 'active').length;
      const returnedCount = history.filter(h => h.status === 'returned').length;
      const firstMatch = history[0];

      summaryCard.classList.remove('hidden');
      summaryCard.innerHTML = `
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold text-lg">
              <i data-lucide="user" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="text-base font-black text-white">${firstMatch.customerName}</h4>
                <span class="bg-cyan-500/20 text-cyan-300 text-xs px-2.5 py-0.5 rounded-full font-mono" dir="ltr">${firstMatch.customerPhone}</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">سجل الحسابات والألعاب الخاصة بالعميل</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-xl text-center">
              <div class="text-[10px] text-slate-400 font-bold">الحسابات النشطة</div>
              <div class="text-base font-black text-emerald-400">${activeCount}</div>
            </div>
            <div class="bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-xl text-center">
              <div class="text-[10px] text-slate-400 font-bold">المسترجعة / السابقة</div>
              <div class="text-base font-black text-slate-400">${returnedCount}</div>
            </div>
            <div class="bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-xl text-center">
              <div class="text-[10px] text-slate-400 font-bold">إجمالي العمليات</div>
              <div class="text-base font-black text-cyan-400">${history.length}</div>
            </div>
          </div>
        </div>
      `;
    } else {
      summaryCard.classList.add('hidden');
    }

    const mobileList = document.getElementById('mobileHistoryList');

    if (history.length === 0) {
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="p-12 text-center text-slate-500">
              <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-2 opacity-50"></i>
              <p class="text-sm font-bold text-slate-400">لا توجد عمليات مسجلة مطابقة للبحث</p>
            </td>
          </tr>
        `;
      }
      if (mobileList) {
        mobileList.innerHTML = `
          <div class="py-10 text-center glass-panel rounded-2xl">
            <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-2 text-slate-500 opacity-60"></i>
            <p class="text-xs font-bold text-slate-400">لا توجد عمليات مسجلة</p>
          </div>
        `;
      }
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Render Desktop Table
    if (tableBody) {
      tableBody.innerHTML = history.map(order => {
        const isPry = order.slotType === 'pry';
        const isSec = order.slotType === 'sec';
        const slotBadgeClass = isPry ? 'badge-pry' : (isSec ? 'badge-sec' : 'badge-off');
        const devTag = order.device ? `(${order.device})` : '';
        const slotLabel = isPry ? `Primary ${devTag}` : (isSec ? 'Secondary' : `Offline ${devTag}`);
        const isActive = order.status === 'active';

        return `
          <tr class="hover:bg-white/[0.02] transition">
            <td class="p-4">
              <div class="font-bold text-white flex items-center gap-1.5">
                <span>${order.customerName}</span>
                <button onclick="app.requestEditOrder('${order.id}')" class="text-slate-500 hover:text-amber-300 p-0.5" title="تعديل بيانات العميل / التاريخ">
                  <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                </button>
              </div>
              <div class="text-slate-400 font-mono text-[11px]" dir="ltr">${order.customerPhone}</div>
            </td>

            <td class="p-4 font-bold text-slate-200">
              <div>${order.gameTitle}</div>
              ${order.duration ? `<div class="text-[10px] text-purple-300 font-bold flex items-center gap-1 mt-0.5"><i data-lucide="clock" class="w-3 h-3"></i> ${order.duration}</div>` : ''}
            </td>

            <td class="p-4">
              <span class="${slotBadgeClass} px-2.5 py-1 rounded-full text-[10px] font-bold">
                ${slotLabel}
              </span>
            </td>

            <td class="p-4 font-mono" dir="ltr">
              <div class="text-cyan-300 font-semibold text-[11px] flex items-center gap-1.5">
                <span>${order.email}</span>
                <button onclick="app.copyToClipboard('${order.email}', 'تم نسخ الإيميل')" class="text-slate-400 hover:text-cyan-300">
                  <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                </button>
              </div>
              <div class="text-slate-300 text-[11px] flex items-center gap-1.5 mt-0.5">
                <span class="text-slate-500 font-sans">Pass:</span>
                <span>${order.password}</span>
                <button onclick="app.copyToClipboard('${order.password}', 'تم نسخ الباسورد')" class="text-slate-400 hover:text-cyan-300">
                  <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </td>

            <td class="p-4 text-slate-300 text-[11px]">
              <div>${order.date}</div>
              <div class="text-slate-500 font-mono">${order.time || ''}</div>
            </td>

            <td class="p-4">
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700/50 text-slate-400 border border-white/5'}">
                ${isActive ? '● نشط (مستلم)' : '✓ مسترجع'}
              </span>
            </td>

            <td class="p-4 text-center">
              <div class="flex items-center justify-center gap-1.5 flex-wrap">
                ${isActive ? `
                  <button onclick="app.handleReleaseOrder('${order.id}')"
                          class="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition"
                          title="تحرير الحساب وإعادته متاحاً في النظام">
                    استرجاع
                  </button>
                ` : `
                  <span class="text-[10px] text-slate-500">تم الإرجاع</span>
                `}

                <button onclick="app.openReceiptModal(${JSON.stringify(order).replace(/"/g, '&quot;')})" 
                        class="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition"
                        title="عرض الفاتورة ونسخ الواتساب">
                  <i data-lucide="share-2" class="w-3.5 h-3.5"></i>
                </button>

                <button onclick="app.handleDeleteOrder('${order.id}')"
                        class="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition"
                        title="حذف من السجل">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Render Mobile Cards View
    if (mobileList) {
      mobileList.innerHTML = history.map(order => {
        const isPry = order.slotType === 'pry';
        const isSec = order.slotType === 'sec';
        const slotBadgeClass = isPry ? 'badge-pry' : (isSec ? 'badge-sec' : 'badge-off');
        const devTag = order.device ? `[${order.device}]` : '';
        const slotLabel = isPry ? `Primary ${devTag}` : (isSec ? `Secondary ${devTag}` : `Offline ${devTag}`);
        const isActive = order.status === 'active';

        return `
          <div class="glass-panel p-3.5 rounded-2xl border border-white/10 space-y-2.5">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="font-black text-sm text-white">${order.customerName}</span>
                <button onclick="app.requestEditOrder('${order.id}')" class="text-slate-400 hover:text-amber-300 p-0.5" title="تعديل بيانات العميل">
                  <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                </button>
              </div>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700/50 text-slate-400 border border-white/5'}">
                ${isActive ? '● نشط' : '✓ مسترجع'}
              </span>
            </div>

            <div class="flex items-center justify-between text-xs pt-1 border-t border-white/5">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-cyan-300 font-bold">${order.gameTitle}</span>
                ${order.duration ? `<span class="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded text-[9px] font-bold">${order.duration}</span>` : ''}
              </div>
              <span class="${slotBadgeClass} px-2 py-0.5 rounded-full text-[10px] font-bold">${slotLabel}</span>
            </div>

            <!-- Credentials Box -->
            <div class="bg-black/40 p-2 rounded-xl border border-white/5 text-[11px] font-mono space-y-1" dir="ltr">
              <div class="flex items-center justify-between">
                <span class="text-cyan-300 truncate max-w-[200px]">${order.email}</span>
                <button onclick="app.copyToClipboard('${order.email}', 'تم نسخ الإيميل')" class="text-slate-400 hover:text-white p-1">
                  <i data-lucide="copy" class="w-3 h-3"></i>
                </button>
              </div>
              <div class="flex items-center justify-between text-slate-300">
                <span>Pass: ${order.password}</span>
                <button onclick="app.copyToClipboard('${order.password}', 'تم نسخ الباسورد')" class="text-slate-400 hover:text-white p-1">
                  <i data-lucide="copy" class="w-3 h-3"></i>
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>📅 ${order.date} ${order.time ? `(${order.time})` : ''}</span>
              <span class="font-mono text-cyan-400 font-bold" dir="ltr">${order.customerPhone}</span>
            </div>

            <!-- Mobile Action Buttons Grid -->
            <div class="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-white/5">
              <button onclick="app.openReceiptModal(${JSON.stringify(order).replace(/"/g, '&quot;')})" 
                      class="py-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 text-[10px] font-bold flex items-center justify-center gap-1">
                <i data-lucide="share-2" class="w-3 h-3"></i>
                <span>واتساب</span>
              </button>

              ${isActive ? `
                <button onclick="app.handleReleaseOrder('${order.id}')"
                        class="py-1.5 rounded-xl bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 text-[10px] font-bold flex items-center justify-center gap-1">
                  <i data-lucide="rotate-ccw" class="w-3 h-3"></i>
                  <span>استرجاع</span>
                </button>
              ` : `
                <button disabled class="py-1.5 rounded-xl bg-slate-800 text-slate-500 text-[10px] font-bold opacity-60">
                  مسترجع
                </button>
              `}

              <button onclick="app.handleDeleteOrder('${order.id}')"
                      class="py-1.5 rounded-xl bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 text-[10px] font-bold flex items-center justify-center gap-1">
                <i data-lucide="trash-2" class="w-3 h-3"></i>
                <span>حذف</span>
              </button>
            </div>

          </div>
        `;
      }).join('');
    }

    if (window.lucide) {
      if (tableBody) lucide.createIcons({ root: tableBody });
      if (mobileList) lucide.createIcons({ root: mobileList });
    }
  }

  handleReleaseOrder(orderId) {
    if (confirm('هل تريد استرجاع هذا الحساب وإعادته متاحاً مرة أخرى في النظام؟')) {
      window.db.releaseOrder(orderId);
      this.showToast('تم استرجاع الحساب وأصبح متاحاً للطلب مرة أخرى! 🔄', 'success');
      this.renderAll();
    }
  }

  handleDeleteOrder(orderId) {
    const history = window.db.getHistory();
    const order = history.find(o => o.id === orderId);
    const customerName = order ? order.customerName : 'العميل';

    this.promptActionPassword(
      'تأكيد كلمة المرور لحذف سجل العميل',
      `يرجى إدخال كلمة مرور تسجيل الدخول أولاً لتأكيد حذف سجل (${customerName}) نهائياً:`,
      () => {
        const confirmDelete = confirm(`⚠️ تأكيد نهائي:\n\nهل أنت متأكد من حذف سجل العميل "${customerName}" نهائياً من السيستم؟\n\n- اضغط [موافق / OK] للتأكيد.\n- اضغط [إلغاء / Cancel] للتراجع.`);
        if (confirmDelete) {
          window.db.deleteOrder(orderId);
          this.showToast(`تم حذف سجل (${customerName}) بنجاح 🗑️`, 'info');
          this.renderAll();
        } else {
          this.showToast('تم إلغاء عملية الحذف 👍', 'info');
        }
      }
    );
  }

  exportHistoryCSV() {
    const history = window.db.getHistory();
    if (history.length === 0) {
      this.showToast('لا توجد بيانات لتصديرها!', 'error');
      return;
    }

    let csvContent = "\uFEFFالعميل,الهاتف,اللعبة,النوع,الجهاز,الإيميل,الباسورد,التاريخ,الوقت,الحالة,ملاحظات\n";
    history.forEach(o => {
      const slot = o.slotType === 'pry' ? 'Primary' : (o.slotType === 'sec' ? 'Secondary' : 'Offline');
      const dev = o.device || 'PS4';
      const status = o.status === 'active' ? 'نشط' : 'مسترجع';
      csvContent += `"${o.customerName}","${o.customerPhone}","${o.gameTitle}","${slot}","${dev}","${o.email}","${o.password}","${o.date}","${o.time || ''}","${status}","${o.notes || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EL FALASTENYStore_History_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('تم تصدير السجل بنجاح! 📊', 'success');
  }

  // ================= BACKUP & RESTORE =================
  requestBackupDownload() {
    this.promptActionPassword(
      'تأكيد تحميل النسخة الاحتياطية',
      'يرجى كتابة كلمة مرور تسجيل الدخول لتنزيل ملف النسخة الاحتياطية:',
      () => {
        this.executeDownloadBackup();
      }
    );
  }

  triggerImportBackupFile() {
    document.getElementById('importBackupFile').click();
  }

  handleImportBackupSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    this.promptActionPassword(
      'تأكيد استعادة النسخة الاحتياطية',
      `يرجى كتابة كلمة مرور تسجيل الدخول لاستعادة البيانات من ملف (${file.name}):`,
      () => {
        this.executeRestoreBackup(file);
      }
    );

    e.target.value = '';
  }

  executeDownloadBackup() {
    const jsonStr = window.db.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EL FALASTENYStore_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('تم التحقق وتنزيل النسخة الاحتياطية بنجاح 💾', 'success');
  }

  executeRestoreBackup(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const success = window.db.importBackup(event.target.result);
      if (success) {
        this.showToast('تمت استعادة البيانات بنجاح! 🎉', 'success');
        this.renderAll();
      } else {
        this.showToast('ملف النسخة الاحتياطية غير صالح أو تالف!', 'error');
      }
    };
    reader.readAsText(file);
  }

  // ================= GENERAL HELPERS =================
  closeModals() {
    this.currentSlotGameId = null;
    this.currentSlotType = null;
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.classList.add('hidden');
    });
  }

  copyToClipboard(text, successMsg = 'تم النسخ للحافظة!') {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(successMsg, 'success');
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      this.showToast(successMsg, 'success');
    });
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-emerald-600/90 text-white border-emerald-400' :
                    type === 'error' ? 'bg-rose-600/90 text-white border-rose-400' :
                    'bg-cyan-600/90 text-white border-cyan-400';

    toast.className = `toast glass-panel px-4 py-3 rounded-2xl border text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-xl ${bgClass}`;
    
    let iconName = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-circle' : 'info');
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ================= CLOUD SYNC UI HANDLERS =================
  initCloudSyncUI() {
    if (window.cloudSync) {
      window.cloudSync.onStatusChange((isConnected) => {
        this.updateCloudStatusUI(isConnected);
      });
      window.cloudSync.init();

      const cfg = window.cloudSync.config;
      const input = document.getElementById('cloudConfigInput');
      if (input && cfg) {
        input.value = JSON.stringify(cfg, null, 2);
      }
    }
  }

  updateCloudStatusUI(isConnected) {
    const badge = document.getElementById('cloudStatusBadge');
    const btnUpload = document.getElementById('btnUploadToCloud');
    const btnDisconnect = document.getElementById('btnDisconnectCloud');

    if (badge) {
      if (isConnected) {
        badge.className = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow";
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>🟢 متصل بالسحابة (مزامنة حية نشطة)</span>`;
        if (btnUpload) btnUpload.classList.remove('hidden');
        if (btnDisconnect) btnDisconnect.classList.remove('hidden');
      } else {
        badge.className = "bg-slate-800 text-slate-400 border border-white/10 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1";
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span><span>تخزين محلي (Offline)</span>`;
        if (btnUpload) btnUpload.classList.add('hidden');
        if (btnDisconnect) btnDisconnect.classList.add('hidden');
      }
    }
  }

  saveCloudConfig() {
    const raw = (document.getElementById('cloudConfigInput')?.value || '').trim();
    if (!raw) {
      this.showToast('يرجى لصق كود إعدادات Firebase Config أولاً', 'error');
      return;
    }

    try {
      let config = null;
      // Handle standard JSON or JS object formats
      if (raw.startsWith('{') && raw.endsWith('}')) {
        config = JSON.parse(raw);
      } else {
        // Extract content between { and }
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const jsonLike = match[0]
            .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
            .replace(/'/g, '"')
            .replace(/,\s*}/g, '}');
          config = JSON.parse(jsonLike);
        }
      }

      if (!config || !config.apiKey) {
        throw new Error('Config missing apiKey or invalid format');
      }

      const success = window.cloudSync.saveConfig(config);
      if (success) {
        this.showToast('تم حفظ الإعدادات وربط السحابة بنجاح! ☁️🔥', 'success');
        this.renderAll();
      } else {
        this.showToast('تم حفظ الإعدادات، يرجى التأكد من تفعيل Realtime Database في Firebase', 'info');
      }
    } catch (err) {
      this.showToast('كود الإعدادات غير صالح! يرجى نسخ كود Config صحيح من Firebase', 'error');
    }
  }

  async uploadLocalToCloud() {
    if (!window.cloudSync || !window.cloudSync.isCloudEnabled) {
      this.showToast('يرجى ربط إعدادات السحابة أولاً!', 'error');
      return;
    }

    this.showToast('جاري رفع كامل البيانات إلى السحابة...', 'info');
    const success = await window.cloudSync.uploadAllLocalToCloud();
    if (success) {
      this.showToast('تم رفع جميع الألعاب والإيميلات إلى السحابة بنجاح! ☁️', 'success');
    } else {
      this.showToast('حدث خطأ أثناء الرفع للسحابة', 'error');
    }
  }

  disconnectCloud() {
    if (confirm('هل تريد فصل الربط السحابي والرجوع للوضع المحلي؟')) {
      if (window.cloudSync) window.cloudSync.removeConfig();
      const input = document.getElementById('cloudConfigInput');
      if (input) input.value = '';
      this.showToast('تم فصل السحابة والرجوع للتخزين المحلي 👍', 'info');
    }
  }

  renderAll() {
    if (this._renderRaf) cancelAnimationFrame(this._renderRaf);
    this._renderRaf = requestAnimationFrame(() => {
      this.renderStats();
      if (this.currentTab === 'games') this.renderGames();
      if (this.currentTab === 'history') this.renderHistory();
      if (window.lucide) lucide.createIcons();
    });
  }
}

// Global App Instance
window.app = new AppController();
