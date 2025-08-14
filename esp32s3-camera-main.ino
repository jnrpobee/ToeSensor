/*
 * ESP32S3 Sense Camera Main Code
 * This code runs on the ESP32S3 Sense board
 * It handles camera capture and communicates with Arduino
 */

#include "esp_camera.h"
#include "FS.h"
#include "SD_MMC.h"
#include "SPI.h"

// ESP32S3 Sense Camera Pins
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     10
#define SIOD_GPIO_NUM     40
#define SIOC_GPIO_NUM     39

#define Y9_GPIO_NUM       48
#define Y8_GPIO_NUM       11
#define Y7_GPIO_NUM       12
#define Y6_GPIO_NUM       14
#define Y5_GPIO_NUM       16
#define Y4_GPIO_NUM       18
#define Y3_GPIO_NUM       17
#define Y2_GPIO_NUM       15

#define VSYNC_GPIO_NUM    38
#define HREF_GPIO_NUM     47
#define PCLK_GPIO_NUM     13

// Communication with Arduino (UART)
#define ARDUINO_RX 18
#define ARDUINO_TX 17

// Camera configuration
camera_config_t config;

// Photo counter
int photoCounter = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32S3 Sense Camera Starting...");
  
  // Initialize SD card
  if (!SD_MMC.begin("/sdcard", true)) {
    Serial.println("SD Card Mount Failed");
    return;
  }
  
  // Configure camera
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.frame_size = FRAMESIZE_UXGA;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 12;
  config.fb_count = 1;
  
  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
  
  Serial.println("Camera initialized successfully");
  
  // Send ready status to Arduino
  Serial.println("CAMERA_READY");
}

void loop() {
  // Check for commands from Arduino
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "TAKE_PHOTO") {
      takePhoto();
    } else if (command == "GET_STATUS") {
      Serial.println("CAMERA_READY");
    }
  }
  
  delay(100);
}

void takePhoto() {
  Serial.println("Taking photo...");
  
  // Capture photo
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    Serial.println("CAMERA_ERROR:Capture failed");
    return;
  }
  
  // Generate filename
  String filename = "/photo_" + String(photoCounter) + ".jpg";
  
  // Save to SD card
  File file = SD_MMC.open(filename, FILE_WRITE);
  if (!file) {
    Serial.println("Failed to open file for writing");
    esp_camera_fb_return(fb);
    Serial.println("CAMERA_ERROR:File write failed");
    return;
  }
  
  file.write(fb->buf, fb->len);
  file.close();
  
  // Return frame buffer
  esp_camera_fb_return(fb);
  
  // Increment counter
  photoCounter++;
  
  Serial.println("Photo saved: " + filename);
  Serial.println("CAMERA_PHOTO_TAKEN");
}

/*
 * Arduino Communication Protocol:
 * 
 * Commands from Arduino:
 * - "TAKE_PHOTO" - Triggers photo capture
 * - "GET_STATUS" - Requests camera status
 * 
 * Responses to Arduino:
 * - "CAMERA_READY" - Camera is ready
 * - "CAMERA_PHOTO_TAKEN" - Photo captured successfully
 * - "CAMERA_ERROR:Description" - Error occurred
 * 
 * Wiring:
 * - Connect Arduino TX to ESP32S3 RX (GPIO 18)
 * - Connect Arduino RX to ESP32S3 TX (GPIO 17)
 * - Connect Arduino GND to ESP32S3 GND
 * 
 * Usage:
 * 1. Upload this code to ESP32S3 Sense
 * 2. Connect ESP32S3 to Arduino via UART
 * 3. Arduino sends "TAKE_PHOTO" when sensor triggers
 * 4. ESP32S3 captures photo and saves to SD card
 * 5. ESP32S3 sends confirmation back to Arduino
 * 6. Arduino forwards status to phone via BLE
 */ 