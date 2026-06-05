#!/usr/bin/env python3
"""
Zero Lines Thermal Print Server - IMAGE MODE
============================================
Generates receipt as a bitmap image and prints via Windows GDI.
This is the same approach your POS system uses — it works with
BIXOLON SRP-350 and any thermal printer that has a Windows driver.

Usage:  python printer-server.py
        Then click "Print Receipt" in the admin panel.

How it works:
1. Admin panel sends offer JSON to this server
2. Server builds a receipt image (logo, text, QR code) using Pillow
3. Image is sent to the printer through Windows GDI (like a photo)
4. The BIXOLON driver converts the image to thermal dots automatically
"""

import os
import sys
import traceback

# --- Catch ALL startup errors and print them ---
startup_error = None
try:
    import json
    import base64
    import tempfile
    import threading
    from datetime import datetime
    from io import BytesIO

    # ============================================================
    # AUTO-INSTALL DEPENDENCIES
    # ============================================================
    import importlib
    import subprocess

    def install_if_missing(pip_name, import_name):
        """Install package via pip if import fails. Clear cache after install."""
        try:
            importlib.import_module(import_name)
        except ImportError:
            print(f"[INSTALL] {pip_name} not found. Installing...")
            try:
                result = subprocess.run(
                    [sys.executable, "-m", "pip", "install", pip_name],
                    capture_output=True, text=True, check=True
                )
                print(f"[OK] Installed {pip_name}")
            except subprocess.CalledProcessError as e:
                print(f"[ERROR] Failed to install {pip_name}")
                print(e.stderr)
                input("Press Enter to exit...")
                sys.exit(1)
            # Clear stale module cache so fresh import works
            for key in list(sys.modules.keys()):
                if key == import_name or key.startswith(import_name + '.'):
                    del sys.modules[key]

    # Install first, then import fresh
    install_if_missing('pillow', 'PIL')
    install_if_missing('qrcode', 'qrcode')

    Image = importlib.import_module('PIL.Image')
    ImageDraw = importlib.import_module('PIL.ImageDraw')
    ImageFont = importlib.import_module('PIL.ImageFont')
    qrcode_module = importlib.import_module('qrcode')

    def get_local_ipv4():
        """Get the primary local IPv4 address. Returns None if unavailable."""
        import socket
        # Trick: open a UDP socket to a public DNS server — no packet is sent,
        # but the OS picks the correct local interface. Then read its IP.
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(2)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            if not ip.startswith('127.'):
                return ip
        except Exception:
            pass
        # Fallback: try hostname resolution, IPv4 only
        try:
            for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
                ip = info[4][0]
                if not ip.startswith('127.'):
                    return ip
        except Exception:
            pass
        return None

except Exception as e:
    startup_error = traceback.format_exc()
    print("=" * 60)
    print("FATAL ERROR DURING STARTUP:")
    print(startup_error)
    print("=" * 60)
    input("Press Enter to exit...")
    sys.exit(1)


# ============================================================
# CONFIGURE YOUR PRINTER HERE
# ============================================================
PRINTER_NAME = "80mm Series Printer"   # <-- Your Windows printer name
PAPER_WIDTH_MM = 80                    # 80mm or 58mm
PAPER_WIDTH_DOTS = 576                 # 80mm at ~180 DPI
# ============================================================

# Gift names for Reverse Five backward compatibility
GIFT_NAMES = {
    'day-cream': 'Crema de Dia',
    'night-cream': 'Crema de Noche',
    'facial-serum': 'Serum Facial',
    'eye-serum': 'Serum de Ojos',
    'eye-cream': 'Contorno de Ojos',
    'facial-peel': 'Peeling Facial',
    'body-scrub': 'Exfoliante Corporal',
    'body-butter': 'Mantequilla Corporal',
    'nail-kit': 'Kit de Unas',
    'facial-cleanser': 'Limpiador Facial',
}

# Receipt labels per language
RECEIPT_LABELS = {
    'en': {
        'exclusive_offer': 'EXCLUSIVE OFFER',
        'for': 'For:',
        'by': 'By:',
        'regular_price': 'Regular Price:',
        'your_price': 'YOUR PRICE:',
        'savings': 'SAVINGS:',
        'gifts_included': 'GIFTS INCLUDED',
        'scan_to_claim': 'SCAN TO CLAIM',
        'offer_expires': 'Offer expires:',
        'thanks': 'Thank you for your trust',
    },
    'es': {
        'exclusive_offer': 'OFERTA EXCLUSIVA',
        'for': 'Para:',
        'by': 'Por:',
        'regular_price': 'Precio regular:',
        'your_price': 'TU PRECIO:',
        'savings': 'AHORRAS:',
        'gifts_included': 'REGALOS INCLUIDOS',
        'scan_to_claim': 'ESCANEA PARA RECLAMAR',
        'offer_expires': 'Oferta expira:',
        'thanks': 'Gracias por su confianza',
    },
    'fr': {
        'exclusive_offer': 'OFFRE EXCLUSIVE',
        'for': 'Pour:',
        'by': 'Par:',
        'regular_price': 'Prix régulier:',
        'your_price': 'VOTRE PRIX:',
        'savings': 'ÉCONOMIES:',
        'gifts_included': 'CADEAUX INCLUS',
        'scan_to_claim': 'SCANNEZ POUR RÉCLAMER',
        'offer_expires': 'Offre expire:',
        'thanks': 'Merci pour votre confiance',
    }
}


