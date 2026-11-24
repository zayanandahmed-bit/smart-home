// Smart home switchboard: 4 lights + 1 fan.
// Wiring matches web/wiring.html:
//   Board A relays 1-4 (lights) on GPIO 26, 27, 25, 33; board B relay 1 (fan) on GPIO 23.
//   Wall switches (now low-voltage, no 230V) on GPIO 32, 14, 13, 4 and fan 16, other side to GND.
// The app sets smarthome.channels.desired; the board drives the relays, saves the state
// to flash (restored after a power cut) and reports the real state back.
// Flipping a wall switch toggles its channel locally, works with no internet,
// and is pushed to the database so the app follows.
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include "secrets.h"

// Avoid strapping pins (0, 2, 12, 15), flash pins (6-11) and, for outputs, input-only pins (34-39).
constexpr uint8_t RELAY_PINS[]  = {26, 27, 25, 33, 23};
constexpr uint8_t SWITCH_PINS[] = {32, 14, 13, 4, 16};
constexpr size_t NUM_CH = sizeof(RELAY_PINS);
static_assert(sizeof(SWITCH_PINS) == NUM_CH, "one wall switch per relay");
constexpr bool ACTIVE_LOW = true;            // most relay boards; flip if yours is not
constexpr uint32_t POLL_MS = 1000, HEARTBEAT_MS = 30000, RELOGIN_MS = 50UL * 60 * 1000;
constexpr uint32_t DEBOUNCE_MS = 60, RETRY_MS = 3000;

Preferences prefs;
SemaphoreHandle_t lock;                      // switches (core 1) and network (core 0) share the state
volatile bool state[NUM_CH];
volatile bool pendingPush[NUM_CH];                    // a wall-switch change the database hasn't heard about yet
bool lastLevel[NUM_CH];                      // debounced switch level
bool rawLevel[NUM_CH];
uint32_t rawSince[NUM_CH];
String token;
uint32_t lastPoll = 0, lastBeat = 0, lastLogin = 0;
uint32_t lastRetry = 0;                      // login retries
volatile uint32_t lastPushTry = 0;           // wall-switch push retries, 0 = send now

void applyRelay(size_t i) { digitalWrite(RELAY_PINS[i], (state[i] != ACTIVE_LOW) ? HIGH : LOW); }
String key(size_t i) { return "s" + String(i); }

void setChannel(size_t i, bool on) {
  xSemaphoreTakeRecursive(lock, portMAX_DELAY);
  state[i] = on;
  applyRelay(i);
  prefs.putBool(key(i).c_str(), on);
  xSemaphoreGiveRecursive(lock);
  Serial.printf("channel %u -> %s\n", (unsigned)i, on ? "ON" : "OFF");
}

