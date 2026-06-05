/* ============================================
   Zero Backhand — Data Layer
   ============================================ */

var ZB_STORAGE_KEYS = {
  SHOP: 'zb_shop',
  WORKERS: 'zb_workers',
  PRINTER_IP: 'zb_printer_ip',
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

function zbGetPrinterUrl() {
  var ip = _zbGetRaw(ZB_STORAGE_KEYS.PRINTER_IP);
  if (!ip) ip = '127.0.0.1';
  return 'http://' + ip + ':8766';
}
function zbSetPrinterIp(ip) {
  _zbSetRaw(ZB_STORAGE_KEYS.PRINTER_IP, ip || '127.0.0.1');
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
  { id: 'reverse-five', name: 'Reverse Five', retail: 300, minimum: 100, image: 'assets/product-reverse-five.webp' },
  { id: 'opatra-synergy', name: 'Opatra Synergy', retail: 4000, minimum: 900, image: 'assets/product-opatra-synergy.webp' },
  { id: 'perfectio-x', name: 'Perfectio X', retail: 5000, minimum: 1500, image: 'assets/product-perfectio-x.webp' },
  { id: 'perfectio-gold', name: 'Perfectio Gold', retail: 3500, minimum: 1100, image: 'assets/product-perfectio-gold.webp' },
  { id: 'perfectio-silver', name: 'Perfectio Silver', retail: 1200, minimum: 800, image: 'assets/product-perfectio-silver.webp' },
  { id: 'premium-peeling-gel', name: 'Premium Peeling Gel', retail: 150, minimum: 50, image: 'assets/product-peeling-gel.webp' },
  { id: 'dermineck', name: 'Dermineck', retail: 1000, minimum: 250, image: 'assets/product-dermineck.webp' }
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