# ============================================================
# FONT HELPERS
# ============================================================
def find_font(names, size):
    """Find a Windows system font by filename."""
    font_dirs = [
        os.path.expandvars(r"%WINDIR%\Fonts"),
        r"C:\Windows\Fonts",
    ]
    for d in font_dirs:
        for name in names:
            path = os.path.join(d, name)
            if os.path.exists(path):
                try:
                    return ImageFont.truetype(path, size)
                except Exception:
                    pass
    return ImageFont.load_default()


def load_font(size, bold=False):
    """Load a sans-serif system font."""
    names = []
    if bold:
        names.extend(["seguisb.ttf", "arialbd.ttf", "tahomabd.ttf", "verdanab.ttf"])
    names.extend(["segoeui.ttf", "arial.ttf", "tahoma.ttf", "verdana.ttf", "msyh.ttc"])
    return find_font(names, size)


def load_mono_font(size):
    """Load a monospace font for aligned pricing."""
    return find_font(["cour.ttf", "consola.ttf", "lucon.ttf", "courbd.ttf"], size)


# ============================================================
# RECEIPT IMAGE BUILDER
# ============================================================
def build_receipt_image(offer):
    """
    Build a receipt as a PIL Image.
    The receipt includes logo, text, pricing, QR code, and footer.
    """
    width = PAPER_WIDTH_DOTS

    # --- Load fonts (ALL bold for maximum darkness on thermal paper) ---
    font_header = load_font(36, bold=True)
    font_subheader = load_font(26, bold=True)
    font_title = load_font(22, bold=True)
    font_text = load_font(20, bold=True)
    font_small = load_font(16, bold=True)
    font_large = load_font(30, bold=True)

    # --- Create a tall canvas for measurement ---
    temp_img = Image.new('RGB', (width, 3000), 'white')
    temp_draw = ImageDraw.Draw(temp_img)

    def text_size(text, font):
        """Measure text dimensions."""
        bbox = temp_draw.textbbox((0, 0), text, font=font)
        return bbox[2] - bbox[0], bbox[3] - bbox[1]

    def draw_text(y, text, font, align='left', color='black'):
        """Draw a line of text and return its height."""
        tw, th = text_size(text, font)
        if align == 'center':
            x = (width - tw) // 2
        elif align == 'right':
            x = width - tw - 20
        else:
            x = 20
        temp_draw.text((x, y), text, font=font, fill=color)
        return th

    # --- Build receipt content ---
    y = 30

    # Logo (PNG file next to script, or text fallback)
    logo = None
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for logo_name in ["zerolines-logo.png", "zerolines-logo.jpg", "logo.png", "logo.jpg"]:
        logo_path = os.path.join(script_dir, logo_name)
        if os.path.exists(logo_path):
            try:
                logo = Image.open(logo_path).convert('RGBA')
                logo_w = min(width - 40, 320)
                ratio = logo_w / logo.width
                logo_h = int(logo.height * ratio)
                logo = logo.resize((logo_w, logo_h), Image.LANCZOS)
                break
            except Exception:
                pass

    if logo:
        logo_x = (width - logo.width) // 2
        temp_img.paste(logo, (logo_x, y), logo)
        y += logo.height + 20
    else:
        h = draw_text(y, "ZERO LINES", font_header, 'center')
        y += h + 5

    h = draw_text(y, "ANDORRA", font_subheader, 'center')
    y += h + 15

    # Separator
    temp_draw.line([(20, y), (width - 20, y)], fill='black', width=2)
    y += 20

    # Offer title
    h = draw_text(y, "OFERTA EXCLUSIVA", font_title, 'center')
    y += h + 10

    # Determine language and labels
    lang = offer.get('lang', 'es')
    labels = RECEIPT_LABELS.get(lang, RECEIPT_LABELS['es'])

    # Determine if this is Zero Backhand or Reverse Five
    is_zb = offer.get('type') == 'zero-backhand'
    product_name = offer.get('product', 'Reverse Five Wrinkle Eraser')
    product_retail = offer.get('productRetail', 300)

    # Calculations
    units = offer.get('units', 1)
    regular = product_retail * units
    custom = offer.get('price', product_retail) * units
    savings = regular - custom

    h = draw_text(y, f"{labels['for']} {offer.get('customer', 'Usted')}", font_text)
    y += h + 5
    h = draw_text(y, f"{labels['by']} {offer.get('seller', 'Vendedor')}", font_small)
    y += h + 15

    temp_draw.line([(20, y), (width - 20, y)], fill='black', width=2)
    y += 20

    # Product info
    h = draw_text(y, product_name, font_title, 'center')
    y += h + 5
    h = draw_text(y, f"{units} unit{'s' if units > 1 else ''}", font_text, 'center')
    y += h + 15

    temp_draw.line([(20, y), (width - 20, y)], fill='black', width=2)
    y += 20

    # Pricing (monospace for alignment)
    mono_font = load_mono_font(20)
    h = draw_text(y, f"{labels['regular_price']}  EUR {regular}", mono_font)
    y += h + 8
    h = draw_text(y, f"{labels['your_price']}       EUR {custom}", font_large)
    y += h + 8
    h = draw_text(y, f"{labels['savings']}         EUR {savings}", font_large)
    y += h + 15

    temp_draw.line([(20, y), (width - 20, y)], fill='black', width=2)
    y += 20

    # Gifts
    gifts = offer.get('gifts', [])
    if gifts:
        h = draw_text(y, f"{labels['gifts_included']} ({len(gifts)})", font_title, 'center')
        y += h + 10
        for g in gifts:
            # For Zero Backhand, gifts are already full English names
            # For Reverse Five, gifts are keys that map to GIFT_NAMES
            gift_name = GIFT_NAMES.get(g, g)
            h = draw_text(y, f"+ {gift_name}", font_text)
            y += h + 5
        y += 10
        temp_draw.line([(20, y), (width - 20, y)], fill='black', width=2)
        y += 20

    # Note
    note = offer.get('note', '')
    if note:
        h = draw_text(y, f'"{note}"', font_small)
        y += h + 15
        temp_draw.line([(20, y), (width - 20, y)], fill='black', width=2)
        y += 20

    # QR Code section
    h = draw_text(y, labels['scan_to_claim'], font_title, 'center')
    y += h + 10

    # Generate QR code image
    if is_zb:
        url = f"https://bullishrobr-dev.github.io/zero-backhand/offer.html?d="
    else:
        url = f"https://bullishrobr-dev.github.io/ReverseFive/offer.html?d="
    url += base64.b64encode(json.dumps(offer).encode()).decode()

    qr = qrcode_module.QRCode(box_size=5, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_size = min(260, width - 60)
    qr_img = qr_img.resize((qr_size, qr_size), Image.NEAREST)
    qr_img = qr_img.convert('RGB')

    qr_x = (width - qr_size) // 2
    temp_img.paste(qr_img, (qr_x, y))
    y += qr_size + 15

    temp_draw.line([(20, y), (width - 20, y)], fill='black', width=2)
    y += 20

    # Expiry
    expiry = offer.get('expires', '')
    if expiry:
        try:
            dt = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
            h = draw_text(y, labels['offer_expires'], font_text, 'center')
            y += h + 5
            h = draw_text(y, dt.strftime("%d/%m/%Y %H:%M"), font_subheader, 'center')
            y += h + 15
        except Exception:
            h = draw_text(y, f"Expira: {expiry}", font_text, 'center')
            y += h + 15
        temp_draw.line([(20, y), (width - 20, y)], fill='black', width=2)
        y += 20

    # Footer
    shop = offer.get('shop', {})
    shop_name = shop.get('name', 'Zero Lines')
    shop_phone = shop.get('phone', '+350 5400 5198')
    shop_email = shop.get('email', 'info@zerolines.life')
    h = draw_text(y, labels['thanks'], font_text, 'center')
    y += h + 5
    h = draw_text(y, shop_name, font_small, 'center')
    y += h + 5
    h = draw_text(y, shop_phone, font_small, 'center')
    y += h + 5
    h = draw_text(y, shop_email, font_small, 'center')
    y += h + 30

    # Cut line (thick)
    temp_draw.line([(20, y), (width - 20, y)], fill='black', width=4)
    y += 40

    # --- Crop to actual content size ---
    receipt = temp_img.crop((0, 0, width, y))

    # --- THRESHOLD: Force pure black/white (no gray anti-aliasing) ---
    # This is the key step for dark, crisp text on thermal printers.
    # GDI drivers often dither gray edges, making text look faded.
    # We boost contrast and threshold so every pixel is 100% black or white.
    gray = receipt.convert('L')
    # Any pixel darker than 200/255 becomes pure black; rest becomes pure white
    bw = gray.point(lambda x: 0 if x < 200 else 255)
    receipt = bw.convert('RGB')

    return receipt


# ============================================================
# QUICK PRINTS RECEIPT BUILDERS
# ============================================================

def _qp_text_size(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def _qp_center(draw, y, text, font, width, color='black'):
    tw, th = _qp_text_size(draw, text, font)
    x = (width - tw) // 2
    draw.text((x, y), text, font=font, fill=color)
    return y + th + 22


def _qp_left(draw, y, text, font, width, margin=20, color='black'):
    _, th = _qp_text_size(draw, text, font)
    draw.text((margin, y), text, font=font, fill=color)
    return y + th + 18


def _qp_wrap(draw, y, text, font, width, margin=20, align='left', color='black', spacing=2):
    if not text:
        return y
    max_w = width - margin * 2
    words = text.split()
    lines = []
    current = ''
    for word in words:
        test = current + ' ' + word if current else word
        tw, _ = _qp_text_size(draw, test, font)
        if tw <= max_w:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)

    for line in lines:
        tw, th = _qp_text_size(draw, line, font)
        if align == 'center':
            x = (width - tw) // 2
        elif align == 'right':
            x = width - tw - margin
        else:
            x = margin
        draw.text((x, y), line, font=font, fill=color)
        y += th + spacing
    return y + 18


def _qp_sep(draw, y, width, style='single'):
    if style == 'double':
        draw.line([(20, y), (width - 20, y)], fill='black', width=2)
        draw.line([(20, y + 10), (width - 20, y + 10)], fill='black', width=2)
        return y + 40
    elif style == 'light':
        draw.line([(20, y), (width - 20, y)], fill='black', width=1)
        return y + 28
    else:
        draw.line([(20, y), (width - 20, y)], fill='black', width=2)
        return y + 32


def _qp_load_logo(shop, width):
    """Load shop logo from base64 data or local file."""
    logo_b64 = shop.get('logo', '') if shop else ''
    if logo_b64:
        try:
            if ',' in logo_b64:
                logo_b64 = logo_b64.split(',', 1)[1]
            logo_data = base64.b64decode(logo_b64)
            logo = Image.open(BytesIO(logo_data)).convert('RGBA')
            logo_w = min(width - 40, 280)
            ratio = logo_w / logo.width
            logo_h = int(logo.height * ratio)
            return logo.resize((logo_w, logo_h), Image.LANCZOS)
        except Exception:
            pass
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for logo_name in ["logo.png", "logo.jpg", "zerolines-logo.png", "zerolines-logo.jpg"]:
        logo_path = os.path.join(script_dir, logo_name)
        if os.path.exists(logo_path):
            try:
                logo = Image.open(logo_path).convert('RGBA')
                logo_w = min(width - 40, 280)
                ratio = logo_w / logo.width
                logo_h = int(logo.height * ratio)
                return logo.resize((logo_w, logo_h), Image.LANCZOS)
            except Exception:
                pass
    return None


def _qp_draw_logo(img, y, shop, width):
    """Paste logo at top of receipt. Returns new y."""
    logo = _qp_load_logo(shop, width)
    if logo:
        x = (width - logo.width) // 2
        img.paste(logo, (x, y), logo)
        return y + logo.height + 50
    return y + 30


def _qp_draw_shop_header(draw, y, width, shop, font_header, font_subheader):
    if shop.get('name'):
        y = _qp_center(draw, y, shop['name'], font_header, width)
    if shop.get('tagline'):
        y = _qp_center(draw, y, shop['tagline'], font_subheader, width)
    return y


def _qp_draw_worker(draw, y, width, worker, font_text, font_small, opts=None):
    opts = opts or {}
    if not worker:
        return _qp_sep(draw, y, width)
    y = _qp_sep(draw, y, width)
    if worker.get('name'):
        y = _qp_center(draw, y, worker['name'], font_text, width)
    if worker.get('role'):
        y = _qp_center(draw, y, worker['role'], font_small, width)
    contacts = []
    if opts.get('showEmail', True) and worker.get('email'):
        contacts.append('Email: ' + worker['email'])
    if opts.get('showPhone', True) and worker.get('phone'):
        contacts.append('Phone: ' + worker['phone'])
    if opts.get('showWhatsApp', True) and worker.get('whatsapp'):
        contacts.append('WhatsApp: ' + worker['whatsapp'])
    if contacts:
        y = _qp_sep(draw, y, width, 'light')
        for c in contacts:
            y = _qp_center(draw, y, c, font_small, width)
    return y


def _qp_draw_shop_footer(draw, y, width, shop, font_small, font_text):
    if not shop:
        return y
    y = _qp_sep(draw, y, width, 'light')
    locations = shop.get('locations', [])
    if locations:
        if len(locations) == 1:
            loc = locations[0]
            if loc.get('name'):
                y = _qp_center(draw, y, loc['name'], font_text, width)
            if loc.get('address'):
                y = _qp_center(draw, y, loc['address'], font_small, width)
        else:
            y = _qp_center(draw, y, 'LOCATIONS', font_small, width)
            for loc in locations:
                addr = (loc.get('name') or '') + (' — ' if loc.get('name') and loc.get('address') else '') + (loc.get('address') or '')
                if addr:
                    y = _qp_center(draw, y, addr, font_small, width)
    items = []
    if shop.get('email'): items.append('Email: ' + shop['email'])
    if shop.get('phone'): items.append('Phone: ' + shop['phone'])
    if shop.get('whatsapp'): items.append('WhatsApp: ' + shop['whatsapp'])
    if shop.get('website'): items.append('Web: ' + shop['website'])
    if items:
        y = _qp_sep(draw, y, width, 'light')
        for item in items:
            y = _qp_center(draw, y, item, font_small, width)
    hours = shop.get('hours', '')
    if hours:
        y = _qp_sep(draw, y, width, 'light')
        y = _qp_center(draw, y, 'OPENING HOURS', font_small, width)
        y = _qp_center(draw, y, str(hours), font_small, width)
    return y


def _qp_resolve_placeholders(text, shop, worker):
    if not text:
        return text
    text = text.replace('{shop_name}', shop.get('name', ''))
    text = text.replace('{shop_tagline}', shop.get('tagline', ''))
    text = text.replace('{shop_email}', shop.get('email', ''))
    text = text.replace('{shop_phone}', shop.get('phone', ''))
    text = text.replace('{shop_whatsapp}', shop.get('whatsapp', ''))
    text = text.replace('{shop_website}', shop.get('website', ''))
    if worker:
        text = text.replace('{worker_name}', worker.get('name', ''))
        text = text.replace('{worker_role}', worker.get('role', ''))
        text = text.replace('{worker_phone}', worker.get('phone', ''))
        text = text.replace('{worker_email}', worker.get('email', ''))
        text = text.replace('{worker_whatsapp}', worker.get('whatsapp', ''))
    else:
        for key in ['{worker_name}', '{worker_role}', '{worker_phone}', '{worker_email}', '{worker_whatsapp}']:
            text = text.replace(key, '')
    locs = shop.get('locations', [])
    loc_text = '\n'.join([f"{(l.get('name') or '')}{(' — ' if l.get('name') and l.get('address') else '')}{(l.get('address') or '')}".strip(' — ') for l in locs])
    text = text.replace('{locations}', loc_text)
    hours = shop.get('hours', '')
    text = text.replace('{hours}', str(hours))
    return text


def _qp_finish_receipt(img, width, y):
    receipt = img.crop((0, 0, width, y + 20))
    gray = receipt.convert('L')
    bw = gray.point(lambda x: 0 if x < 200 else 255)
    return bw.convert('RGB')


def build_access_qr_image(local_url):
    """Build a small receipt with a QR code for local app access."""
    Image = importlib.import_module('PIL.Image')
    ImageDraw = importlib.import_module('PIL.ImageDraw')
    qrcode_module = importlib.import_module('qrcode')

    width = PAPER_WIDTH_DOTS
    height = 500
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    font_title = load_font(22)
    font_text = load_font(16)
    font_small = load_font(13)

    def text_size(text, font):
        bbox = draw.textbbox((0, 0), text, font=font)
        return bbox[2] - bbox[0], bbox[3] - bbox[1]

    def draw_text_line(y, text, font, align='left'):
        tw, th = text_size(text, font)
        if align == 'center':
            x = (width - tw) // 2
        elif align == 'right':
            x = width - tw - 20
        else:
            x = 20
        draw.text((x, y), text, font=font, fill='black')
        return th

    y = 20
    h = draw_text_line(y, "ZERO BACKHAND", font_title, 'center')
    y += h + 5
    h = draw_text_line(y, "Wi-Fi Access", font_text, 'center')
    y += h + 15

    draw.line([(20, y), (width - 20, y)], fill='black', width=2)
    y += 20

    # QR Code
    h = draw_text_line(y, "Scan to open the app", font_text, 'center')
    y += h + 10

    qr = qrcode_module.QRCode(box_size=6, border=2)
    qr.add_data(local_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_size = min(240, width - 80)
    qr_img = qr_img.resize((qr_size, qr_size), Image.NEAREST)
    qr_img = qr_img.convert('RGB')
    qr_x = (width - qr_size) // 2
    img.paste(qr_img, (qr_x, y))
    y += qr_size + 15

    draw.line([(20, y), (width - 20, y)], fill='black', width=2)
    y += 20

    # URL text
    h = draw_text_line(y, local_url, font_small, 'center')
    y += h + 10
    h = draw_text_line(y, "Bookmark this page on your phone", font_small, 'center')
    y += h + 15

    draw.line([(20, y), (width - 20, y)], fill='black', width=2)
    y += 20

    h = draw_text_line(y, "Zero Lines - Andorra", font_small, 'center')
    y += h + 10

    receipt = img.crop((0, 0, width, y + 20))
    gray = receipt.convert('L')
    bw = gray.point(lambda x: 0 if x < 200 else 255)
    return bw.convert('RGB')


def build_quick_prints_receipt(data):
    """Build a receipt for Quick Prints based on template type."""
    template = data.get('template', 'custom')
    builders = {
        'discount': build_qp_discount,
        'businesscard': build_qp_businesscard,
        'facial': build_qp_facial,
        'skincare': build_qp_skincare,
    }
    builder = builders.get(template, build_qp_custom)
    return builder(data)


def build_qp_discount(data):
    width = PAPER_WIDTH_DOTS
    shop = data.get('shop', {})
    worker = data.get('worker')
    d = data.get('data', {})
    font_header = load_font(32, bold=True)
    font_subheader = load_font(22, bold=True)
    font_title = load_font(20, bold=True)
    font_text = load_font(18, bold=True)
    font_small = load_font(14, bold=True)
    font_highlight = load_font(36, bold=True)

    img = Image.new('RGB', (width, 3000), 'white')
    y = _qp_draw_logo(img, 30, shop, width)
    draw = ImageDraw.Draw(img)

    y = _qp_draw_shop_header(draw, y, width, shop, font_header, font_subheader)
    y += 20
    y = _qp_sep(draw, y, width, 'double')
    y += 16
    if d.get('headline'):
        y = _qp_center(draw, y, d['headline'].upper(), font_header, width)
        y += 12
    y = _qp_sep(draw, y, width, 'double')
    y += 16
    if d.get('code'):
        y = _qp_center(draw, y, f"CODE: {d['code']}", font_text, width)
    if d.get('percent'):
        y = _qp_center(draw, y, f"• {d['percent']}% OFF •", font_highlight, width)
    y = _qp_sep(draw, y, width)
    y += 14
    if d.get('description'):
        y = _qp_wrap(draw, y, d['description'], font_text, width, align='center')
        y = _qp_sep(draw, y, width)
        y += 14
    if d.get('redemption'):
        y = _qp_wrap(draw, y, d['redemption'], font_small, width, align='center')
        y = _qp_sep(draw, y, width)
        y += 14
    if d.get('validUntil'):
        y = _qp_center(draw, y, f"VALID UNTIL: {d['validUntil']}", font_text, width)
        y = _qp_sep(draw, y, width)
        y += 14
    y = _qp_draw_worker(draw, y, width, worker, font_text, font_small)
    y += 20
    y = _qp_draw_shop_footer(draw, y, width, shop, font_small, font_text)
    y += 20
    y = _qp_sep(draw, y, width, 'double')
    return _qp_finish_receipt(img, width, y)


def build_qp_businesscard(data):
    width = PAPER_WIDTH_DOTS
    shop = data.get('shop', {})
    worker = data.get('worker')
    d = data.get('data', {})
    font_header = load_font(32, bold=True)
    font_subheader = load_font(22, bold=True)
    font_title = load_font(20, bold=True)
    font_text = load_font(18, bold=True)
    font_small = load_font(14, bold=True)
    font_large = load_font(28, bold=True)

    img = Image.new('RGB', (width, 3000), 'white')
    y = _qp_draw_logo(img, 30, shop, width)
    draw = ImageDraw.Draw(img)

    y = _qp_draw_shop_header(draw, y, width, shop, font_header, font_subheader)
    y += 20
    y = _qp_sep(draw, y, width, 'double')
    y += 16
    if d.get('tagline'):
        y = _qp_center(draw, y, d['tagline'].upper(), font_title, width)
    if d.get('role'):
        y = _qp_center(draw, y, d['role'], font_text, width)
    if worker and worker.get('name'):
        y = _qp_center(draw, y, worker['name'], font_large, width)
    y = _qp_sep(draw, y, width)
    y += 14
    if d.get('notes'):
        y = _qp_wrap(draw, y, d['notes'], font_text, width, align='center')
        y = _qp_sep(draw, y, width)
        y += 14
    opts = {'showEmail': d.get('showEmail', False), 'showPhone': d.get('showPhone', False), 'showWhatsApp': d.get('showWhatsApp', False)}
    y = _qp_draw_worker(draw, y, width, worker, font_text, font_small, opts)
    y += 20
    y = _qp_draw_shop_footer(draw, y, width, shop, font_small, font_text)
    y += 20
    y = _qp_sep(draw, y, width, 'double')
    return _qp_finish_receipt(img, width, y)


def build_qp_facial(data):
    width = PAPER_WIDTH_DOTS
    shop = data.get('shop', {})
    worker = data.get('worker')
    d = data.get('data', {})
    font_header = load_font(32, bold=True)
    font_subheader = load_font(22, bold=True)
    font_title = load_font(20, bold=True)
    font_text = load_font(18, bold=True)
    font_small = load_font(14, bold=True)

    img = Image.new('RGB', (width, 3000), 'white')
    y = _qp_draw_logo(img, 30, shop, width)
    draw = ImageDraw.Draw(img)

    y = _qp_draw_shop_header(draw, y, width, shop, font_header, font_subheader)
    y += 20
    y = _qp_sep(draw, y, width, 'double')
    y += 16
    if d.get('headline'):
        y = _qp_center(draw, y, d['headline'].upper(), font_header, width)
    if d.get('subheadline'):
        y = _qp_center(draw, y, d['subheadline'], font_subheader, width)
    y = _qp_sep(draw, y, width)
    y += 14
    if d.get('intro'):
        y = _qp_wrap(draw, y, d['intro'], font_text, width)
        y = _qp_sep(draw, y, width)
        y += 14
    if d.get('benefits'):
        y = _qp_center(draw, y, 'BENEFITS', font_title, width)
        for line in d['benefits'].split('\n'):
            line = line.strip()
            if line:
                y = _qp_left(draw, y, f'• {line}', font_text, width)
        y = _qp_sep(draw, y, width)
        y += 14
    if d.get('code'):
        y = _qp_center(draw, y, f"CODE: {d['code']}", font_text, width)
    if worker and worker.get('name'):
        y = _qp_center(draw, y, f"Specialist: {worker['name']}", font_text, width)
    y = _qp_sep(draw, y, width)
    y += 14
    y = _qp_draw_worker(draw, y, width, worker, font_text, font_small, {'showPhone': True, 'showWhatsApp': True})
    y += 20
    y = _qp_draw_shop_footer(draw, y, width, shop, font_small, font_text)
    y += 20
    y = _qp_sep(draw, y, width, 'double')
    return _qp_finish_receipt(img, width, y)


def build_qp_skincare(data):
    width = PAPER_WIDTH_DOTS
    shop = data.get('shop', {})
    worker = data.get('worker')
    d = data.get('data', {})
    font_header = load_font(32, bold=True)
    font_subheader = load_font(22, bold=True)
    font_title = load_font(20, bold=True)
    font_text = load_font(18, bold=True)
    font_small = load_font(14, bold=True)

    img = Image.new('RGB', (width, 3000), 'white')
    y = _qp_draw_logo(img, 30, shop, width)
    draw = ImageDraw.Draw(img)

    y = _qp_draw_shop_header(draw, y, width, shop, font_header, font_subheader)
    y += 20
    y = _qp_sep(draw, y, width, 'double')
    y += 16
    y = _qp_center(draw, y, 'SKINCARE PLAN', font_header, width)
    if d.get('product'):
        y = _qp_center(draw, y, d['product'], font_subheader, width)
    y = _qp_sep(draw, y, width)
    y += 14
    if d.get('steps'):
        y = _qp_center(draw, y, 'USAGE:', font_title, width)
        step_num = 1
        for line in d['steps'].split('\n'):
            line = line.strip()
            if line:
                y = _qp_left(draw, y, f'{step_num}. {line}', font_text, width)
                step_num += 1
        y = _qp_sep(draw, y, width)
        y += 14
    if d.get('frequency'):
        y = _qp_left(draw, y, f"Frequency: {d['frequency']}", font_text, width)
    if d.get('duration'):
        y = _qp_left(draw, y, f"Duration: {d['duration']}", font_text, width)
    if d.get('frequency') or d.get('duration'):
        y = _qp_sep(draw, y, width)
        y += 14
    if d.get('notes'):
        y = _qp_sep(draw, y, width, 'light')
        y = _qp_wrap(draw, y, d['notes'], font_small, width)
        y = _qp_sep(draw, y, width)
        y += 14
    if worker:
        y = _qp_sep(draw, y, width)
        y += 12
        y = _qp_center(draw, y, 'YOUR SPECIALIST', font_small, width)
        if worker.get('name'):
            y = _qp_center(draw, y, worker['name'], font_text, width)
        if worker.get('role'):
            y = _qp_center(draw, y, worker['role'], font_small, width)
        y = _qp_draw_worker(draw, y, width, worker, font_text, font_small, {'showPhone': True, 'showWhatsApp': True})
    y += 20
    y = _qp_draw_shop_footer(draw, y, width, shop, font_small, font_text)
    y += 20
    y = _qp_sep(draw, y, width, 'double')
    return _qp_finish_receipt(img, width, y)


def build_qp_custom(data):
    width = PAPER_WIDTH_DOTS
    shop = data.get('shop', {})
    worker = data.get('worker')
    d = data.get('data', {})
    font_header = load_font(32, bold=True)
    font_subheader = load_font(22, bold=True)
    font_text = load_font(18, bold=True)
    font_small = load_font(14, bold=True)

    img = Image.new('RGB', (width, 3000), 'white')
    y = _qp_draw_logo(img, 30, shop, width)
    draw = ImageDraw.Draw(img)

    y = _qp_draw_shop_header(draw, y, width, shop, font_header, font_subheader)
    y += 20
    y = _qp_sep(draw, y, width)
    y += 14

    content = d.get('content', '')
    content = _qp_resolve_placeholders(content, shop, worker)
    if content:
        for para in content.split('\n\n'):
            para = para.strip()
            if para:
                y = _qp_wrap(draw, y, para, font_text, width, align='center')
                y = _qp_sep(draw, y, width, 'light')
                y += 12

    y += 14
    y = _qp_draw_shop_footer(draw, y, width, shop, font_small, font_text)
    y += 20
    y = _qp_sep(draw, y, width, 'double')
    return _qp_finish_receipt(img, width, y)


# ============================================================
# WINDOWS GDI PRINTER (ctypes - no pywin32 needed)
# ============================================================
def print_receipt_image(image, printer_name=PRINTER_NAME):
    """
    Print a PIL Image via Windows GDI using ctypes.
    This sends the image to the printer like a photo/document,
    and the BIXOLON driver handles converting it to thermal dots.
    """
    import ctypes
    from ctypes import wintypes

    gdi32 = ctypes.windll.gdi32

    # Ensure image is RGB
    if image.mode != 'RGB':
        image = image.convert('RGB')

    width, height = image.size

    # Convert PIL RGB data to Windows BGR format for DIB
    rgb_data = image.tobytes()
    bgr_data = bytearray()
    for i in range(0, len(rgb_data), 3):
        bgr_data.extend([rgb_data[i + 2], rgb_data[i + 1], rgb_data[i]])
    bgr_data = bytes(bgr_data)

    # Create printer device context
    hdc = gdi32.CreateDCW("WINSPOOL", printer_name, None, None)
    if not hdc:
        err = ctypes.GetLastError()
        raise RuntimeError(
            f"Cannot open printer '{printer_name}'. Error: {err}.\n"
            f"Make sure the printer name matches exactly in Windows.\n"
            f"Check: Control Panel > Devices and Printers"
        )

    try:
        # Start print document
        class DOCINFOW(ctypes.Structure):
            _fields_ = [
                ("cbSize", wintypes.INT),
                ("lpszDocName", wintypes.LPCWSTR),
                ("lpszOutput", wintypes.LPCWSTR),
                ("lpszDatatype", wintypes.LPCWSTR),
                ("fwType", wintypes.DWORD),
            ]

        doc_info = DOCINFOW()
        doc_info.cbSize = ctypes.sizeof(DOCINFOW)
        doc_info.lpszDocName = "Zero Lines Receipt"
        doc_info.lpszOutput = None
        doc_info.lpszDatatype = None
        doc_info.fwType = 0

        if gdi32.StartDocW(hdc, ctypes.byref(doc_info)) <= 0:
            err = ctypes.GetLastError()
            raise RuntimeError(f"StartDoc failed. Error: {err}")

        try:
            if gdi32.StartPage(hdc) <= 0:
                err = ctypes.GetLastError()
                raise RuntimeError(f"StartPage failed. Error: {err}")

            try:
                # Create memory DC compatible with printer
                memdc = gdi32.CreateCompatibleDC(hdc)
                if not memdc:
                    raise RuntimeError("CreateCompatibleDC failed")

                try:
                    # BITMAPINFO for 24-bit DIB
                    class BITMAPINFOHEADER(ctypes.Structure):
                        _fields_ = [
                            ("biSize", wintypes.DWORD),
                            ("biWidth", wintypes.LONG),
                            ("biHeight", wintypes.LONG),
                            ("biPlanes", wintypes.WORD),
                            ("biBitCount", wintypes.WORD),
                            ("biCompression", wintypes.DWORD),
                            ("biSizeImage", wintypes.DWORD),
                            ("biXPelsPerMeter", wintypes.LONG),
                            ("biYPelsPerMeter", wintypes.LONG),
                            ("biClrUsed", wintypes.DWORD),
                            ("biClrImportant", wintypes.DWORD),
                        ]

                    class RGBQUAD(ctypes.Structure):
                        _fields_ = [
                            ("rgbBlue", wintypes.BYTE),
                            ("rgbGreen", wintypes.BYTE),
                            ("rgbRed", wintypes.BYTE),
                            ("rgbReserved", wintypes.BYTE),
                        ]

                    class BITMAPINFO(ctypes.Structure):
                        _fields_ = [
                            ("bmiHeader", BITMAPINFOHEADER),
                            ("bmiColors", RGBQUAD * 1),
                        ]

                    bmi = BITMAPINFO()
                    bmi.bmiHeader.biSize = ctypes.sizeof(BITMAPINFOHEADER)
                    bmi.bmiHeader.biWidth = width
                    bmi.bmiHeader.biHeight = -height   # Negative = top-down
                    bmi.bmiHeader.biPlanes = 1
                    bmi.bmiHeader.biBitCount = 24
                    bmi.bmiHeader.biCompression = 0    # BI_RGB
                    bmi.bmiHeader.biSizeImage = len(bgr_data)
                    bmi.bmiHeader.biXPelsPerMeter = 0
                    bmi.bmiHeader.biYPelsPerMeter = 0
                    bmi.bmiHeader.biClrUsed = 0
                    bmi.bmiHeader.biClrImportant = 0

                    # Create DIB section (memory-mapped bitmap)
                    ppvBits = ctypes.c_void_p()
                    hbitmap = gdi32.CreateDIBSection(
                        memdc, ctypes.byref(bmi), 0,
                        ctypes.byref(ppvBits), None, 0
                    )
                    if not hbitmap:
                        raise RuntimeError("CreateDIBSection failed")

                    try:
                        # Copy image pixels into DIB memory
                        ctypes.memmove(ppvBits.value, bgr_data, len(bgr_data))

                        # Select bitmap into memory DC
                        old_bitmap = gdi32.SelectObject(memdc, hbitmap)

                        # Copy from memory DC to printer DC
                        SRCCOPY = 0x00CC0020
                        result = gdi32.BitBlt(
                            hdc, 0, 0, width, height,
                            memdc, 0, 0, SRCCOPY
                        )
                        if not result:
                            err = ctypes.GetLastError()
                            raise RuntimeError(f"BitBlt failed. Error: {err}")

                        # Restore old bitmap
                        gdi32.SelectObject(memdc, old_bitmap)

                    finally:
                        gdi32.DeleteObject(hbitmap)

                finally:
                    gdi32.DeleteDC(memdc)

            finally:
                gdi32.EndPage(hdc)

        finally:
            gdi32.EndDoc(hdc)

    finally:
        gdi32.DeleteDC(hdc)

    print(f"[OK] Printed {width}x{height} receipt to '{printer_name}'")
    return True


# ============================================================
# HTTP SERVER
# ============================================================
def start_server(port=8766):
    from http.server import BaseHTTPRequestHandler, HTTPServer

    class PrintHandler(BaseHTTPRequestHandler):
        def do_OPTIONS(self):
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()

        def do_POST(self):
            if self.path == '/qr-access':
                try:
                    local_ip = get_local_ipv4()
                    if not local_ip:
                        local_ip = '127.0.0.1'
                    local_url = f"http://{local_ip}:{port}"
                    print(f"[QR] Printing access QR for {local_url}")
                    qr_image = build_access_qr_image(local_url)
                    success = print_receipt_image(qr_image, PRINTER_NAME)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'success': success,
                        'url': local_url,
                        'message': 'Access QR printed!'
                    }).encode())
                except Exception as e:
                    import traceback
                    print(f"[ERROR] QR print failed: {e}")
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'success': False,
                        'error': str(e)
                    }).encode())
                return

            if self.path == '/print':
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length).decode('utf-8')

                import traceback
                try:
                    offer = json.loads(post_data)

                    # Build receipt image
                    print(f"[BUILD] Generating receipt image...")
                    if offer.get('type') == 'quick-prints':
                        receipt_image = build_quick_prints_receipt(offer)
                        print(f"[BUILD] Quick Prints '{offer.get('template')}' receipt: {receipt_image.size[0]} x {receipt_image.size[1]} pixels")
                    elif offer.get('type') == 'zero-backhand':
                        # Zero Backhand wraps deal in 'deal' key
                        deal_data = offer.get('deal', offer)
                        deal_data['type'] = 'zero-backhand'
                        receipt_image = build_receipt_image(deal_data)
                        print(f"[BUILD] Zero Backhand '{deal_data.get('product', 'Unknown')}' receipt: {receipt_image.size[0]} x {receipt_image.size[1]} pixels")
                    else:
                        receipt_image = build_receipt_image(offer)
                        print(f"[BUILD] Receipt size: {receipt_image.size[0]} x {receipt_image.size[1]} pixels")

                    # Save debug copy (optional - for troubleshooting)
                    debug_path = os.path.join(tempfile.gettempdir(), "receipt_debug.png")
                    try:
                        receipt_image.save(debug_path)
                        print(f"[DEBUG] Saved preview to: {debug_path}")
                    except Exception:
                        pass

                    # Print via GDI
                    success = print_receipt_image(receipt_image, PRINTER_NAME)

                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'success': success,
                        'message': 'Receipt printed!'
                    }).encode())

                except Exception as e:
                    error_msg = str(e)
                    tb = traceback.format_exc()
                    print(f"[ERROR] {error_msg}")
                    print(tb)
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'success': False,
                        'error': error_msg,
                        'traceback': tb
                    }).encode())
            else:
                self.send_response(404)
                self.end_headers()

        def do_GET(self):
            # Serve static files (app HTML/JS/CSS/assets) for local network access
            path = self.path
            if path == '/':
                path = '/index.html'

            # Security: prevent directory traversal
            safe_path = os.path.normpath(path.lstrip('/'))
            if safe_path.startswith('..') or safe_path.startswith('/'):
                self.send_response(403)
                self.end_headers()
                return

            # Resolve from the directory where this script lives
            script_dir = os.path.dirname(os.path.abspath(__file__))
            file_path = os.path.join(script_dir, safe_path)

            if not os.path.exists(file_path) or not os.path.isfile(file_path):
                self.send_response(404)
                self.end_headers()
                return

            content_types = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon',
                '.bat': 'text/plain',
                '.py': 'text/plain',
            }
            ext = os.path.splitext(file_path)[1].lower()
            content_type = content_types.get(ext, 'application/octet-stream')

            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())

        def log_message(self, format, *args):
            print("[Print Server]", format % args)

    local_ip = get_local_ipv4()

    server = HTTPServer(('0.0.0.0', port), PrintHandler)
    print("=" * 56)
    print("  Zero Backhand Thermal Print Server")
    print("  Image Mode (GDI) - BIXOLON Compatible")
    print("  Supports: Reverse Five + Zero Backhand + Quick Prints")
    print("=" * 56)
    print(f"  Local URL:  http://127.0.0.1:{port}")
    if local_ip:
        print(f"  Network:    http://{local_ip}:{port}")
    print(f"  Printer:    {PRINTER_NAME}")
    print(f"  Paper:      {PAPER_WIDTH_MM}mm ({PAPER_WIDTH_DOTS} dots)")
    print("")
    print("  App URL:      http://<Network-IP>:" + str(port))
    print("  Wi-Fi phones: open the App URL above in their browser")
    print("  (GitHub Pages cannot print to local network — use local URL)")
    print("  Usage:        Click 'Print Receipt' in the app")
    print("  Stop:         Press Ctrl+C")
    print("=" * 56)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


if __name__ == '__main__':
    start_server()
