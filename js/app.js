/**
 * app.js — Zero Backhand Main Application Logic
 */

var zbCurrentView = 'products';
var zbCurrentProductId = null;
var zbCurrentDeal = {};
var zbCurrentOfferURL = '';

/* ============================================
   DOM REFS
   ============================================ */
var zbViews = {
  products: document.getElementById('view-products'),
  deal: document.getElementById('view-deal'),
  quickprints: document.getElementById('view-quickprints'),
  editor: document.getElementById('view-editor'),
  settings: document.getElementById('view-settings')
};
var zbPageTitle = document.getElementById('page-title');
var zbPageSubtitle = document.getElementById('page-subtitle');
var zbNavLinks = document.querySelectorAll('.sidebar-nav a');

/* ============================================
   ROUTING
   ============================================ */
function zbSwitchView(viewName) {
  zbCurrentView = viewName;
  Object.keys(zbViews).forEach(function(key) {
    zbViews[key].classList.remove('active');
  });
  if (zbViews[viewName]) zbViews[viewName].classList.add('active');
  zbNavLinks.forEach(function(link) {
    link.classList.toggle('active', link.dataset.view === viewName);
  });

  if (viewName === 'products') {
    zbPageTitle.textContent = zbT('appName');
    zbPageSubtitle.textContent = zbT('appTagline');
    zbPageSubtitle.style.display = '';
    zbRenderProductsGrid();
  } else if (viewName === 'deal') {
    zbPageTitle.textContent = zbT('appName');
    zbPageSubtitle.style.display = 'none';
  } else if (viewName === 'quickprints') {
    zbPageTitle.textContent = zbT('quickPrints');
    zbPageSubtitle.textContent = '';
    zbPageSubtitle.style.display = 'none';
    _qpRenderTemplatesGrid();
  } else if (viewName === 'editor') {
    zbPageTitle.textContent = zbT('quickPrints');
    zbPageSubtitle.style.display = 'none';
  } else if (viewName === 'settings') {
    zbPageTitle.textContent = zbT('settings');
    zbPageSubtitle.textContent = zbT('settingsTagline') || '';
    zbPageSubtitle.style.display = '';
    zbRenderSettings();
  }
}

zbNavLinks.forEach(function(link) {
  link.addEventListener('click', function(e) {
    if (!link.dataset.view) return;
    e.preventDefault();
    zbSwitchView(link.dataset.view);
  });
});

/* ============================================
   LANGUAGE SWITCHER
   ============================================ */
function zbRenderLangSwitcher() {
  var container = document.getElementById('lang-switcher');
  if (!container) return;
  var langs = [{ code: 'en', label: 'EN' }, { code: 'es', label: 'ES' }, { code: 'fr', label: 'FR' }];
  var current = zbGetLang();
  container.innerHTML = '';
  langs.forEach(function(l) {
    var btn = document.createElement('button');
    btn.className = 'lang-btn' + (l.code === current ? ' active' : '');
    btn.textContent = l.label;
    btn.onclick = function() {
      zbSetLang(l.code);
      location.reload();
    };
    container.appendChild(btn);
  });
}

/* ============================================
   PRODUCTS GRID
   ============================================ */
function zbRenderProductsGrid() {
  var grid = document.getElementById('products-grid');
  if (!grid) return;
  grid.innerHTML = '';

  ZB_PRODUCTS.forEach(function(prod) {
    var card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML =
      '<div class="product-image-wrap">' +
        '<img src="' + prod.image + '" alt="' + zbEscapeHtml(prod.name) + '" loading="lazy">' +
      '</div>' +
      '<div class="product-info">' +
        '<h3>' + zbEscapeHtml(prod.name) + '</h3>' +
        '<div class="price-row">' +
          '<span class="retail">' + zbFormatPrice(prod.retail) + '</span>' +
          '<span class="minimum">' + zbFormatPrice(prod.minimum) + '</span>' +
        '</div>' +
        '<div class="range-label">' + zbT('minPrice') + ' ' + zbFormatPrice(prod.minimum) + ' · ' + zbT('retailPrice') + ' ' + zbFormatPrice(prod.retail) + '</div>' +
      '</div>';
    card.addEventListener('click', function() { zbOpenDealBuilder(prod.id); });
    grid.appendChild(card);
  });
}

/* ============================================
   DEAL BUILDER
   ============================================ */
function zbOpenDealBuilder(productId) {
  var product = ZB_PRODUCTS.find(function(p) { return p.id === productId; });
  if (!product) return;
  zbCurrentProductId = productId;

  // Default deal data
  var shop = zbGetShop();
  var workers = zbGetWorkers();
  var defaultSeller = workers.length ? workers[0].name : '';

  zbCurrentDeal = {
    product: product.name,
    productImage: product.image,
    productRetail: product.retail,
    productMinimum: product.minimum,
    seller: defaultSeller,
    customer: '',
    units: 1,
    price: product.retail,
    gifts: [],
    expiryPreset: '24h',
    customExpiry: '',
    note: ''
  };

  var titleEl = document.getElementById('deal-form-title');
  if (titleEl) titleEl.textContent = product.name + ' — ' + zbT('dealBuilder');

  zbBuildDealForm(product);
  zbUpdateDealPreview();
  zbSwitchView('deal');
}

