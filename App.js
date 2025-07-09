import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import {BleManager} from 'react-native-ble-plx';
import SystemSetting from 'react-native-system-setting';

const bleManager = new BleManager();
const ARDUINO_SERVICE_UUID = '180A';
const ARDUINO_CHARACTERISTIC_UUID = '2A57';

// Function to decode base64 to text
const base64ToAscii = base64String => {
  try {
    console.log('Original base64 string:', base64String);

    // Lookup table for base64
    const lookup =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    // Remove padding and non-base64 characters
    const cleanBase64 = base64String.replace(/=+$/, '');

    // Convert to binary
    let binary = '';
    for (let i = 0; i < cleanBase64.length; i++) {
      let byte = lookup.indexOf(cleanBase64[i]).toString(2);
      // Pad each byte to 6 bits
      byte = '0'.repeat(6 - byte.length) + byte;
      binary += byte;
    }

    // Convert binary to ASCII
    let ascii = '';
    for (let i = 0; i < binary.length; i += 8) {
      const byte = binary.substr(i, 8);
      if (byte.length === 8) {
        const charCode = parseInt(byte, 2);
        // Only include printable ASCII characters
        if (charCode >= 32 && charCode <= 126) {
          ascii += String.fromCharCode(charCode);
        }
      }
    }

    console.log('Decoded string:', ascii);
    return ascii;
  } catch (error) {
    console.error('Base64 decode error:', error);
    return '';
  }
};

const App = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState('Disconnected');
  const [currentVolume, setCurrentVolume] = useState(0);

  useEffect(() => {
    const subscription = bleManager.onStateChange(state => {
      if (state === 'PoweredOn') {
        requestPermissions();
      }
    }, true);

    // Initialize volume
    SystemSetting.getVolume().then(volume => {
      console.log('Initial volume:', volume);
      setCurrentVolume(volume);
    });

    return () => {
      subscription.remove();
      if (connectedDevice) {
        connectedDevice.cancelConnection();
      }
      bleManager.destroy();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      return Object.values(granted).every(
        permission => permission === PermissionsAndroid.RESULTS.GRANTED,
      );
    }
    return true;
  };

  const scanAndConnect = () => {
    setIsScanning(true);
    setDeviceStatus('Scanning...');

    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Scanning error:', error);
        setDeviceStatus('Scan Error: ' + error.message);
        setIsScanning(false);
        return;
      }

      console.log('Found device:', device?.name);

      if (device?.name === 'Arduino_FSR') {
        bleManager.stopDeviceScan();
        connectToDevice(device);
      }
    });

    // Stop scanning after 10 seconds
    setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
      if (!connectedDevice) {
        setDeviceStatus('Device not found');
      }
    }, 10000);
  };

  const connectToDevice = async device => {
    try {
      const connectedDevice = await device.connect();
      setConnectedDevice(connectedDevice);
      setDeviceStatus('Connected to ' + device.name);

      await connectedDevice.discoverAllServicesAndCharacteristics();
      startStreamingData(connectedDevice);
    } catch (error) {
      console.error('Connection error:', error);
      setDeviceStatus('Connection Failed: ' + error.message);
      Alert.alert('Connection Error', error.message);
    }
  };

    // Function to adjust volume or control playback based on the third input
    const controlAudio = async (action) => {
      try {
        if (action === 'play') {
          await SystemSetting.play();
          console.log('Music playback started');
        } else if (action === 'pause') {
          await SystemSetting.pause();
          console.log('Music playback paused');
        } 
      } catch (err) {
        console.error('Audio control error:', err);
      }
    };

  const adjustVolume = async direction => {
    try {
      const volume = await SystemSetting.getVolume();
      console.log('Current volume before adjustment:', volume);

      let newVolume;
      if (direction === 'up') {
        newVolume = Math.min(volume + 0.1, 1.0);
        console.log('Increasing volume to:', newVolume);
      } else if (direction === 'down') {
        newVolume = Math.max(volume - 0.1, 0.0);
        console.log('Decreasing volume to:', newVolume);
      }

      await SystemSetting.setVolume(newVolume);
      setCurrentVolume(newVolume);
      console.log('Volume set to:', newVolume);
    } catch (err) {
      console.error('Volume adjustment error:', err);
    }
  };

  // function to execute the commands received from the Arduino 
  const startStreamingData = device => {
    device.monitorCharacteristicForService(
      ARDUINO_SERVICE_UUID,
      ARDUINO_CHARACTERISTIC_UUID,
      async (error, characteristic) => {
        if (error) {
          console.error('Monitoring error:', error);
          return;
        }

        if (characteristic?.value) {
          console.log('\n--- New BLE Data Received ---');
          console.log('Raw characteristic value:', characteristic.value);
          const value = base64ToAscii(characteristic.value);
          console.log('Final decoded value:', value);

          if (value.includes('VOL_UP')) {
            console.log('Volume up command received');
            await adjustVolume('up');
          } else if (value.includes('VOL_DOWN') || value.includes('VOL_DO')) {
            console.log('Volume down command received');
            await adjustVolume('down');
          }
          else if (value.includes('PLAY')) {
            console.log('Play command received');
            await controlAudio('play');
          }
          else if (value.includes('PAUSE')) {
            console.log('Pause command received');
            await controlAudio('pause');
          }
        }
      }
    );

  const disconnect = async () => {
    if (connectedDevice) {
      try {
        await connectedDevice.cancelConnection();
        setConnectedDevice(null);
        setDeviceStatus('Disconnected');
      } catch (error) {
        console.error('Disconnect error:', error);
        setDeviceStatus('Disconnect Failed: ' + error.message);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>BLE Controller</Text>
        <Text style={styles.status}>Status: {deviceStatus}</Text>
        <Text style={styles.volume}>
          Volume: {Math.round(currentVolume * 100)}%
        </Text>
        <TouchableOpacity
          style={[styles.button, isScanning && styles.buttonDisabled]}
          onPress={connectedDevice ? disconnect : scanAndConnect}
          disabled={isScanning}>
          <Text style={styles.buttonText}>
            {isScanning
              ? 'Scanning...'
              : connectedDevice
              ? 'Disconnect'
              : 'Scan and Connect'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  status: {
    fontSize: 18,
    marginBottom: 10,
    color: '#333',
  },
  volume: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    width: 200,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
};

export default App;
