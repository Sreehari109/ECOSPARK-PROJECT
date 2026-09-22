/**
 * EcoSpark — Gamified Energy Saving Platform
 * Pure Vanilla JavaScript — Client-side State, Habit Gamification Engine & Visualizations
 */

// =============================================================================
// 1. MULTI-USER DATA STATE & LOCALSTORAGE PERSISTENCE
// =============================================================================
const STORAGE_KEY_USERS = 'ecospark_app_users_v6';
const STORAGE_KEY_ACTIVE_USER = 'ecospark_active_user_id_v6';
const LEGACY_STORAGE_KEY = 'ecospark_user_state_v6';

function createDefaultUser(overrides = {}) {
  const id = overrides.id || ('user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
  return {
    id,
    hasRegistered: overrides.hasRegistered !== undefined ? overrides.hasRegistered : true,
    username: overrides.username || 'My Profile',
    role: overrides.role || 'Residential', // 'Residential' | 'Commercial' | 'Solar Prosumer' | 'Facility Manager' | 'Energy Analyst'
    college: overrides.college || 'Green Valley District',
    department: overrides.department || 'Sector 4B Substation',
    dorm: overrides.dorm || 'Unit 204',
    dailyGoalKwh: overrides.dailyGoalKwh || 1.5,
    avatarSymbol: overrides.avatarSymbol || 'fa-bolt',
    xp: overrides.xp !== undefined ? overrides.xp : 0,
    energySavedKwh: overrides.energySavedKwh !== undefined ? overrides.energySavedKwh : 0,
    co2SavedKg: overrides.co2SavedKg !== undefined ? overrides.co2SavedKg : 0,
    streak: overrides.streak !== undefined ? overrides.streak : 1,
    energyUsedKwh: overrides.energyUsedKwh !== undefined ? overrides.energyUsedKwh : 0,
    completedMissions: overrides.completedMissions || [],
    completedCount: overrides.completedCount || 0,
    unlockedBadges: overrides.unlockedBadges || [],
    applianceAudit: overrides.applianceAudit || [],
    theme: overrides.theme || 'light',
    createdAt: overrides.createdAt || new Date().toISOString(),
    lastActiveDate: new Date().toISOString().split('T')[0]
  };
}

let campusUsers = loadAllUsers();
let activeUserId = loadActiveUserId();
let appState = getActiveUser();

function loadAllUsers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Strip out any legacy default demo profiles
        const filtered = parsed.filter(u => 
          u.id !== 'user_default_student' &&
          u.id !== 'user_faculty_demo' &&
          u.id !== 'user_researcher_demo' &&
          u.id !== 'user_migrated_1' &&
          u.username !== 'Prof. Ananya Iyer' &&
          u.username !== 'Dr. Kevin Chen'
        );
        if (filtered.length > 0) {
          return filtered;
        }
      }
    }
  } catch (err) {
    console.warn('Error loading users from localStorage:', err);
  }

  // Fresh initial user profile - no fake demo accounts
  const initialUser = createDefaultUser({
    id: 'user_active_' + Date.now(),
    username: 'My Profile',
    role: 'Residential',
    college: 'Green Valley District',
    department: 'Sector 4B Substation',
    dorm: 'Unit 204',
    dailyGoalKwh: 1.5,
    avatarSymbol: 'fa-bolt',
    xp: 0,
    energySavedKwh: 0,
    co2SavedKg: 0,
    streak: 1,
    energyUsedKwh: 0,
    completedMissions: [],
    completedCount: 0,
    unlockedBadges: [],
    applianceAudit: []
  });

  const defaultList = [initialUser];
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(defaultList));
    localStorage.setItem(STORAGE_KEY_ACTIVE_USER, initialUser.id);
  } catch (e) {}
  return defaultList;
}

function loadActiveUserId() {
  try {
    const active = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
    if (active && campusUsers.some(u => u.id === active)) {
      return active;
    }
  } catch (e) {}
  return campusUsers[0] ? campusUsers[0].id : 'default';
}

function getActiveUser() {
  const user = campusUsers.find(u => u.id === activeUserId);
  return user || campusUsers[0] || createDefaultUser();
}

function saveState() {
  try {
    const idx = campusUsers.findIndex(u => u.id === activeUserId);
    if (idx !== -1) {
      campusUsers[idx] = { ...appState };
    } else {
      campusUsers.push({ ...appState });
    }
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(campusUsers));
    localStorage.setItem(STORAGE_KEY_ACTIVE_USER, activeUserId);
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(appState));
  } catch (err) {
    console.warn('Failed to save multi-user state:', err);
  }
}

function switchActiveUser(userId) {
  const target = campusUsers.find(u => u.id === userId);
  if (!target) return;

  activeUserId = target.id;
  appState = target;
  saveState();

  // Re-render all views
  updateHeaderUI();
  renderDashboard();
  renderMissions();
  renderScanner();
  renderLeaderboard();
  renderProfileAndVault();
  renderAccountsList();

  // Update theme if user saved a preference
  if (appState.theme) {
    document.body.classList.toggle('dark-mode', appState.theme === 'dark');
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.innerHTML = appState.theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }
  }

  showToast(`⚡ Switched to ${appState.username} (${appState.role || 'Member'})`);
}

function registerNewUser({ name, role, college, department, dorm, dailyTarget, avatarSymbol }) {
  const newUser = createDefaultUser({
    username: name,
    role: role || 'Student',
    college: college,
    department: department,
    dorm: dorm,
    dailyGoalKwh: dailyTarget || 1.5,
    avatarSymbol: avatarSymbol || '⚡',
    xp: 50,
    energySavedKwh: 0,
    co2SavedKg: 0,
    streak: 1,
    unlockedBadges: ['first-saver']
  });

  campusUsers.push(newUser);
  activeUserId = newUser.id;
  appState = newUser;
  saveState();

  updateHeaderUI();
  renderDashboard();
  renderMissions();
  renderScanner();
  renderLeaderboard();
  renderProfileAndVault();
  renderAccountsList();

  showToast(`Welcome, ${newUser.username}! Registered as ${newUser.role}.`);
}

function deleteUserAccount(userId) {
  if (campusUsers.length <= 1) {
    showToast('⚠️ At least one energy profile must remain active.');
    return;
  }

  const userToDelete = campusUsers.find(u => u.id === userId);
  const name = userToDelete ? userToDelete.username : 'Account';

  if (!confirm(`Are you sure you want to remove ${name} from this device?`)) {
    return;
  }

  campusUsers = campusUsers.filter(u => u.id !== userId);
  if (activeUserId === userId) {
    activeUserId = campusUsers[0].id;
    appState = campusUsers[0];
  }
  saveState();

  updateHeaderUI();
  renderDashboard();
  renderMissions();
  renderScanner();
  renderLeaderboard();
  renderProfileAndVault();
  renderAccountsList();

  showToast(`✓ Removed ${name}`);
}

// =============================================================================
// 2. GAMIFICATION SYSTEM & LEVEL LOGIC
// =============================================================================
const LEVELS = [
  { minXp: 0, maxXp: 199, title: 'Energy Associate', icon: '<i class="fa-solid fa-shield-halved"></i>' },
  { minXp: 200, maxXp: 499, title: 'Energy Specialist', icon: '<i class="fa-solid fa-bolt"></i>' },
  { minXp: 500, maxXp: 999, title: 'Conservation Officer', icon: '<i class="fa-solid fa-leaf"></i>' },
  { minXp: 1000, maxXp: 1499, title: 'Sustainability Lead', icon: '<i class="fa-solid fa-earth-americas"></i>' },
  { minXp: 1500, maxXp: Infinity, title: 'Chief Conservator', icon: '<i class="fa-solid fa-award"></i>' }
];

function getCurrentLevel(xp) {
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].minXp && xp <= LEVELS[i].maxXp) {
      const nextLevel = LEVELS[i + 1] || null;
      const range = nextLevel ? (nextLevel.minXp - LEVELS[i].minXp) : 500;
      const progressInLevel = nextLevel ? (xp - LEVELS[i].minXp) : range;
      const percent = nextLevel ? Math.min(100, Math.round((progressInLevel / range) * 100)) : 100;
      return {
        current: LEVELS[i],
        next: nextLevel,
        percent: percent,
        xpToNext: nextLevel ? nextLevel.minXp - xp : 0
      };
    }
  }
  return { current: LEVELS[0], next: LEVELS[1], percent: 0, xpToNext: 200 };
}

const BADGES_CONFIG = [
  {
    id: 'first-saver',
    title: 'First Saver',
    icon: '<i class="fa-solid fa-seedling"></i>',
    desc: 'Began your energy conservation journey by setting your profile or completing your first mission.',
    reqText: 'Complete your first conservation action or profile setup',
    check: (state) => state.completedMissions.length >= 1 || state.hasRegistered
  },
  {
    id: 'streak-3',
    title: '3-Day Consistency',
    icon: '<i class="fa-solid fa-calendar-check"></i>',
    desc: 'Maintained consecutive daily energy-saving habits for 3 days.',
    reqText: 'Maintain a 3-day active habit streak',
    check: (state) => state.streak >= 3
  },
  {
    id: 'kwh-crusher',
    title: 'Kilowatt Auditor',
    icon: '<i class="fa-solid fa-bolt"></i>',
    desc: 'Saved more than 10 kilowatt-hours of electrical energy from thermal grid generation.',
    reqText: 'Save at least 10.0 kWh total energy',
    check: (state) => state.energySavedKwh >= 10
  },
  {
    id: 'night-owl',
    title: 'Standby Mitigator',
    icon: '<i class="fa-solid fa-power-off"></i>',
    desc: 'Eliminated idle standby phantom power across workstations and entertainment systems overnight.',
    reqText: 'Complete the Phantom Standby mission',
    check: (state) => state.completedMissions.includes('phantom')
  },
  {
    id: 'ac-master',
    title: 'Thermal Optimizer',
    icon: '<i class="fa-solid fa-temperature-arrow-down"></i>',
    desc: 'Kept air conditioning at 24°C or above for maximum efficiency.',
    reqText: 'Complete the 24°C AC Challenge',
    check: (state) => state.completedMissions.includes('ac_24')
  },
  {
    id: 'eco-champion',
    title: 'Eco Lead',
    icon: '<i class="fa-solid fa-award"></i>',
    desc: 'Achieved 500+ XP points in energy conservation challenges.',
    reqText: 'Reach Conservation Officer rank (500 XP)',
    check: (state) => state.xp >= 500
  }
];

// =============================================================================
// 3. DAILY CONSERVATION MISSIONS
// =============================================================================
const MISSIONS_DATA = [
  {
    id: 'ac_24',
    title: 'Set AC to 24°C or Higher',
    desc: 'Keep living space, office, or bedroom air conditioning at an optimal 24°C instead of freezing levels to cut cooling load by 18%.',
    icon: '<i class="fa-solid fa-temperature-arrow-down"></i>',
    category: 'cooling',
    xp: 50,
    kwh: 1.2,
    co2: 0.98,
    difficulty: 'Easy Daily'
  },
  {
    id: 'phantom',
    title: 'Kill Phantom Standby Power',
    desc: 'Unplug phone adapters, work desk power strips, and laptop power bricks when devices reach 100% battery.',
    icon: '<i class="fa-solid fa-plug-circle-xmark"></i>',
    category: 'living',
    xp: 30,
    kwh: 0.5,
    co2: 0.41,
    difficulty: 'Quick Action'
  },
  {
    id: 'stairs',
    title: 'Take Stairs Over Elevators',
    desc: 'Opt for stairway stairs instead of motorized building elevators for trips between 1 to 4 floors.',
    icon: '<i class="fa-solid fa-person-walking"></i>',
    category: 'space',
    xp: 40,
    kwh: 0.8,
    co2: 0.65,
    difficulty: 'Fitness & Eco'
  },
  {
    id: 'lab_screens',
    title: 'Sleep Desktop Workstations & Monitors',
    desc: 'Power down computer display screens and peripherals when completing work sessions or stepping away.',
    icon: '<i class="fa-solid fa-desktop"></i>',
    category: 'tech',
    xp: 35,
    kwh: 0.6,
    co2: 0.49,
    difficulty: 'Office & Tech'
  },
  {
    id: 'fan',
    title: 'Switch Off Unoccupied Fans & Lights',
    desc: 'Turn off ceiling fans and room lighting fixtures whenever stepping out of rooms or unoccupied areas.',
    icon: '<i class="fa-solid fa-fan"></i>',
    category: 'living',
    xp: 30,
    kwh: 0.4,
    co2: 0.33,
    difficulty: 'Daily Habit'
  },
  {
    id: 'sunlight',
    title: 'Open Window Blinds for Daylight',
    desc: 'Use natural window daylight between 09:00 and 16:00 instead of artificial overhead fixtures.',
    icon: '<i class="fa-solid fa-sun"></i>',
    category: 'space',
    xp: 25,
    kwh: 0.3,
    co2: 0.25,
    difficulty: 'Daylight'
  }
];

// =============================================================================
// 4. ENERGY SCANNER / CALCULATOR PRESETS & TIME OF USE (ToU) SURGE SLOTS
// =============================================================================
const TIME_OF_USE_SLOTS = {
  evening: {
    id: 'evening',
    name: 'Evening Peak Period',
    range: '18:00 – 22:00 (6 PM – 10 PM)',
    multiplier: 1.5,
    badgeClass: 'peak',
    icon: '<i class="fa-solid fa-arrow-trend-up"></i>',
    isSurge: true,
    carbonMult: 1.18,
    costLabel: '+50% Peak Surge Penalty',
    shiftTarget: 'offpeak',
    tip: 'High grid demand window. Shifting heavy appliances to off-peak hours significantly reduces energy expenditure and carbon intensity.'
  },
  morning: {
    id: 'morning',
    name: 'Morning Peak Period',
    range: '08:00 – 11:00 (8 AM – 11 AM)',
    multiplier: 1.35,
    badgeClass: 'morning',
    icon: '<i class="fa-solid fa-chart-line"></i>',
    isSurge: true,
    carbonMult: 1.08,
    costLabel: '+35% Morning Peak',
    shiftTarget: 'solar',
    tip: 'Regional grid morning ramp-up. Water heating and major appliances create substantial power demand.'
  },
  solar: {
    id: 'solar',
    name: 'Solar Daytime',
    range: '11:00 – 18:00 (11 AM – 6 PM)',
    multiplier: 1.0,
    badgeClass: 'normal',
    icon: '<i class="fa-solid fa-sun"></i>',
    isSurge: false,
    carbonMult: 0.85,
    costLabel: 'Standard Base Rate',
    shiftTarget: 'solar',
    tip: 'Optimal clean daytime window supported by rooftop solar photovoltaic generation.'
  },
  offpeak: {
    id: 'offpeak',
    name: 'Night Off-Peak',
    range: '22:00 – 08:00 (10 PM – 8 AM)',
    multiplier: 0.8,
    badgeClass: 'offpeak',
    icon: '<i class="fa-solid fa-moon"></i>',
    isSurge: false,
    carbonMult: 0.90,
    costLabel: '-20% Economy Rate',
    shiftTarget: 'offpeak',
    tip: 'Lowest tariff rate. Optimal for overnight charging, thermal water heating, and laundry.'
  },
  allday: {
    id: 'allday',
    name: '24-Hour Continuous',
    range: '24-Hour Continuous',
    multiplier: 1.08,
    badgeClass: 'allday',
    icon: '<i class="fa-solid fa-arrows-spin"></i>',
    isSurge: false,
    carbonMult: 1.0,
    costLabel: 'Weighted Average (1.08x)',
    shiftTarget: 'allday',
    tip: 'Continuous 24-hour appliance operating across base, peak, and off-peak periods.'
  }
};

const SCANNER_PRESETS = [
  { name: 'Air Conditioner (1.5 Ton)', watts: 1500, hours: 5, icon: '<i class="fa-solid fa-snowflake"></i>', slot: 'evening', qty: 1 },
  { name: 'Water Geyser / Heater', watts: 2000, hours: 1.5, icon: '<i class="fa-solid fa-shower"></i>', slot: 'morning', qty: 1 },
  { name: 'Induction Cooktop', watts: 1800, hours: 2, icon: '<i class="fa-solid fa-fire-burner"></i>', slot: 'evening', qty: 1 },
  { name: 'Electric Kettle', watts: 1200, hours: 0.5, icon: '<i class="fa-solid fa-mug-hot"></i>', slot: 'evening', qty: 1 },
  { name: 'Electric Iron', watts: 1000, hours: 0.75, icon: '<i class="fa-solid fa-shirt"></i>', slot: 'morning', qty: 1 },
  { name: 'Desktop Workstation', watts: 350, hours: 4, icon: '<i class="fa-solid fa-desktop"></i>', slot: 'evening', qty: 1 },
  { name: 'Study Laptop', watts: 65, hours: 7, icon: '<i class="fa-solid fa-laptop"></i>', slot: 'solar', qty: 1 },
  { name: 'Ceiling Fan (High Speed)', watts: 75, hours: 12, icon: '<i class="fa-solid fa-fan"></i>', slot: 'allday', qty: 1 },
  { name: 'Refrigerator (Double Door)', watts: 150, hours: 24, icon: '<i class="fa-solid fa-box-archive"></i>', slot: 'allday', qty: 1 },
  { name: 'LED Room Tube Lights', watts: 20, hours: 6, icon: '<i class="fa-solid fa-lightbulb"></i>', slot: 'evening', qty: 2 }
];

