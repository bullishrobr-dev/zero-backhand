/**
 * templates.js — Template schemas, defaults, and luxury receipt renderers
 */

function zbFormatDateDMY(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  var day = String(d.getDate()).padStart(2, '0');
  var month = String(d.getMonth() + 1).padStart(2, '0');
  var year = String(d.getFullYear()).slice(-2);
  return day + '.' + month + '.' + year;
}

function zbEscapeHtml(text) {
  if (text == null) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function zbNl2br(text) {
  return zbEscapeHtml(text).replace(/\n/g, '<br>');
}

function zbBenefitsToHtml(text) {
  if (!text) return '';
  var lines = text.split('\n').filter(function(l) { return l.trim(); });
  if (!lines.length) return '';
  return '<ul class="rc-list">' + lines.map(function(l) {
    return '<li>' + zbEscapeHtml(l.trim()) + '</li>';
  }).join('') + '</ul>';
}

function zbStepsToHtml(text) {
  if (!text) return '';
  var lines = text.split('\n').filter(function(l) { return l.trim(); });
  if (!lines.length) return '';
  return '<ol class="rc-list">' + lines.map(function(l) {
    return '<li>' + zbEscapeHtml(l.trim()) + '</li>';
  }).join('') + '</ol>';
}

/* ---------- Receipt helpers ---------- */
function rcLogo(shop) {
  if (shop.logo) {
    return '<div class="rc-logo"><img src="' + zbEscapeHtml(shop.logo) + '" alt=""></div>';
  }
  if (shop.name) {
    return '<div class="rc-brand">' + zbEscapeHtml(shop.name) + '</div>';
  }
  return '';
}

function rcTagline(shop) {
  if (shop.tagline) {
    return '<div class="rc-tagline">' + zbEscapeHtml(shop.tagline) + '</div>';
  }
  return '';
}

function rcDivider(style) {
  style = style || 'single';
  return '<div class="rc-divider rc-divider--' + style + '"></div>';
}

function rcCenter(text, cls) {
  cls = cls || '';
  return '<div class="rc-center ' + cls + '">' + text + '</div>';
}

function rcLabel(text) {
  return '<div class="rc-label">' + zbEscapeHtml(text) + '</div>';
}

function rcValue(text) {
  return '<div class="rc-value">' + zbEscapeHtml(text) + '</div>';
}

function rcRow(label, value) {
  return '<div class="rc-row"><span>' + zbEscapeHtml(label) + '</span><span>' + zbEscapeHtml(value) + '</span></div>';
}

function rcParagraph(text, cls) {
  cls = cls || '';
  return '<div class="rc-paragraph ' + cls + '">' + zbNl2br(text) + '</div>';
}

/* ---------- Shop footer ---------- */
function rcShopFooter(shop, opts) {
  opts = opts || {};
  var html = '';

  /* Locations */
  if (shop.locations && shop.locations.length) {
    if (shop.locations.length === 1) {
      var loc = shop.locations[0];
      html += rcDivider('light');
      if (loc.name) html += rcCenter(zbEscapeHtml(loc.name), 'rc-loc-name');
      if (loc.address) html += rcCenter(zbEscapeHtml(loc.address), 'rc-loc-addr');
    } else {
      html += rcDivider('light');
      html += rcLabel(zbT('locationsLabel'));
      shop.locations.forEach(function(loc) {
        var line = loc.name ? (loc.name + ' — ' + loc.address) : loc.address;
        html += '<div class="rc-loc-item">' + zbEscapeHtml(line) + '</div>';
      });
    }
  }

  /* Contact */
  var hasContact = shop.email || shop.phone || shop.whatsapp || shop.website;
  if (hasContact) {
    html += rcDivider('light');
    if (shop.email) {
      html += rcLabel(zbT('emailLabel'));
      html += rcValue(shop.email);
    }
    if (shop.phone) {
      html += rcLabel(zbT('phoneLabel'));
      html += rcValue(shop.phone);
    }
    if (shop.whatsapp) {
      html += rcLabel(zbT('whatsappLabel'));
      html += rcValue(shop.whatsapp);
    }
    if (shop.website) {
      html += rcLabel(zbT('website'));
      html += rcValue(shop.website);
    }
  }

  /* Hours */
  if (opts.showOpeningHours && shop.hours) {
    var days = { mon: zbT('mon'), tue: zbT('tue'), wed: zbT('wed'), thu: zbT('thu'), fri: zbT('fri'), sat: zbT('sat'), sun: zbT('sun') };
    var hoursHtml = '';
    Object.entries(days).forEach(function(entry) {
      var key = entry[0], label = entry[1];
      if (shop.hours[key]) {
        hoursHtml += rcRow(label, shop.hours[key]);
      }
    });
    if (hoursHtml) {
      html += rcDivider('light');
      html += rcLabel(zbT('openingHoursLabel'));
      html += '<div class="rc-hours">' + hoursHtml + '</div>';
    }
  }

  if (html) {
    return rcDivider('double') + html + rcDivider('double');
  }
  return '';
}

/* ---------- Worker contact (business card body) ---------- */
function rcWorkerContact(worker, opts) {
  opts = opts || {};
  if (!worker) return '';
  var html = '';
  if (opts.showEmail && worker.email) {
    html += rcLabel(zbT('emailLabel'));
    html += rcValue(worker.email);
  }
  if (opts.showPhone && worker.phone) {
    html += rcLabel(zbT('phoneLabel'));
    html += rcValue(worker.phone);
  }
  if (opts.showWhatsApp && worker.whatsapp) {
    html += rcLabel(zbT('whatsappLabel'));
    html += rcValue(worker.whatsapp);
  }
  if (html) {
    return rcDivider('dotted') + html;
  }
  return '';
}

/* ---------- Worker inline (for facial/skincare) ---------- */
function rcWorkerInline(worker) {
  if (!worker) return '';
  var html = rcDivider('single');
  html += rcCenter(zbEscapeHtml(worker.role));
  html += rcCenter('<strong>' + zbEscapeHtml(worker.name) + '</strong>', 'rc-worker-name');
  if (worker.phone) {
    html += rcCenter(worker.phone, 'rc-worker-contact');
  }
  if (worker.whatsapp) {
    html += rcCenter('WA: ' + worker.whatsapp, 'rc-worker-contact');
  }
  return html;
}

/* ---------- Defaults per language ---------- */
var ZB_TEMPLATE_DEFAULTS = {
  en: {
    discount: { headline: 'EXCLUSIVE VOUCHER', code: 'SAVE20', percent: '20', description: 'Valid on your next skincare product purchase in-store. Limited time only!', redemption: 'Present this voucher at checkout to redeem your discount.', validUntil: '', cta: 'Visit us today and redeem your unique offer!', showFreeDelivery: false, freeDeliveryCopy: 'Contact us for a FREE delivery with your discount!' },
    businesscard: { tagline: 'Your Skin, Refined.', role: 'Skincare Specialist', showEmail: false, showPhone: false, showWhatsApp: false, notes: '', showHours: false, cta: 'Visit us in-store and ask for your free skincare consultation today!' },
    facial: { headline: 'COMPLIMENTARY FACIAL', subheadline: 'Red + Infrared LED Therapy Session + Complimentary Refreshment', intro: 'Discover the benefits of this advanced non-invasive technology, designed for total skin and body rejuvenation:', benefits: 'Smooths fine lines and wrinkles\nLifts and tones facial muscles\nStimulates collagen and elastin\nMinimises visible pores\nEvens out skin tone and texture\nRepairs sun-damaged and aging skin\nImproves blood flow and circulation\nReduces inflammation and redness', code: 'FACELIFT25', closing: 'Ask in-store for full treatment details!' },
    skincare: { product: 'Yubari King Wrinkle Eraser', steps: 'Cleanse face thoroughly and pat dry\nApply a pea-sized amount to target areas\nGently massage in circular motions until absorbed\nFollow with moisturiser and SPF in the morning', frequency: 'Morning & Evening', duration: '4 weeks', notes: 'For best results, use consistently. Avoid contact with eyes. If irritation occurs, discontinue use.' }
  },
  es: {
    discount: { headline: 'VALE EXCLUSIVO', code: 'AHORRA20', percent: '20', description: 'Válido en tu próxima compra de productos de cuidado de la piel en tienda. ¡Por tiempo limitado!', redemption: 'Presenta este vale en caja para canjear tu descuento.', validUntil: '', cta: '¡Visítanos hoy y canjea tu oferta exclusiva!', showFreeDelivery: false, freeDeliveryCopy: '¡Contáctanos para una entrega GRATUITA con tu descuento!' },
    businesscard: { tagline: 'Tu Piel, Refinada.', role: 'Especialista en Cuidado de la Piel', showEmail: false, showPhone: false, showWhatsApp: false, notes: '', showHours: false, cta: '¡Visítanos en tienda y pide tu consulta gratuita de cuidado de la piel hoy!' },
    facial: { headline: 'FACIAL GRATUITO', subheadline: 'Sesión de Terapia LED Roja + Infrarroja + Refresco Complimentario', intro: 'Descubre los beneficios de esta tecnología avanzada no invasiva, diseñada para la rejuvenación total de la piel y el cuerpo:', benefits: 'Suaviza las líneas finas y arrugas\nLevanta y tonifica los músculos faciales\nEstimula el colágeno y la elastina\nMinimiza los poros visibles\nUniformiza el tono y la textura de la piel\nRepara la piel dañada por el sol y el envejecimiento\nMejora el flujo sanguíneo y la circulación\nReduce la inflamación y el enrojecimiento', code: 'REJUV25', closing: '¡Pregunta en tienda por los detalles completos del tratamiento!' },
    skincare: { product: 'Yubari King Wrinkle Eraser', steps: 'Limpia bien el rostro y sécalo con suavidad\nAplica una cantidad del tamaño de un guisante en las zonas objetivo\nMasajea suavemente con movimientos circulares hasta absorber\nAplica hidratante y SPF por la mañana', frequency: 'Mañana y Noche', duration: '4 semanas', notes: 'Para mejores resultados, úsalo consistentemente. Evita el contacto con los ojos. Si hay irritación, suspende su uso.' }
  },
  fr: {
    discount: { headline: 'BON EXCLUSIF', code: 'ECONOMISE20', percent: '20', description: 'Valable sur votre prochain achat de produits de soin de la peau en magasin. Durée limitée!', redemption: 'Présentez ce bon à la caisse pour obtenir votre remise.', validUntil: '', cta: 'Visitez-nous aujourd\'hui et profitez de votre offre exclusive!', showFreeDelivery: false, freeDeliveryCopy: 'Contactez-nous pour une livraison GRATUITE avec votre remise!' },
    businesscard: { tagline: 'Votre Peau, Raffînée.', role: 'Spécialiste en Soins de la Peau', showEmail: false, showPhone: false, showWhatsApp: false, notes: '', showHours: false, cta: 'Visitez-nous en magasin et demandez votre consultation gratuite de soins de la peau!' },
    facial: { headline: 'SOIN GRATUIT', subheadline: 'Séance de Thérapie LED Rouge + Infrarouge + Rafraîchissement Complimentaire', intro: 'Découvrez les bienfaits de cette technologie avancée non invasive, conçue pour la rejuvenation totale de la peau et du corps:', benefits: 'Lisse les ridules et les rides\nRemonte et tonifie les muscles du visage\nStimule le collagène et l\'élastine\nMinimise les pores visibles\nUniformise le teint et la texture de la peau\nRépare la peau abîmée par le soleil et le vieillissement\nAméliore le flux sanguin et la circulation\nRéduit l\'inflammation et les rougeurs', code: 'REJUV25', closing: 'Demandez en magasin les détails complets du traitement!' },
    skincare: { product: 'Yubari King Wrinkle Eraser', steps: 'Nettoyez bien le visage et séchez-le délicatement\nAppliquez une noisette sur les zones ciblées\nMassagez doucement par mouvements circulaires jusqu\'à absorption\nAppliquez hydratant et SPF le matin', frequency: 'Matin & Soir', duration: '4 semaines', notes: 'Pour de meilleurs résultats, utilisez régulièrement. Évitez le contact avec les yeux. En cas d\'irritation, cessez l\'utilisation.' }
  }
};

var ZB_TEMPLATES = {
  discount: {
    id: 'discount',
    nameKey: 'discountVoucher',
    descKey: 'discountVoucherDesc',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7h10l-2 7H9L7 7z"/><path d="M8 14v4"/><path d="M16 14v4"/></svg>',
    fields: [
      { key: 'headline', labelKey: 'headline', type: 'text' },
      { key: 'code', labelKey: 'voucherCode', type: 'text' },
      { key: 'percent', labelKey: 'percentOff', type: 'number' },
      { key: 'description', labelKey: 'description', type: 'textarea' },
      { key: 'redemption', labelKey: 'redemptionNote', type: 'text' },
      { key: 'validUntil', labelKey: 'validUntil', type: 'date' },
      { key: 'workerId', labelKey: 'specialist', type: 'worker' },
      { key: 'cta', labelKey: 'callToAction', type: 'text' },
      { key: 'showFreeDelivery', labelKey: 'showFreeDelivery', type: 'checkbox' },
      { key: 'freeDeliveryCopy', labelKey: 'freeDeliveryCopy', type: 'text' }
    ],
    render: function(data, shop, worker) {
      var html = rcLogo(shop) + rcTagline(shop);
      html += rcDivider('double');
      html += rcCenter('<div class="rc-title">' + zbEscapeHtml(data.headline) + '</div>');
      html += rcDivider('double');

      if (data.code) html += rcCenter('<div class="rc-meta">Code · ' + zbEscapeHtml(data.code) + '</div>');
      if (data.percent) html += rcCenter('<div class="rc-highlight">• ' + zbEscapeHtml(data.percent) + '% OFF •</div>');
      if (data.description) html += rcParagraph(data.description, 'rc-center');
      if (data.redemption) html += rcParagraph(data.redemption, 'rc-center rc-small');
      if (data.validUntil) {
        html += rcCenter('<div class="rc-meta">' + zbT('validUntilLabel') + ' ' + zbFormatDateDMY(data.validUntil) + '</div>');
      }

      if (worker) html += rcWorkerInline(worker);
      else html += rcDivider('single');

      html += rcShopFooter(shop);

      if (data.cta) {
        html += rcParagraph(data.cta, 'rc-center rc-cta');
        html += rcDivider('single');
      }
      if (data.showFreeDelivery && data.freeDeliveryCopy) {
        html += rcParagraph(data.freeDeliveryCopy, 'rc-center rc-small');
        html += rcDivider('single');
      }
      return html;
    }
  },

  businesscard: {
    id: 'businesscard',
    nameKey: 'businessCard',
    descKey: 'businessCardDesc',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 10h.01"/><path d="M8 14h.01"/><path d="M12 10h4"/><path d="M12 14h4"/></svg>',
    fields: [
      { key: 'tagline', labelKey: 'tagline', type: 'text' },
      { key: 'role', labelKey: 'specialistRole', type: 'text' },
      { key: 'workerId', labelKey: 'specialist', type: 'worker' },
      { key: 'showEmail', labelKey: 'showEmail', type: 'checkbox' },
      { key: 'showPhone', labelKey: 'showPhone', type: 'checkbox' },
      { key: 'showWhatsApp', labelKey: 'showWhatsApp', type: 'checkbox' },
      { key: 'notes', labelKey: 'notesOptional', type: 'textarea' },
      { key: 'showHours', labelKey: 'showOpeningHours', type: 'checkbox' },
      { key: 'cta', labelKey: 'callToAction', type: 'text' }
    ],
    render: function(data, shop, worker) {
      var html = rcLogo(shop) + rcTagline(shop);
      html += rcDivider('double');

      if (data.tagline) html += rcCenter('<div class="rc-title">' + zbEscapeHtml(data.tagline) + '</div>');
      if (data.role) html += rcCenter('<div class="rc-meta">' + zbEscapeHtml(data.role) + '</div>');
      if (worker) html += rcCenter('<div class="rc-worker-name">' + zbEscapeHtml(worker.name) + '</div>');

      html += rcDivider('single');

      if (data.notes) html += rcParagraph(data.notes, 'rc-center');

      if (worker) {
        html += rcWorkerContact(worker, { showEmail: data.showEmail, showPhone: data.showPhone, showWhatsApp: data.showWhatsApp });
      }

      html += rcShopFooter(shop, { showOpeningHours: data.showHours });

      if (data.cta) {
        html += rcParagraph(data.cta, 'rc-center rc-cta');
        html += rcDivider('single');
      }
      return html;
    }
  },

  facial: {
    id: 'facial',
    nameKey: 'facialVoucher',
    descKey: 'facialVoucherDesc',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/></svg>',
    fields: [
      { key: 'headline', labelKey: 'headline', type: 'text' },
      { key: 'subheadline', labelKey: 'subheadline', type: 'text' },
      { key: 'intro', labelKey: 'introParagraph', type: 'textarea' },
      { key: 'benefits', labelKey: 'benefits', type: 'textarea' },
      { key: 'code', labelKey: 'voucherCode', type: 'text' },
      { key: 'workerId', labelKey: 'specialist', type: 'worker' },
      { key: 'closing', labelKey: 'closingLine', type: 'text' }
    ],
    render: function(data, shop, worker) {
      var html = rcLogo(shop) + rcTagline(shop);
      html += rcDivider('double');
      if (data.headline) html += rcCenter('<div class="rc-title">' + zbEscapeHtml(data.headline) + '</div>');
      if (data.subheadline) html += rcCenter('<div class="rc-subtitle">' + zbEscapeHtml(data.subheadline) + '</div>');
      html += rcDivider('single');

      if (data.intro) html += rcParagraph(data.intro);
      if (data.benefits) html += zbBenefitsToHtml(data.benefits);

      html += rcDivider('single');
      if (data.code) html += rcCenter('<div class="rc-meta">' + zbT('voucherCodeLabel') + ' ' + zbEscapeHtml(data.code) + '</div>');
      if (worker) html += rcCenter('<div class="rc-meta">' + zbT('specialist') + ' ' + zbEscapeHtml(worker.name) + '</div>');

      if (worker) html += rcWorkerContact(worker, { showPhone: true, showWhatsApp: true });
      else html += rcDivider('single');

      html += rcShopFooter(shop);

      if (data.closing) {
        html += rcParagraph(data.closing, 'rc-center rc-cta');
        html += rcDivider('single');
      }
      return html;
    }
  },

  skincare: {
    id: 'skincare',
    nameKey: 'skincareInstructions',
    descKey: 'skincareInstructionsDesc',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
    fields: [
      { key: 'product', labelKey: 'productName', type: 'text' },
      { key: 'steps', labelKey: 'usageSteps', type: 'textarea' },
      { key: 'frequency', labelKey: 'frequency', type: 'text' },
      { key: 'duration', labelKey: 'duration', type: 'text' },
      { key: 'notes', labelKey: 'notes', type: 'textarea' },
      { key: 'workerId', labelKey: 'specialist', type: 'worker' }
    ],
    render: function(data, shop, worker) {
      var html = rcLogo(shop) + rcTagline(shop);
      html += rcDivider('double');
      html += rcCenter('<div class="rc-title">' + zbT('skincarePlan') + '</div>');
      if (data.product) html += rcCenter('<div class="rc-subtitle">' + zbEscapeHtml(data.product) + '</div>');
      html += rcDivider('single');

      if (data.steps) {
        html += rcLabel(zbT('usageLabel'));
        html += zbStepsToHtml(data.steps);
      }

      var meta = '';
      if (data.frequency) meta += rcRow(zbT('frequency'), data.frequency);
      if (data.duration) meta += rcRow(zbT('duration'), data.duration);
      if (meta) html += '<div class="rc-hours">' + meta + '</div>';

      if (data.notes) {
        html += rcDivider('light');
        html += rcParagraph(data.notes, 'rc-small');
      }

      if (worker) {
        html += rcDivider('single');
        html += rcCenter('<div class="rc-meta">' + zbT('yourSpecialist') + '</div>');
        html += rcCenter('<div class="rc-worker-name">' + zbEscapeHtml(worker.name) + '</div>');
        html += rcCenter('<div class="rc-meta">' + zbEscapeHtml(worker.role) + '</div>');
        html += rcWorkerContact(worker, { showPhone: true, showWhatsApp: true });
      } else {
        html += rcDivider('single');
      }

      html += rcShopFooter(shop);
      return html;
    }
  }
};

function zbGetTemplateDefaults(templateId) {
  var lang = zbGetLang();
  var defaults = ZB_TEMPLATE_DEFAULTS[lang] || ZB_TEMPLATE_DEFAULTS.en;
  var tmplDefaults = defaults[templateId] || {};
  var result = {};
  var tmpl = ZB_TEMPLATES[templateId];
  if (tmpl) {
    tmpl.fields.forEach(function(f) {
      result[f.key] = tmplDefaults[f.key] !== undefined ? tmplDefaults[f.key] : '';
    });
  }
  return result;
}

function zbBuildTemplateData(templateId, formValues) {
  var tmpl = ZB_TEMPLATES[templateId];
  if (!tmpl) return {};
  var data = {};
  tmpl.fields.forEach(function(f) {
    var val = formValues[f.key];
    if (f.type === 'checkbox') {
      data[f.key] = !!val;
    } else if (f.type === 'number') {
      data[f.key] = val === '' ? '' : Number(val);
    } else {
      data[f.key] = val === undefined ? '' : val;
    }
  });
  return data;
}

function zbRenderTemplate(templateId, data, shop, worker) {
  var tmpl = ZB_TEMPLATES[templateId];
  if (!tmpl) return '<div class="rc-error">Unknown template</div>';
  return tmpl.render(data, shop, worker);
}
