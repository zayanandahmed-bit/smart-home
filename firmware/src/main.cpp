// Smart home board. Reads what the app wants (smarthome.channels.desired),
// drives the relays, saves state to flash, reports the real state back.
// Signs in as its own Supabase user, so it can only touch its own device.
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include "secrets.h"

// Prototype: one relay (low-voltage LED only, no mains). Add pins for more channels.
// Avoid strapping pins (0,2,12,15), flash pins (6-11), input-only pins (34-39).
constexpr uint8_t PINS[] = {26};
constexpr size_t NUM_CH = sizeof(PINS);
constexpr bool ACTIVE_LOW = true;          // most 4-ch relay boards; flip if yours is not
constexpr uint32_t POLL_MS = 1000, HEARTBEAT_MS = 30000, RELOGIN_MS = 50UL * 60 * 1000;

Preferences prefs;
bool state[NUM_CH];
String token;
uint32_t lastPoll = 0, lastBeat = 0, lastLogin = 0;

void applyRelay(size_t i) { digitalWrite(PINS[i], (state[i] != ACTIVE_LOW) ? HIGH : LOW); }

// Returns HTTP status; response body in *out.
int call(const char *method, const String &path, const String &body, String *out = nullptr,
         bool auth = true, bool write = false) {
  WiFiClientSecure c;
  c.setInsecure();  // prototype: no certificate pinning yet
  HTTPClient h;
  h.begin(c, String(SB_URL) + path);
  h.addHeader("apikey", SB_KEY);
  h.addHeader("Content-Type", "application/json");
  if (auth) h.addHeader("Authorization", "Bearer " + token);
  if (path.startsWith("/rest/v1/")) h.addHeader(write ? "Content-Profile" : "Accept-Profile", "smarthome");
  int code = h.sendRequest(method, body);
  if (out && code > 0) *out = h.getString();
  h.end();
  return code;
}

bool login() {
  JsonDocument d;
  d["email"] = DEV_EMAIL;
  d["password"] = DEV_PASS;
  String b, resp;
  serializeJson(d, b);
  int code = call("POST", "/auth/v1/token?grant_type=password", b, &resp, false);
  if (code != 200) { Serial.printf("login failed %d\n", code); return false; }
  JsonDocument r;
  if (deserializeJson(r, resp)) return false;
  token = r["access_token"].as<String>();
  lastLogin = millis();
  return token.length() > 0;
}

void report(size_t i) {
  String b = String("{\"p_device\":\"") + DEVICE_ID + "\",\"p_n\":" + i + ",\"p_reported\":" + (state[i] ? "true" : "false") + "}";
  if (call("POST", "/rest/v1/rpc/device_report", b, nullptr, true, true) == 401) token = "";
}

void heartbeat() {
  String b = String("{\"p_device\":\"") + DEVICE_ID + "\"}";
  if (call("POST", "/rest/v1/rpc/device_heartbeat", b, nullptr, true, true) == 401) token = "";
}

void poll() {
  String resp;
  int code = call("GET", String("/rest/v1/channels?select=n,desired&device_id=eq.") + DEVICE_ID, "", &resp);
  if (code == 401) { token = ""; return; }
  if (code != 200) return;
  JsonDocument d;
  if (deserializeJson(d, resp)) return;
  for (JsonObject row : d.as<JsonArray>()) {
    size_t n = row["n"] | 99;
    if (n >= NUM_CH) continue;
    bool want = row["desired"] | false;
    if (want != state[n]) {
      state[n] = want;
      applyRelay(n);
      prefs.putBool(("s" + String(n)).c_str(), want);
      report(n);
      Serial.printf("relay %u -> %s\n", (unsigned)n, want ? "ON" : "OFF");
    }
  }
}

void setup() {
  Serial.begin(115200);
  prefs.begin("relay", false);
  for (size_t i = 0; i < NUM_CH; i++) {
    pinMode(PINS[i], OUTPUT);
    state[i] = prefs.getBool(("s" + String(i)).c_str(), false);  // restore after a power cut
    applyRelay(i);
  }
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }
  Serial.printf("\nWiFi OK %s\n", WiFi.localIP().toString().c_str());
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) { WiFi.reconnect(); delay(1000); return; }
  uint32_t now = millis();
  if (token.isEmpty() || now - lastLogin > RELOGIN_MS) {
    if (!login()) { delay(5000); return; }
    for (size_t i = 0; i < NUM_CH; i++) report(i);
    heartbeat();
  }
  if (now - lastPoll >= POLL_MS) { lastPoll = now; poll(); }
  if (now - lastBeat >= HEARTBEAT_MS) { lastBeat = now; heartbeat(); }
}