const DEFAULT_APPLIANCE_AUDIT = [
  { id: 'app-1', name: 'Workstation / Laptop Computer', watts: 65, qty: 1, hours: 7, days: 30, slot: 'solar', icon: '<i class="fa-solid fa-laptop"></i>' },
  { id: 'app-2', name: 'Ceiling Fan (Standard)', watts: 75, qty: 1, hours: 14, days: 30, slot: 'allday', icon: '<i class="fa-solid fa-fan"></i>' },
  { id: 'app-3', name: 'Water Geyser / Boiler', watts: 2000, qty: 1, hours: 1.5, days: 30, slot: 'morning', icon: '<i class="fa-solid fa-shower"></i>' },
  { id: 'app-4', name: 'Room Air Conditioner (1.5 Ton)', watts: 1500, qty: 1, hours: 5, days: 30, slot: 'evening', icon: '<i class="fa-solid fa-snowflake"></i>' },
  { id: 'app-5', name: 'LED Room Lighting', watts: 20, qty: 2, hours: 6, days: 30, slot: 'evening', icon: '<i class="fa-solid fa-lightbulb"></i>' }
];

// =============================================================================
// 5. MOTIVATIONAL ENERGY QUOTES
// =============================================================================
const ENERGY_QUOTES = [
  { text: "Every watt saved today powers a cleaner, greener community tomorrow.", author: "Smart Grid Initiative" },
  { text: "The greatest threat to our planet is the belief that someone else will save it.", author: "Robert Swan, Polar Explorer" },
  { text: "Energy conservation is the foundation of genuine sustainability.", author: "Energy Economics Council" },
  { text: "Raising room AC by just 1°C saves approximately 6% in grid power demand.", author: "Bureau of Energy Efficiency" },
  { text: "Small actions, multiplied by thousands of consumers, transform global climate impact.", author: "EcoSpark SDG Core" }
];

let currentQuoteIndex = 0;

// Daily conservation tips for spark clicker
const SPARK_TIPS = [
  "Setting your AC thermostat to 24°C saves up to 18% on electrical utility bills!",
  "Unplugging chargers when not in use stops silent 'vampire' standby power drain.",
  "Natural window daylight during morning work hours displaces artificial fluorescent glare.",
  "Using the stairs instead of the elevator saves power while giving you a healthy cardio boost.",
  "Putting computers to sleep when idle saves hundreds of kilowatt-hours annually."
];
let tipIndex = 0;

// =============================================================================
// 6. INITIALIZATION & DOM BINDING
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initSplashScreen();
  initEntryAnimation();
  initTheme();
  initParticleCanvas();
  initNavigation();
  initEnergyOrb();
  initAccountsModal();
  renderDashboard();
  renderMissions();
  renderScanner();
  renderLeaderboard();
  renderProfileAndVault();
  initQuoteRotator();
  
  // Update live clock
  updateLiveIndicators();
});

// Site Entry Loading Animation: Grid Core Bootup
function initEntryAnimation() {
  const loader = document.getElementById('site-intro-loader');
  if (!loader) return;

  const meterFill = document.getElementById('intro-meter-fill');
  const percentText = document.getElementById('intro-percent-text');
  const stepText = document.getElementById('intro-loading-step');
  const syncVal = document.getElementById('intro-telemetry-sync');
  const metersVal = document.getElementById('intro-telemetry-meters');
  const statusMsg = document.getElementById('intro-status-msg');
  const skipBtn = document.getElementById('btn-skip-intro');

  let currentPercent = 0;
  let hasDismissed = false;

  function dismissIntro() {
    if (hasDismissed) return;
    hasDismissed = true;
    loader.classList.add('fade-out');
    setTimeout(() => {
      loader.style.display = 'none';
    }, 450);
  }

  if (skipBtn) {
    skipBtn.onclick = dismissIntro;
  }

  const steps = [
    { p: 15, msg: 'Calibrating power grid & sub-meter telemetry...', step: 'Connecting micro-grid circuits...' },
    { p: 40, msg: 'Synchronizing smart meters across distribution substations...', step: 'Polling electrical sub-meters...' },
    { p: 75, msg: `Loading active profile: ${appState.username} (${appState.role || 'Member'})...`, step: 'Calculating daily conservation baseline...' },
    { p: 100, msg: 'Smart Energy Grid Online • High Distribution Reliability!', step: 'Grid core synchronized!' }
  ];

  const startTime = Date.now();
  const duration = 1900; // 1.9s smooth bootup animation

  const interval = setInterval(() => {
    if (hasDismissed) {
      clearInterval(interval);
      return;
    }

    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / duration);
    currentPercent = Math.round(progress * 100);

    if (meterFill) meterFill.style.width = `${currentPercent}%`;
    if (percentText) percentText.textContent = `${currentPercent}%`;

    // Dynamic telemetry jitter
    if (syncVal) {
      const freq = (50.0 + (Math.random() * 0.08 - 0.04)).toFixed(2);
      syncVal.textContent = `${freq} Hz`;
    }
    if (metersVal) {
      const count = Math.min(1420, Math.floor(progress * 1420));
      metersVal.textContent = count.toLocaleString();
    }

    for (let i = steps.length - 1; i >= 0; i--) {
      if (currentPercent >= steps[i].p) {
        if (stepText) stepText.textContent = steps[i].step;
        if (statusMsg) statusMsg.textContent = steps[i].msg;
        break;
      }
    }

    if (progress >= 1) {
      clearInterval(interval);
      setTimeout(dismissIntro, 350);
    }
  }, 35);
}

function replayEntryAnimation() {
  const loader = document.getElementById('site-intro-loader');
  if (!loader) return;

  loader.style.display = 'flex';
  loader.classList.remove('fade-out');

  const meterFill = document.getElementById('intro-meter-fill');
  const percentText = document.getElementById('intro-percent-text');
  if (meterFill) meterFill.style.width = '0%';
  if (percentText) percentText.textContent = '0%';

  initEntryAnimation();
}

// Remove any artificial splash screen immediately
function initSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (splash) splash.remove();
}

// Clean Theme handling (Light default, Dark optional)
function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const isDark = appState.theme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);

  if (toggleBtn) {
    toggleBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    toggleBtn.title = isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme';
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const nowDark = document.body.classList.contains('dark-mode');
      appState.theme = nowDark ? 'dark' : 'light';
      saveState();
      toggleBtn.innerHTML = nowDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      toggleBtn.title = nowDark ? 'Switch to Light Theme' : 'Switch to Dark Theme';
      showToast(nowDark ? 'Switched to Slate Dark Theme' : 'Switched to Clean Light Theme');
      if (window.energyChartInstance) {
        updateChartColors();
      }
    });
  }
}

// SPA Navigation Router
function switchView(targetViewId) {
  const views = document.querySelectorAll('.view-section');
  const navBtns = document.querySelectorAll('[data-view-target]');
  const mobileDrawer = document.getElementById('mobile-nav-drawer');

  views.forEach(v => {
    if (v.id === targetViewId) {
      v.classList.add('active');
    } else {
      v.classList.remove('active');
    }
  });

  navBtns.forEach(btn => {
    if (btn.getAttribute('data-view-target') === targetViewId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (mobileDrawer) {
    mobileDrawer.classList.remove('open');
  }

  // Scroll smoothly to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Refresh chart if navigating to dashboard
  if (targetViewId === 'dashboard-view') {
    setTimeout(() => {
      if (!window.energyChartInstance) {
        initChart();
      } else {
        window.energyChartInstance.resize();
      }
    }, 100);
  }
}
window.switchView = switchView;

function initNavigation() {
  const navBtns = document.querySelectorAll('[data-view-target]');
  const mobileDrawer = document.getElementById('mobile-nav-drawer');
  const mobileToggleBtn = document.getElementById('mobile-toggle-btn');

  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-view-target');
      if (target) switchView(target);
    });
  });

  if (mobileToggleBtn && mobileDrawer) {
    mobileToggleBtn.addEventListener('click', () => {
      mobileDrawer.classList.toggle('open');
    });
  }

  // Hero action buttons
  const startSavingBtn = document.getElementById('btn-hero-missions');
  if (startSavingBtn) {
    startSavingBtn.addEventListener('click', () => switchView('missions-view'));
  }

  const exploreDashBtn = document.getElementById('btn-hero-dashboard');
  if (exploreDashBtn) {
    exploreDashBtn.addEventListener('click', () => switchView('dashboard-view'));
  }

  // User Nav chip shortcut
  const userChip = document.getElementById('user-nav-chip');
  if (userChip) {
    userChip.addEventListener('click', () => {
      switchView('profile-view');
    });
  }

  // Top Nav "Sign Up / Switch" button
  const navAccountsBtn = document.getElementById('btn-nav-open-accounts');
  if (navAccountsBtn) {
    navAccountsBtn.addEventListener('click', () => {
      openAccountsModal('switch');
    });
  }

  // Hero pill shortcut
  const heroPill = document.getElementById('hero-student-pill');
  if (heroPill) {
    heroPill.addEventListener('click', () => {
      openAccountsModal('switch');
    });
  }

  // Dashboard status bar student chip shortcut
  const dashEditChip = document.getElementById('dash-edit-chip');
  if (dashEditChip) {
    dashEditChip.addEventListener('click', () => {
      openAccountsModal('switch');
    });
  }

  // Home onboarding banner buttons
  const bannerSetupBtn = document.getElementById('btn-banner-setup-profile');
  if (bannerSetupBtn) {
    bannerSetupBtn.addEventListener('click', () => {
      openAccountsModal('signup');
    });
  }

  const bannerSwitchBtn = document.getElementById('btn-banner-switch-user');
  if (bannerSwitchBtn) {
    bannerSwitchBtn.addEventListener('click', () => {
      openAccountsModal('switch');
    });
  }

  // Grid Online status indicator click to replay entry animation
  const statusIndicator = document.getElementById('system-status-indicator');
  if (statusIndicator) {
    statusIndicator.style.cursor = 'pointer';
    statusIndicator.title = 'Click to replay Grid Telemetry Bootup Animation';
    statusIndicator.addEventListener('click', () => {
      replayEntryAnimation();
    });
  }

  // Footer replay animation button
  const footerReplayBtn = document.getElementById('btn-footer-replay-intro');
  if (footerReplayBtn) {
    footerReplayBtn.addEventListener('click', () => {
      replayEntryAnimation();
    });
  }
}

// System Architecture & Method Interactive Inspector
const ARCH_STAGES_DATA = {
  1: {
    badge: 'Stage 01 • Subsystem Specifications',
    title: 'IoT Sensing & Telemetry Ingestion Layer',
    protocol: '<i class="fa-solid fa-satellite-dish"></i> Protocol: Modbus TCP / MQTT Edge Ingestion',
    inputs: '1-Hz active power (kW), grid frequency (Hz), line voltage (V), reactive power (kVAR), and power factor from digital smart meters and branch sub-meters.',
    func: 'Synchronous edge aggregation and noise filtering; dynamic sample decimation and rolling 15-minute RMS demand integration conforming to IEC 62053-22 Class 0.5S standards.',
    outputs: 'Cleaned telemetry telemetry packets published over secure lightweight MQTT channels to edge broker and client dashboard.',
    metrics: '< 50ms ingestion latency, 99.99% sampling fidelity, local buffer stores up to 72 hours of telemetry during network disconnects.'
  },
  2: {
    badge: 'Stage 02 • Subsystem Specifications',
    title: 'Edge Time-of-Use (ToU) Tariff & Surge Engine',
    protocol: '<i class="fa-solid fa-code"></i> Algorithm: Dynamic Priority Peak Surge Rule Engine',
    inputs: 'Real-time system clock, dynamic utility tariff schedule (₹/kWh), regional peak demand notification triggers, and solar generation curve.',
    func: 'Applies time-window multipliers M_slot ∈ {0.8, 1.0, 1.35, 1.50} to base tariff R_base, calculating instantaneous cost per kWh and computing peak surcharge differential ΔC = E · (R_peak - R_offpeak).',
    outputs: 'Live surge warning alerts, tariff state broadcasting (Evening Surge, Morning Peak, Solar Daytime, Night Off-Peak), time-shift savings forecasts.',
    metrics: 'Sub-10ms edge evaluation latency, zero external API latency, 100% offline-first local persistence.'
  },
  3: {
    badge: 'Stage 03 • Subsystem Specifications',
    title: 'Appliance Energy & Carbon Modeling Engine',
    protocol: '<i class="fa-solid fa-calculator"></i> Framework: Deterministic Load Profiling & CEA Footprinting',
    inputs: 'Device wattage rating (W), quantity, daily operational duration (hours), operating days/month, and assigned Time-of-Use temporal slot.',
    func: 'Computes monthly consumption E = (P × h × d) / 1000, evaluates dynamic surge penalties, synthesizes alternate slot savings ΔS = E × R_base × (M_current - M_target), and calculates CEA carbon footprint (0.82 kg CO₂/kWh).',
    outputs: 'Itemized consumption roster, optimal scheduling recommendations, priority shift actions (e.g. shift to Solar or Night), and downloadable audit exports (CSV/PDF).',
    metrics: 'Instantaneous recalculation on slider input, supports up to 100 concurrent appliance profiles without frame drops.'
  },
  4: {
    badge: 'Stage 04 • Subsystem Specifications',
    title: 'Behavioral Demand Response (BDR) & Gamification Loop',
    protocol: '<i class="fa-solid fa-award"></i> Architecture: Event-Driven Incentive & Streak Ledger',
    inputs: 'Active consumer profile, completed conservation challenges, verified off-peak shift logs, and continuous daily login streaks.',
    func: 'Computes energy conservation XP rewards, updates tier milestones (Conservation Initiate to Smart Grid Master), calculates rank standings, and unlocks verifiable accomplishment badges.',
    outputs: 'Real-time rank updates, toast notifications, progress bar animations, multi-profile state synchronization via local storage.',
    metrics: 'Zero cloud latency, multi-account isolation, tamper-evident local state ledger.'
  }
};

function selectArchStage(stageNum) {
  const stage = ARCH_STAGES_DATA[stageNum];
  if (!stage) return;

  // Highlight active stage card
  document.querySelectorAll('.arch-stage-card').forEach((card, idx) => {
    card.classList.toggle('active', (idx + 1) === stageNum);
  });

  // Update inspector elements
  const badgeEl = document.getElementById('inspector-badge');
  const titleEl = document.getElementById('inspector-title');
  const protocolEl = document.getElementById('inspector-protocol');
  const inputsEl = document.getElementById('inspector-inputs');
  const funcEl = document.getElementById('inspector-function');
  const outputsEl = document.getElementById('inspector-outputs');
  const metricsEl = document.getElementById('inspector-metrics');

  if (badgeEl) badgeEl.textContent = stage.badge;
  if (titleEl) titleEl.textContent = stage.title;
  if (protocolEl) protocolEl.innerHTML = stage.protocol;
  if (inputsEl) inputsEl.textContent = stage.inputs;
  if (funcEl) funcEl.textContent = stage.func;
  if (outputsEl) outputsEl.textContent = stage.outputs;
  if (metricsEl) metricsEl.textContent = stage.metrics;
}
window.selectArchStage = selectArchStage;

// Live Status, Frequency & Clock
let liveGridFreq = 50.00;
let liveMicrogridLoad = 412.8;

function updateLiveIndicators() {
  const clockEl = document.getElementById('live-uptime-clock');
  if (clockEl) {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // Realistic micro-jitter for synchronous 50.00 Hz smart grid telemetry
  const jitter = (Math.random() - 0.49) * 0.04;
  liveGridFreq = Math.max(49.96, Math.min(50.04, liveGridFreq + jitter * 0.35));

  const statusIndicator = document.getElementById('system-status-indicator');
  if (statusIndicator) {
    const statusText = statusIndicator.querySelector('span:last-child');
    if (statusText) {
      statusText.textContent = `Grid Telemetry • ${liveGridFreq.toFixed(2)} Hz`;
    }
  }

  // Microgrid load jitter in executive summary
  const loadMetricNumber = document.querySelector('.exec-metric-card .metric-number');
  if (loadMetricNumber) {
    const loadJitter = (Math.random() - 0.5) * 1.6;
    liveMicrogridLoad = Math.max(405.0, Math.min(420.0, liveMicrogridLoad + loadJitter * 0.25));
    loadMetricNumber.textContent = liveMicrogridLoad.toFixed(1);
  }

  setTimeout(updateLiveIndicators, 2200);
}

// Subtle Particle Canvas
function initParticleCanvas() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const PARTICLE_COUNT = Math.min(35, Math.floor(window.innerWidth / 35));

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    const isDark = document.body.classList.contains('dark-mode');
    const dotColor = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(5, 150, 105, 0.18)';
    const lineColor = isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(5, 150, 105, 0.06)';

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(render);
  }

  render();
}