function zbBuildDealForm(product) {
  var container = document.getElementById('deal-form-body');
  if (!container) return;
  container.innerHTML = '';

  // Toolbar
  var toolbar = document.createElement('div');
  toolbar.className = 'editor-toolbar';
  toolbar.innerHTML =
    '<button class="btn btn-secondary btn-sm" id="btn-back">&larr; ' + zbT('backToProducts') + '</button>' +
    '<button class="btn btn-secondary btn-sm" id="btn-reset">' + zbT('resetFields') + '</button>' +
    '<button class="btn btn-primary btn-sm" id="btn-generate">' + zbT('generateOffer') + '</button>';
  container.appendChild(toolbar);

  document.getElementById('btn-back').addEventListener('click', function() { zbSwitchView('products'); });
  document.getElementById('btn-reset').addEventListener('click', function() {
    zbOpenDealBuilder(zbCurrentProductId);
  });
  document.getElementById('btn-generate').addEventListener('click', zbGenerateOffer);

  // Seller
  var sellerGroup = zbFormGroup(zbT('sellerName'), 'text', 'seller', zbCurrentDeal.seller);
  container.appendChild(sellerGroup);

  // Customer
  var custGroup = zbFormGroup(zbT('customerName'), 'text', 'customer', zbCurrentDeal.customer);
  container.appendChild(custGroup);

  // Units
  var unitsGroup = zbFormGroup(zbT('units'), 'number', 'units', zbCurrentDeal.units);
  unitsGroup.querySelector('input').setAttribute('min', '1');
  unitsGroup.querySelector('input').setAttribute('max', '5');
  container.appendChild(unitsGroup);

  // Price slider
  var priceWrap = document.createElement('div');
  priceWrap.className = 'form-group';
  priceWrap.innerHTML =
    '<label>' + zbT('dealPrice') + ' · ' + zbT('minPrice') + ' ' + zbFormatPrice(product.minimum) + '</label>' +
    '<div class="price-slider-wrap">' +
      '<input type="range" id="deal-price-slider" min="' + product.minimum + '" max="' + product.retail + '" value="' + zbCurrentDeal.price + '" step="5">' +
      '<span class="price-display" id="deal-price-display">' + zbFormatPrice(zbCurrentDeal.price) + '</span>' +
    '</div>';
  container.appendChild(priceWrap);

  // Deal summary
  var summary = document.createElement('div');
  summary.className = 'deal-summary';
  summary.id = 'deal-summary';
  container.appendChild(summary);

  // Gifts
  var giftsGroup = document.createElement('div');
  giftsGroup.className = 'form-group';
  giftsGroup.innerHTML = '<label>' + zbT('freeGifts') + '</label>';
  var giftGrid = document.createElement('div');
  giftGrid.className = 'gift-grid';
  giftGrid.id = 'gift-grid';
  ZB_GIFTS.forEach(function(gift) {
    var label = document.createElement('label');
    label.className = 'gift-checkbox';
    label.innerHTML = '<input type="checkbox" value="' + zbEscapeHtml(gift) + '"><span>' + zbEscapeHtml(gift) + '</span>';
    giftGrid.appendChild(label);
  });
  giftsGroup.appendChild(giftGrid);
  container.appendChild(giftsGroup);

  // Expiry
  var expiryGroup = document.createElement('div');
  expiryGroup.className = 'form-group';
  expiryGroup.innerHTML =
    '<label>' + zbT('expiresIn') + '</label>' +
    '<select id="deal-expiry-preset">' +
      '<option value="8h">' + zbT('expiry8h') + '</option>' +
      '<option value="24h" selected>' + zbT('expiry24h') + '</option>' +
      '<option value="1w">' + zbT('expiry1w') + '</option>' +
      '<option value="1m">' + zbT('expiry1m') + '</option>' +
      '<option value="custom">' + zbT('expiryCustom') + '</option>' +
    '</select>';
  container.appendChild(expiryGroup);

  // Custom expiry (hidden by default)
  var customExpiryGroup = document.createElement('div');
  customExpiryGroup.className = 'form-group';
  customExpiryGroup.id = 'custom-expiry-group';
  customExpiryGroup.style.display = 'none';
  customExpiryGroup.innerHTML =
    '<label>' + zbT('customExpiry') + '</label>' +
    '<input type="datetime-local" id="deal-custom-expiry">';
  container.appendChild(customExpiryGroup);

  // Note
  var noteGroup = zbFormGroup(zbT('noteOptional'), 'textarea', 'note', zbCurrentDeal.note);
  noteGroup.querySelector('textarea').setAttribute('rows', '3');
  container.appendChild(noteGroup);

  // Attach listeners
  container.querySelectorAll('input, select, textarea').forEach(function(el) {
    el.addEventListener('input', zbOnDealInput);
    el.addEventListener('change', zbOnDealInput);
  });

  // Gift checkbox visual toggle
  giftGrid.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
    cb.addEventListener('change', function() {
      cb.parentElement.classList.toggle('checked', cb.checked);
      zbOnDealInput({ target: cb });
    });
  });

  // Expiry preset toggle
  document.getElementById('deal-expiry-preset').addEventListener('change', function(e) {
    var customGroup = document.getElementById('custom-expiry-group');
    customGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
    zbOnDealInput(e);
  });

  // Price slider live display
  document.getElementById('deal-price-slider').addEventListener('input', function(e) {
    document.getElementById('deal-price-display').textContent = zbFormatPrice(e.target.value);
    zbOnDealInput(e);
  });
}

