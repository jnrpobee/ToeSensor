/*
 * ESP32S3 Sense Camera Integration for Arduino
 * This code integrates with your existing Arduino project
 * to trigger camera capture when sensors are activated
 */

// ESP32 Camera Commands (send via BLE to phone)
const char* CAMERA_PHOTO_TAKEN = "CAMERA_PHOTO_TAKEN";
const char* CAMERA_ERROR = "CAMERA_ERROR";
const char* CAMERA_READY = "CAMERA_READY";

// Add this function to your existing Arduino code
void sendCameraCommand(const char* command) {
  if (pCharacteristic != nullptr) {
    pCharacteristic->setValue((uint8_t*)command, strlen(command));
    pCharacteristic->notify();
    Serial.print("Sent camera command: ");
    Serial.println(command);
  }
}

// Add this to your sensor input handling code
void handleCameraSensorInput() {
  // Your existing sensor reading code here
  int sensorValue = analogRead(SENSOR_PIN); // Replace with your actual sensor pin
  
  // Example: If sensor value exceeds threshold, trigger camera
  if (sensorValue > SENSOR_THRESHOLD) {
    Serial.println("Sensor triggered - ESP32 camera should take photo");
    sendCameraCommand(CAMERA_PHOTO_TAKEN);
    
    // Optional: Add delay to prevent multiple triggers
    delay(1000);
  }
}

// Add this to your setup() function
void setupCameraIntegration() {
  // Initialize any camera-specific pins or settings
  Serial.println("ESP32 Camera integration initialized");
  
  // Send camera ready status
  sendCameraCommand(CAMERA_READY);
}

// Add this to your main loop() function
void loopCameraIntegration() {
  // Check for sensor input and send camera commands
  handleCameraSensorInput();
  
  // Optional: Add a button to manually trigger camera
  if (digitalRead(CAMERA_BUTTON_PIN) == HIGH) { // Replace with your actual button pin
    Serial.println("Camera button pressed");
    sendCameraCommand(CAMERA_PHOTO_TAKEN);
    delay(500); // Debounce
  }
}

/*
 * Integration Instructions:
 * 
 * 1. Add the above code to your existing Arduino project
 * 2. Replace SENSOR_PIN with your actual sensor input pin
 * 3. Replace SENSOR_THRESHOLD with your desired trigger threshold
 * 4. Replace CAMERA_BUTTON_PIN with your actual button pin (optional)
 * 5. Call setupCameraIntegration() in your setup() function
 * 6. Call loopCameraIntegration() in your loop() function
 * 
 * Example integration:
 * 
 * #define SENSOR_PIN A0
 * #define SENSOR_THRESHOLD 500
 * #define CAMERA_BUTTON_PIN 2
 * 
 * void setup() {
 *   // Your existing setup code
 *   setupCameraIntegration();
 * }
 * 
 * void loop() {
 *   // Your existing loop code
 *   loopCameraIntegration();
 * }
 * 
 * ESP32S3 Sense Setup:
 * 
 * 1. Connect your ESP32S3 Sense to your Arduino via UART or I2C
 * 2. ESP32S3 will handle the actual camera capture
 * 3. When sensor triggers, Arduino sends command to ESP32S3
 * 4. ESP32S3 takes photo and stores it
 * 5. ESP32S3 sends confirmation back to Arduino
 * 6. Arduino forwards status to phone via BLE
 */ 