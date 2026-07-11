# ESP32 → Simple POS: Barcode Scan HTTP Guide

This guide shows how to flash an ESP32 so that every barcode it scans is sent to the Simple POS server and pushed onto the cashier screen.

## 1. How it works (the big picture)

```
[Barcode scanner] ──serial/TTL──> [ESP32] ──HTTP POST──> https://YOUR_SITE/api/scan
                                                              │
                                                              ▼
                                              Server looks up product in DB
                                              (auto-creates "Unknown <barcode>" if new),
                                              then broadcasts to all cashier screens
                                              over Server-Sent Events.
```

The server is **Next.js 16** running at your domain. The ESP32 only needs to send one HTTP request per scan. No persistent socket, no polling.

## 2. What you need

| Thing | Value |
|---|---|
| Server URL | `https://YOUR_DOMAIN/api/scan` (replace `YOUR_DOMAIN`) |
| HTTP method | `POST` |
| Auth header | `X-Device-Key: <shared-secret>` — get this from your friend (it's the server's `DEVICE_KEY` env var) |
| Content-Type | `application/json` |
| WiFi network | Same LAN as the server, or any network with internet if server is hosted |
| WiFi password | — |
| Arduino IDE or PlatformIO | with `esp32` board package installed |
| Library | `HTTPClient` (built into the ESP32 Arduino core) — **no extra install needed** |

> In local dev the server runs on `http://<server-LAN-IP>:3000` (plain HTTP). In production it's HTTPS. The code below picks the right one via a `#define`.

## 3. The request format

**Headers:**
```
Content-Type: application/json
X-Device-Key: your-shared-secret-here
```

**Body (JSON):**
```json
{
  "barcode": "8851234567890",
  "device_id": "esp32-01"
}
```

- `barcode` *(required)* — the scanned barcode string. Numbers, letters, dashes — whatever the scanner outputs.
- `device_id` *(required for broadcast)* — any non-empty string that identifies this physical scanner. **If `device_id` is empty or missing, the scan is NOT pushed to the cashier screen.** Always send one. Example: `"esp32-counter-1"`.

## 4. The response

**Success (HTTP 200):**
```json
{
  "status": "ok",
  "id": 42,
  "barcode": "8851234567890",
  "product": "Coca-Cola 390ml",
  "price": 20,
  "stock": 17,
  "currency": "THB"
}
```

- `product` may be `"Unknown <barcode>"` if it's the first scan of a new item — that's normal, the server creates a placeholder. Edit the real name/price later in the `/products` admin page.
- `price` and `stock` come from the server DB — don't trust any local price table.

**Errors:**

| Status | Meaning | Fix |
|---|---|---|
| `401` | Missing or wrong `X-Device-Key` | Check the shared secret matches server's `DEVICE_KEY` |
| `400` | No `barcode` field or bad JSON | Send valid JSON with a `barcode` |
| `500` | Server error | Check server logs; retry the scan |

## 5. Firmware (Arduino C++)

Install the **ESP32 board package** in Arduino IDE (Boards Manager → search "esp32" by Espressif). Then flash this sketch. Plug your scanner's TX into ESP32 **GPIO 16 (RX2)** and GND to GND (most HID/serial barcode scanners work this way — confirm your scanner's pinout).

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

// ====== CONFIG — edit these ======
#define WIFI_SSID     "your-wifi-name"
#define WIFI_PASSWORD "your-wifi-password"

// Local dev (pick ONE):
#define SERVER_URL    "http://192.168.1.50:3000/api/scan"
// Production (HTTPS):
// #define SERVER_URL    "https://yourdomain.com/api/scan"

#define DEVICE_KEY    "your-shared-secret-here"
#define DEVICE_ID     "esp32-01"

#define SCAN_RX_PIN   16   // GPIO receiving scanner TX
#define SCAN_BAUD     9600 // most scanners default to 9600
// =================================

#define MAX_BARCODE_LEN 64
char barcodeBuf[MAX_BARCODE_LEN];
size_t barcodeLen = 0;

void setup() {
  Serial.begin(115200);
  Serial2.begin(SCAN_BAUD, SERIAL_8N1, SCAN_RX_PIN, -1); // -1 = no TX pin

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected. IP: ");
  Serial.println(WiFi.localIP());
}