function renderAvatarBadge(symbolOrInitial) {
  if (!symbolOrInitial) return '<i class="fa-solid fa-user"></i>';
  if (symbolOrInitial.startsWith('fa-') || symbolOrInitial.startsWith('fa ')) {
    return `<i class="fa-solid ${symbolOrInitial}"></i>`;
  }
  if (symbolOrInitial.includes('<i') || symbolOrInitial.includes('<svg')) {
    return symbolOrInitial;
  }
  if (symbolOrInitial.length <= 2 && !/[\u{1F300}-\u{1F9FF}]/u.test(symbolOrInitial)) {
    return `<span class="avatar-initials">${escapeHtml(symbolOrInitial)}</span>`;
  }
  return '<i class="fa-solid fa-user"></i>';
}

// Hero Interactive Energy Tip Spark
function initEnergyOrb() {
  const orb = document.getElementById('energy-hero-orb');
  if (!orb) return;

  orb.addEventListener('click', () => {
    tipIndex = (tipIndex + 1) % SPARK_TIPS.length;
    showToast(`Conservation Tip: ${SPARK_TIPS[tipIndex]}`);
  });
}

// =============================================================================
// 7. DASHBOARD RENDERING & CHART.JS
// =============================================================================
function renderDashboard() {
  const levelData = getCurrentLevel(appState.xp);

  setElementText('dash-today-score', '94');
  setElementText('dash-co2-saved', appState.co2SavedKg.toFixed(1));
  setElementText('dash-streak', `${appState.streak} DAYS`);
  setElementText('dash-total-xp', `${appState.xp} XP`);
  setElementText('dash-energy-used', `${appState.energyUsedKwh.toFixed(1)} kWh`);
  setElementText('dash-energy-saved', `${appState.energySavedKwh.toFixed(1)} kWh`);
  setElementText('dash-completed-count', `${appState.completedMissions.length}`);
  
  const levelNameEl = document.getElementById('dash-current-level-name');
  if (levelNameEl) {
    levelNameEl.innerHTML = `${levelData.current.icon} ${levelData.current.title}`;
  }

  // Dynamic Daily Target calculation
  const targetGoal = appState.dailyGoalKwh || 1.5;
  setElementText('dash-target-desc', `Progress toward daily ${targetGoal.toFixed(1)} kWh target`);

  // Circular progress meter against user's target
  const circleEl = document.getElementById('dash-gauge-circle');
  const gaugePercentEl = document.getElementById('dash-gauge-percent');
  const calculatedPercent = Math.min(100, Math.round((appState.energySavedKwh / targetGoal) * 100));
  const targetPercent = appState.energySavedKwh > 0 ? calculatedPercent : 0;

  if (circleEl) {
    const circumference = 440;
    const offset = circumference - (targetPercent / 100) * circumference;
    circleEl.style.strokeDashoffset = offset.toString();
  }
  if (gaugePercentEl) {
    gaugePercentEl.textContent = `${targetPercent}%`;
  }

  // Level progress bar
  const dashBar = document.getElementById('dash-level-progress-bar');
  const dashPercentText = document.getElementById('dash-level-progress-percent');
  if (dashBar) dashBar.style.width = `${levelData.percent}%`;
  if (dashPercentText) dashPercentText.textContent = `${levelData.percent}% to ${levelData.next ? levelData.next.title : 'Max'}`;

  // Update navigation chips and headers
  updateHeaderUI();

  // Lazy init chart
  if (!window.energyChartInstance) {
    initChart();
  }
}

function updateHeaderUI() {
  const chipXp = document.getElementById('nav-chip-xp');
  const chipAvatar = document.getElementById('nav-user-avatar');
  const chipName = document.getElementById('nav-user-name');
  const userChip = document.getElementById('user-nav-chip');
  const roleBadge = document.getElementById('nav-user-role-badge');
  const tabCount = document.getElementById('accounts-tab-count');
  
  if (chipXp) chipXp.textContent = `${appState.xp} XP`;
  if (chipAvatar) chipAvatar.innerHTML = renderAvatarBadge(appState.avatarSymbol || (appState.username ? appState.username.charAt(0).toUpperCase() : 'U'));
  if (chipName) chipName.textContent = appState.username || 'Conservator';
  if (roleBadge) roleBadge.textContent = appState.role || 'Residential';
  if (tabCount) tabCount.textContent = campusUsers.length.toString();

  if (userChip) {
    userChip.title = `${appState.username} (${appState.role || 'Residential'}, ${appState.college || 'District'}) — Click to View Profile`;
  }

  // Update Hero section pill
  const heroPillText = document.getElementById('hero-pill-text');
  if (heroPillText) {
    if (appState.username) {
      heroPillText.innerHTML = `${escapeHtml(appState.role || 'Residential')}: <strong style="color: var(--color-primary);">${escapeHtml(appState.username)}</strong> • ${escapeHtml(appState.college || 'Smart Grid District')}`;
    } else {
      heroPillText.innerHTML = `Smart Grid Demand-Side Energy Management System`;
    }
  }

  // Update Home onboarding banner
  const bannerAvatar = document.getElementById('banner-avatar-icon');
  const bannerHeading = document.getElementById('banner-welcome-heading');
  const bannerSubheading = document.getElementById('banner-welcome-subheading');
  const bannerBtn = document.getElementById('btn-banner-setup-profile');
  
  if (bannerAvatar) bannerAvatar.innerHTML = renderAvatarBadge(appState.avatarSymbol || 'fa-leaf');
  if (bannerHeading) bannerHeading.textContent = `Welcome, ${appState.username}`;
  if (bannerSubheading) {
    bannerSubheading.textContent = `${appState.role || 'Residential'} • ${appState.college || 'District'} • Target: ${(appState.dailyGoalKwh || 1.5).toFixed(1)} kWh/day`;
  }
  if (bannerBtn) {
    bannerBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> <span id="banner-btn-text">Register Profile</span>`;
  }

  // Update Dashboard header operator subheading
  const dashSub = document.getElementById('dash-student-subheading');
  if (dashSub) {
    if (appState.username) {
      dashSub.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--color-primary);"></i> Active Account: <strong>${escapeHtml(appState.username)}</strong> (${escapeHtml(appState.role || 'Residential')}) • ${escapeHtml(appState.department || 'Sector')}`;
    } else {
      dashSub.innerHTML = `<i class="fa-solid fa-user-plus" style="color: var(--color-primary);"></i> Configure user profile`;
    }
  }

  // Update Dashboard status bar chip
  const dashChipName = document.getElementById('dash-student-chip-name');
  if (dashChipName) {
    dashChipName.textContent = appState.username ? `${appState.username} (${appState.role || 'Residential'})` : 'Set Details';
  }
}

function initChart() {
  const ctx = document.getElementById('weeklyEnergyChart');
  if (!ctx) return;

  const isLight = !document.body.classList.contains('dark-mode');
  const primaryColor = isLight ? '#059669' : '#10b981';
  const secondaryColor = isLight ? '#0284c7' : '#38bdf8';
  const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';
  const textColor = isLight ? '#475569' : '#94a3b8';

  const weeklyData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    saved: [2.1, 2.8, 3.4, 1.9, 2.7, 3.1, appState.energySavedKwh > 10 ? 3.8 : 2.4],
    baseline: [4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5]
  };

  // @ts-ignore
  if (typeof Chart === 'undefined') return;

  // @ts-ignore
  if (window.energyChartInstance && typeof window.energyChartInstance.destroy === 'function') {
    // @ts-ignore
    window.energyChartInstance.destroy();
  }

  // @ts-ignore
  window.energyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: weeklyData.labels,
      datasets: [
        {
          label: 'Energy Saved (kWh)',
          data: weeklyData.saved,
          backgroundColor: primaryColor,
          borderRadius: 6,
          borderWidth: 0
        },
        {
          label: 'Regional Grid Baseline (kWh)',
          data: weeklyData.baseline,
          type: 'line',
          borderColor: secondaryColor,
          borderWidth: 2,
          borderDash: [4, 4],
          pointRadius: 3,
          pointBackgroundColor: secondaryColor,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: 'Poppins', size: 12, weight: '500' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#e2e8f0',
          borderColor: primaryColor,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Poppins', size: 11 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'Poppins', size: 11 },
            callback: (v) => `${v} kWh`
          }
        }
      }
    }
  });

  // Chart view switcher
  const toggleBtns = document.querySelectorAll('.chart-card .mission-filter-btn');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const period = btn.getAttribute('data-period');
      if (period === 'monthly') {
        window.energyChartInstance.data.labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        window.energyChartInstance.data.datasets[0].data = [14.2, 18.5, 21.0, 19.8];
        window.energyChartInstance.data.datasets[1].data = [25.0, 25.0, 25.0, 25.0];
      } else {
        window.energyChartInstance.data.labels = weeklyData.labels;
        window.energyChartInstance.data.datasets[0].data = weeklyData.saved;
        window.energyChartInstance.data.datasets[1].data = weeklyData.baseline;
      }
      window.energyChartInstance.update();
    });
  });
}

function updateChartColors() {
  if (!window.energyChartInstance) return;
  const isLight = !document.body.classList.contains('dark-mode');
  const primaryColor = isLight ? '#059669' : '#10b981';
  const secondaryColor = isLight ? '#0284c7' : '#38bdf8';
  const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';
  const textColor = isLight ? '#475569' : '#94a3b8';

  window.energyChartInstance.data.datasets[0].backgroundColor = primaryColor;
  window.energyChartInstance.data.datasets[1].borderColor = secondaryColor;
  window.energyChartInstance.options.plugins.legend.labels.color = textColor;
  window.energyChartInstance.options.scales.x.grid.color = gridColor;
  window.energyChartInstance.options.scales.x.ticks.color = textColor;
  window.energyChartInstance.options.scales.y.grid.color = gridColor;
  window.energyChartInstance.options.scales.y.ticks.color = textColor;
  window.energyChartInstance.update();
}

// Quote Rotator
function initQuoteRotator() {
  const quoteText = document.getElementById('daily-quote-text');
  const quoteAuthor = document.getElementById('daily-quote-author');
  const refreshBtn = document.getElementById('btn-refresh-quote');

  function showQuote(index) {
    if (!quoteText || !quoteAuthor) return;
    const q = ENERGY_QUOTES[index % ENERGY_QUOTES.length];
    quoteText.textContent = `“${q.text}”`;
    quoteAuthor.textContent = `— ${q.author}`;
  }

  showQuote(currentQuoteIndex);

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      currentQuoteIndex = (currentQuoteIndex + 1) % ENERGY_QUOTES.length;
      showQuote(currentQuoteIndex);
    });
  }
}

// =============================================================================
// 8. DAILY MISSIONS
// =============================================================================
function renderMissions(filterCategory = 'all') {
  const grid = document.getElementById('missions-cards-grid');
  if (!grid) return;

  grid.innerHTML = '';

  MISSIONS_DATA.forEach(mission => {
    if (filterCategory !== 'all' && mission.category !== filterCategory) return;

    const isCompleted = appState.completedMissions.includes(mission.id);

    const card = document.createElement('div');
    card.className = `glass-panel mission-card ${isCompleted ? 'completed' : ''}`;
    card.id = `mission-card-${mission.id}`;

    card.innerHTML = `
      <div>
        <div class="mission-header-row">
          <span class="mission-category-tag">${mission.difficulty}</span>
          <span class="mission-xp-badge">+${mission.xp} XP</span>
        </div>
        <h4 class="mission-title">${mission.title}</h4>
        <p class="mission-desc">${mission.desc}</p>
        <div class="mission-impact-row">
          <span class="impact-metric"><i class="fa-solid fa-bolt" style="color: var(--color-primary);"></i> ${mission.kwh} kWh</span>
          <span class="impact-metric"><i class="fa-solid fa-leaf" style="color: var(--color-secondary);"></i> -${mission.co2} kg CO₂</span>
          <button class="btn-complete-mission" id="btn-mission-${mission.id}" ${isCompleted ? 'disabled' : ''}>
            ${isCompleted ? '<i class="fa-solid fa-check"></i> Completed' : '<i class="fa-solid fa-check"></i> Mark Done'}
          </button>
        </div>
      </div>
    `;

    const completeBtn = card.querySelector(`#btn-mission-${mission.id}`);
    if (completeBtn && !isCompleted) {
      completeBtn.addEventListener('click', () => completeMission(mission));
    }

    grid.appendChild(card);
  });

  // Filter Buttons
  const filterBtns = document.querySelectorAll('.missions-filter-bar .mission-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-filter') || 'all';
      renderMissions(cat);
    });
  });
}

function completeMission(mission) {
  if (appState.completedMissions.includes(mission.id)) {
    showToast('⚠️ Mission already completed today!');
    return;
  }

  const prevLevel = getCurrentLevel(appState.xp).current.title;
  appState.completedMissions.push(mission.id);
  appState.completedCount += 1;
  appState.xp += mission.xp;
  appState.energySavedKwh = parseFloat((appState.energySavedKwh + mission.kwh).toFixed(2));
  appState.co2SavedKg = parseFloat((appState.co2SavedKg + mission.co2).toFixed(2));

  // If completing 2nd mission, increase streak
  if (appState.completedMissions.length === 2 && appState.streak === 1) {
    appState.streak = 2;
  }

  saveState();

  // Check badges
  checkBadges();

  // Re-render UI
  renderDashboard();
  renderMissions();
  renderLeaderboard();
  renderProfileAndVault();

  showToast(`Completed: ${mission.title}! +${mission.xp} XP`);

  const newLevel = getCurrentLevel(appState.xp).current.title;
  if (newLevel !== prevLevel) {
    showToast(`Level Advanced: You reached ${newLevel}!`);
  }
}

// =============================================================================
// 9. ENERGY SCANNER, SURGE CALCULATOR & APPLIANCE AUDIT ROSTER
// =============================================================================

function getApplianceAuditList() {
  if (!appState.applianceAudit || !Array.isArray(appState.applianceAudit)) {
    appState.applianceAudit = [];
  }
  return appState.applianceAudit;
}

function saveApplianceAuditList() {
  saveState();
  renderApplianceRoster();
}

/**
 * Intelligent reduction advice engine
 * Calculates consumption, cost, and specific reduction strategies based on time-of-use and appliance type.
 */
