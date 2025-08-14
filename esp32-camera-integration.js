import React from 'react';
import { Alert, Platform } from 'react-native';

// ESP32S3 Sense Camera Integration
class ESP32CameraController {
  constructor() {
    this.isConnected = false;
    this.cameraStatus = 'Not Connected';
    this.lastPhoto = null;
  }

  // Handle camera commands from ESP32
  async handleCameraCommand(command, data) {
    switch (command) {
      case 'CAMERA_PHOTO_TAKEN':
        console.log('Photo taken by ESP32 camera');
        this.cameraStatus = 'Photo Captured';
        // You can add photo display logic here
        Alert.alert('ESP32 Camera', 'Photo captured successfully!');
        break;
        
      case 'CAMERA_ERROR':
        console.error('Camera error:', data);
        this.cameraStatus = 'Camera Error';
        Alert.alert('Camera Error', data || 'Failed to capture photo');
        break;
        
      case 'CAMERA_READY':
        console.log('ESP32 camera ready');
        this.cameraStatus = 'Camera Ready';
        break;
        
      default:
        console.log('Unknown camera command:', command);
    }
  }

  // Get current camera status
  getStatus() {
    return this.cameraStatus;
  }

  // Reset camera status
  resetStatus() {
    this.cameraStatus = 'Not Connected';
  }
}

// Arduino command handler for ESP32 camera integration
const handleESP32CameraCommand = async (command, esp32Controller) => {
  if (command.includes('CAMERA_PHOTO_TAKEN')) {
    await esp32Controller.handleCameraCommand('CAMERA_PHOTO_TAKEN');
  } else if (command.includes('CAMERA_ERROR')) {
    const errorMsg = command.replace('CAMERA_ERROR:', '').trim();
    await esp32Controller.handleCameraCommand('CAMERA_ERROR', errorMsg);
  } else if (command.includes('CAMERA_READY')) {
    await esp32Controller.handleCameraCommand('CAMERA_READY');
  }
};

export { ESP32CameraController, handleESP32CameraCommand }; 