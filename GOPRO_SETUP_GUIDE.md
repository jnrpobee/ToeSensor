# GoPro Hero 11 Black Mini Integration Guide

## Overview
This guide shows how to integrate your GoPro Hero 11 Black Mini with your Arduino sensor system and React Native phone app.

## Setup Steps

### 1. GoPro WiFi Setup
1. **Enable WiFi on GoPro:**
   - Turn on your GoPro Hero 11 Black Mini
   - Go to Settings → Connections → WiFi → Turn On
   - Note the WiFi password displayed on screen

2. **Connect Phone to GoPro WiFi:**
   - On your phone, go to WiFi settings
   - Connect to the GoPro WiFi network (usually named "GP12345678")
   - Enter the password shown on your GoPro

### 2. Arduino Integration
1. **Add the provided Arduino code** (`arduino-gopro-integration.ino`) to your existing Arduino project
2. **Define your sensor pins:**
   ```cpp
   #define SENSOR_PIN A0  // Your sensor input pin
   #define SENSOR_THRESHOLD 500  // Your trigger threshold
   #define GOPRO_BUTTON_PIN 2  // Optional button pin
   ```
3. **Call the integration functions:**
   ```cpp
   void setup() {
     // Your existing setup code
     setupGoProIntegration();
   }
   
   void loop() {
     // Your existing loop code
     loopGoProIntegration();
   }
   ```

### 3. Phone App Integration
1. **The GoPro integration code** (`gopro-integration.js`) has been added to your project
2. **Your main App.js** has been updated to handle GoPro commands
3. **The app will now respond to these BLE commands:**
   - `GOPRO_VIDEO` - Start/stop video recording (toggle each BLE command)
   - `GOPRO_CONNECT` - Connects to GoPro WiFi

## How It Works

### Flow:
1. **Sensor Input** → Arduino detects sensor trigger
2. **BLE Command** → Arduino sends `GOPRO_VIDEO` via BLE
3. **Phone App** → Receives command (phone should be on GoPro Wi-Fi for API calls)
4. **GoPro API** → Phone app starts or stops recording on the GoPro
5. **Clip saved** → GoPro writes video to the SD card when recording stops

### Commands Your Arduino Can Send:
- `GOPRO_VIDEO` - Toggles recording (start on first trigger, stop on second)
- `GOPRO_CONNECT` - Manually connect to GoPro (optional button)

## Testing

### Test Arduino → Phone Communication:
1. Upload the Arduino code
2. Open your phone app
3. Connect to Arduino via BLE
4. Trigger your sensor or press the GoPro button
5. Check the app logs for "GoPro record toggle command received"

### Test GoPro Connection:
1. Ensure GoPro WiFi is enabled
2. Connect phone to GoPro WiFi network
3. In the app, the GoPro status should show "Connected"

## Troubleshooting

### Common Issues:

1. **GoPro not connecting:**
   - Ensure GoPro WiFi is enabled
   - Check that phone is connected to GoPro WiFi network
   - Verify GoPro IP address (default: 10.5.5.9)

2. **Arduino not sending commands:**
   - Check BLE connection status
   - Verify sensor wiring and thresholds
   - Check Serial Monitor for debug messages

3. **Video not starting/stopping:**
   - Ensure the phone is on the GoPro Wi-Fi network when recording
   - Check GoPro battery level
   - Verify SD card has space

## Advanced Features

### Downloading Photos:
The integration includes functions to:
- List photos from GoPro
- Download photos to phone
- Display photos in the app

### Custom Commands:
You can add more GoPro commands by:
1. Adding new command strings to Arduino code
2. Adding command handlers in the phone app
3. Implementing additional GoPro API calls

## Hardware Requirements

### Arduino Setup:
- Arduino board (Uno, Nano, etc.)
- BLE module (HM-10, nRF52, etc.)
- Your sensor (FSR, pressure sensor, etc.)
- Optional: Button for manual trigger

### Phone Requirements:
- React Native app (already implemented)
- WiFi capability
- Camera permissions (for photo display)

## API Reference

### GoPro WiFi API Endpoints:
- `GET /gp/gpControl/info` - Get camera info
- `GET /gp/gpControl/command/mode?p=0` - Video mode
- `GET /gp/gpControl/command/shutter?p=1` - Start recording
- `GET /gp/gpControl/command/shutter?p=0` - Stop recording
- `GET /gp/gpControl/execute?p1=gpMediaList` - List media files

### BLE Commands:
- `GOPRO_VIDEO` - Toggle video recording (start / stop)
- `GOPRO_CONNECT` - Connect to GoPro WiFi

## Next Steps

1. **Test the basic integration** with your sensor
2. **Add photo display** to show captured images
3. **Implement photo download** functionality
4. **Add video recording** capabilities
5. **Create custom triggers** for different sensor conditions

## Support

If you encounter issues:
1. Check the Serial Monitor for Arduino debug messages
2. Check the React Native console for app debug messages
3. Verify all connections and permissions
4. Test each component individually before integration 