function generateApplianceReductionAdvice(applianceName, watts, hours, timeSlot, baseTariff, qty = 1, days = 30) {
  const totalWatts = Math.max(1, watts * qty);
  const slotInfo = TIME_OF_USE_SLOTS[timeSlot] || TIME_OF_USE_SLOTS.evening;
  const effectiveTariff = baseTariff * slotInfo.multiplier;
  const dailyKwh = (totalWatts / 1000) * hours;
  const monthlyKwh = dailyKwh * days;
  const annualKwh = dailyKwh * 365;

  const dailyCost = dailyKwh * effectiveTariff;
  const monthlyCost = monthlyKwh * effectiveTariff;
  const annualCost = dailyCost * 365;

  const baseStandardCost = monthlyKwh * baseTariff;
  const surgePenalty = Math.max(0, monthlyCost - baseStandardCost);

  // Alternative timings
  const solarTariff = baseTariff * TIME_OF_USE_SLOTS.solar.multiplier;
  const solarCost = monthlyKwh * solarTariff;
  const savingsToSolar = Math.max(0, monthlyCost - solarCost);

  const offpeakTariff = baseTariff * TIME_OF_USE_SLOTS.offpeak.multiplier;
  const offpeakCost = monthlyKwh * offpeakTariff;
  const savingsToOffpeak = Math.max(0, monthlyCost - offpeakCost);

  const eveningTariff = baseTariff * TIME_OF_USE_SLOTS.evening.multiplier;
  const eveningCost = monthlyKwh * eveningTariff;
  const extraIfPeak = Math.max(0, eveningCost - monthlyCost);

  // Time-of-use specific analysis
  let timingAssessment = '';
  let timingBadgeClass = 'normal';
  let timingBadgeLabel = slotInfo.name;
  let recommendedActions = [];

  if (timeSlot === 'evening') {
    timingBadgeClass = 'peak';
    timingBadgeLabel = 'Evening Peak (+50% Surge)';
    timingAssessment = `This appliance runs during the <strong>Evening Peak (6:00 PM – 10:00 PM)</strong> when grid demand is highest. You pay <strong>+50% surge tariff (₹ ${(baseTariff * 1.5).toFixed(2)}/kWh)</strong>, adding <strong>₹ ${surgePenalty.toFixed(2)}</strong> in peak penalty every month.`;
    
    if (savingsToSolar > 0.5) {
      recommendedActions.push({
        slot: 'solar',
        label: `Shift to Solar (11 AM–6 PM)`,
        savingsText: `Save ₹ ${savingsToSolar.toFixed(2)}/mo`,
        savingsVal: savingsToSolar,
        icon: 'fa-sun'
      });
    }
    if (savingsToOffpeak > 0.5) {
      recommendedActions.push({
        slot: 'offpeak',
        label: `Shift to Off-Peak (10 PM–8 AM)`,
        savingsText: `Save ₹ ${savingsToOffpeak.toFixed(2)}/mo`,
        savingsVal: savingsToOffpeak,
        icon: 'fa-moon'
      });
    }
  } else if (timeSlot === 'morning') {
    timingBadgeClass = 'morning';
    timingBadgeLabel = 'Morning Peak (+35% Surge)';
    timingAssessment = `Operating in the <strong>Morning Peak (8:00 AM – 11:00 AM)</strong> carries a <strong>+35% surcharge (₹ ${(baseTariff * 1.35).toFixed(2)}/kWh)</strong>, costing an extra <strong>₹ ${surgePenalty.toFixed(2)}/mo</strong>.`;

    if (savingsToOffpeak > 0.5) {
      recommendedActions.push({
        slot: 'offpeak',
        label: `Shift before 8 AM (Night Off-Peak)`,
        savingsText: `Save ₹ ${savingsToOffpeak.toFixed(2)}/mo`,
        savingsVal: savingsToOffpeak,
        icon: 'fa-moon'
      });
    }
    if (savingsToSolar > 0.5) {
      recommendedActions.push({
        slot: 'solar',
        label: `Shift after 11 AM (Solar Daytime)`,
        savingsText: `Save ₹ ${savingsToSolar.toFixed(2)}/mo`,
        savingsVal: savingsToSolar,
        icon: 'fa-sun'
      });
    }
  } else if (timeSlot === 'solar') {
    timingBadgeClass = 'normal';
    timingBadgeLabel = 'Solar Daytime (Base Rate)';
    timingAssessment = `Great timing! Operating during <strong>Solar Daytime (11:00 AM – 6:00 PM)</strong> utilizes clean rooftop solar generation at the standard base tariff (₹ ${baseTariff.toFixed(2)}/kWh).`;
    
    if (savingsToOffpeak > 0.5) {
      recommendedActions.push({
        slot: 'offpeak',
        label: `Shift to Night Off-Peak (-20% Discount)`,
        savingsText: `Save additional ₹ ${savingsToOffpeak.toFixed(2)}/mo`,
        savingsVal: savingsToOffpeak,
        icon: 'fa-moon'
      });
    }
  } else if (timeSlot === 'offpeak') {
    timingBadgeClass = 'offpeak';
    timingBadgeLabel = 'Night Off-Peak (-20% Discount)';
    timingAssessment = `Optimal economic timing! You are utilizing the <strong>Night Off-Peak window (10:00 PM – 8:00 AM)</strong>, earning a <strong>20% discount (₹ ${(baseTariff * 0.8).toFixed(2)}/kWh)</strong> and saving <strong>₹ ${extraIfPeak.toFixed(2)}/mo</strong> compared to peak hours.`;
  } else {
    timingBadgeClass = 'allday';
    timingBadgeLabel = '24-Hour Continuous';
    timingAssessment = `Continuous 24-hour operation runs across all tariff tiers. Because timing cannot be shifted, cost reduction relies directly on energy-saving settings, thermostat setpoints, and high-efficiency hardware.`;
  }

  // Appliance category identification & customized advice
  const nameLower = (applianceName || '').toLowerCase();
  let operationalTips = [];
  let hardwareTip = '';

  if (nameLower.includes('ac') || nameLower.includes('air conditioner') || nameLower.includes('cooling')) {
    operationalTips = [
      `<strong>Set thermostat to 24°C–26°C:</strong> Raising from 18°C to 24°C reduces compressor runtime by ~30%, saving approx. <strong>₹ ${(monthlyCost * 0.3).toFixed(2)}/month</strong>.`,
      `<strong>Use ceiling fan simultaneously:</strong> Gentle ceiling fan airflow creates a wind-chill effect, making 25°C feel as comfortable as 22°C.`,
      timeSlot === 'evening' 
        ? `<strong>Pre-cool during solar hours:</strong> Cool your room to 23°C at 5:00 PM before peak surge begins, then set temperature to 26°C with a 2-hour sleep timer at 6:00 PM.`
        : `<strong>Activate Sleep Mode:</strong> Shuts down or raises temperature by 1°C per hour overnight when outdoor temperatures drop naturally.`
    ];
    hardwareTip = `Clean dust filters every 15 days (dirty filters increase power draw by 15%). Upgrade to a 5-Star BEE Inverter AC to save up to 40% annually.`;
  } else if (nameLower.includes('geyser') || nameLower.includes('water heater') || nameLower.includes('shower') || nameLower.includes('boiler')) {
    operationalTips = [
      `<strong>Limit pre-heating to 15–20 minutes:</strong> Leaving a ${watts}W geyser running continuously for 1–2 hours wastes over <strong>₹ ${(monthlyCost * 0.5).toFixed(2)}/month</strong> in standby heat loss.`,
      `<strong>Adjust thermostat dial to 50°C:</strong> Most factory units are set to 70°C, which causes rapid heat loss and scald hazards. 50°C is optimal and saves 15% energy.`,
      timeSlot === 'morning'
        ? `<strong>Heat water before 8:00 AM:</strong> Complete heating in the Night Off-Peak slot before morning surge pricing starts at 8:00 AM.`
        : `<strong>Install low-flow showerheads:</strong> Reduces hot water volume consumed by 40% without compromising water pressure.`
    ];
    hardwareTip = `Descale the immersion heating element every 6 months; mineral scale creates an insulating barrier that burns 12% more power.`;
  } else if (nameLower.includes('fan') || nameLower.includes('cooler')) {
    const isBldc = watts <= 35;
    operationalTips = [
      `<strong>Turn off when leaving the room:</strong> Fans cool occupants via skin evaporation, not the room air itself. An empty running fan wastes power.`,
      `<strong>Use Electronic Regulators:</strong> Old resistance regulators waste power as heat at lower speeds; electronic regulators save real watts at Speeds 1–3.`
    ];
    if (isBldc) {
      operationalTips.push(`<strong>Already BLDC Efficient:</strong> Consuming only ${watts}W—excellent choice compared to traditional 75W induction fans.`);
      hardwareTip = `Keep motor bearings lubricated and dust fan blades monthly to prevent aerodynamic drag.`;
    } else {
      const bldcSavings = Math.max(0, monthlyCost * (1 - 28 / Math.max(watts, 28)));
      operationalTips.push(`<strong>Upgrade to 5-Star BLDC Motor:</strong> A Brushless DC (BLDC) fan consumes just <strong>28W</strong> vs ${watts}W, saving <strong>₹ ${bldcSavings.toFixed(2)}/month</strong>.`);
      hardwareTip = `BLDC fans pay for their replacement cost within 12–14 months through monthly tariff savings.`;
    }
  } else if (nameLower.includes('fridge') || nameLower.includes('refrigerator')) {
    operationalTips = [
      `<strong>Calibrate Temperature:</strong> Set fridge to <strong>3°C–4°C</strong> and freezer to <strong>-18°C</strong>. Setting cooler than this burns 20% more power without extending food life.`,
      `<strong>Never store hot food directly:</strong> Allow hot meals and tea to reach room temperature first; hot steam forces the compressor into maximum overdrive.`,
      `<strong>Check Door Gasket Seal:</strong> Close the door on a currency note or paper slip. If it slips out effortlessly, replace the magnetic rubber seal.`
    ];
    hardwareTip = `Ensure at least 3–4 inches clearance between the refrigerator back and the wall for unrestricted condenser heat dissipation.`;
  } else if (nameLower.includes('laptop') || nameLower.includes('macbook') || nameLower.includes('tablet')) {
    operationalTips = [
      `<strong>Unplug once charged to 80–90%:</strong> Keeping laptops plugged in 24/7 draws continuous standby current and degrades lithium battery health.`,
      `<strong>Dim screen brightness to 65–75%:</strong> The LCD/OLED display panel consumes up to 40% of overall system power.`,
      `<strong>Enable OS Sleep Mode:</strong> Set screen shutoff to 5 minutes and sleep to 15 minutes of inactivity.`
    ];
    hardwareTip = `Schedule heavy compilation, data analysis, or video rendering during Night Off-Peak hours (after 10 PM).`;
  } else if (nameLower.includes('desktop') || nameLower.includes('pc') || nameLower.includes('workstation') || nameLower.includes('monitor')) {
    operationalTips = [
      `<strong>Kill Vampire Standby Power:</strong> Connect PC, dual monitors, and speakers to a master power strip and switch it off at night (stops 15W–30W phantom drain).`,
      `<strong>Configure Energy Profile:</strong> Use Windows 'Balanced/Energy Saver' or macOS 'Low Power Mode' during web browsing and document editing.`,
      `<strong>Turn off secondary monitors:</strong> Switch off extra screens when watching full-screen video or reading.`
    ];
    hardwareTip = `Choose 80-Plus Gold or Platinum rated power supplies (PSUs) which operate at 90%+ energy efficiency.`;
  } else if (nameLower.includes('cook') || nameLower.includes('induction') || nameLower.includes('stove')) {
    operationalTips = [
      `<strong>Always cover pots with lids:</strong> Traps steam, cuts cooking time by 30%, and allows dropping induction wattage by 2–3 levels.`,
      `<strong>Pre-soak grains and lentils:</strong> Soaking rice, dal, and beans before cooking cuts boiling time in half.`,
      timeSlot === 'evening'
        ? `<strong>Meal-prep before 6:00 PM:</strong> Boil rice and pulses during afternoon solar hours to avoid dinner peak surge tariffs.`
        : `<strong>Use flat ferromagnetic cookware:</strong> Warped pans fail to couple with the induction coil, wasting 20% magnetic energy.`
    ];
    hardwareTip = `Turn off induction 2 minutes before cooking finishes and let retained residual pan heat complete simmering.`;
  } else if (nameLower.includes('iron')) {
    operationalTips = [
      `<strong>Batch iron clothes once a week:</strong> Heating a 1000W iron from cold uses substantial energy; ironing a full week's clothes at once is 35% more efficient.`,
      `<strong>Temperature Sequencing:</strong> Iron delicate synthetics first while heating; iron cotton/linen at max heat; then unplug and finish shirts on residual heat.`,
      timeSlot === 'morning'
        ? `<strong>Shift ironing away from 8–11 AM:</strong> Iron clothes the previous evening (off-peak) or on Sunday afternoon (solar) to avoid the morning surge tariff.`
        : `<strong>Smooth garments while drying:</strong> Hanging shirts carefully on hangers minimizes deep wrinkles and reduces required ironing time.`
    ];
    hardwareTip = `Keep the iron soleplate clean and free of scorched fabric residues to ensure smooth, rapid heat transfer.`;
  } else if (nameLower.includes('wash') || nameLower.includes('dryer') || nameLower.includes('laundry')) {
    operationalTips = [
      `<strong>Wash with Cold Water (30°C):</strong> Heating water consumes <strong>75%–85%</strong> of a washing machine's total electricity. Cold water cleans modern detergents just as effectively!`,
      `<strong>Run full capacity loads:</strong> Two half loads use more power and twice as much water as one full load.`,
      `<strong>Schedule via Delay Timer:</strong> Set your machine's delay timer to start at 12:00 PM (peak solar) or after 10:00 PM (night economy discount).`
    ];
    hardwareTip = `Air dry clothes on laundry racks whenever weather allows rather than running electric tumble dryers.`;
  } else if (nameLower.includes('light') || nameLower.includes('lamp') || nameLower.includes('bulb') || nameLower.includes('tube')) {
    operationalTips = [
      `<strong>Harvest Window Daylight:</strong> Open window blinds and position work desks near windows to eliminate daytime artificial lighting needs.`,
      `<strong>Task Lighting over Ambient:</strong> Use a focused 5W–9W LED desk lamp for working rather than lighting up the entire room with high-wattage ceiling fixtures.`,
      `<strong>Switch off when vacating:</strong> A 10-second habit of switching off lights when leaving the room compounds into significant savings.`
    ];
    hardwareTip = `Ensure all sockets use 9W–12W BEE 5-Star LEDs (replaces 60W incandescents or 24W CFLs, cutting electricity by up to 80%).`;
  } else if (nameLower.includes('kettle') || nameLower.includes('microwave') || nameLower.includes('oven')) {
    operationalTips = [
      `<strong>Boil only the water needed:</strong> Boiling 500ml for a single mug takes 1/3 the energy and time of boiling a full 1.5L kettle.`,
      `<strong>Microwave instead of Oven for reheating:</strong> Microwaves heat food directly via water molecules, using 60% less energy than heating a whole conventional oven.`,
      `<strong>Unplug after use:</strong> Digital clock displays on microwaves draw continuous standby electricity 24 hours a day.`
    ];
    hardwareTip = `Descale electric kettles monthly with mild vinegar to maintain rapid heat conduction.`;
  } else if (nameLower.includes('tv') || nameLower.includes('television')) {
    operationalTips = [
      `<strong>Enable Eco / Auto-Dimming Mode:</strong> Dynamically adjusts backlight brightness based on room lighting, reducing display power by up to 35%.`,
      `<strong>Turn off at wall switch:</strong> Modern smart TVs and streaming sticks draw 5W–15W in standby mode waiting for remote signals.`,
      `<strong>Set a Sleep Timer:</strong> Prevents TVs from playing unnoticed for hours if you doze off while watching.`
    ];
    hardwareTip = `Lower default backlight from 100% to 70%—delivers better contrast in dimmed rooms while significantly reducing power.`;
  } else {
    // Custom / Generic appliance
    operationalTips = [
      timeSlot === 'evening' || timeSlot === 'morning'
        ? `<strong>Avoid Peak Surge Hours:</strong> Operating during ${slotInfo.name} adds a surcharge. Shifting usage to Solar (11 AM–6 PM) or Off-Peak (10 PM–8 AM) saves up to ₹ ${savingsToOffpeak.toFixed(2)}/month.`
        : `<strong>Maintain Scheduled Hours:</strong> Current operating time (${slotInfo.name}) is cost-effective. Keep daily duration under control.`,
      `<strong>Eliminate Phantom Draw:</strong> Disconnect the wall plug when not in active use to prevent silent standby electricity consumption.`,
      `<strong>Use Smart Timer Plugs:</strong> Plug high-draw equipment into a programmable timer socket to automatically prevent accidental overnight runs.`
    ];
    hardwareTip = `When purchasing appliances and electronics, prioritize BEE 5-Star or Energy Star certified models to cut consumption by 30%–50%.`;
  }

  return {
    dailyKwh,
    monthlyKwh,
    annualKwh,
    dailyCost,
    monthlyCost,
    annualCost,
    effectiveTariff,
    surgePenalty,
    savingsToSolar,
    savingsToOffpeak,
    extraIfPeak,
    timingAssessment,
    timingBadgeClass,
    timingBadgeLabel,
    recommendedActions,
    operationalTips,
    hardwareTip
  };
}

function initScanner() {
  const nameInput = document.getElementById('scanner-appliance-name');
  const qtyInput = document.getElementById('scanner-qty');
  const wattsInput = document.getElementById('scanner-watts');
  const hoursInput = document.getElementById('scanner-hours');
  const daysInput = document.getElementById('scanner-days');
  const tariffInput = document.getElementById('scanner-tariff');
  const chipsContainer = document.getElementById('scanner-preset-chips');
  const addToAuditBtn = document.getElementById('btn-add-to-audit');
  const resetCalcBtn = document.getElementById('btn-reset-calculator') || document.getElementById('btn-reset-calc');
  const quickAddSampleBtn = document.getElementById('btn-quick-add-sample') || document.getElementById('btn-load-preset-audit');
  const clearAuditBtn = document.getElementById('btn-clear-audit');

  // Render Preset chips
  if (chipsContainer) {
    chipsContainer.innerHTML = '';
    SCANNER_PRESETS.forEach(preset => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'preset-pill';
      chip.innerHTML = `${preset.icon} ${preset.name}`;
      chip.addEventListener('click', () => {
        document.querySelectorAll('.preset-pill').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (nameInput) nameInput.value = preset.name;
        if (wattsInput) wattsInput.value = preset.watts;
        if (hoursInput) hoursInput.value = preset.hours;
        if (qtyInput) qtyInput.value = preset.qty || 1;

        // Select preset time-of-use slot
        if (preset.slot) {
          selectTimeSlot(preset.slot);
        }
        calculateScanner();
      });
      chipsContainer.appendChild(chip);
    });
  }

  // Quick watt buttons
  document.querySelectorAll('[data-set-watts]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseFloat(btn.getAttribute('data-set-watts') || '100');
      if (wattsInput) wattsInput.value = val;
      calculateScanner();
    });
  });

  // Slider and number inputs
  [nameInput, qtyInput, wattsInput, hoursInput, daysInput, tariffInput].forEach(inp => {
    if (inp) {
      inp.addEventListener('input', calculateScanner);
      inp.addEventListener('change', calculateScanner);
    }
  });

  // Time-of-Use slot buttons
  document.querySelectorAll('.time-slot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = btn.getAttribute('data-slot');
      if (slot) selectTimeSlot(slot);
      calculateScanner();
    });
  });

  // Add to Audit Button
  if (addToAuditBtn) {
    addToAuditBtn.onclick = addToApplianceAudit;
  }

  // Reset Button
  if (resetCalcBtn) {
    resetCalcBtn.onclick = () => {
      if (nameInput) nameInput.value = 'Air Conditioner (1.5 Ton)';
      if (qtyInput) qtyInput.value = '1';
      if (wattsInput) wattsInput.value = '1500';
      if (hoursInput) hoursInput.value = '5';
      if (daysInput) daysInput.value = '30';
      if (tariffInput) tariffInput.value = '8.5';
      selectTimeSlot('evening');
      calculateScanner();
      showToast('Calculator reset to standard AC baseline.');
    };
  }

  // Quick Add Sample Appliances
  if (quickAddSampleBtn) {
    quickAddSampleBtn.onclick = quickAddSampleAudit;
  }

  // Clear Audit
  if (clearAuditBtn) {
    clearAuditBtn.onclick = clearAuditRoster;
  }

  // Export Audit Modal Trigger
  const exportAuditBtn = document.getElementById('btn-export-audit');
  if (exportAuditBtn) {
    exportAuditBtn.onclick = openAuditExportModal;
  }

  // Audit Toolbar Filter Chips
  document.querySelectorAll('.audit-filter-chip').forEach(chip => {
    chip.onclick = () => {
      document.querySelectorAll('.audit-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentAuditFilter = chip.getAttribute('data-audit-filter') || 'all';
      renderApplianceRoster();
    };
  });

  // Audit Search Input
  const searchInput = document.getElementById('audit-search-input');
  if (searchInput) {
    searchInput.oninput = (e) => {
      currentAuditSearch = e.target.value.toLowerCase().trim();
      renderApplianceRoster();
    };
  }

  // Audit Sort Select
  const sortSelect = document.getElementById('audit-sort-select');
  if (sortSelect) {
    sortSelect.onchange = (e) => {
      currentAuditSort = e.target.value;
      renderApplianceRoster();
    };
  }

  // Initialize Audit Export Modal Actions once
  initAuditExportModal();

  // Live Grid Clock
  updateLiveGridTariffClock();

  // Initial Calculation and Render
  calculateScanner();
  renderApplianceRoster();
}

