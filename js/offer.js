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

    var html = '';

    // Header
    html += '<div class="header"><h1>Zero <span>Backhand</span></h1></div>';

    // Countdown
    html += '<div class="countdown-timer" id="countdown"><span class="label">Expires in</span><span class="digits" id="countdown-digits">--:--:--</span></div>';

    // Product card
    html += '<div class="card">';
    html += '<div class="card-title">Exclusive Offer</div>';
    html += '<div class="product-name">' + escapeHtml(deal.product) + '</div>';
    html += '<div class="product-meta">' + (deal.units || 1) + ' unit' + ((deal.units || 1) > 1 ? 's' : '') + '</div>';
    html += '</div>';

    // Customer & Seller
    html += '<div class="card">';
    html += '<div class="price-block"><span class="label">For</span><span class="value">' + escapeHtml(customer) + '</span></div>';
    if (seller) {
      html += '<div class="price-block"><span class="label">Prepared by</span><span class="value">' + escapeHtml(seller) + '</span></div>';
    }
    html += '</div>';

    // Pricing
    html += '<div class="card">';
    html += '<div class="price-block"><span class="label">Regular Price</span><span class="value" style="text-decoration:line-through;color:var(--text-muted);">' + formatPrice(regularTotal) + '</span></div>';
    html += '<div class="price-block"><span class="label">Your Price</span><span class="value highlight">' + formatPrice(dealTotal) + '</span></div>';
    if (savings > 0) {
      html += '<div class="price-block"><span class="label">You Save</span><span class="value savings">-' + formatPrice(savings) + '</span></div>';
    }
    html += '</div>';

    // Gifts
    if (deal.gifts && deal.gifts.length) {
      html += '<div class="card">';
      html += '<div class="card-title">Free Gifts (' + deal.gifts.length + ')</div>';
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

    // QR Code
    html += '<div class="card">';
    html += '<div class="qr-section">';
    html += '<div class="label">Scan to Claim</div>';
    html += '<div id="qrcode"></div>';
    html += '</div>';
    html += '</div>';

    // Expiry
    html += '<div class="card">';
    html += '<div class="price-block"><span class="label">Valid until</span><span class="value">' + expiry.toLocaleString() + '</span></div>';
    html += '</div>';

    // WhatsApp CTA
    var waMsg = encodeURIComponent('Hi! I have an exclusive offer for ' + deal.product + ' at ' + formatPrice(dealTotal) + '. Here is my link: ' + window.location.href);
    html += '<a class="cta-button" href="https://wa.me/?text=' + waMsg + '" target="_blank">';
    html += '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
    html += 'Share on WhatsApp';
    html += '</a>';

    // Footer
    html += '<div class="footer">';
    if (deal.shop && deal.shop.name) html += escapeHtml(deal.shop.name) + ' · ';
    html += '<a href="https://zerolines.life">zerolines.life</a>';
    html += '</div>';

    app.innerHTML = html;

    // Generate QR
    var qrDiv = document.getElementById('qrcode');
    if (qrDiv && typeof QRCode !== 'undefined') {
      new QRCode(qrDiv, {
        text: window.location.href,
        width: 180,
        height: 180,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }

    // Start countdown
    startCountdown(expiry);
  }

  function startCountdown(expiry) {
    var digitsEl = document.getElementById('countdown-digits');
    var timerEl = document.getElementById('countdown');
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

      if (diff < 600000 && timerEl) { // < 10 min
        timerEl.classList.add('urgent');
      }

      setTimeout(update, 1000);
    }
    update();
  }

  function showExpired() {
    app.innerHTML =
      '<div class="offer-expired">' +
        '<h2>This offer has expired</h2>' +
        '<p>Please contact us for a new offer.</p>' +
        '<a href="https://zerolines.life">Visit Zero Lines</a>' +
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