function zbFormGroup(labelText, type, name, value) {
  var group = document.createElement('div');
  group.className = 'form-group';
  if (type === 'textarea') {
    group.innerHTML = '<label>' + zbEscapeHtml(labelText) + '</label><textarea name="' + name + '">' + zbEscapeHtml(value || '') + '</textarea>';
  } else {
    group.innerHTML = '<label>' + zbEscapeHtml(labelText) + '</label><input type="' + type + '" name="' + name + '" value="' + zbEscapeHtml(value !== undefined ? value : '') + '">';
  }
  return group;
}

function zbOnDealInput(e) {
  var el = e.target;
  var key = el.name || el.id;

  if (key === 'deal-price-slider') {
    zbCurrentDeal.price = Number(el.value);
  } else if (key === 'deal-expiry-preset') {
    zbCurrentDeal.expiryPreset = el.value;
  } else if (key === 'deal-custom-expiry') {
    zbCurrentDeal.customExpiry = el.value;
  } else if (el.type === 'checkbox') {
    // Handled separately for gifts
    if (el.parentElement.classList.contains('gift-checkbox')) {
      var checked = Array.from(document.querySelectorAll('#gift-grid input:checked')).map(function(cb) { return cb.value; });
      zbCurrentDeal.gifts = checked;
    }
  } else if (el.type === 'number') {
    zbCurrentDeal[key] = el.value === '' ? '' : Number(el.value);
  } else {
    zbCurrentDeal[key] = el.value;
  }

  zbUpdateDealPreview();
}

/* ============================================
   RECEIPT PREVIEW RENDERER
   ============================================ */
function zbUpdateDealPreview() {
  var shop = zbGetShop();
  var html = zbRenderReceiptPreview(zbCurrentDeal, shop);
  var previewEl = document.getElementById('receipt-preview');
  if (previewEl) previewEl.innerHTML = html;
}

function zbRenderReceiptPreview(deal, shop) {
  var html = '';
  html += rcLogo(shop);
  html += rcTagline(shop);
  html += rcDivider('double');

  html += rcTitle(zbT('scanToClaim'));
  html += rcSubtitle(deal.product);

  html += rcDivider('single');

  if (deal.customer) {
    html += rcLabel(zbT('offerFor'));
    html += rcValue(deal.customer || zbT('customerDefault'));
  }
  if (deal.seller) {
    html += rcLabel(zbT('preparedBy'));
    html += rcValue(deal.seller);
  }

  html += rcDivider('light');

  // Pricing
  var regularTotal = deal.productRetail * (deal.units || 1);
  var dealTotal = deal.price * (deal.units || 1);
  var savings = regularTotal - dealTotal;

  html += rcRow(zbT('regularPrice'), zbFormatPrice(regularTotal));
  html += rcRow(zbT('yourPrice'), zbFormatPrice(dealTotal), true);
  if (savings > 0) {
    html += rcRow(zbT('savings'), '-' + zbFormatPrice(savings), true);
  }

  html += rcDivider('light');

  // Gifts
  if (deal.gifts && deal.gifts.length) {
    html += rcLabel(zbT('freeGifts') + ' (' + deal.gifts.length + ')');
    deal.gifts.forEach(function(g) {
      html += rcValue('+ ' + g);
    });
    html += rcDivider('light');
  }

  // Note
  if (deal.note) {
    html += rcParagraph('"' + deal.note + '"', 'rc-small rc-center');
    html += rcDivider('light');
  }

  // QR placeholder
  html += rcLabel(zbT('qrCodeLabel'));
  html += '<div style="margin:8px 0;"><div style="width:120px;height:120px;background:#eee;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">QR</div></div>';

  // Expiry
  var expiryText = zbComputeExpiryText(deal);
  if (expiryText) {
    html += rcLabel(zbT('expiresAt'));
    html += rcValue(expiryText);
  }

  html += rcDivider('double');
  html += rcShopFooter(shop);
  return html;
}