function selectTimeSlot(slotId) {
  document.querySelectorAll('.time-slot-btn').forEach(b => {
    if (b.getAttribute('data-slot') === slotId) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });
}

/**
 * Apply time shift directly in the calculator
 */
function applyScannerTimeShift(slotKey) {
  selectTimeSlot(slotKey);
  calculateScanner();
  const slot = TIME_OF_USE_SLOTS[slotKey];
  showToast(`Shifted to ${slot ? slot.name : slotKey}! Recalculated savings.`);
}
window.applyScannerTimeShift = applyScannerTimeShift;

function updateLiveGridTariffClock() {
  const currentHour = new Date().getHours();
  let currentSlotKey = 'solar';
  let badgeColor = 'var(--color-primary)';

  if (currentHour >= 18 && currentHour < 22) {
    currentSlotKey = 'evening';
    badgeColor = '#ef4444';
  } else if (currentHour >= 8 && currentHour < 11) {
    currentSlotKey = 'morning';
    badgeColor = '#f97316';
  } else if (currentHour >= 11 && currentHour < 18) {
    currentSlotKey = 'solar';
    badgeColor = '#0284c7';
  } else {
    currentSlotKey = 'offpeak';
    badgeColor = '#10b981';
  }

  const slotInfo = TIME_OF_USE_SLOTS[currentSlotKey];
  const liveState = document.getElementById('live-grid-tariff-state');
  const pulseDot = document.querySelector('.status-pulse-dot');

  if (liveState && slotInfo) {
    liveState.textContent = `${slotInfo.name} (${slotInfo.costLabel})`;
    liveState.style.color = badgeColor;
  }

  if (pulseDot) {
    pulseDot.style.background = badgeColor;
  }

  // Highlight in schedule strip
  document.querySelectorAll('.tou-pill').forEach(pill => {
    if (pill.classList.contains(currentSlotKey)) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

function calculateScanner() {
  const name = (document.getElementById('scanner-appliance-name')?.value || '').trim() || 'Appliance';
  const watts = Math.max(1, parseFloat(document.getElementById('scanner-watts')?.value || '1500'));
  const qty = Math.max(1, parseInt(document.getElementById('scanner-qty')?.value || '1', 10));
  const hours = Math.max(0.1, parseFloat(document.getElementById('scanner-hours')?.value || '5'));
  const days = Math.max(1, parseInt(document.getElementById('scanner-days')?.value || '30', 10));
  const baseTariff = Math.max(0.5, parseFloat(document.getElementById('scanner-tariff')?.value || '8.5'));

  const activeBtn = document.querySelector('.time-slot-btn.active');
  const selectedSlotKey = activeBtn ? activeBtn.getAttribute('data-slot') || 'evening' : 'evening';
  const slotInfo = TIME_OF_USE_SLOTS[selectedSlotKey] || TIME_OF_USE_SLOTS.evening;

  // Real-time input label reflections
  setElementText('scanner-watts-val', `${watts * qty} W`);
  setElementText('scanner-kw-val', `(${((watts * qty) / 1000).toFixed(3)} kW)`);
  setElementText('scanner-qty-val', `${qty} Unit${qty > 1 ? 's' : ''}`);
  setElementText('scanner-hours-val', `${hours.toFixed(1)} hrs / day`);
  setElementText('scanner-days-val', `${days} days / mo`);
  setElementText('scanner-tariff-val', `₹ ${baseTariff.toFixed(2)}`);

  // Run reduction analysis engine
  const advice = generateApplianceReductionAdvice(name, watts, hours, selectedSlotKey, baseTariff, qty, days);

  // Carbon Emission calculation
  const carbonMultiplier = slotInfo.carbonMult || 1.0;
  const co2Emissions = advice.monthlyKwh * 0.82 * carbonMultiplier;
  const treeMonths = (co2Emissions / 1.81).toFixed(1);

  // Update Output Displays
  setElementText('scanner-kwh-result', `${advice.monthlyKwh.toFixed(1)} kWh`);
  setElementText('scanner-daily-kwh', `${advice.dailyKwh.toFixed(2)} kWh / day`);
  setElementText('scanner-annual-kwh', `• ${advice.annualKwh.toFixed(1)} kWh / year`);
  setElementText('scanner-money-result', `₹ ${advice.monthlyCost.toFixed(2)}`);
  setElementText('scanner-base-cost-text', `≈ ₹ ${advice.dailyCost.toFixed(2)} / day • ₹ ${advice.annualCost.toFixed(2)} / year`);
  setElementText('scanner-effective-rate', `Effective: ₹ ${advice.effectiveTariff.toFixed(2)} / kWh`);

  // Surge Surcharge Badge
  const surgePill = document.getElementById('scanner-surge-pill');
  if (surgePill) {
    if (slotInfo.isSurge) {
      surgePill.className = 'surge-surcharge-pill surge';
      surgePill.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Includes ₹ ${advice.surgePenalty.toFixed(2)} Peak Surcharge`;
      surgePill.style.display = 'inline-flex';
    } else if (selectedSlotKey === 'offpeak') {
      const discount = advice.monthlyKwh * baseTariff - advice.monthlyCost;
      surgePill.className = 'surge-surcharge-pill discount';
      surgePill.innerHTML = `<i class="fa-solid fa-leaf"></i> Saves ₹ ${discount.toFixed(2)} via Night Discount`;
      surgePill.style.display = 'inline-flex';
    } else if (selectedSlotKey === 'solar') {
      surgePill.className = 'surge-surcharge-pill normal';
      surgePill.innerHTML = `<i class="fa-solid fa-sun"></i> Base Tariff (No Surcharge)`;
      surgePill.style.display = 'inline-flex';
    } else {
      surgePill.className = 'surge-surcharge-pill neutral';
      surgePill.innerHTML = `<i class="fa-solid fa-arrows-spin"></i> 24h Blended Rate`;
      surgePill.style.display = 'inline-flex';
    }
  }

  setElementText('scanner-co2-result', `${co2Emissions.toFixed(1)} kg`);
  setElementText('scanner-trees-offset', `≈ ${treeMonths} tree-months to offset`);

  // Render "Ways to Reduce Electricity & Cost" Live Advice Card
  const timingTag = document.getElementById('scanner-timing-tag');
  if (timingTag) {
    timingTag.className = `badge-tou-slot ${advice.timingBadgeClass}`;
    timingTag.textContent = advice.timingBadgeLabel;
  }

  const timingSavingsText = document.getElementById('timing-savings-text');
  if (timingSavingsText) {
    timingSavingsText.innerHTML = advice.timingAssessment;
  }

  const actionsRow = document.getElementById('timing-actions-row');
  if (actionsRow) {
    if (advice.recommendedActions.length > 0) {
      actionsRow.style.display = 'flex';
      actionsRow.innerHTML = advice.recommendedActions.map(act => `
        <button type="button" class="btn-quick-shift" onclick="applyScannerTimeShift('${act.slot}')">
          <i class="fa-solid ${act.icon}"></i> ${act.label} (<strong>${act.savingsText}</strong>)
        </button>
      `).join('');
    } else {
      actionsRow.style.display = 'none';
      actionsRow.innerHTML = '';
    }
  }

  const tipsList = document.getElementById('reduction-tips-list');
  if (tipsList) {
    const tipsHtml = advice.operationalTips.map(t => `
      <div class="reduction-tip-item">
        <div class="reduction-tip-icon"><i class="fa-solid fa-lightbulb"></i></div>
        <div>${t}</div>
      </div>
    `).join('') + `
      <div class="reduction-tip-item">
        <div class="reduction-tip-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;"><i class="fa-solid fa-bolt"></i></div>
        <div><strong>Hardware & Efficiency:</strong> ${advice.hardwareTip}</div>
      </div>
    `;
    tipsList.innerHTML = tipsHtml;
  }

  // Surge Alert Banner Logic
  const surgeAlertEl = document.getElementById('scanner-surge-alert');
  const alertTitle = document.getElementById('surge-alert-title');
  const alertDesc = document.getElementById('surge-alert-desc');
  const alertSavings = document.getElementById('surge-savings-val');

  if (surgeAlertEl) {
    if (slotInfo.isSurge && (watts * qty) >= 400) {
      surgeAlertEl.style.display = 'flex';
      if (alertTitle) alertTitle.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> High Demand Load in ${escapeHtml(slotInfo.name)}`;
      if (alertDesc) {
        alertDesc.innerHTML = `Using <strong>${watts * qty}W</strong> during peak hours adds 
          <strong>₹ ${advice.surgePenalty.toFixed(2)}</strong> surcharge. Shifting usage avoids grid stress.`;
      }
      if (alertSavings) {
        alertSavings.innerHTML = `<i class="fa-solid fa-arrow-right-arrow-left"></i> Shift to Solar or Off-Peak: Save up to ₹ ${advice.savingsToOffpeak.toFixed(2)} monthly`;
      }
    } else {
      surgeAlertEl.style.display = 'none';
    }
  }

  // Tariff Rate Comparison Bars
  const peakMonthly = advice.monthlyKwh * (baseTariff * TIME_OF_USE_SLOTS.evening.multiplier);
  const normalMonthly = advice.monthlyKwh * baseTariff;
  const offpeakMonthly = advice.monthlyKwh * (baseTariff * TIME_OF_USE_SLOTS.offpeak.multiplier);

  const maxVal = Math.max(peakMonthly, 1);
  const peakBar = document.getElementById('comp-bar-peak');
  const normalBar = document.getElementById('comp-bar-normal');
  const offpeakBar = document.getElementById('comp-bar-offpeak');

  if (peakBar) peakBar.style.width = `${Math.min(100, Math.round((peakMonthly / maxVal) * 100))}%`;
  if (normalBar) normalBar.style.width = `${Math.min(100, Math.round((normalMonthly / maxVal) * 100))}%`;
  if (offpeakBar) offpeakBar.style.width = `${Math.min(100, Math.round((offpeakMonthly / maxVal) * 100))}%`;

  setElementText('comp-val-peak', `₹ ${peakMonthly.toFixed(2)}`);
  setElementText('comp-val-normal', `₹ ${normalMonthly.toFixed(2)}`);
  setElementText('comp-val-offpeak', `₹ ${offpeakMonthly.toFixed(2)}`);

  const shiftDiffText = document.getElementById('scanner-shift-diff-text');
  if (shiftDiffText) {
    const diff = peakMonthly - offpeakMonthly;
    shiftDiffText.textContent = `Save up to ₹ ${diff.toFixed(2)}/mo by shifting hours`;
  }

  // Load Tier Meter
  const tierFill = document.getElementById('scanner-tier-fill');
  const tierTag = document.getElementById('scanner-tier-tag');
  let tier = 'Light Room Load';
  let percent = 25;

  if (advice.monthlyKwh > 120) {
    tier = 'Heavy Load';
    percent = 92;
  } else if (advice.monthlyKwh > 50) {
    tier = 'Moderate Load';
    percent = 60;
  } else if (advice.monthlyKwh > 20) {
    tier = 'Standard Room Load';
    percent = 40;
  }

  if (tierFill) tierFill.style.width = `${percent}%`;
  if (tierTag) tierTag.textContent = tier;
}

function addToApplianceAudit() {
  const nameInput = document.getElementById('scanner-appliance-name');
  const qtyInput = document.getElementById('scanner-qty');
  const wattsInput = document.getElementById('scanner-watts');
  const hoursInput = document.getElementById('scanner-hours');
  const daysInput = document.getElementById('scanner-days');

  const name = (nameInput?.value || '').trim() || 'Custom Appliance';
  const qty = Math.max(1, parseInt(qtyInput?.value || '1', 10));
  const watts = Math.max(1, parseFloat(wattsInput?.value || '100'));
  const hours = Math.max(0.1, parseFloat(hoursInput?.value || '4'));
  const days = Math.max(1, parseInt(daysInput?.value || '30', 10));

  const activeBtn = document.querySelector('.time-slot-btn.active');
  const slot = activeBtn ? activeBtn.getAttribute('data-slot') || 'evening' : 'evening';

  // Choose icon based on name
  let icon = '<i class="fa-solid fa-bolt"></i>';
  const lower = name.toLowerCase();
  if (lower.includes('ac') || lower.includes('air') || lower.includes('condition')) icon = '<i class="fa-solid fa-snowflake"></i>';
  else if (lower.includes('fan')) icon = '<i class="fa-solid fa-fan"></i>';
  else if (lower.includes('geyser') || lower.includes('water') || lower.includes('heater') || lower.includes('shower')) icon = '<i class="fa-solid fa-shower"></i>';
  else if (lower.includes('laptop') || lower.includes('macbook')) icon = '<i class="fa-solid fa-laptop"></i>';
  else if (lower.includes('pc') || lower.includes('desktop') || lower.includes('computer')) icon = '<i class="fa-solid fa-desktop"></i>';
  else if (lower.includes('light') || lower.includes('bulb') || lower.includes('lamp') || lower.includes('tube')) icon = '<i class="fa-solid fa-lightbulb"></i>';
  else if (lower.includes('fridge') || lower.includes('refrigerator')) icon = '<i class="fa-solid fa-box-archive"></i>';
  else if (lower.includes('kettle')) icon = '<i class="fa-solid fa-mug-hot"></i>';
  else if (lower.includes('cook') || lower.includes('induction') || lower.includes('stove')) icon = '<i class="fa-solid fa-fire-burner"></i>';
  else if (lower.includes('iron')) icon = '<i class="fa-solid fa-shirt"></i>';
  else if (lower.includes('wash') || lower.includes('laundry')) icon = '<i class="fa-solid fa-soap"></i>';
  else if (lower.includes('tv') || lower.includes('television')) icon = '<i class="fa-solid fa-tv"></i>';

  const newAppliance = {
    id: `app_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name,
    qty,
    watts,
    hours,
    days,
    slot,
    icon
  };

  const list = getApplianceAuditList();
  list.unshift(newAppliance);
  saveApplianceAuditList();

  showToast(`Added ${name} (${watts * qty}W, ${hours}h/d) to audit roster!`);
}

function removeAuditAppliance(applianceId) {
  const list = getApplianceAuditList();
  const idx = list.findIndex(a => a.id === applianceId);
  if (idx !== -1) {
    const removed = list.splice(idx, 1)[0];
    saveApplianceAuditList();
    showToast(`Removed ${removed.name} from audit roster.`);
  }
}
window.removeAuditAppliance = removeAuditAppliance;

/**
 * One-click shift an appliance's time-of-use slot directly in the audit table
 */
function shiftAuditApplianceSlot(applianceId, newSlot) {
  const list = getApplianceAuditList();
  const item = list.find(a => a.id === applianceId);
  if (item) {
    const oldSlot = item.slot;
    item.slot = newSlot;
    saveApplianceAuditList();
    const newSlotInfo = TIME_OF_USE_SLOTS[newSlot];
    showToast(`Shifted "${item.name}" to ${newSlotInfo ? newSlotInfo.name : newSlot}! Bill updated.`);
  }
}
window.shiftAuditApplianceSlot = shiftAuditApplianceSlot;

/**
 * Toggle expandable tips drawer in audit table
 */
function toggleApplianceTips(applianceId) {
  const drawer = document.getElementById(`drawer-${applianceId}`);
  if (drawer) {
    const isHidden = drawer.style.display === 'none' || !drawer.style.display;
    drawer.style.display = isHidden ? 'table-row' : 'none';
  }
}
window.toggleApplianceTips = toggleApplianceTips;

function quickAddSampleAudit() {
  const sampleItems = [
    { id: 'app-s1', name: 'Workstation / Laptop Computer', watts: 65, qty: 1, hours: 7, days: 30, slot: 'solar', icon: '<i class="fa-solid fa-laptop"></i>' },
    { id: 'app-s2', name: 'Ceiling Fan (Standard)', watts: 75, qty: 1, hours: 14, days: 30, slot: 'allday', icon: '<i class="fa-solid fa-fan"></i>' },
    { id: 'app-s3', name: 'Water Geyser (Morning Bath)', watts: 2000, qty: 1, hours: 1, days: 30, slot: 'morning', icon: '<i class="fa-solid fa-shower"></i>' },
    { id: 'app-s4', name: 'Room Air Conditioner (1.5 Ton)', watts: 1500, qty: 1, hours: 5, days: 30, slot: 'evening', icon: '<i class="fa-solid fa-snowflake"></i>' },
    { id: 'app-s5', name: 'LED Room Lighting', watts: 20, qty: 2, hours: 6, days: 30, slot: 'evening', icon: '<i class="fa-solid fa-lightbulb"></i>' }
  ];

  appState.applianceAudit = sampleItems;
  saveApplianceAuditList();
  showToast('Added standard daily household appliances to audit.');
}
window.quickAddSampleAudit = quickAddSampleAudit;

function clearAuditRoster() {
  if (confirm('Clear all appliances from your audit roster?')) {
    appState.applianceAudit = [];
    saveApplianceAuditList();
    showToast('Audit roster cleared.');
  }
}

let currentAuditFilter = 'all';
let currentAuditSort = 'cost-desc';
let currentAuditSearch = '';

function renderApplianceRoster() {
  const tbody = document.getElementById('appliance-audit-tbody');
  const countBadge = document.getElementById('audit-count-badge');
  const list = getApplianceAuditList();
  const baseTariff = Math.max(0.5, parseFloat(document.getElementById('scanner-tariff')?.value || '8.5'));

  if (countBadge) countBadge.textContent = `${list.length} Tracked`;

  if (!tbody) return;
  tbody.innerHTML = '';

  // Calculate Cumulative Metrics across ALL items (for the summary strip)
  let totalCumulativeMonthlyKwh = 0;
  let totalCumulativeDailyKwh = 0;
  let totalCumulativeBill = 0;
  let totalBaseCost = 0;
  let totalSurgePenalty = 0;
  let totalShiftSavings = 0;
  let surgeDevicesCount = 0;

  // Prepare full advice list
  const listWithAdvice = list.map(item => {
    const qty = item.qty || 1;
    const totalWatts = item.watts * qty;
    const slot = TIME_OF_USE_SLOTS[item.slot] || TIME_OF_USE_SLOTS.evening;
    const days = item.days || 30;
    const advice = generateApplianceReductionAdvice(item.name, item.watts, item.hours, item.slot, baseTariff, qty, days);

    totalCumulativeDailyKwh += advice.dailyKwh;
    totalCumulativeMonthlyKwh += advice.monthlyKwh;
    totalCumulativeBill += advice.monthlyCost;
    totalBaseCost += (advice.monthlyKwh * baseTariff);
    totalSurgePenalty += advice.surgePenalty;
    totalShiftSavings += advice.savingsToOffpeak;

    if (slot.isSurge) {
      surgeDevicesCount++;
    }

    return { item, qty, totalWatts, slot, days, advice };
  });

  // Update Summary Strip
  setElementText('audit-total-kwh', `${totalCumulativeMonthlyKwh.toFixed(1)} kWh`);
  setElementText('audit-daily-average', `${totalCumulativeDailyKwh.toFixed(2)} kWh/day • ${(totalCumulativeDailyKwh * 365).toFixed(0)} kWh/yr`);
  setElementText('audit-total-bill', `₹ ${totalCumulativeBill.toFixed(2)}`);
  setElementText('audit-base-bill-text', `Base: ₹ ${totalBaseCost.toFixed(2)} (Standard Tariff)`);
  setElementText('audit-total-surge-penalty', `₹ ${totalSurgePenalty.toFixed(2)}`);
  setElementText('audit-surge-devices-count', `${surgeDevicesCount} Peak Load Appliance${surgeDevicesCount === 1 ? '' : 's'}`);
  setElementText('audit-shift-savings', `₹ ${totalShiftSavings.toFixed(2)}`);
  const co2SavingsKg = (totalShiftSavings / (baseTariff * 0.5)) * 0.82;
  setElementText('audit-co2-avoided-text', `Avoids up to ${Math.max(0, co2SavingsKg).toFixed(1)} kg CO₂ grid emissions`);

  // Update Toolbar Filter Counts
  const countAll = list.length;
  const countSurge = list.filter(a => TIME_OF_USE_SLOTS[a.slot]?.isSurge).length;
  const countSolar = list.filter(a => a.slot === 'solar').length;
  const countOffpeak = list.filter(a => a.slot === 'offpeak').length;
  const countAllday = list.filter(a => a.slot === 'allday').length;

  setElementText('audit-filter-count-all', countAll);
  setElementText('audit-filter-count-surge', countSurge);
  setElementText('audit-filter-count-solar', countSolar);
  setElementText('audit-filter-count-offpeak', countOffpeak);
  setElementText('audit-filter-count-allday', countAllday);

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem; opacity: 0.7;">🔌</div>
          <strong style="display: block; font-size: 1.05rem; color: var(--text-primary); margin-bottom: 0.35rem;">
            No appliances added yet
          </strong>
          <span style="font-size: 0.85rem; display: block; max-width: 460px; margin: 0 auto 1.25rem;">
            Use the calculator above to configure your daily appliances (AC, Laptop, Geyser, Lights, etc.) 
            and click <strong>"Add to Appliance Audit Roster"</strong> to calculate electricity consumption, costs, and time-based savings!
          </span>
          <button type="button" class="btn-clean btn-secondary-clean" onclick="quickAddSampleAudit()" style="display: inline-flex; font-size: 0.82rem; padding: 0.45rem 1rem;">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Load 5 Common Household Appliances
          </button>
        </td>
      </tr>
    `;
    return;
  }

  // Filter Items based on active chip and search query
  let filteredList = listWithAdvice.filter(entry => {
    // Slot Filter
    if (currentAuditFilter === 'surge' && !entry.slot.isSurge) return false;
    if (currentAuditFilter === 'solar' && entry.item.slot !== 'solar') return false;
    if (currentAuditFilter === 'offpeak' && entry.item.slot !== 'offpeak') return false;
    if (currentAuditFilter === 'allday' && entry.item.slot !== 'allday') return false;

    // Search Filter
    if (currentAuditSearch) {
      const q = currentAuditSearch;
      const nameMatch = entry.item.name.toLowerCase().includes(q);
      const slotMatch = entry.slot.name.toLowerCase().includes(q);
      if (!nameMatch && !slotMatch) return false;
    }
    return true;
  });

  // Sort Items
  filteredList.sort((a, b) => {
    switch (currentAuditSort) {
      case 'cost-desc':
        return b.advice.monthlyCost - a.advice.monthlyCost;
      case 'watts-desc':
        return b.totalWatts - a.totalWatts;
      case 'kwh-desc':
        return b.advice.monthlyKwh - a.advice.monthlyKwh;
      case 'hours-desc':
        return b.item.hours - a.item.hours;
      case 'name-asc':
        return a.item.name.localeCompare(b.item.name);
      default:
        return b.advice.monthlyCost - a.advice.monthlyCost;
    }
  });

  if (filteredList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
          <i class="fa-solid fa-filter" style="font-size: 1.8rem; margin-bottom: 0.4rem; opacity: 0.6;"></i>
          <strong style="display: block; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 0.25rem;">
            No appliances match the current filter
          </strong>
          <span style="font-size: 0.8rem; display: block; margin-bottom: 0.75rem;">
            Try selecting "All Appliances" or clearing the search box.
          </span>
          <button type="button" class="btn-clean btn-secondary-clean" onclick="clearAuditFilterSearch()" style="font-size: 0.78rem; padding: 0.35rem 0.8rem;">
            Reset Filter & Search
          </button>
        </td>
      </tr>
    `;
    return;
  }

  // Render Table Rows
  filteredList.forEach(entry => {
    const { item, qty, totalWatts, slot, days, advice } = entry;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="appliance-row-main">
          <div class="appliance-row-icon">${item.icon && item.icon.startsWith('<') ? item.icon : renderAvatarBadge(item.icon)}</div>
          <div class="appliance-row-meta">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${qty} unit(s) • ${item.watts}W each</span>
          </div>
        </div>
      </td>
      <td>
        <strong>${totalWatts} W</strong>
      </td>
      <td>
        ${item.hours}h / day<br>
        <span style="font-size:0.72rem; color:var(--text-muted);">${days} days/mo</span>
      </td>
      <td>
        <span class="badge-tou-slot ${slot.badgeClass}">
          ${slot.icon} ${slot.name.split(' ')[0]}
        </span>
        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">
          ${slot.range.split('(')[0]}
        </div>
      </td>
      <td>
        <strong>${advice.monthlyKwh.toFixed(1)} kWh</strong>
        <div style="font-size:0.72rem; color:var(--text-muted);">${advice.dailyKwh.toFixed(2)} kWh/day</div>
      </td>
      <td>
        <strong style="color: ${advice.surgePenalty > 0 ? '#ef4444' : 'var(--text-primary)'};">₹ ${advice.monthlyCost.toFixed(2)}</strong>
        ${advice.surgePenalty > 0 ? `<div class="surge-penalty-tag">+₹${advice.surgePenalty.toFixed(2)} peak surge</div>` : ''}
        ${item.slot === 'offpeak' ? `<div style="font-size:0.7rem; color:#10b981; font-weight:600;">-20% discount</div>` : ''}
      </td>
      <td>
        <div class="ways-to-reduce-cell">
          ${item.slot === 'evening' ? `
            <div class="shift-recommendation-chip" title="High evening surge pricing">
              <i class="fa-solid fa-triangle-exclamation"></i> Peak Surge (+50%)
            </div>
            <div class="table-shift-actions">
              <button type="button" class="btn-table-shift shift-solar" onclick="shiftAuditApplianceSlot('${item.id}', 'solar')" title="Shift to Solar daytime">
                <i class="fa-solid fa-sun"></i> Shift to Solar (Save ₹${advice.savingsToSolar.toFixed(0)})
              </button>
              <button type="button" class="btn-table-shift shift-offpeak" onclick="shiftAuditApplianceSlot('${item.id}', 'offpeak')" title="Shift to Night Off-Peak">
                <i class="fa-solid fa-moon"></i> Shift to Night (Save ₹${advice.savingsToOffpeak.toFixed(0)})
              </button>
            </div>
          ` : item.slot === 'morning' ? `
            <div class="shift-recommendation-chip" title="Morning peak surcharge">
              <i class="fa-solid fa-clock"></i> Morning Peak (+35%)
            </div>
            <div class="table-shift-actions">
              <button type="button" class="btn-table-shift shift-offpeak" onclick="shiftAuditApplianceSlot('${item.id}', 'offpeak')" title="Shift before 8 AM">
                <i class="fa-solid fa-moon"></i> Shift before 8 AM
              </button>
            </div>
          ` : item.slot === 'solar' ? `
            <span style="font-size:0.75rem; color:#0284c7; font-weight:600; display:flex; align-items:center; gap:4px;">
              <i class="fa-solid fa-circle-check"></i> Clean Solar Daytime
            </span>
          ` : item.slot === 'offpeak' ? `
            <span style="font-size:0.75rem; color:#10b981; font-weight:600; display:flex; align-items:center; gap:4px;">
              <i class="fa-solid fa-circle-check"></i> Economy Night (-20%)
            </span>
          ` : `
            <span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">
              Continuous 24h
            </span>
          `}
          <button type="button" class="btn-toggle-tips" onclick="toggleApplianceTips('${item.id}')" title="Click to view appliance reduction strategy and tips">
            <i class="fa-solid fa-lightbulb"></i> View Ways to Reduce
          </button>
        </div>
      </td>
      <td style="text-align: right;">
        <button class="btn-remove-appliance" title="Remove appliance" onclick="removeAuditAppliance('${item.id}')">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);

    // Expandable Drawer Row for Tips & Reduction Guidance
    const drawerRow = document.createElement('tr');
    drawerRow.className = 'appliance-drawer-row';
    drawerRow.id = `drawer-${item.id}`;
    drawerRow.style.display = 'none';
    drawerRow.innerHTML = `
      <td colspan="8">
        <div class="appliance-tips-drawer">
          <div class="drawer-header">
            <h4><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--color-primary);"></i> Reduction Guide for ${escapeHtml(item.name)} (${item.slot.toUpperCase()})</h4>
            <span style="font-size:0.76rem; color:var(--text-muted);">Current consumption: ${advice.monthlyKwh.toFixed(1)} kWh/mo (₹ ${advice.monthlyCost.toFixed(2)})</span>
          </div>
          <div class="drawer-grid">
            <div class="drawer-card">
              <h5><i class="fa-solid fa-clock-rotate-left"></i> Time-of-Use Shift Strategy</h5>
              <p style="font-size:0.8rem; line-height:1.5; color:var(--text-secondary); margin-bottom:0.6rem;">
                ${advice.timingAssessment}
              </p>
              ${advice.recommendedActions.length > 0 ? `
                <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
                  ${advice.recommendedActions.map(act => `
                    <button type="button" class="btn-table-shift" onclick="shiftAuditApplianceSlot('${item.id}', '${act.slot}')">
                      <i class="fa-solid ${act.icon}"></i> ${act.label} (<strong>${act.savingsText}</strong>)
                    </button>
                  `).join('')}
                </div>
              ` : `
                <span style="font-size:0.78rem; color:#10b981; font-weight:600;"><i class="fa-solid fa-circle-check"></i> Already running at favorable grid hours.</span>
              `}
            </div>
            <div class="drawer-card">
              <h5><i class="fa-solid fa-lightbulb"></i> Daily Usage Best Practices</h5>
              <ul style="font-size:0.8rem; line-height:1.5; padding-left:1.1rem; color:var(--text-secondary); margin:0;">
                ${advice.operationalTips.map(tip => `<li style="margin-bottom:0.35rem;">${tip}</li>`).join('')}
              </ul>
            </div>
            <div class="drawer-card">
              <h5><i class="fa-solid fa-screwdriver-wrench"></i> Hardware & Energy Efficiency</h5>
              <p style="font-size:0.8rem; line-height:1.5; color:var(--text-secondary); margin:0;">
                ${advice.hardwareTip}
              </p>
            </div>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(drawerRow);
  });
}

function clearAuditFilterSearch() {
  currentAuditFilter = 'all';
  currentAuditSearch = '';
  const searchInput = document.getElementById('audit-search-input');
  if (searchInput) searchInput.value = '';
  document.querySelectorAll('.audit-filter-chip').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-audit-filter') === 'all');
  });
  renderApplianceRoster();
}
window.clearAuditFilterSearch = clearAuditFilterSearch;

