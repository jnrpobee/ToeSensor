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
  NativeModules,
} from 'react-native';
import {BleManager} from 'react-native-ble-plx';
import SystemSetting from 'react-native-system-setting';
import {GoProController, handleGoProCommand} from './gopro-integration';

const {MediaControlModule, OpenWifi} = NativeModules;

const bleManager = new BleManager();

// 16-bit UUIDs as full Bluetooth base UUID (Android matching is more reliable).
const toFullUuid16 = short =>
  `0000${String(short).toLowerCase()}-0000-1000-8000-00805f9b34fb`;
const ARDUINO_SERVICE_UUID = toFullUuid16('180a');
const ARDUINO_CHARACTERISTIC_UUID = toFullUuid16('2a57');

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decode react-native-ble-plx Base64 without Hermes atob() (padding/strictness bugs on RN 0.71). */
const bleBase64ToCommandString = base64String => {
  if (!base64String) {
    return '';
  }
  try {
    let b64 = String(base64String).replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (b64.length % 4)) % 4;
    b64 += '='.repeat(padLen);

    const bytes = [];
    for (let i = 0; i < b64.length; i += 4) {
      const c1 = b64[i];
      const c2 = b64[i + 1];
      const c3 = b64[i + 2];
      const c4 = b64[i + 3];
      if (c1 === '=' || c1 === undefined) {
        break;
      }
      const n1 = BASE64_ALPHABET.indexOf(c1);
      const n2 = c2 === '=' || c2 === undefined ? 0 : BASE64_ALPHABET.indexOf(c2);
      const n3 = c3 === '=' || c3 === undefined ? 0 : BASE64_ALPHABET.indexOf(c3);
      const n4 = c4 === '=' || c4 === undefined ? 0 : BASE64_ALPHABET.indexOf(c4);
      if (n1 < 0 || n2 < 0 || n3 < 0 || n4 < 0) {
        break;
      }
      const triple = (n1 << 18) | (n2 << 12) | (n3 << 6) | n4;
      if (c2 !== '=') {
        bytes.push((triple >> 16) & 0xff);
      }
      if (c3 !== '=') {
        bytes.push((triple >> 8) & 0xff);
      }
      if (c4 !== '=') {
        bytes.push(triple & 0xff);
      }
    }

    let out = '';
    for (let j = 0; j < bytes.length; j++) {
      if (bytes[j] !== 0) {
        out += String.fromCharCode(bytes[j]);
      }
    }
    const cleaned = out.trim();
    console.log('BLE decoded command:', JSON.stringify(cleaned));
    return cleaned;
  } catch (error) {
    console.error('BLE base64 decode error:', error, base64String);
    return '';
  }
};

const App = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState('Disconnected');
  const [currentVolume, setCurrentVolume] = useState(0);
  const [goproController] = useState(new GoProController());
  const [goproStatus, setGoproStatus] = useState('Not connected');
  const [goproConnectBusy, setGoproConnectBusy] = useState(false);

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

    // Function to control playback using native media control. Includes play, pause, and skip.
    const controlAudio = async (action) => {
      try {
        if (Platform.OS === 'android') {
          if (action === 'play' || action === 'pause' || action === 'skip') {
            console.log(`${action} command received - sending media key event`);
            await MediaControlModule.sendMediaKeyEvent(action);
            console.log('Media key event sent successfully');
          }
        } else {
          // iOS: Not supported without custom native code
          Alert.alert('Not supported on iOS');
        }
      } catch (err) {
        console.error('Audio control error:', err);
        Alert.alert('Media Control Error', err.message);
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
          const value = bleBase64ToCommandString(characteristic.value);
          console.log('Final decoded value:', value);

          if (value.includes('GOPRO_VIDEO')) {
            console.log('GoPro record toggle command received');
            await handleGoProCommand(
              'GOPRO_VIDEO',
              goproController,
              setGoproStatus,
            );
          } else if (value.includes('GOPRO_CONNECT')) {
            console.log('GoPro connect command received');
            await handleGoProCommand(
              'GOPRO_CONNECT',
              goproController,
              setGoproStatus,
            );
          } else if (value.includes('VOL_UP')) {
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
          else if (value.includes('SKIP')) {
            console.log('Skip command received');
            await controlAudio('skip');
          }
        }
      }
    );
  };

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

  const runGoProConnectTest = async () => {
    if (goproConnectBusy) {
      return;
    }
    setGoproConnectBusy(true);
    try {
      await handleGoProCommand(
        'GOPRO_CONNECT',
        goproController,
        setGoproStatus,
      );
    } finally {
      setGoproConnectBusy(false);
    }
  };

  const connectToGoProManual = () => {
    if (goproConnectBusy) {
      return;
    }

    if (Platform.OS === 'android' && OpenWifi?.openWifiSettings) {
      Alert.alert(
        'GoPro Wi-Fi',
        'Tap Open Wi-Fi to pick your GoPro network. When you return here, tap Test connection to verify the camera is reachable.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Open Wi-Fi',
            onPress: () => {
              try {
                OpenWifi.openWifiSettings();
              } catch (e) {
                console.warn('openWifiSettings failed', e);
              }
            },
          },
          {text: 'Test connection', onPress: () => runGoProConnectTest()},
        ],
      );
      return;
    }

    Alert.alert(
      'GoPro Wi-Fi',
      'iOS does not allow apps to open Wi-Fi settings for you. Open Settings → Wi-Fi, join your GoPro network, then tap Test connection.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Test connection', onPress: () => runGoProConnectTest()},
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>BLE Controller</Text>
        <Text style={styles.status}>Status: {deviceStatus}</Text>
        <Text style={styles.volume}>
          Volume: {Math.round(currentVolume * 100)}%
        </Text>
        <Text style={styles.status}>
          GoPro: {goproStatus}
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
        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonGoPro,
            goproConnectBusy && styles.buttonDisabled,
          ]}
          onPress={connectToGoProManual}
          disabled={goproConnectBusy}>
          <Text style={styles.buttonText}>
            {goproConnectBusy ? 'Connecting...' : 'Connect to GoPro'}
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
  buttonGoPro: {
    backgroundColor: '#5856D6',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default App;
