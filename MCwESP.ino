#include <ArduinoBLE.h>
#include <SoftwareSerial.h>

// This code contains functionality for volume Up, volume Down, Pause/Play, and Skip song
// Now with double tap detection for each sensor AND ESP32S3 Sense camera integration!

const int sensorPin1 = A5;
const int sensorPin2 = A4;
const int sensorPin3 = A3;
int sensorValue1 = 0;
int sensorValue2 = 0;
int sensorValue3 = 0;

int threshold = 150;

// ESP32 Camera Integration
SoftwareSerial esp32Serial(2, 3); // RX: 2, TX: 3 (adjust pins as needed)
const char* CAMERA_PHOTO_TAKEN = "CAMERA_PHOTO_TAKEN";
const char* CAMERA_ERROR = "CAMERA_ERROR";
const char* CAMERA_READY = "CAMERA_READY";
bool cameraReady = false;

// Double tap detection state for each sensor
struct DoubleTapState {
  bool waitingForSecondTap = false;
  unsigned long firstTapTime = 0;
  bool lastPressed = false;
};

DoubleTapState dt1, dt2, dt3;
const unsigned long DOUBLE_TAP_TIMEOUT = 500; // ms

// Pause/play state
bool sensor3paused = false;

// BLE setup
BLEService fsrService("180A");                     // Custom BLE Service
BLEStringCharacteristic fsrCharacteristic("2A57",  // Custom Characteristic
                                          BLERead | BLENotify,
                                          20);  // Increased max length for camera commands

// ESP32 Camera Functions
void sendCameraCommand(const char* command) {
  if (esp32Serial.available()) {
    esp32Serial.println(command);
    Serial.print("Sent camera command: ");
    Serial.println(command);
  }
}

void checkCameraStatus() {
  if (esp32Serial.available()) {
    String response = esp32Serial.readStringUntil('\n');
    response.trim();
    
    if (response == "CAMERA_READY") {
      cameraReady = true;
      Serial.println("ESP32 Camera is ready");
      // Send status to phone via BLE
      fsrCharacteristic.writeValue(CAMERA_READY);
    } else if (response == "CAMERA_PHOTO_TAKEN") {
      Serial.println("ESP32 Camera photo taken successfully");
      // Send status to phone via BLE
      fsrCharacteristic.writeValue(CAMERA_PHOTO_TAKEN);
    } else if (response.startsWith("CAMERA_ERROR")) {
      Serial.println("ESP32 Camera error: " + response);
      // Send error to phone via BLE
      fsrCharacteristic.writeValue(response.c_str());
    }
  }
}

void takePhoto() {
  if (cameraReady) {
    Serial.println("Triggering ESP32 camera to take photo");
    sendCameraCommand("TAKE_PHOTO");
  } else {
    Serial.println("Camera not ready yet");
  }
}

// Double tap detection function
bool doubleTapped(int value, DoubleTapState &state) {
  bool pressed = value > threshold;
  bool tapped = false;
  if (pressed && !state.lastPressed) {
    if (!state.waitingForSecondTap) {
      // First tap detected
      state.waitingForSecondTap = true;
      state.firstTapTime = millis();
    } else if (millis() - state.firstTapTime <= DOUBLE_TAP_TIMEOUT) {
      // Second tap within timeout
      state.waitingForSecondTap = false;
      tapped = true;
    } else {
      // Too late, restart
      state.firstTapTime = millis();
    }
  }
  // Timeout: reset
  if (state.waitingForSecondTap && (millis() - state.firstTapTime > DOUBLE_TAP_TIMEOUT)) {
    state.waitingForSecondTap = false;
  }
  state.lastPressed = pressed;
  return tapped;
}

void setup() {
  Serial.begin(115200);
  while (!Serial);

  // Initialize ESP32 communication
  esp32Serial.begin(115200);
  Serial.println("ESP32 Serial communication initialized");

  if (!BLE.begin()) {
    Serial.println("Starting BLE failed!");
    while (1);
  }

  BLE.setLocalName("Arduino_FSR");  // Name shown on phone

  BLE.setAdvertisedService(fsrService);
  fsrService.addCharacteristic(fsrCharacteristic);
  BLE.addService(fsrService);

  BLE.advertise();  // Start advertising BLE connection

  Serial.println("BLE device is ready!");
  
  // Request camera status from ESP32
  delay(1000);
  sendCameraCommand("GET_STATUS");
}

void loop() {
  BLEDevice central = BLE.central();

  if (central) {
    Serial.print("Connected to ");
    Serial.println(central.address());

    while (central.connected()) {
      sensorValue1 = analogRead(sensorPin1);
      sensorValue2 = analogRead(sensorPin2);
      sensorValue3 = analogRead(sensorPin3);
      Serial.println("Sensor Value1: " + String(sensorValue1) + "   Sensor Value2: " + String(sensorValue2) +"   Sensor Value3: " + String(sensorValue3));

      // Check for ESP32 camera responses
      checkCameraStatus();

      // Double tap detection
      bool doubleTap1 = doubleTapped(sensorValue1, dt1);
      bool doubleTap2 = doubleTapped(sensorValue2, dt2);
      bool doubleTap3 = doubleTapped(sensorValue3, dt3);

      // Example: Skip song on double tap of sensor 1+3
      if (doubleTap1 && doubleTap3) {
        fsrCharacteristic.writeValue("SKIP");
        Serial.println("Sent SKIP song command (double tap)");
        delay(500);
      }
      // Example: Double tap on sensor 1 triggers a different command
      else if (doubleTap1) {
        fsrCharacteristic.writeValue("VOL_DOWN");
        Serial.println("Sent Volume Down command");
        delay(500);
      }
      else if (doubleTap3) {
        if (sensor3paused) {
          fsrCharacteristic.writeValue("PLAY");
          Serial.println("Sent PLAY command");
          sensor3paused = false;
          delay(500);
        }
        else {
          fsrCharacteristic.writeValue("PAUSE");
          Serial.println("Sent PAUSE command");
          sensor3paused = true;
          delay(500);
        }
      }
      else if (sensorValue2 > threshold) {
        fsrCharacteristic.writeValue("VOL_UP");
        Serial.println("Sent Volume Up command");
        delay(500);
      }
      
      // NEW: Camera trigger on sensor 1 press (single press)
      if (sensorValue1 > threshold && !dt1.lastPressed) {
        takePhoto();
        delay(500);
      }

      delay(10);
    }
    Serial.println("Disconnected");
  }
} 