// =============================================================================
// AUDIT REPORT EXPORT & PRINTING ENGINE
// =============================================================================

function openAuditExportModal() {
  const modal = document.getElementById('audit-export-modal');
  if (!modal) return;

  const list = getApplianceAuditList();
  const baseTariff = Math.max(0.5, parseFloat(document.getElementById('scanner-tariff')?.value || '8.5'));
  const user = campusUsers.find(u => u.id === activeUserId) || campusUsers[0];

  // Set Report Meta
  const today = new Date();
  setElementText('export-report-date', `Generated: ${today.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`);
  setElementText('export-report-consumer', `Account: ${user.username} (${user.role || 'Residential'})`);
  setElementText('export-report-district', `District: ${user.college || 'Central Grid'} • ${user.department || 'Sector A'}`);

  // Calculate Metrics
  let totalKwh = 0;
  let totalDailyKwh = 0;
  let totalBill = 0;
  let totalSurge = 0;
  let totalSavings = 0;
  let surgeDevices = 0;

  const tbody = document.getElementById('export-report-tbody');
  if (tbody) tbody.innerHTML = '';

  const recList = document.getElementById('export-recommendations-list');
  if (recList) recList.innerHTML = '';

  const recommendations = [];

  list.forEach(item => {
    const qty = item.qty || 1;
    const totalWatts = item.watts * qty;
    const slot = TIME_OF_USE_SLOTS[item.slot] || TIME_OF_USE_SLOTS.evening;
    const days = item.days || 30;
    const advice = generateApplianceReductionAdvice(item.name, item.watts, item.hours, item.slot, baseTariff, qty, days);

    totalKwh += advice.monthlyKwh;
    totalDailyKwh += advice.dailyKwh;
    totalBill += advice.monthlyCost;
    totalSurge += advice.surgePenalty;
    totalSavings += advice.savingsToOffpeak;

    if (slot.isSurge) {
      surgeDevices++;
      recommendations.push(
        `<strong>${escapeHtml(item.name)}:</strong> Currently running during ${slot.name} (${slot.costLabel}). Shifting to solar daytime or off-peak night can save up to <strong>₹ ${advice.savingsToOffpeak.toFixed(0)}/month</strong>.`
      );
    }

    if (tbody) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(item.name)}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${qty}x)</span></td>
        <td>${totalWatts} W</td>
        <td>${item.hours}h / day</td>
        <td><span class="badge-tou-slot ${slot.badgeClass}">${slot.name.split(' ')[0]}</span></td>
        <td><strong>${advice.monthlyKwh.toFixed(1)} kWh</strong></td>
        <td style="text-align: right;"><strong>₹ ${advice.monthlyCost.toFixed(2)}</strong></td>
      `;
      tbody.appendChild(tr);
    }
  });

  if (list.length === 0 && tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          No appliances in audit roster. Add appliances via the calculator first.
        </td>
      </tr>
    `;
  }

  // Populate Recommendations
  if (recList) {
    if (recommendations.length > 0) {
      recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.innerHTML = rec;
        recList.appendChild(li);
      });
    } else if (list.length > 0) {
      const li = document.createElement('li');
      li.innerHTML = `<strong>Optimal Schedule:</strong> All audited appliances are already scheduled outside peak surge hours. Maintain clean daytime solar charging to keep grid carbon footprint at minimum.`;
      recList.appendChild(li);
    } else {
      const li = document.createElement('li');
      li.textContent = 'Add appliances to your audit roster to generate personalized grid-shifting recommendations.';
      recList.appendChild(li);
    }
  }

  // Set Metric Cards
  setElementText('export-stat-kwh', `${totalKwh.toFixed(1)} kWh`);
  setElementText('export-stat-daily', `${totalDailyKwh.toFixed(2)} kWh / day`);
  setElementText('export-stat-cost', `₹ ${totalBill.toFixed(2)}`);
  setElementText('export-stat-annual', `≈ ₹ ${(totalBill * 12).toFixed(0)} / yr`);
  setElementText('export-stat-surge', `₹ ${totalSurge.toFixed(2)}`);
  setElementText('export-stat-surge-appliances', `${surgeDevices} appliance${surgeDevices === 1 ? '' : 's'} in peak window`);
  setElementText('export-stat-savings', `Save ₹ ${totalSavings.toFixed(2)}`);
  const co2Avoidable = (totalSavings / (baseTariff * 0.5)) * 0.82;
  setElementText('export-stat-co2', `${Math.max(0, co2Avoidable).toFixed(1)} kg CO₂ avoidable`);

  modal.classList.add('open');
}

