import React from 'react';
import { Alert, Platform } from 'react-native';

// GoPro WiFi API Integration
class GoProController {
  constructor() {
    this.goproIP = '10.5.5.9'; // Default GoPro IP when in WiFi mode
    this.baseURL = `http://${this.goproIP}:8080`;
    this.isConnected = false;
  }

  // Connect to GoPro WiFi
  async connectToGoPro() {
    try {
      // First, you need to connect to GoPro's WiFi network
      // This requires the user to manually connect to GoPro's WiFi
      console.log('Please connect to GoPro WiFi network');
      
      // Test connection
      const response = await fetch(`${this.baseURL}/gp/gpControl/info`);
      if (response.ok) {
        this.isConnected = true;
        console.log('Connected to GoPro');
        return true;
      }
    } catch (error) {
      console.error('Failed to connect to GoPro:', error);
      Alert.alert('GoPro Connection', 'Please ensure GoPro WiFi is enabled and connected');
      return false;
    }
  }

  // Take a photo
  async takePhoto() {
    if (!this.isConnected) {
      const connected = await this.connectToGoPro();
      if (!connected) return false;
    }

    try {
      // Set camera to photo mode
      await fetch(`${this.baseURL}/gp/gpControl/setting/10/1`);
      
      // Take photo
      const response = await fetch(`${this.baseURL}/gp/gpControl/command/mode?p=1`);
      
      if (response.ok) {
        console.log('Photo taken successfully');
        return true;
      } else {
        console.error('Failed to take photo');
        return false;
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      return false;
    }
  }

  // Get list of photos from GoPro
  async getPhotos() {
    if (!this.isConnected) {
      const connected = await this.connectToGoPro();
      if (!connected) return [];
    }

    try {
      const response = await fetch(`${this.baseURL}/gp/gpControl/execute?p1=gpMediaList`);
      const data = await response.json();
      return data.fs || [];
    } catch (error) {
      console.error('Error getting photos:', error);
      return [];
    }
  }

  // Download a specific photo
  async downloadPhoto(filename) {
    if (!this.isConnected) {
      const connected = await this.connectToGoPro();
      if (!connected) return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/videos/DCIM/100GOPRO/${filename}`);
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Error downloading photo:', error);
      return null;
    }
  }
}

// Arduino command handler for GoPro integration
const handleGoProCommand = async (command, goproController) => {
  switch (command) {
    case 'GOPRO_PHOTO':
      console.log('Taking GoPro photo...');
      const success = await goproController.takePhoto();
      if (success) {
        Alert.alert('GoPro', 'Photo taken successfully!');
      } else {
        Alert.alert('GoPro', 'Failed to take photo');
      }
      break;
      
    case 'GOPRO_CONNECT':
      console.log('Connecting to GoPro...');
      const connected = await goproController.connectToGoPro();
      if (connected) {
        Alert.alert('GoPro', 'Connected to GoPro!');
      }
      break;
      
    default:
      console.log('Unknown GoPro command:', command);
  }
};

export { GoProController, handleGoProCommand }; 