// Returns HTTP status; response body in *out.
int call(const char *method, const String &path, const String &body, String *out = nullptr, bool auth = true) {
  if (WiFi.status() != WL_CONNECTED) return -1;
  WiFiClientSecure c;
  c.setInsecure();  // prototype: no certificate pinning yet
  HTTPClient h;
  h.setTimeout(4000);
  h.begin(c, String(SB_URL) + path);
  h.addHeader("apikey", SB_KEY);
  h.addHeader("Content-Type", "application/json");
  if (auth) h.addHeader("Authorization", "Bearer " + token);
  if (path.startsWith("/rest/v1/")) h.addHeader(String(method) == "GET" ? "Accept-Profile" : "Content-Profile", "smarthome");
  int code = h.sendRequest(method, body);
  if (out && code > 0) *out = h.getString();
  h.end();
  if (code == 401) token = "";
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

String rpcBody(size_t i, const char *field, bool v) {
  return String("{\"p_device\":\"") + DEVICE_ID + "\",\"p_n\":" + i + ",\"" + field + "\":" + (v ? "true" : "false") + "}";
}
void report(size_t i) { call("POST", "/rest/v1/rpc/device_report", rpcBody(i, "p_reported", state[i])); }
bool pushToggle(size_t i) { return call("POST", "/rest/v1/rpc/device_toggle", rpcBody(i, "p_on", state[i])) / 100 == 2; }
void heartbeat() { call("POST", "/rest/v1/rpc/device_heartbeat", String("{\"p_device\":\"") + DEVICE_ID + "\"}"); }

void poll() {
  String resp;
  if (call("GET", String("/rest/v1/channels?select=n,desired&device_id=eq.") + DEVICE_ID, "", &resp) != 200) return;
  JsonDocument d;
  if (deserializeJson(d, resp)) return;
  for (JsonObject row : d.as<JsonArray>()) {
    size_t n = row["n"] | 99;
    if (n >= NUM_CH) continue;
    bool want = row["desired"] | false;
    // check and change in one step, so a wall switch flipped right now can't be undone
    xSemaphoreTakeRecursive(lock, portMAX_DELAY);
    bool apply = !pendingPush[n] && want != state[n];   // our own wall-switch change wins until it's saved
    if (apply) setChannel(n, want);
    xSemaphoreGiveRecursive(lock);
    if (apply) report(n);
  }
}

// Any flip of a wall switch (up or down) toggles its channel, so the switch
// position never fights the app.
void readSwitches() {
  uint32_t now = millis();
  for (size_t i = 0; i < NUM_CH; i++) {
    bool lv = digitalRead(SWITCH_PINS[i]);
    if (lv != rawLevel[i]) { rawLevel[i] = lv; rawSince[i] = now; }
    if (lv != lastLevel[i] && now - rawSince[i] >= DEBOUNCE_MS) {
      lastLevel[i] = lv;
      xSemaphoreTakeRecursive(lock, portMAX_DELAY);
      pendingPush[i] = true;                       // so a poll can't undo the flip
      setChannel(i, !state[i]);
      xSemaphoreGiveRecursive(lock);
      lastPushTry = 0;                             // tell the database right away
    }
  }
}

void flushPending() {
  if (token.isEmpty() || (lastPushTry && millis() - lastPushTry < RETRY_MS)) return;
  lastPushTry = millis();
  for (size_t i = 0; i < NUM_CH; i++) {
    if (!pendingPush[i]) continue;
    bool sent = state[i];
    // only clear it if nobody flipped the switch again while we were sending
    if (pushToggle(i) && state[i] == sent) pendingPush[i] = false;
  }
}

// All networking runs here, on core 0, so a slow request never delays a wall switch.
void networkTask(void *) {
  for (;;) {
    if (WiFi.status() != WL_CONNECTED) { vTaskDelay(pdMS_TO_TICKS(200)); continue; }
    uint32_t now = millis();
    if (token.isEmpty() || now - lastLogin > RELOGIN_MS) {
      if (now - lastRetry < RETRY_MS) { vTaskDelay(pdMS_TO_TICKS(50)); continue; }
      lastRetry = now;
      if (!login()) continue;
      flushPending();
      for (size_t i = 0; i < NUM_CH; i++) if (!pendingPush[i]) report(i);
      heartbeat();
    }
    flushPending();
    if (now - lastPoll >= POLL_MS) { lastPoll = now; poll(); }
    if (now - lastBeat >= HEARTBEAT_MS) { lastBeat = now; heartbeat(); }
    vTaskDelay(pdMS_TO_TICKS(20));
  }
}

void setup() {
  Serial.begin(115200);
  lock = xSemaphoreCreateRecursiveMutex();
  prefs.begin("relay", false);
  for (size_t i = 0; i < NUM_CH; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    state[i] = prefs.getBool(key(i).c_str(), false);   // restore after a power cut
    applyRelay(i);
    pinMode(SWITCH_PINS[i], INPUT_PULLUP);
    lastLevel[i] = rawLevel[i] = digitalRead(SWITCH_PINS[i]);  // where the switch sits now is the baseline
    rawSince[i] = millis();
    pendingPush[i] = false;
  }
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);   // don't wait: wall switches must work even with no Wi-Fi
  xTaskCreatePinnedToCore(networkTask, "net", 12288, nullptr, 1, nullptr, 0);
}

void loop() {
  readSwitches();   // core 1: wall switches answer instantly, internet or not
  delay(5);
}