function closeAuditExportModal() {
  const modal = document.getElementById('audit-export-modal');
  if (modal) modal.classList.remove('open');
}

function copyAuditSummary() {
  const list = getApplianceAuditList();
  const baseTariff = Math.max(0.5, parseFloat(document.getElementById('scanner-tariff')?.value || '8.5'));
  const user = campusUsers.find(u => u.id === activeUserId) || campusUsers[0];

  let totalKwh = 0;
  let totalCost = 0;
  let totalSurge = 0;
  let totalShiftSavings = 0;

  let itemsSummary = '';
  list.forEach((item, idx) => {
    const qty = item.qty || 1;
    const slot = TIME_OF_USE_SLOTS[item.slot] || TIME_OF_USE_SLOTS.evening;
    const advice = generateApplianceReductionAdvice(item.name, item.watts, item.hours, item.slot, baseTariff, qty, item.days || 30);
    totalKwh += advice.monthlyKwh;
    totalCost += advice.monthlyCost;
    totalSurge += advice.surgePenalty;
    totalShiftSavings += advice.savingsToOffpeak;
    itemsSummary += `  ${idx + 1}. ${item.name} (${qty}x, ${item.watts * qty}W) — ${advice.monthlyKwh.toFixed(1)} kWh/mo, ₹${advice.monthlyCost.toFixed(2)} [${slot.name}]\n`;
  });

  const reportText = 
`========================================
ECOSPARK SMART GRID ENERGY AUDIT REPORT
========================================
Consumer Account: ${user.username} (${user.role || 'Residential'})
District / Sector: ${user.college || 'Central District'} • ${user.department || 'Sector A'}
Date Generated: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
Base Electricity Tariff: ₹ ${baseTariff.toFixed(2)} / kWh

EXECUTIVE SUMMARY:
- Monthly Electricity: ${totalKwh.toFixed(1)} kWh
- Projected Monthly Bill: ₹ ${totalCost.toFixed(2)}
- Peak Surge Surcharges: ₹ ${totalSurge.toFixed(2)}
- Smart Shift Savings Potential: Save up to ₹ ${totalShiftSavings.toFixed(2)} / month
- Carbon Reduction Potential: Avoid up to ${((totalShiftSavings / (baseTariff * 0.5)) * 0.82).toFixed(1)} kg CO2

ITEMIZED AUDIT ROSTER (${list.length} Tracked Appliances):
${itemsSummary || '  (No appliances tracked)'}
========================================
Generated by EcoSpark Telemetry Platform`;

  navigator.clipboard.writeText(reportText).then(() => {
    showToast('Audit report copied to clipboard!');
  }).catch(() => {
    showToast('Failed to copy to clipboard.');
  });
}

function downloadAuditCSV() {
  const list = getApplianceAuditList();
  const baseTariff = Math.max(0.5, parseFloat(document.getElementById('scanner-tariff')?.value || '8.5'));
  const user = campusUsers.find(u => u.id === activeUserId) || campusUsers[0];

  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += 'Appliance Name,Quantity,Power Rating (Watts),Total Load (Watts),Daily Hours,Days Per Month,Time Slot,Slot Rate Multiplier,Monthly kWh,Base Cost (INR),Surge Surcharge (INR),Total Monthly Cost (INR)\r\n';

  list.forEach(item => {
    const qty = item.qty || 1;
    const totalWatts = item.watts * qty;
    const slot = TIME_OF_USE_SLOTS[item.slot] || TIME_OF_USE_SLOTS.evening;
    const days = item.days || 30;
    const advice = generateApplianceReductionAdvice(item.name, item.watts, item.hours, item.slot, baseTariff, qty, days);
    const baseCost = advice.monthlyKwh * baseTariff;

    const row = [
      `"${item.name.replace(/"/g, '""')}"`,
      qty,
      item.watts,
      totalWatts,
      item.hours,
      days,
      `"${slot.name}"`,
      slot.multiplier,
      advice.monthlyKwh.toFixed(2),
      baseCost.toFixed(2),
      advice.surgePenalty.toFixed(2),
      advice.monthlyCost.toFixed(2)
    ];
    csvContent += row.join(',') + '\r\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `EcoSpark_Audit_Report_${user.username.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Energy audit CSV file downloaded.');
}

function printAuditReport() {
  window.print();
}

function initAuditExportModal() {
  const closeBtn = document.getElementById('btn-close-export-modal');
  if (closeBtn) closeBtn.onclick = closeAuditExportModal;

  const copyBtn = document.getElementById('btn-copy-audit-summary');
  if (copyBtn) copyBtn.onclick = copyAuditSummary;

  const csvBtn = document.getElementById('btn-download-audit-csv');
  if (csvBtn) csvBtn.onclick = downloadAuditCSV;

  const printBtn = document.getElementById('btn-print-audit-report');
  if (printBtn) printBtn.onclick = printAuditReport;

  // Global escape and backdrop listener for all modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
    }
  });

  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
      }
    });
  });
}

function renderScanner() {
  initScanner();
}

// =============================================================================
// 10. ENERGY CONSERVATION LEADERBOARD
// =============================================================================

