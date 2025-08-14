# ESP32S3 Sense Camera Integration Guide

## Overview
This guide shows how to integrate your Seeed XIAO ESP32S3 Sense camera with your Arduino sensor system and React Native phone app. When your sensor is triggered, the ESP32S3 will automatically take a photo.

## Hardware Setup

### Components Needed:
1. **Seeed XIAO ESP32S3 Sense** - Main camera board
2. **Your existing Arduino** - With BLE module
3. **Micro SD Card** - For storing photos
4. **Jumper wires** - For UART communication
5. **Your sensor** - FSR, pressure sensor, etc.

### Wiring Diagram:
```
Arduino          ESP32S3 Sense
TX (Pin 1)  →   RX (GPIO 18)
RX (Pin 0)  ←   TX (GPIO 17)
GND         →   GND
```

## Software Setup

### 1. ESP32S3 Sense Code
1. **Install ESP32 board support** in Arduino IDE
2. **Upload** `esp32s3-camera-main.ino` to your ESP32S3 Sense
3. **Insert micro SD card** into ESP32S3 Sense

### 2. Arduino Integration
1. **Add the code** from `esp32-camera-arduino.ino` to your existing Arduino project
2. **Define your sensor pins:**
   ```cpp
   #define SENSOR_PIN A0  // Your sensor input pin
   #define SENSOR_THRESHOLD 500  // Your trigger threshold
   #define CAMERA_BUTTON_PIN 2  // Optional button pin
   ```
3. **Call the integration functions:**
   ```cpp
   void setup() {
     // Your existing setup code
     setupCameraIntegration();
   }
   
   void loop() {
     // Your existing loop code
     loopCameraIntegration();
   }
   ```

### 3. Phone App Integration
1. **The ESP32 camera integration** has been added to your app
2. **Your App.js** now handles camera commands
3. **The app will show camera status** and respond to commands

## How It Works

### Complete Flow:
1. **Sensor Input** → Arduino detects sensor trigger
2. **Arduino → ESP32S3** → Sends "TAKE_PHOTO" via UART
3. **ESP32S3 Camera** → Captures photo and saves to SD card
4. **ESP32S3 → Arduino** → Sends "CAMERA_PHOTO_TAKEN" confirmation
5. **Arduino → Phone** → Forwards status via BLE
6. **Phone App** → Shows "Photo Captured" status

### Commands:
- **From Arduino to ESP32S3:**
  - `TAKE_PHOTO` - Triggers photo capture
  
- **From ESP32S3 to Arduino:**
  - `CAMERA_READY` - Camera is ready
  - `CAMERA_PHOTO_TAKEN` - Photo captured successfully
  - `CAMERA_ERROR:Description` - Error occurred

## Phone App Interface

### New Display Elements:
```
┌─────────────────────────────┐
│        BLE Controller       │
├─────────────────────────────┤
│                             │
│  Status: Connected to       │
│          Arduino_FSR        │
│                             │
│  Volume: 75%                │
│                             │
│  ESP32 Camera: Photo        │
│          Captured           │
│                             │
│    [    Disconnect    ]     │
│                             │
└─────────────────────────────┘
```

### Camera Status Messages:
- **"Not Connected"** - Initial state
- **"Camera Ready"** - ESP32S3 camera initialized
- **"Photo Captured"** - Photo taken successfully
- **"Camera Error"** - Error occurred

## Testing

### Test Arduino → ESP32S3 Communication:
1. Upload both Arduino and ESP32S3 codes
2. Open Serial Monitor for both boards
3. Trigger your sensor
4. Check ESP32S3 Serial Monitor for "TAKE_PHOTO" command
5. Verify photo is saved to SD card

### Test Complete System:
1. Connect Arduino to phone via BLE
2. Trigger your sensor
3. Check phone app for "Photo Captured" status
4. Verify photo file exists on ESP32S3 SD card

## Troubleshooting

### Common Issues:

1. **ESP32S3 not responding:**
   - Check UART wiring (TX→RX, RX→TX)
   - Verify baud rate (115200)
   - Check Serial Monitor connections

2. **Camera not initializing:**
   - Ensure micro SD card is inserted
   - Check camera pin definitions
   - Verify ESP32S3 board selection

3. **Photos not being taken:**
   - Check sensor wiring and thresholds
   - Verify UART communication
   - Check SD card space

4. **Phone app not showing status:**
   - Verify BLE connection
   - Check Arduino command sending
   - Review app console logs

## Advanced Features

### Photo Management:
- Photos are automatically numbered (`photo_0.jpg`, `photo_1.jpg`, etc.)
- Stored on micro SD card in ESP32S3 Sense
- Can be accessed by removing SD card

### Custom Triggers:
You can add more camera commands by:
1. Adding new command strings to Arduino code
2. Adding command handlers in ESP32S3 code
3. Implementing additional camera functions

### Photo Quality Settings:
Modify in `esp32s3-camera-main.ino`:
```cpp
config.frame_size = FRAMESIZE_UXGA;  // Photo resolution
config.jpeg_quality = 12;            // JPEG quality (0-63, lower = better)
```

## Hardware Requirements

### ESP32S3 Sense:
- Built-in OV2640 camera sensor
- Micro SD card slot
- UART communication pins
- 8MB PSRAM for image processing

### Arduino Setup:
- Arduino board (Uno, Nano, etc.)
- BLE module (HM-10, nRF52, etc.)
- Your sensor (FSR, pressure sensor, etc.)
- UART communication capability

### Phone Requirements:
- React Native app (already implemented)
- BLE capability
- Camera permissions (for future photo display)

## Next Steps

1. **Test the basic integration** with your sensor
2. **Add photo display** to show captured images in the app
3. **Implement photo download** from ESP32S3 to phone
4. **Add video recording** capabilities
5. **Create custom triggers** for different sensor conditions
6. **Add photo gallery** functionality

## Benefits Over GoPro Integration

### Advantages:
- **Direct integration** - No WiFi setup required
- **Lower cost** - ESP32S3 Sense is more affordable
- **Faster response** - Direct UART communication
- **Offline operation** - Works without internet
- **Customizable** - Full control over camera settings

### Use Cases:
- **Research applications** - Automatic data collection
- **Security systems** - Motion-triggered capture
- **Quality control** - Sensor-triggered inspection
- **Documentation** - Automatic process recording

## Support

If you encounter issues:
1. Check Serial Monitor for both Arduino and ESP32S3
2. Check the React Native console for app debug messages
3. Verify all connections and permissions
4. Test each component individually before integration
5. Ensure proper power supply for both boards 