function rcLogo(shop) {
  if (!shop || !shop.logo) return '';
  return '<div class="rc-logo"><img src="' + zbEscapeHtml(shop.logo) + '" alt=""></div>';
}
function rcTagline(shop) {
  if (!shop) return '';
  var html = '';
  if (shop.name) html += '<div class="rc-brand">' + zbEscapeHtml(shop.name) + '</div>';
  if (shop.tagline) html += '<div class="rc-tagline">' + zbEscapeHtml(shop.tagline) + '</div>';
  return html;
}
function rcDivider(type) {
  return '<div class="rc-divider rc-divider--' + type + '"></div>';
}
function rcTitle(text) {
  return '<div class="rc-title">' + zbEscapeHtml(text) + '</div>';
}
function rcSubtitle(text) {
  return '<div class="rc-subtitle">' + zbEscapeHtml(text) + '</div>';
}
function rcLabel(text) {
  return '<div class="rc-label">' + zbEscapeHtml(text) + '</div>';
}
function rcValue(text) {
  return '<div class="rc-value">' + zbEscapeHtml(text) + '</div>';
}
function rcParagraph(text, className) {
  return '<div class="rc-paragraph' + (className ? ' ' + className : '') + '">' + text + '</div>';
}
function rcRow(label, value, isHighlight) {
  return '<div class="rc-row' + (isHighlight ? ' highlight' : '') + '"><span>' + zbEscapeHtml(label) + '</span><span>' + zbEscapeHtml(value) + '</span></div>';
}
function rcShopFooter(shop) {
  if (!shop) return '';
  var html = '';
  if (shop.phone) html += '<div class="rc-meta">' + zbEscapeHtml(shop.phone) + '</div>';
  if (shop.whatsapp) html += '<div class="rc-meta">WA: ' + zbEscapeHtml(shop.whatsapp) + '</div>';
  if (shop.email) html += '<div class="rc-meta">' + zbEscapeHtml(shop.email) + '</div>';
  if (shop.website) html += '<div class="rc-meta">' + zbEscapeHtml(shop.website) + '</div>';
  if (shop.locations && shop.locations.length) {
    html += rcDivider('light');
    html += rcLabel(zbT('locations'));
    shop.locations.forEach(function(loc) {
      html += '<div class="rc-value">' + zbEscapeHtml(loc.name) + (loc.address ? ' — ' + zbEscapeHtml(loc.address) : '') + '</div>';
    });
  }
  if (shop.hours) {
    html += rcDivider('light');
    html += rcLabel(zbT('openingHours'));
    html += '<div class="rc-value">' + zbEscapeHtml(shop.hours) + '</div>';
  }
  return html;
}

/* ============================================
   OFFER GENERATION
   ============================================ */
function zbComputeExpiryDate(deal) {
  var now = new Date();
  if (deal.expiryPreset === 'custom' && deal.customExpiry) {
    return new Date(deal.customExpiry);
  }
  var ms = 0;
  switch (deal.expiryPreset) {
    case '8h': ms = 8 * 60 * 60 * 1000; break;
    case '24h': ms = 24 * 60 * 60 * 1000; break;
    case '1w': ms = 7 * 24 * 60 * 60 * 1000; break;
    case '1m': ms = 30 * 24 * 60 * 60 * 1000; break;
    default: ms = 24 * 60 * 60 * 1000;
  }
  return new Date(now.getTime() + ms);
}