function renderLeaderboard() {
  // Map all registered accounts into leaderboard entries (no hardcoded fake entries)
  const allUsers = campusUsers.map(u => ({
    username: u.username || 'Member',
    dept: `${u.department || 'Sector'} (${u.role || 'Residential'})`,
    college: u.college || 'District',
    xp: u.xp || 0,
    challenges: (u.completedMissions || []).length,
    streak: u.streak || 1,
    avatar: u.avatarSymbol || 'fa-bolt',
    isCurrentUser: u.id === activeUserId
  })).sort((a, b) => b.xp - a.xp);

  // Render Top 3 Podium
  const top1 = allUsers[0];
  const top2 = allUsers[1];
  const top3 = allUsers[2];

  if (top1) {
    renderPodiumCard('podium-1', top1, '<i class="fa-solid fa-crown" style="color: #d97706;"></i> 1');
  } else {
    resetPodiumCard('podium-1', 'No Account Yet', 'Register your profile');
  }

  if (top2) {
    renderPodiumCard('podium-2', top2, '<i class="fa-solid fa-medal" style="color: #64748b;"></i> 2');
  } else {
    resetPodiumCard('podium-2', 'Open Slot', 'Add Second Profile');
  }

  if (top3) {
    renderPodiumCard('podium-3', top3, '<i class="fa-solid fa-award" style="color: #b45309;"></i> 3');
  } else {
    resetPodiumCard('podium-3', 'Open Slot', 'Add Third Profile');
  }

  // Render Table
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (allUsers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No users registered yet. Click the account button at the top to create your profile.
        </td>
      </tr>
    `;
    return;
  }

  allUsers.forEach((user, idx) => {
    const rank = idx + 1;
    let rankBadge = `${rank}`;
    if (rank === 1) rankBadge = '<i class="fa-solid fa-crown" style="color: #d97706;"></i> 1';
    else if (rank === 2) rankBadge = '<i class="fa-solid fa-medal" style="color: #64748b;"></i> 2';
    else if (rank === 3) rankBadge = '<i class="fa-solid fa-award" style="color: #b45309;"></i> 3';

    const row = document.createElement('tr');
    row.className = `leaderboard-row ${user.isCurrentUser ? 'is-current-user' : ''}`;

    row.innerHTML = `
      <td><span class="rank-pill">${rankBadge}</span></td>
      <td>
        <div class="user-cell">
          <div class="user-cell-avatar">${renderAvatarBadge(user.avatar || user.username.charAt(0))}</div>
          <div class="user-cell-meta">
            <h4>${escapeHtml(user.username)} ${user.isCurrentUser ? '<span class="you-tag">ACTIVE</span>' : ''}</h4>
            <span>${escapeHtml(user.dept)}</span>
          </div>
        </div>
      </td>
      <td><strong style="color: var(--color-primary); font-weight: 700;">${user.xp} XP</strong></td>
      <td><span class="level-indicator">${getCurrentLevel(user.xp).current.title}</span></td>
      <td>${user.challenges} missions</td>
      <td><i class="fa-solid fa-fire" style="color: #ea580c; font-size: 0.75rem;"></i> ${user.streak}d</td>
    `;
    tbody.appendChild(row);
  });
}

function resetPodiumCard(elemId, placeholderName, placeholderSub) {
  const el = document.getElementById(elemId);
  if (!el) return;
  const crown = el.querySelector('.podium-crown');
  const avatar = el.querySelector('.podium-avatar');
  const name = el.querySelector('.podium-name');
  const dept = el.querySelector('.podium-dept');
  const xp = el.querySelector('.podium-xp');

  if (crown) crown.innerHTML = '<i class="fa-solid fa-user-plus" style="opacity:0.4;"></i>';
  if (avatar) avatar.innerHTML = '<span class="avatar-badge-initials" style="opacity:0.4;">-</span>';
  if (name) name.textContent = placeholderName;
  if (dept) dept.textContent = placeholderSub;
  if (xp) xp.textContent = '0 XP';
}

function renderPodiumCard(elemId, user, medal) {
  const el = document.getElementById(elemId);
  if (!el) return;
  const crown = el.querySelector('.podium-crown');
  const avatar = el.querySelector('.podium-avatar');
  const name = el.querySelector('.podium-name');
  const dept = el.querySelector('.podium-dept');
  const xp = el.querySelector('.podium-xp');

  if (crown) crown.innerHTML = medal;
  if (avatar) avatar.innerHTML = renderAvatarBadge(user.avatar || user.username.charAt(0));
  if (name) name.innerHTML = `${escapeHtml(user.username)} ${user.isCurrentUser ? '<span class="you-tag">YOU</span>' : ''}`;
  if (dept) dept.textContent = user.dept;
  if (xp) xp.textContent = `${user.xp} XP`;
}

// =============================================================================
// 11. PROFILE & ACHIEVEMENT VAULT
// =============================================================================
function checkBadges() {
  BADGES_CONFIG.forEach(badge => {
    if (!appState.unlockedBadges.includes(badge.id) && badge.check(appState)) {
      appState.unlockedBadges.push(badge.id);
      saveState();
      openBadgeModal(badge);
      showToast(`Achievement Unlocked: ${badge.title}`);
    }
  });
}

function renderProfileAndVault() {
  const levelData = getCurrentLevel(appState.xp);

  // Profile Information
  setElementText('profile-display-name', appState.username || 'My Profile');
  
  const avatarInitial = document.getElementById('profile-avatar-initial');
  if (avatarInitial) {
    avatarInitial.innerHTML = renderAvatarBadge(appState.avatarSymbol || (appState.username ? appState.username.charAt(0).toUpperCase() : 'U'));
  }
  
  setElementText('profile-college-name', appState.college || 'Green Valley District');
  setElementText('profile-dept-name', appState.department || 'Sector 4B Substation');
  
  const dormText = appState.dorm ? `Unit: ${appState.dorm}` : 'Grid Consumer';
  const goalText = `Target: ${(appState.dailyGoalKwh || 1.5).toFixed(1)} kWh/day`;
  setElementText('profile-dorm-target', `${dormText} • ${goalText}`);
  
  const levelTag = document.getElementById('profile-level-tag');
  if (levelTag) {
    levelTag.innerHTML = `${levelData.current.icon} ${levelData.current.title}`;
  }
  
  // Progress Bar
  const progFill = document.getElementById('profile-xp-fill');
  const progLabel = document.getElementById('profile-xp-label');
  const progTarget = document.getElementById('profile-xp-target');

  if (progFill) progFill.style.width = `${levelData.percent}%`;
  if (progLabel) progLabel.textContent = `${appState.xp} XP`;
  if (progTarget) progTarget.textContent = levelData.next ? `${levelData.next.minXp} XP (${levelData.xpToNext} XP needed)` : 'Maximum Rank';

  // Stats Grid in Profile
  setElementText('profile-total-kwh', `${appState.energySavedKwh.toFixed(1)} kWh`);
  setElementText('profile-total-co2', `${appState.co2SavedKg.toFixed(1)} kg`);
  setElementText('profile-total-missions', `${appState.completedMissions.length}`);
  setElementText('profile-streak-count', `${appState.streak} Days`);

  // Render Badges in Vault
  const vaultGrid = document.getElementById('badges-vault-grid');
  if (!vaultGrid) return;
  vaultGrid.innerHTML = '';

  BADGES_CONFIG.forEach(b => {
    const isUnlocked = appState.unlockedBadges.includes(b.id);
    const card = document.createElement('div');
    card.className = `glass-panel badge-card ${isUnlocked ? 'unlocked' : 'locked'}`;

    card.innerHTML = `
      <div class="badge-icon-frame">
        <span>${b.icon}</span>
      </div>
      <h4 class="badge-title">${b.title}</h4>
      <p class="badge-desc">${b.desc}</p>
      <span class="badge-status-tag">
        ${isUnlocked ? '<i class="fa-solid fa-check"></i> Unlocked' : `<i class="fa-solid fa-lock"></i> ${b.reqText}`}
      </span>
    `;

    card.addEventListener('click', () => openBadgeModal(b));
    vaultGrid.appendChild(card);
  });

  // Edit Profile buttons
  const editBtn = document.getElementById('btn-edit-username');
  if (editBtn) {
    editBtn.onclick = () => openAccountsModal('signup');
  }

  const openProfileEditBtn = document.getElementById('btn-open-profile-edit');
  if (openProfileEditBtn) {
    openProfileEditBtn.onclick = () => {
      const nameInput = document.getElementById('reg-student-name') || document.getElementById('reg-person-name');
      const collegeInput = document.getElementById('reg-college-name') || document.getElementById('reg-person-college');
      const deptInput = document.getElementById('reg-department') || document.getElementById('reg-person-department');
      const dormInput = document.getElementById('reg-dorm-room') || document.getElementById('reg-person-dorm');
      const targetInput = document.getElementById('reg-daily-target') || document.getElementById('reg-person-target');
      if (nameInput) nameInput.value = appState.username || '';
      if (collegeInput) collegeInput.value = appState.college || '';
      if (deptInput) deptInput.value = appState.department || '';
      if (dormInput) dormInput.value = appState.dorm || '';
      if (targetInput) targetInput.value = (appState.dailyGoalKwh || 1.5).toString();
      openAccountsModal('signup');
    };
  }

  const registerNewBtn = document.getElementById('btn-register-new-student');
  if (registerNewBtn) {
    registerNewBtn.onclick = () => {
      const form = document.getElementById('accounts-signup-form');
      if (form) form.reset();
      openAccountsModal('signup');
    };
  }

  const switchAccountBtn = document.getElementById('btn-profile-switch-account');
  if (switchAccountBtn) {
    switchAccountBtn.onclick = () => {
      openAccountsModal('switch');
    };
  }

  // Reset Demo Data Handler
  const resetBtn = document.getElementById('btn-reset-demo-data');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (confirm('Reset EcoSpark energy profiles to initial baseline?')) {
        localStorage.removeItem(STORAGE_KEY_USERS);
        localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        campusUsers = loadAllUsers();
        activeUserId = campusUsers[0].id;
        appState = campusUsers[0];
        saveState();
        renderDashboard();
        renderMissions();
        renderLeaderboard();
        renderProfileAndVault();
        updateHeaderUI();
        showToast('Energy profile data reset to default.');
      }
    };
  }
}

// =============================================================================
// 12. MULTI-USER SIGN UP & ACCOUNT SWITCH MODAL
// =============================================================================
let selectedAvatarSymbol = 'fa-bolt';
let selectedRole = 'Residential';

function initAccountsModal() {
  const modal = document.getElementById('accounts-modal');
  const form = document.getElementById('accounts-signup-form');
  const closeBtn = document.getElementById('btn-close-accounts-modal');
  const cancelBtn = document.getElementById('btn-cancel-signup') || document.getElementById('btn-cancel-account');
  const closeSwitchBtn = document.getElementById('btn-close-switch-panel');
  const tabSignup = document.getElementById('tab-btn-signup');
  const tabSwitch = document.getElementById('tab-btn-switch');
  const addAnotherBtn = document.getElementById('btn-modal-add-another');
  const symbolBtns = document.querySelectorAll('.avatar-symbol-btn');
  const avatarPreview = document.getElementById('modal-avatar-preview') || document.getElementById('reg-avatar-preview');
  const roleRadios = document.querySelectorAll('input[name="campus-role"]');
  const rolePills = document.querySelectorAll('.role-pill');
  const presetBtns = document.querySelectorAll('.btn-preset-persona, .preset-pill-btn');

  if (!modal) return;

  // Tab switching
  if (tabSignup) {
    tabSignup.addEventListener('click', () => switchAccountsModalTab('signup'));
  }
  if (tabSwitch) {
    tabSwitch.addEventListener('click', () => switchAccountsModalTab('switch'));
  }
  if (addAnotherBtn) {
    addAnotherBtn.addEventListener('click', () => switchAccountsModalTab('signup'));
  }

  // Symbol selector listeners
  symbolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      symbolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAvatarSymbol = btn.getAttribute('data-symbol') || 'fa-bolt';
      if (avatarPreview) {
        avatarPreview.innerHTML = renderAvatarBadge(selectedAvatarSymbol);
      }
    });
  });

  // Role selector listeners
  roleRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        selectedRole = radio.value;
        rolePills.forEach(pill => {
          const r = pill.querySelector('input[type="radio"]');
          pill.classList.toggle('active', r && r.checked);
        });
      }
    });
  });

  // Preset quick fill buttons
  const PRESETS = {
    residential: {
      name: 'Sreehari M',
      role: 'Residential',
      college: 'Green Valley Residence',
      dept: 'Substation Sector 4B',
      dorm: 'Unit 204 • Meter #M-882',
      target: '1.5',
      symbol: 'fa-house'
    },
    commercial: {
      name: 'Ananya Iyer',
      role: 'Commercial',
      college: 'Apex Tech Business Park',
      dept: 'Commercial Suite 12',
      dorm: 'Tower B - Floor 4',
      target: '3.5',
      symbol: 'fa-building'
    },
    solar: {
      name: 'Kevin Chen',
      role: 'Solar Prosumer',
      college: 'SunRidge Eco Homes',
      dept: '5kW Rooftop Solar Array',
      dorm: 'Premises #18',
      target: '2.5',
      symbol: 'fa-solar-panel'
    },
    facility: {
      name: 'Neha V',
      role: 'Facility Manager',
      college: 'Civic Utility Complex',
      dept: 'HVAC & Power Plant',
      dorm: 'Station 102',
      target: '4.0',
      symbol: 'fa-warehouse'
    },
    student: {
      name: 'Sreehari M',
      role: 'Residential',
      college: 'Green Valley Residence',
      dept: 'Substation Sector 4B',
      dorm: 'Unit 204 • Meter #M-882',
      target: '1.5',
      symbol: 'fa-house'
    },
    faculty: {
      name: 'Ananya Iyer',
      role: 'Commercial',
      college: 'Apex Tech Business Park',
      dept: 'Commercial Suite 12',
      dorm: 'Tower B - Floor 4',
      target: '3.5',
      symbol: 'fa-building'
    },
    researcher: {
      name: 'Kevin Chen',
      role: 'Solar Prosumer',
      college: 'SunRidge Eco Homes',
      dept: '5kW Rooftop Solar Array',
      dorm: 'Premises #18',
      target: '2.5',
      symbol: 'fa-solar-panel'
    },
    dorm: {
      name: 'Neha V',
      role: 'Facility Manager',
      college: 'Civic Utility Complex',
      dept: 'HVAC & Power Plant',
      dorm: 'Station 102',
      target: '4.0',
      symbol: 'fa-warehouse'
    }
  };

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-preset');
      const data = PRESETS[presetKey];
      if (!data) return;

      const nameInput = document.getElementById('reg-student-name') || document.getElementById('reg-person-name');
      const collegeInput = document.getElementById('reg-college-name') || document.getElementById('reg-person-college');
      const deptInput = document.getElementById('reg-department') || document.getElementById('reg-person-department');
      const dormInput = document.getElementById('reg-dorm-room') || document.getElementById('reg-person-dorm');
      const targetInput = document.getElementById('reg-daily-target') || document.getElementById('reg-person-target');

      if (nameInput) nameInput.value = data.name;
      if (collegeInput) collegeInput.value = data.college;
      if (deptInput) deptInput.value = data.dept;
      if (dormInput) dormInput.value = data.dorm;
      if (targetInput) targetInput.value = data.target;

      selectedRole = data.role;
      roleRadios.forEach(radio => {
        radio.checked = radio.value === data.role;
      });
      rolePills.forEach(pill => {
        const r = pill.querySelector('input[type="radio"]');
        pill.classList.toggle('active', r && r.checked);
      });

      selectedAvatarSymbol = data.symbol;
      symbolBtns.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-symbol') === data.symbol);
      });
      if (avatarPreview) {
        avatarPreview.innerHTML = renderAvatarBadge(data.symbol);
      }
    });
  });

  const closeModal = () => {
    modal.classList.remove('open');
  };

  if (closeBtn) closeBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;
  if (closeSwitchBtn) closeSwitchBtn.onclick = closeModal;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Form submission handler
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('reg-student-name') || document.getElementById('reg-person-name');
      const collegeInput = document.getElementById('reg-college-name') || document.getElementById('reg-person-college');
      const deptInput = document.getElementById('reg-department') || document.getElementById('reg-person-department');
      const dormInput = document.getElementById('reg-dorm-room') || document.getElementById('reg-person-dorm');
      const targetInput = document.getElementById('reg-daily-target') || document.getElementById('reg-person-target');

      const name = nameInput ? nameInput.value.trim() : '';
      const college = collegeInput ? collegeInput.value.trim() : '';
      const dept = deptInput ? deptInput.value.trim() : '';
      const dorm = dormInput ? dormInput.value.trim() : '';
      const dailyTarget = parseFloat(targetInput ? targetInput.value : '1.5') || 1.5;

      if (!name) {
        showToast('Please enter a name for this profile.');
        return;
      }

      registerNewUser({
        name,
        role: selectedRole,
        college: college || 'Green Valley District',
        department: dept || 'Sector 4B Substation',
        dorm,
        dailyTarget,
        avatarSymbol: selectedAvatarSymbol
      });

      closeModal();
    });
  }
}

function switchAccountsModalTab(tabName) {
  const tabSignup = document.getElementById('tab-btn-signup');
  const tabSwitch = document.getElementById('tab-btn-switch');
  const contentSignup = document.getElementById('signup-panel') || document.getElementById('accounts-tab-signup');
  const contentSwitch = document.getElementById('switch-panel') || document.getElementById('accounts-tab-switch');

  if (tabName === 'signup') {
    if (tabSignup) tabSignup.classList.add('active');
    if (tabSwitch) tabSwitch.classList.remove('active');
    if (contentSignup) contentSignup.classList.add('active');
    if (contentSwitch) contentSwitch.classList.remove('active');

    setTimeout(() => {
      const nameInput = document.getElementById('reg-student-name') || document.getElementById('reg-person-name');
      if (nameInput) nameInput.focus();
    }, 100);
  } else {
    if (tabSignup) tabSignup.classList.remove('active');
    if (tabSwitch) tabSwitch.classList.add('active');
    if (contentSignup) contentSignup.classList.remove('active');
    if (contentSwitch) contentSwitch.classList.add('active');
    renderAccountsList();
  }
}

function renderAccountsList() {
  const listContainer = document.getElementById('registered-accounts-list') || document.getElementById('accounts-cards-list');
  const tabCount = document.getElementById('accounts-tab-count');
  if (tabCount) tabCount.textContent = campusUsers.length.toString();
  if (!listContainer) return;

  listContainer.innerHTML = '';

  campusUsers.forEach(user => {
    const isActive = user.id === activeUserId;
    const card = document.createElement('div');
    card.className = `account-profile-card ${isActive ? 'active' : ''}`;

    card.innerHTML = `
      <div class="account-card-header">
        <div class="account-avatar-circle">${renderAvatarBadge(user.avatarSymbol || 'fa-bolt')}</div>
        <div class="account-card-info">
          <h4>${escapeHtml(user.username)}</h4>
          <span class="account-role-badge">${escapeHtml(user.role || 'Member')}</span>
          <div class="account-dept-line">${escapeHtml(user.department || 'Sector')} • ${escapeHtml(user.college || 'District')}</div>
        </div>
      </div>
      <div class="account-card-stats">
        <div class="account-stat-pill">
          <span><i class="fa-solid fa-bolt"></i> Saved</span>
          <strong>${(user.energySavedKwh || 0).toFixed(1)} kWh</strong>
        </div>
        <div class="account-stat-pill">
          <span><i class="fa-solid fa-award"></i> XP</span>
          <strong>${user.xp || 0} XP</strong>
        </div>
        <div class="account-stat-pill">
          <span><i class="fa-solid fa-fire"></i> Streak</span>
          <strong>${user.streak || 1}d</strong>
        </div>
      </div>
      <div class="account-card-actions">
        ${isActive ? `
          <span class="active-tag-pill">
            <i class="fa-solid fa-circle-check"></i> Currently Active Profile
          </span>
        ` : `
          <button type="button" class="btn-account-switch" data-switch-id="${user.id}">
            <i class="fa-solid fa-arrow-right-to-bracket"></i> Switch to Profile
          </button>
        `}
        ${campusUsers.length > 1 ? `
          <button type="button" class="btn-account-delete" data-delete-id="${user.id}" title="Remove this profile">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        ` : ''}
      </div>
    `;

    const switchBtn = card.querySelector('.btn-account-switch');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        switchActiveUser(user.id);
        const modal = document.getElementById('accounts-modal');
        if (modal) modal.classList.remove('open');
      });
    }

    const deleteBtn = card.querySelector('.btn-account-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteUserAccount(user.id);
      });
    }

    listContainer.appendChild(card);
  });
}

function openAccountsModal(initialTab = 'signup') {
  const modal = document.getElementById('accounts-modal');
  if (!modal) return;

  switchAccountsModalTab(initialTab);
  modal.classList.add('open');
}

// Badge Modal
function openBadgeModal(badge) {
  const modal = document.getElementById('badge-modal');
  if (!modal) return;

  const isUnlocked = appState.unlockedBadges.includes(badge.id);

  const iconEl = modal.querySelector('#modal-badge-icon');
  if (iconEl) iconEl.innerHTML = badge.icon;
  
  modal.querySelector('#modal-badge-title').textContent = badge.title;
  
  const statusEl = modal.querySelector('#modal-badge-status');
  if (statusEl) {
    statusEl.innerHTML = isUnlocked ? '<i class="fa-solid fa-check"></i> BADGE UNLOCKED' : '<i class="fa-solid fa-lock"></i> CRITERIA LOCKED';
    statusEl.style.color = isUnlocked ? 'var(--color-primary)' : 'var(--text-muted)';
  }
  
  modal.querySelector('#modal-badge-desc').textContent = badge.desc;
  modal.querySelector('#modal-badge-criteria').textContent = `Requirement: ${badge.reqText}`;

  modal.classList.add('open');

  const closeBtn = modal.querySelector('.modal-close-btn');
  if (closeBtn) {
    closeBtn.onclick = () => modal.classList.remove('open');
  }

  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.remove('open');
  };
}

// =============================================================================
// 13. NOTIFICATIONS & TOASTS
// =============================================================================
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Clean any stray emojis
  const cleanMsg = message.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span style="color: var(--color-primary);"><i class="fa-solid fa-circle-check"></i></span>
    <span>${escapeHtml(cleanMsg)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// Utility Helpers
function setElementText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Quick Load-Shift Simulator in Solution View
function setSimSlot(slot) {
  const peakBtn = document.getElementById('sim-btn-peak');
  const solarBtn = document.getElementById('sim-btn-solar');
  const offpeakBtn = document.getElementById('sim-btn-offpeak');
  
  if (peakBtn) peakBtn.classList.remove('active');
  if (solarBtn) solarBtn.classList.remove('active');
  if (offpeakBtn) offpeakBtn.classList.remove('active');

  const rateEl = document.getElementById('sim-val-rate');
  const statusEl = document.getElementById('sim-val-status');
  const costEl = document.getElementById('sim-val-cost');
  const savingsEl = document.getElementById('sim-val-savings');
  const co2El = document.getElementById('sim-val-co2');

  const baseRate = 6.50;
  const kwh = 225; // 1500W * 5h * 30 days = 225 kWh

  if (slot === 'peak') {
    if (peakBtn) peakBtn.classList.add('active');
    const rate = baseRate * 1.5; // ₹9.75
    const cost = Math.round(kwh * rate);
    if (rateEl) { rateEl.textContent = '₹9.75 / kWh'; rateEl.style.color = '#ef4444'; }
    if (statusEl) statusEl.textContent = '+50% Peak Surcharge';
    if (costEl) costEl.textContent = `₹${cost.toLocaleString('en-IN')}`;
    if (savingsEl) { savingsEl.textContent = '₹0 / mo'; savingsEl.style.color = '#ef4444'; }
    if (co2El) co2El.textContent = 'Currently on highest rate';
  } else if (slot === 'solar') {
    if (solarBtn) solarBtn.classList.add('active');
    const rate = baseRate * 1.0; // ₹6.50
    const cost = Math.round(kwh * rate);
    const savings = Math.round(kwh * (baseRate * 1.5 - baseRate)); // ₹731
    if (rateEl) { rateEl.textContent = '₹6.50 / kWh'; rateEl.style.color = '#f59e0b'; }
    if (statusEl) statusEl.textContent = 'Standard Solar Daytime';
    if (costEl) costEl.textContent = `₹${cost.toLocaleString('en-IN')}`;
    if (savingsEl) { savingsEl.textContent = `Save ₹${savings.toLocaleString('en-IN')} / mo`; savingsEl.style.color = 'var(--color-primary)'; }
    if (co2El) co2El.textContent = 'Clean midday solar power';
  } else if (slot === 'offpeak') {
    if (offpeakBtn) offpeakBtn.classList.add('active');
    const rate = baseRate * 0.8; // ₹5.20
    const cost = Math.round(kwh * rate);
    const savings = Math.round(kwh * (baseRate * 1.5 - baseRate * 0.8)); // ₹1,024
    if (rateEl) { rateEl.textContent = '₹5.20 / kWh'; rateEl.style.color = '#10b981'; }
    if (statusEl) statusEl.textContent = '-20% Off-Peak Discount';
    if (costEl) costEl.textContent = `₹${cost.toLocaleString('en-IN')}`;
    if (savingsEl) { savingsEl.textContent = `Save ₹${savings.toLocaleString('en-IN')} / mo`; savingsEl.style.color = 'var(--color-primary)'; }
    if (co2El) co2El.textContent = 'Prevents 92 kg CO₂/mo';
  }
}

const escapeHTML = escapeHtml;
function initConfetti() {}
function createConfettiBurst() {}

if (typeof window !== 'undefined') {
  window.switchView = switchView;
  window.selectArchStage = selectArchStage;
  window.setSimSlot = setSimSlot;
  window.escapeHtml = escapeHtml;
  window.escapeHTML = escapeHtml;
  window.removeAuditAppliance = removeAuditAppliance;
  window.shiftAuditApplianceSlot = shiftAuditApplianceSlot;
  window.toggleApplianceTips = toggleApplianceTips;
  window.quickAddSampleAudit = quickAddSampleAudit;
  window.clearAuditFilterSearch = clearAuditFilterSearch;
  window.initConfetti = initConfetti;
  window.createConfettiBurst = createConfettiBurst;
}
