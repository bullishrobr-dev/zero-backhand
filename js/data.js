/* ============================================
   Zero Backhand — Data Layer
   ============================================ */

var ZB_STORAGE_KEYS = {
  SHOP: 'zb_shop',
  WORKERS: 'zb_workers',
  LANG: 'zb_lang',
  VERSION: 'zb_version'
};

var ZB_DEFAULT_SHOP = {
  name: 'Zero Lines',
  tagline: 'Your Skin, Refined.',
  logo: '',
  email: 'info@zerolines.life',
  phone: '+350 5400 5198',
  whatsapp: '+350 5400 5198',
  website: 'https://zerolines.life',
  locations: [],
  hours: 'Mon-Fri 9:00-18:00, Sat 10:00-14:00'
};

var ZB_DEFAULT_WORKERS = [];

var _zbMemoryShop = null;
var _zbMemoryWorkers = null;

function _zbGetRaw(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function _zbSetRaw(key, val) {
  try { localStorage.setItem(key, val); } catch (e) {}
}
function _zbRemoveRaw(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}

function zbGetShop() {
  if (_zbMemoryShop) return _zbMemoryShop;
  var raw = _zbGetRaw(ZB_STORAGE_KEYS.SHOP);
  if (!raw) return JSON.parse(JSON.stringify(ZB_DEFAULT_SHOP));
  try {
    var parsed = JSON.parse(raw);
    // backward compat: hours might be an old dict
    if (parsed.hours && typeof parsed.hours === 'object') {
      parsed.hours = '';
    }
    _zbMemoryShop = parsed;
    return parsed;
  } catch (e) {
    return JSON.parse(JSON.stringify(ZB_DEFAULT_SHOP));
  }
}

function zbSetShop(shop) {
  _zbMemoryShop = shop;
  _zbSetRaw(ZB_STORAGE_KEYS.SHOP, JSON.stringify(shop));
}

function zbGetWorkers() {
  if (_zbMemoryWorkers) return _zbMemoryWorkers;
  var raw = _zbGetRaw(ZB_STORAGE_KEYS.WORKERS);
  if (!raw) return JSON.parse(JSON.stringify(ZB_DEFAULT_WORKERS));
  try {
    var parsed = JSON.parse(raw);
    _zbMemoryWorkers = parsed;
    return parsed;
  } catch (e) {
    return JSON.parse(JSON.stringify(ZB_DEFAULT_WORKERS));
  }
}

function zbSetWorkers(workers) {
  _zbMemoryWorkers = workers;
  _zbSetRaw(ZB_STORAGE_KEYS.WORKERS, JSON.stringify(workers));
}

function zbAddWorker(data) {
  var workers = zbGetWorkers();
  workers.push({
    id: 'w' + Date.now(),
    name: data.name || '',
    role: data.role || '',
    phone: data.phone || '',
    whatsapp: data.whatsapp || '',
    email: data.email || ''
  });
  zbSetWorkers(workers);
}

function zbUpdateWorker(id, data) {
  var workers = zbGetWorkers();
  var idx = workers.findIndex(function(w) { return w.id === id; });
  if (idx >= 0) {
    workers[idx] = Object.assign({}, workers[idx], data);
    zbSetWorkers(workers);
  }
}

function zbRemoveWorker(id) {
  var workers = zbGetWorkers();
  workers = workers.filter(function(w) { return w.id !== id; });
  zbSetWorkers(workers);
}

function zbGetWorkerById(id) {
  return zbGetWorkers().find(function(w) { return w.id === id; }) || null;
}

function zbGetLang() {
  return _zbGetRaw(ZB_STORAGE_KEYS.LANG) || 'en';
}

function zbSetLang(lang) {
  _zbSetRaw(ZB_STORAGE_KEYS.LANG, lang);
}

function zbResetToDefaults() {
  _zbMemoryShop = null;
  _zbMemoryWorkers = null;
  _zbSetRaw(ZB_STORAGE_KEYS.SHOP, JSON.stringify(ZB_DEFAULT_SHOP));
  _zbSetRaw(ZB_STORAGE_KEYS.WORKERS, JSON.stringify(ZB_DEFAULT_WORKERS));
  _zbRemoveRaw(ZB_STORAGE_KEYS.LANG);
  _zbRemoveRaw('zb_editor_state');
}

/* ============================================
   Quick Prints Editor State (per-language)
   ============================================ */

function zbSaveEditorState(templateId, data) {
  var lang = zbGetLang();
  var all = JSON.parse(_zbGetRaw('zb_editor_state') || '{}');
  if (!all[lang]) all[lang] = {};
  all[lang][templateId] = data;
  _zbSetRaw('zb_editor_state', JSON.stringify(all));
}

function zbGetEditorState(templateId) {
  var lang = zbGetLang();
  var all = JSON.parse(_zbGetRaw('zb_editor_state') || '{}');
  if (all[lang] && all[lang][templateId]) {
    return all[lang][templateId];
  }
  return null;
}

/* ============================================
   Product & Gift Catalogs
   ============================================ */

var ZB_PRODUCTS = [
  { id: 'reverse-five', name: 'Reverse Five', retail: 300, minimum: 100, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>' },
  { id: 'opatra-synergy', name: 'Opatra Synergy', retail: 4000, minimum: 900, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20"/><path d="M2 12h20"/></svg>' },
  { id: 'perfectio-x', name: 'Perfectio X', retail: 5000, minimum: 1500, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>' },
  { id: 'perfectio-gold', name: 'Perfectio Gold', retail: 3500, minimum: 1100, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
  { id: 'perfectio-silver', name: 'Perfectio Silver', retail: 1200, minimum: 800, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>' },
  { id: 'premium-peeling-gel', name: 'Premium Peeling Gel', retail: 150, minimum: 50, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c4.97 0 9-4.03 9-9V7a9 9 0 10-18 0v6c0 4.97 4.03 9 9 9z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>' },
  { id: 'dermineck', name: 'Dermineck', retail: 1000, minimum: 250, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' }
];

var ZB_GIFTS = [
  'Premium Night Cream',
  'Premium Day Cream',
  'Thermal Set',
  'Hand Cream',
  'Concentrated Facial Serum',
  'Prestige Silk Mask',
  'Nail Kit',
  'Body Scrub',
  'Body Butter',
  'Premium Eye Serum',
  'Prestige Facial Peel',
  'Premium Eye Cream'
];

/* ============================================
   Utility
   ============================================ */

function zbEscapeHtml(text) {
  if (text == null) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function zbFormatPrice(amount) {
  return '€' + Number(amount).toLocaleString('en-GB');
}

function zbNl2br(text) {
  return text.replace(/\n/g, '<br>');
}
