import { Alert } from 'react-native';

// GoPro WiFi API Integration
class GoProController {
  constructor() {
    this.goproIP = '10.5.5.9'; // Default GoPro IP when in WiFi mode
    this.baseURL = `http://${this.goproIP}:8080`;
    this.isConnected = false;
    /** 'open' = Hero 9+ / Open GoPro HTTP; 'legacy' = older gpControl */
    this.apiMode = 'open';
    /** Tracks whether we believe video is recording (Hero 11 Mini: start/stop via BLE toggles). */
    this.isRecording = false;
  }

  // Connect to GoPro WiFi (detect API style)
  async connectToGoPro() {
    try {
      console.log('Probing GoPro at', this.baseURL);

      let response = await fetch(`${this.baseURL}/gopro/camera/state`);
      if (response.ok) {
        this.isConnected = true;
        this.apiMode = 'open';
        console.log('GoPro reachable (Open GoPro API)');
        return true;
      }

      response = await fetch(`${this.baseURL}/gp/gpControl/info`);
      if (response.ok) {
        this.isConnected = true;
        this.apiMode = 'legacy';
        console.log('GoPro reachable (legacy gpControl)');
        return true;
      }

      this.isConnected = false;
      return false;
    } catch (error) {
      console.error('Failed to connect to GoPro:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * First call: video mode + start recording. Second call: stop recording.
   * BLE can keep sending the same command (e.g. GOPRO_VIDEO).
   */
  async toggleVideoRecording() {
    if (!this.isConnected) {
      const connected = await this.connectToGoPro();
      if (!connected) {
        return false;
      }
    }

    try {
      if (this.apiMode === 'open') {
        if (!this.isRecording) {
          await fetch(
            `${this.baseURL}/gopro/camera/presets/set_group?id=1000`,
          );
          const start = await fetch(
            `${this.baseURL}/gopro/camera/shutter/start`,
          );
          if (start.ok) {
            this.isRecording = true;
            console.log('GoPro recording started (Open GoPro)');
            return true;
          }
          console.error('Open GoPro shutter/start failed', start.status);
          return false;
        }
        const stop = await fetch(
          `${this.baseURL}/gopro/camera/shutter/stop`,
        );
        if (stop.ok) {
          this.isRecording = false;
          console.log('GoPro recording stopped (Open GoPro)');
          return true;
        }
        console.error('Open GoPro shutter/stop failed', stop.status);
        return false;
      }

      if (!this.isRecording) {
        await fetch(`${this.baseURL}/gp/gpControl/command/mode?p=0`);
        const start = await fetch(
          `${this.baseURL}/gp/gpControl/command/shutter?p=1`,
        );
        if (start.ok) {
          this.isRecording = true;
          console.log('GoPro recording started (legacy)');
          return true;
        }
        console.error('Legacy start failed', start.status);
        return false;
      }
      const stop = await fetch(
        `${this.baseURL}/gp/gpControl/command/shutter?p=0`,
      );
      if (stop.ok) {
        this.isRecording = false;
        console.log('GoPro recording stopped (legacy)');
        return true;
      }
      console.error('Legacy stop failed', stop.status);
      return false;
    } catch (error) {
      console.error('Error toggling video recording:', error);
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
const handleGoProCommand = async (command, goproController, setGoproStatus) => {
  const setStatus = status => {
    if (typeof setGoproStatus === 'function') {
      setGoproStatus(status);
    }
  };

  switch (command) {
    case 'GOPRO_VIDEO':
      console.log('GoPro video toggle command...');
      setStatus(
        goproController.isRecording
          ? 'Stopping recording...'
          : 'Starting recording...',
      );
      const success = await goproController.toggleVideoRecording();
      setStatus(
        !goproController.isConnected
          ? 'Not connected'
          : goproController.isRecording
            ? 'Recording'
            : 'Connected',
      );
      if (success) {
        Alert.alert(
          'GoPro',
          goproController.isRecording
            ? 'Recording started.'
            : 'Recording stopped.',
        );
      } else {
        Alert.alert('GoPro', 'Could not start or stop recording.');
      }
      break;

    case 'GOPRO_CONNECT':
      console.log('Connecting to GoPro...');
      setStatus('Connecting...');
      const connected = await goproController.connectToGoPro();
      setStatus(connected ? 'Connected' : 'Not connected');
      if (connected) {
        Alert.alert('GoPro', 'Connected to GoPro!');
      } else {
        Alert.alert(
          'GoPro',
          'Could not reach the camera. Join the GoPro Wi-Fi network and try again.',
        );
      }
      break;

    default:
      console.log('Unknown GoPro command:', command);
  }
};

export { GoProController, handleGoProCommand }; 