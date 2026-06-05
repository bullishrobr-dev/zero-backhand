# Zero Backhand - Setup Guide

## Network Printing (Phones & Other Computers)

### The Problem
When workers open the app from GitHub Pages (`https://...`), their browser blocks printing to a local printer server on a different device. This is a browser security rule that cannot be bypassed.

**Solution:** Run the app locally from the shop computer, and give the shop computer a fixed IP address.

---

### Step 1: Reserve a Fixed IP in Your Router

This ensures the shop computer always gets the same local IP (e.g., `192.168.1.50`), even after restarts.

#### How to find your router's admin page:
1. On the shop computer, open **Command Prompt** (type `cmd` in Start menu)
2. Type: `ipconfig` and press Enter
3. Look for **"Default Gateway"** — this is your router's address (usually `192.168.1.1` or `192.168.0.1`)
4. Open a browser and go to that address (e.g., `http://192.168.1.1`)
5. Log in with the router's username/password (often on a sticker on the router)

#### How to reserve the IP:
1. In the router settings, look for one of these sections:
   - **DHCP Reservation**
   - **Static IP Assignment**
   - **Address Reservation**
   - **LAN Settings → DHCP**
2. Find the shop computer in the list of connected devices (look for its name, e.g., `ZEROLINES-PC`)
3. Click **Reserve** or **Assign Static IP**
4. Choose an IP like `192.168.1.50` (pick something in your router's range)
5. Save and reboot the router if required

**From now on, that computer will ALWAYS get `192.168.1.50`.**

---

### Step 2: Open Windows Firewall

1. Right-click `fix-firewall.bat` → **"Run as administrator"**
2. Click **Yes** if Windows asks for permission
3. This opens port 8766 so other devices can connect

You only need to do this once.

---

### Step 3: Start the Printer Server

1. Double-click `start-printer.bat`
2. The window will show the local URL, e.g.:
   ```
   Local URL:  http://127.0.0.1:8766
   Network:    http://192.168.1.50:8766
   ```
3. Leave this window open

---

### Step 4: Print the Wi-Fi Access QR Code

1. On the shop computer, open the app at `http://127.0.0.1:8766`
2. Go to **Settings → Thermal Printer**
3. Click **"Print Wi-Fi QR"**
4. A receipt prints with a QR code
5. **Stick this QR code near the printer** or at the counter

---

### Step 5: Workers Scan the QR Code

1. Workers open their phone's camera
2. Scan the QR code stuck near the printer
3. It opens `http://192.168.1.50:8766` in their browser
4. They tap **"Add to Home Screen"** or bookmark the page
5. From now on, they just tap the home screen icon — no typing needed

**Important:** Workers must be on the **same Wi-Fi** as the shop computer.

---

### If the Router Is Ever Replaced

1. Repeat Step 1 (reserve the same IP in the new router)
2. Print a new QR code (the URL stays the same if you reserved the same IP)
3. Workers already have the bookmark — it still works

---

### Troubleshooting

| Problem | Solution |
|---------|----------|
| "Printer not found" on phone | Make sure phone is on the same Wi-Fi. Check that the server window shows a Network IP. |
| QR code scans but page doesn't load | Run `fix-firewall.bat` as administrator on the shop computer. |
| IP changed after restart | Reserve a static IP in the router (Step 1). |
| App works but prints fail | Check that the BIXOLON printer driver is installed and the printer is online. |
