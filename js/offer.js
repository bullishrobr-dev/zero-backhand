/**
 * offer.js — Zero Backhand Customer Offer Page
 */

(function() {
  var app = document.getElementById('app');
  if (!app) return;

  // Decode deal from URL
  var params = new URLSearchParams(window.location.search);
  var encoded = params.get('d');
  if (!encoded) {
    showExpired();
    return;
  }

  var deal;
  try {
    var json = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    deal = JSON.parse(json);
  } catch (e) {
    showExpired();
    return;
  }

  var expiry = new Date(deal.expires);
  var now = new Date();

  if (now >= expiry) {
    showExpired();
    return;
  }

  renderOffer(deal, expiry);

  function renderOffer(deal, expiry) {
    var regularTotal = deal.productRetail * (deal.units || 1);
    var dealTotal = deal.price * (deal.units || 1);
    var savings = regularTotal - dealTotal;
    var customer = deal.customer || 'You';
    var seller = deal.seller || '';
    var shop = deal.shop || {};
    var shopPhone = '+350 5400 5198';
    var shopEmail = shop.email || 'info@zerolines.life';

    // Pre-filled messages
    var waMsg = 'Hello Zero Lines! I have an exclusive offer for ' + deal.product + ' at ' + formatPrice(dealTotal) + '. I would like to claim it. Here is my offer link: ' + window.location.href;
    var emailSubject = 'Exclusive Offer Claim - ' + deal.product;
    var emailBody = 'Hello Zero Lines team,\n\nI received an exclusive offer for ' + deal.product + ' at ' + formatPrice(dealTotal) + '.\n\n';
    if (customer && customer !== 'You') emailBody += 'Customer name: ' + customer + '\n';
    if (seller) emailBody += 'Prepared by: ' + seller + '\n';
    emailBody += 'Gifts included: ' + (deal.gifts ? deal.gifts.length : 0) + '\n';
    emailBody += 'Valid until: ' + expiry.toLocaleString() + '\n\n';
    emailBody += 'Here is my offer link: ' + window.location.href + '\n\nBest regards';

    var html = '';

    // Header with Zero Lines logo
    html += '<div class="header">';
    html += '<img src="assets/zerolines-logo.png" alt="Zero Lines">';
    html += '<div class="tagline">Exclusive Beauty Offer</div>';
    html += '</div>';

    // Hero image
    html += '<div class="hero-image">';
    html += '<img src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80" alt="Beauty">';
    html += '<div class="overlay"></div>';
    html += '<div class="overlay-text">';
    html += '<h2>Your Exclusive Deal Awaits</h2>';
    html += '<p>Premium skincare, personalised just for you</p>';
    html += '</div>';
    html += '</div>';

    // Countdown
    html += '<div class="countdown-card">';
    html += '<div class="label">Your opportunity expires in</div>';
    html += '<div class="digits" id="countdown-digits">--:--:--</div>';
    html += '<div class="sub-label">Don\'t miss out on this exclusive offer</div>';
    html += '</div>';

    // Determine product info link
    var productName = (deal.product || '').toLowerCase();
    var learnMoreUrl = null;
    if (productName.indexOf('reverse') !== -1 || productName.indexOf('syringe') !== -1) {
      // Reverse Five / Syringe both go to the ReverseFive page
      learnMoreUrl = 'https://bullishrobr-dev.github.io/ReverseFive/';
    } else if (productName.indexOf('perfectio') !== -1) {
      // Perfectio Silver / Gold / X go to the Red-LED page
      learnMoreUrl = 'https://bullishrobr-dev.github.io/Red-LED/';
    }

    // Product card
    html += '<div class="card">';
    html += '<div class="card-title">Exclusive Offer</div>';
    if (deal.productImage) {
      html += '<img class="product-image" src="' + escapeHtml(deal.productImage) + '" alt="' + escapeHtml(deal.product) + '">';
    }
    html += '<div class="product-name">' + escapeHtml(deal.product) + '</div>';
    html += '<div class="product-meta">' + (deal.units || 1) + ' unit' + ((deal.units || 1) > 1 ? 's' : '') + '</div>';
    html += '</div>';

    // Learn More button (if product has a dedicated info page)
    if (learnMoreUrl) {
      html += '<div class="cta-section">';
      html += '<a class="cta-button learn-more" href="' + escapeHtml(learnMoreUrl) + '" target="_blank">';
      html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
      html += 'Learn More — Click Here';
      html += '</a>';
      html += '</div>';
    }

    // Customer & Seller
    html += '<div class="card">';
    html += '<div class="price-row"><span class="label">For</span><span class="value">' + escapeHtml(customer) + '</span></div>';
    if (seller) {
      html += '<div class="price-row"><span class="label">Prepared by</span><span class="value">' + escapeHtml(seller) + '</span></div>';
    }
    html += '</div>';

    // Pricing
    html += '<div class="card">';
    html += '<div class="price-row"><span class="label">Regular Price</span><span class="value strike">' + formatPrice(regularTotal) + '</span></div>';
    html += '<div class="price-row"><span class="label">Your Exclusive Price</span><span class="value highlight">' + formatPrice(dealTotal) + '</span></div>';
    if (savings > 0) {
      html += '<div class="price-row"><span class="label">You Save</span><span class="value savings">' + formatPrice(savings) + '</span></div>';
    }
    html += '</div>';

    // Gifts
    if (deal.gifts && deal.gifts.length) {
      html += '<div class="card">';
      html += '<div class="card-title">Complimentary Gifts (' + deal.gifts.length + ')</div>';
      html += '<ul class="gift-list">';
      deal.gifts.forEach(function(g) {
        html += '<li>' + escapeHtml(g) + '</li>';
      });
      html += '</ul>';
      html += '</div>';
    }

    // Note
    if (deal.note) {
      html += '<div class="card"><div class="note">"' + escapeHtml(deal.note) + '"</div></div>';
    }

    // Valid until (RED)
    html += '<div class="valid-until">';
    html += '<div class="label">Valid Until</div>';
    html += '<div class="date">' + expiry.toLocaleString() + '</div>';
    html += '</div>';

    // CTA Buttons
    html += '<div class="cta-section">';
    html += '<a class="cta-button whatsapp" href="https://wa.me/' + shopPhone.replace(/\D/g, '') + '?text=' + encodeURIComponent(waMsg) + '" target="_blank">';
    html += '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
    html += 'Claim via WhatsApp';
    html += '</a>';
    html += '<a class="cta-button email" href="mailto:' + shopEmail + '?subject=' + encodeURIComponent(emailSubject) + '&body=' + encodeURIComponent(emailBody) + '">';
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
    html += 'Claim via Email';
    html += '</a>';
    html += '</div>';

    // Footer
    html += '<div class="footer">';
    html += '<p>' + escapeHtml(shop.name || 'Zero Lines') + '</p>';
    html += '<p><a href="https://zerolines.life">zerolines.life</a> · ' + escapeHtml(shopPhone) + '</p>';
    html += '</div>';

    app.innerHTML = html;

    // Start countdown
    startCountdown(expiry);
  }

  function startCountdown(expiry) {
    var digitsEl = document.getElementById('countdown-digits');
    if (!digitsEl) return;

    function update() {
      var now = new Date();
      var diff = expiry - now;
      if (diff <= 0) {
        digitsEl.textContent = '00:00:00';
        setTimeout(function() { location.reload(); }, 1500);
        return;
      }

      var hours = Math.floor(diff / 3600000);
      var mins = Math.floor((diff % 3600000) / 60000);
      var secs = Math.floor((diff % 60000) / 1000);
      digitsEl.textContent = pad(hours) + ':' + pad(mins) + ':' + pad(secs);

      if (diff < 600000) {
        digitsEl.classList.add('urgent');
      }

      setTimeout(update, 1000);
    }
    update();
  }

  function showExpired() {
    app.innerHTML =
      '<div class="expired-card">' +
        '<h2>This Offer Has Expired</h2>' +
        '<p>We would love to prepare a new exclusive offer just for you.</p>' +
        '<a href="https://wa.me/35054005198?text=Hello%20Zero%20Lines!%20I%20would%20like%20to%20request%20a%20new%20exclusive%20offer.">Contact us on WhatsApp</a>' +
      '</div>';
  }

  function pad(n) { return n < 10 ? '0' + n : n; }
  function escapeHtml(text) {
    if (text == null) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  function formatPrice(amount) {
    return '€' + Number(amount).toLocaleString('en-GB');
  }
})();