void sendScan(const char* code) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERR] WiFi down, skipping");
    return;
  }

  HTTPClient http;
  http.setTimeout(5000);
  if (!http.begin(SERVER_URL)) {
    Serial.println("[ERR] begin() failed");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);

  String body = String("{\"barcode\":\"") + code +
                "\",\"device_id\":\"" DEVICE_ID "\"}";

  int code_http = http.POST(body);
  if (code_http > 0) {
    String resp = http.getString();
    Serial.printf("[OK ] HTTP %d -> %s\n", code_http, resp.c_str());
  } else {
    Serial.printf("[ERR] HTTP %s\n", http.errorToString(code_http).c_str());
  }
  http.end();
}

void readScanner() {
  while (Serial2.available()) {
    char c = Serial2.read();
    // Most scanners terminate a barcode with ENTER (CR or LF).
    if (c == '\r' || c == '\n') {
      if (barcodeLen > 0) {
        barcodeBuf[barcodeLen] = '\0';
        Serial.printf("[SCAN] %s\n", barcodeBuf);
        sendScan(barcodeBuf);
        barcodeLen = 0;
      }
    } else if (barcodeLen < MAX_BARCODE_LEN - 1) {
      // Keep printable chars only; ignore everything else.
      if (c >= 0x20 && c < 0x7F) {
        barcodeBuf[barcodeLen++] = c;
      }
    }
    // Overflow: drop the barcode silently rather than sending garbage.
    if (barcodeLen >= MAX_BARCODE_LEN - 1) barcodeLen = 0;
  }
}

void loop() {
  readScanner();
}
```

Open **Serial Monitor at 115200 baud** to watch connects, scans, and server responses.

## 6. Wiring (typical USB-HID/serial scanner → ESP32)

```
Scanner         ESP32
───────         ─────
TX        ───>  GPIO 16  (RX2)
GND       ───>  GND
(5V / VCC ───>  5V / VIN  if scanner needs external power)
```

- If your scanner is a **USB HID** (keyboard-wedge) type, you'll need a USB Host shield or a scanner that speaks TTL serial (most configurable scanners can switch modes via a config barcode in their manual — look for "RS232" or "TTL" mode).
- Common scanner brands: **Honeywell Voyager, Zebex, Netum** — all have a serial mode.

## 7. Test it without a scanner first

Before wiring the scanner, comment out the `readScanner()` call in `loop()` and call `sendScan("8851234567890");` once in `setup()`. You should see in Serial Monitor:

```
[OK ] HTTP 200 -> {"status":"ok","id":1,"barcode":"8851234567890","product":"Unknown 8851234567890","price":0,"stock":0,"currency":"THB"}
```

…and the cashier screen at `/cashier` should show the item appear. Once that works, restore `readScanner()`.

## 8. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `HTTP -1` / `connection refused` | Wrong server URL/IP, server not running, firewall blocking port. Local dev → must use the server's LAN IP, not `localhost`. |
| `HTTP 401` | `X-Device-Key` doesn't match server's `DEVICE_KEY`. Ask your friend to confirm. |
| `HTTP -11` (read timeout) | Server slow or URL is HTTPS on an HTTP port. Check the `SERVER_URL` scheme. |
| Scan doesn't show on cashier screen | You forgot to send `device_id`, or sent it empty. Without it, scans are **not broadcast**. |
| WiFi won't connect | Wrong SSID/password; 5GHz-only network (ESP32 is 2.4GHz only). |
| `begin() failed` on HTTPS | For production HTTPS you may need `http.setInsecure();` before `begin()`, or use `WiFiClientSecure`. See *HTTPS notes* below. |

## 9. HTTPS notes (production)

For `https://` URLs, replace `HTTPClient http;` with a secure client:

```cpp
#include <WiFiClientSecure.h>
WiFiClientSecure client;
client.setInsecure(); // accept any cert — fine for a demo, not production-grade
HTTPClient http;
http.begin(client, SERVER_URL);
```

For a real deployment, pin the server's root certificate (`client.setCACert(root_ca_pem);`) instead of `setInsecure()`.

## 10. Quick checklist

- [ ] ESP32 on same network as server (or has internet for hosted server)
- [ ] `WIFI_SSID` / `WIFI_PASSWORD` correct
- [ ] `SERVER_URL` points to `/api/scan` with right scheme (http local / https prod)
- [ ] `DEVICE_KEY` matches server's `DEVICE_KEY` env var exactly
- [ ] `DEVICE_ID` is non-empty (e.g. `"esp32-01"`)
- [ ] Scanner in serial/TTL mode at 9600 baud
- [ ] Scanner TX → ESP32 GPIO 16
- [ ] Serial Monitor open at 115200 to watch results
- [ ] Cashier at `/cashier` logged in and watching — scan should appear within ~1 second

Happy scanning. Ping your friend if you see any `[ERR]` lines you can't decode.