function zbComputeExpiryText(deal) {
  var d = zbComputeExpiryDate(deal);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(zbGetLang() === 'en' ? 'en-GB' : zbGetLang() === 'es' ? 'es-ES' : 'fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function zbGenerateOffer() {
  var deal = JSON.parse(JSON.stringify(zbCurrentDeal));
  deal.expires = zbComputeExpiryDate(deal).toISOString();
  deal.created = new Date().toISOString();

  var shop = zbGetShop();
  var worker = zbGetWorkers().find(function(w) { return w.name === deal.seller; });
  deal.shop = shop;
  deal.worker = worker || null;

  // Encode to base64 URL
  var json = JSON.stringify(deal);
  var encoded = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  var baseUrl = 'https://bullishrobr-dev.github.io/zero-backhand/offer.html';
  zbCurrentOfferURL = baseUrl + '?d=' + encoded;

  zbShowOfferModal();
}

function zbShowOfferModal() {
  var modal = document.getElementById('offer-modal');
  var qrWrap = document.getElementById('modal-qr');
  var linkInput = document.getElementById('offer-link');

  linkInput.value = zbCurrentOfferURL;

  // Generate QR
  qrWrap.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    new QRCode(qrWrap, {
      text: zbCurrentOfferURL,
      width: 180,
      height: 180,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  // WhatsApp link
  var waMsg = zbT('appName') + ' — ' + zbCurrentDeal.product + ' — ' + zbFormatPrice(zbCurrentDeal.price * zbCurrentDeal.units) + ' — ' + zbCurrentOfferURL;
  document.getElementById('btn-whatsapp').href = 'https://wa.me/?text=' + encodeURIComponent(waMsg);

  // Copy link
  document.getElementById('btn-copy-link').onclick = function() {
    linkInput.select();
    document.execCommand('copy');
    alert(zbT('linkCopied'));
  };

  // Print from modal
  document.getElementById('btn-print-modal').onclick = zbPrintDeal;

  // Close
  document.getElementById('modal-close').onclick = function() { modal.style.display = 'none'; };

  modal.style.display = 'flex';
}

/* ============================================
   THERMAL PRINTING
   ============================================ */
function zbPrintDeal() {
  var deal = JSON.parse(JSON.stringify(zbCurrentDeal));
  deal.expires = zbComputeExpiryDate(deal).toISOString();
  deal.created = new Date().toISOString();

  var shop = zbGetShop();
  var worker = zbGetWorkers().find(function(w) { return w.name === deal.seller; });

  var payload = {
    type: 'zero-backhand',
    deal: deal,
    shop: shop,
    worker: worker || null,
    lang: zbGetLang()
  };

  fetch('http://127.0.0.1:8766/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(function(r) { return r.json(); })
  .then(function(result) {
    if (result.success) {
      alert(zbT('printed'));
    } else {
      alert(zbT('printFailed') + ': ' + (result.error || 'Unknown'));
    }
  })
  .catch(function(err) {
    alert(zbT('printServerNotRunning'));
  });
}

/* ============================================
   SETTINGS
   ============================================ */
var zbSettingsShop = null;
var zbSettingsWorkers = [];

function zbRenderSettings() {
  zbSettingsShop = zbGetShop();
  zbSettingsWorkers = zbGetWorkers();

  document.getElementById('shop-name').value = zbSettingsShop.name;
  document.getElementById('shop-tagline').value = zbSettingsShop.tagline;
  document.getElementById('shop-email').value = zbSettingsShop.email;
  document.getElementById('shop-phone').value = zbSettingsShop.phone;
  document.getElementById('shop-whatsapp').value = zbSettingsShop.whatsapp;
  document.getElementById('shop-website').value = zbSettingsShop.website;
  document.getElementById('shop-hours').value = zbSettingsShop.hours || '';

  var logoPreview = document.getElementById('logo-preview');
  if (logoPreview) {
    if (zbSettingsShop.logo) {
      logoPreview.src = zbSettingsShop.logo;
      logoPreview.style.display = 'block';
    } else {
      logoPreview.style.display = 'none';
    }
  }

  ['name', 'tagline', 'email', 'phone', 'whatsapp', 'website', 'hours'].forEach(function(key) {
    var el = document.getElementById('shop-' + key);
    if (el) {
      el.oninput = function(e) {
        zbSettingsShop[key] = e.target.value;
        zbSetShop(zbSettingsShop);
      };
    }
  });

  var logoInput = document.getElementById('shop-logo-file');
  if (logoInput) {
    logoInput.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        zbSettingsShop.logo = ev.target.result;
        zbSetShop(zbSettingsShop);
        var preview = document.getElementById('logo-preview');
        if (preview) { preview.src = ev.target.result; preview.style.display = 'block'; }
      };
      reader.readAsDataURL(file);
    };
  }

  var clearLogo = document.getElementById('btn-clear-logo');
  if (clearLogo) {
    clearLogo.onclick = function() {
      zbSettingsShop.logo = '';
      zbSetShop(zbSettingsShop);
      var preview = document.getElementById('logo-preview');
      if (preview) preview.style.display = 'none';
      if (logoInput) logoInput.value = '';
    };
  }

  zbRenderLocations();
  zbRenderWorkersList();

  var btnAddLoc = document.getElementById('btn-add-location');
  var btnAddWorker = document.getElementById('btn-add-worker');
  var btnReset = document.getElementById('btn-reset-all');
  if (btnAddLoc) btnAddLoc.onclick = zbAddLocationRow;
  if (btnAddWorker) btnAddWorker.onclick = function() { zbShowWorkerForm(); };
  if (btnReset) btnReset.onclick = function() {
    if (confirm(zbT('confirmReset'))) {
      zbResetToDefaults();
      zbRenderSettings();
    }
  };

  // Printer setup
  var btnTestPrint = document.getElementById('btn-test-print');
  var btnCheckPrinter = document.getElementById('btn-check-printer');
  if (btnTestPrint) btnTestPrint.onclick = zbTestPrint;
  if (btnCheckPrinter) btnCheckPrinter.onclick = zbCheckPrinterStatus;
  zbCheckPrinterStatus();
}

function zbRenderLocations() {
  var container = document.getElementById('locations-list');
  if (!container) return;
  container.innerHTML = '';
  if (!zbSettingsShop.locations.length) {
    container.innerHTML = '<div class="empty-state">' + zbT('add') + ' ' + zbT('locations').toLowerCase() + '</div>';
    return;
  }
  zbSettingsShop.locations.forEach(function(loc, idx) {
    var row = document.createElement('div');
    row.className = 'location-row';
    row.innerHTML =
      '<div class="form-group"><label>' + zbT('name') + '</label><input type="text" data-idx="' + idx + '" data-field="name" value="' + zbEscapeHtml(loc.name) + '"></div>' +
      '<div class="form-group"><label>' + zbT('address') + '</label><input type="text" data-idx="' + idx + '" data-field="address" value="' + zbEscapeHtml(loc.address) + '"></div>' +
      '<button class="btn btn-danger btn-sm" data-remove-idx="' + idx + '">&times;</button>';
    container.appendChild(row);
  });
  container.querySelectorAll('input').forEach(function(input) {
    input.oninput = function(e) {
      var idx = Number(e.target.dataset.idx);
      var field = e.target.dataset.field;
      zbSettingsShop.locations[idx][field] = e.target.value;
      zbSetShop(zbSettingsShop);
    };
  });
  container.querySelectorAll('[data-remove-idx]').forEach(function(btn) {
    btn.onclick = function() {
      var idx = Number(btn.dataset.removeIdx);
      zbSettingsShop.locations.splice(idx, 1);
      zbSetShop(zbSettingsShop);
      zbRenderLocations();
    };
  });
}

function zbAddLocationRow() {
  zbSettingsShop.locations.push({ id: 'loc' + Date.now(), name: '', address: '' });
  zbSetShop(zbSettingsShop);
  zbRenderLocations();
}

function zbRenderWorkersList() {
  var container = document.getElementById('workers-list');
  if (!container) return;
  container.innerHTML = '';
  if (!zbSettingsWorkers.length) {
    container.innerHTML = '<div class="empty-state">' + zbT('addWorker') + '</div>';
    return;
  }
  zbSettingsWorkers.forEach(function(w) {
    var card = document.createElement('div');
    card.className = 'worker-card';
    var contact = [];
    if (w.phone) contact.push(w.phone);
    if (w.whatsapp) contact.push('WA: ' + w.whatsapp);
    if (w.email) contact.push(w.email);
    card.innerHTML =
      '<div class="worker-card-info"><h4>' + zbEscapeHtml(w.name) + '</h4><p>' + zbEscapeHtml(w.role) + (contact.length ? ' · ' + zbEscapeHtml(contact.join(' · ')) : '') + '</p></div>' +
      '<div class="worker-card-actions"><button class="btn btn-sm btn-secondary" data-edit="' + w.id + '">' + zbT('edit') + '</button><button class="btn btn-sm btn-danger" data-remove="' + w.id + '">' + zbT('remove') + '</button></div>';
    container.appendChild(card);
  });
  container.querySelectorAll('[data-edit]').forEach(function(btn) {
    btn.onclick = function() { zbShowWorkerForm(btn.dataset.edit); };
  });
  container.querySelectorAll('[data-remove]').forEach(function(btn) {
    btn.onclick = function() {
      if (confirm(zbT('removeWorker'))) {
        zbRemoveWorker(btn.dataset.remove);
        zbRenderWorkersList();
      }
    };
  });
}

function zbShowWorkerForm(workerId) {
  var worker = workerId ? zbGetWorkers().find(function(w) { return w.id === workerId; }) : null;
  var container = document.getElementById('workers-list');
  if (!container) return;
  var existing = container.querySelector('.settings-section');
  if (existing) existing.remove();

  var section = document.createElement('div');
  section.className = 'settings-section';
  section.style.marginTop = '10px';
  section.innerHTML =
    '<div class="settings-section-header">' + (worker ? zbT('edit') : zbT('addWorker')) + '</div>' +
    '<div class="settings-section-body">' +
      '<div class="settings-grid">' +
        '<div class="form-group"><label>' + zbT('name') + '</label><input type="text" id="w-name" value="' + zbEscapeHtml(worker ? worker.name : '') + '"></div>' +
        '<div class="form-group"><label>' + zbT('role') + '</label><input type="text" id="w-role" value="' + zbEscapeHtml(worker ? worker.role : '') + '"></div>' +
        '<div class="form-group"><label>' + zbT('phone') + '</label><input type="text" id="w-phone" value="' + zbEscapeHtml(worker ? worker.phone : '') + '"></div>' +
        '<div class="form-group"><label>' + zbT('whatsapp') + '</label><input type="text" id="w-whatsapp" value="' + zbEscapeHtml(worker ? worker.whatsapp : '') + '"></div>' +
        '<div class="form-group"><label>' + zbT('email') + '</label><input type="text" id="w-email" value="' + zbEscapeHtml(worker ? worker.email : '') + '"></div>' +
      '</div>' +
      '<div style="margin-top:14px; display:flex; gap:8px;">' +
        '<button class="btn btn-primary btn-sm" id="w-save">' + zbT('save') + '</button>' +
        '<button class="btn btn-secondary btn-sm" id="w-cancel">' + zbT('cancel') + '</button>' +
      '</div>' +
    '</div>';
  container.prepend(section);

  document.getElementById('w-save').onclick = function() {
    var data = {
      name: document.getElementById('w-name').value.trim(),
      role: document.getElementById('w-role').value.trim(),
      phone: document.getElementById('w-phone').value.trim(),
      whatsapp: document.getElementById('w-whatsapp').value.trim(),
      email: document.getElementById('w-email').value.trim()
    };
    if (!data.name) { alert(zbT('name') + ' required'); return; }
    if (worker) zbUpdateWorker(worker.id, data);
    else zbAddWorker(data);
    zbRenderWorkersList();
  };
  document.getElementById('w-cancel').onclick = function() {
    var sec = container.querySelector('.settings-section');
    if (sec) sec.remove();
  };
}

/* ============================================
   PRINTER STATUS & TEST PRINT
   ============================================ */
function zbCheckPrinterStatus() {
  var statusEl = document.getElementById('printer-status');
  var msgEl = document.getElementById('printer-message');
  if (!statusEl) return;

  statusEl.innerHTML = '<span class="status-dot"></span> Checking...';
  statusEl.className = 'printer-status';

  fetch('http://127.0.0.1:8766/print', { method: 'OPTIONS' })
    .then(function() {
      statusEl.innerHTML = '<span class="status-dot"></span> Online';
      statusEl.className = 'printer-status online';
      if (msgEl) msgEl.textContent = 'Printer server is running. Ready to print.';
    })
    .catch(function() {
      statusEl.innerHTML = '<span class="status-dot"></span> Offline';
      statusEl.className = 'printer-status offline';
      if (msgEl) msgEl.textContent = 'Printer server not running. Double-click start-printer.bat to start it.';
    });
}

function zbTestPrint() {
  var msgEl = document.getElementById('printer-message');
  if (msgEl) msgEl.textContent = 'Sending test print...';

  var shop = zbGetShop();
  var payload = {
    type: 'zero-backhand',
    deal: {
      product: 'Test Print',
      productRetail: 300,
      units: 1,
      price: 250,
      seller: 'System',
      customer: 'Test',
      gifts: ['Premium Night Cream'],
      note: 'This is a test print to verify the thermal printer is working.',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    shop: shop,
    worker: null,
    lang: zbGetLang()
  };

  fetch('http://127.0.0.1:8766/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(function(r) { return r.json(); })
  .then(function(result) {
    if (result.success) {
      if (msgEl) msgEl.textContent = 'Test print sent successfully! Check your printer.';
      zbCheckPrinterStatus();
    } else {
      if (msgEl) msgEl.textContent = 'Test print failed: ' + (result.error || 'Unknown error');
    }
  })
  .catch(function(err) {
    if (msgEl) msgEl.textContent = 'Cannot reach printer server. Make sure start-printer.bat is running.';
  });
}

/* ============================================
   INIT
   ============================================ */
function zbInit() {
  try {
    zbRenderLangSwitcher();
    zbRenderProductsGrid();
    console.log('Zero Backhand initialized');
  } catch (err) {
    console.error('Init error:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', zbInit);
} else {
  zbInit();
}


/* ============================================
   QUICK PRINTS EMBEDDED
   ============================================ */

var _qpCurrentTemplateId = null;
var _qpCurrentEditorData = {};

function _qpRenderTemplatesGrid() {
  var grid = document.getElementById('qp-templates-grid');
  if (!grid) { console.error('Grid not found'); return; }
  grid.innerHTML = '';
  if (typeof ZB_TEMPLATES === 'undefined') {
    grid.innerHTML = '<div style="padding:20px;color:red;">Error: ZB_TEMPLATES not loaded</div>';
    console.error('ZB_TEMPLATES is undefined');
    return;
  }
  var keys = Object.keys(ZB_TEMPLATES);
  if (keys.length === 0) {
    grid.innerHTML = '<div style="padding:20px;color:red;">Error: No templates found</div>';
    return;
  }
  keys.forEach(function(key) {
    var tmpl = ZB_TEMPLATES[key];
    var card = document.createElement('div');
    card.className = 'template-card';
    var name = zbT(tmpl.nameKey) || tmpl.nameKey;
    var desc = zbT(tmpl.descKey) || tmpl.descKey;
    card.innerHTML = '<div class="icon">' + tmpl.icon + '</div><div><h3>' + zbEscapeHtml(name) + '</h3><p>' + zbEscapeHtml(desc) + '</p></div>';
    card.addEventListener('click', function() { _qpOpenEditor(tmpl.id); });
    grid.appendChild(card);
  });
}

function _qpOpenEditor(templateId) {
  try {
    _qpCurrentTemplateId = templateId;
    var tmpl = ZB_TEMPLATES[templateId];
    if (!tmpl) { alert('ERROR: Template not found: ' + templateId); return; }
    var saved = zbGetEditorState(templateId);
    _qpCurrentEditorData = saved ? Object.assign({}, zbGetTemplateDefaults(templateId), saved) : zbGetTemplateDefaults(templateId);
    var titleEl = document.getElementById('qp-editor-form-title');
    if (titleEl) titleEl.textContent = zbT(tmpl.nameKey);
    _qpBuildEditorForm(tmpl);
    _qpUpdatePreview();
    zbSwitchView('editor');
  } catch (err) {
    alert('ERROR in _qpOpenEditor:\n' + err.message + '\n\nStack:\n' + (err.stack || 'none'));
    console.error('_qpOpenEditor error:', err);
  }
}

function _qpBuildEditorForm(tmpl) {
  try {
    var container = document.getElementById('qp-editor-form-body');
    if (!container) { alert('ERROR: qp-editor-form-body not found'); return; }
    var workers = zbGetWorkers();
    container.innerHTML = '';

  var toolbar = document.createElement('div');
  toolbar.className = 'editor-toolbar';
  toolbar.innerHTML = '<button class="btn btn-secondary btn-sm" id="qp-btn-back">&larr; ' + zbT('backToTemplates') + '</button><button class="btn btn-secondary btn-sm" id="qp-btn-reset">' + zbT('resetFields') + '</button><button class="btn btn-primary btn-sm" id="qp-btn-print">' + zbT('print') + '</button>';
  container.appendChild(toolbar);

  document.getElementById('qp-btn-back').addEventListener('click', function() { zbSwitchView('quickprints'); });
  document.getElementById('qp-btn-reset').addEventListener('click', function() {
    _qpCurrentEditorData = zbGetTemplateDefaults(_qpCurrentTemplateId);
    _qpBuildEditorForm(tmpl);
    _qpUpdatePreview();
  });
  document.getElementById('qp-btn-print').addEventListener('click', _qpDoPrintThermal);

  tmpl.fields.forEach(function(field) {
    var group = document.createElement('div');
    group.className = 'form-group';
    var label = zbT(field.labelKey) || field.labelKey;

    if (field.type === 'checkbox') {
      group.innerHTML = '<label class="checkbox-row"><input type="checkbox" name="' + field.key + '"' + (_qpCurrentEditorData[field.key] ? ' checked' : '') + '><span>' + zbEscapeHtml(label) + '</span></label>';
    } else if (field.type === 'worker') {
      var options = '<option value="">-- ' + zbT('specialist') + ' --</option>';
      workers.forEach(function(w) {
        options += '<option value="' + w.id + '"' + (_qpCurrentEditorData[field.key] === w.id ? ' selected' : '') + '>' + zbEscapeHtml(w.name) + ' &mdash; ' + zbEscapeHtml(w.role) + '</option>';
      });
      group.innerHTML = '<label>' + zbEscapeHtml(label) + '</label><select name="' + field.key + '">' + options + '</select>';
    } else if (field.type === 'textarea') {
      group.innerHTML = '<label>' + zbEscapeHtml(label) + '</label><textarea name="' + field.key + '" rows="4">' + zbEscapeHtml(_qpCurrentEditorData[field.key] || '') + '</textarea>';
    } else {
      group.innerHTML = '<label>' + zbEscapeHtml(label) + '</label><input type="' + field.type + '" name="' + field.key + '" value="' + zbEscapeHtml(_qpCurrentEditorData[field.key] || '') + '">';
    }

    if (field.type === 'textarea' && (field.key === 'benefits' || field.key === 'steps')) {
      var hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = zbT('onePerLine');
      group.appendChild(hint);
    }
    container.appendChild(group);
  });

    container.querySelectorAll('input, select, textarea').forEach(function(el) {
      el.addEventListener('input', _qpOnEditorInput);
      el.addEventListener('change', _qpOnEditorInput);
    });
  } catch (err) {
    alert('ERROR in _qpBuildEditorForm:\n' + err.message + '\n\nStack:\n' + (err.stack || 'none'));
    console.error('_qpBuildEditorForm error:', err);
  }
}

function _qpOnEditorInput(e) {
  var el = e.target;
  var key = el.name;
  var tmpl = ZB_TEMPLATES[_qpCurrentTemplateId];
  if (!tmpl) return;
  var field = tmpl.fields.find(function(f) { return f.key === key; });
  if (!field) return;
  if (field.type === 'checkbox') _qpCurrentEditorData[key] = el.checked;
  else if (field.type === 'number') _qpCurrentEditorData[key] = el.value === '' ? '' : Number(el.value);
  else _qpCurrentEditorData[key] = el.value;
  zbSaveEditorState(_qpCurrentTemplateId, _qpCurrentEditorData);
  _qpUpdatePreview();
}

function _qpUpdatePreview() {
  try {
    var tmpl = ZB_TEMPLATES[_qpCurrentTemplateId];
    if (!tmpl) return;
    var shop = zbGetShop();
    var data = zbBuildTemplateData(_qpCurrentTemplateId, _qpCurrentEditorData);
    var worker = data.workerId ? zbGetWorkerById(data.workerId) : null;
    var html = zbRenderTemplate(_qpCurrentTemplateId, data, shop, worker);
    var previewEl = document.getElementById('qp-receipt-preview');
    if (previewEl) previewEl.innerHTML = html;
  } catch (err) {
    alert('ERROR in _qpUpdatePreview:\n' + err.message + '\n\nStack:\n' + (err.stack || 'none'));
    console.error('_qpUpdatePreview error:', err);
  }
}

function _qpDoPrintThermal() {
  var shop = zbGetShop();
  var worker = null;
  if (_qpCurrentEditorData.workerId) {
    worker = zbGetWorkerById(_qpCurrentEditorData.workerId);
  }

  var payload = {
    type: 'quick-prints',
    template: _qpCurrentTemplateId,
    data: JSON.parse(JSON.stringify(_qpCurrentEditorData)),
    shop: shop,
    worker: worker
  };

  fetch('http://127.0.0.1:8766/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(function(r) { return r.json(); })
  .then(function(result) {
    if (result.success) {
      alert(zbT('printed'));
    } else {
      alert(zbT('printFailed') + ': ' + (result.error || 'Unknown'));
    }
  })
  .catch(function(err) {
    alert(zbT('printServerNotRunning'));
  });
}
