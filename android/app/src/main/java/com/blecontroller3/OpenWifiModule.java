package com.blecontroller3;

import android.content.Intent;
import android.provider.Settings;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

/**
 * Opens the system Wi-Fi settings so the user can join the GoPro hotspot.
 * Apps cannot join arbitrary networks without user action (Android 10+).
 */
public class OpenWifiModule extends ReactContextBaseJavaModule {

    public OpenWifiModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "OpenWifi";
    }

    @ReactMethod
    public void openWifiSettings() {
        Intent intent = new Intent(Settings.ACTION_WIFI_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getReactApplicationContext().startActivity(intent);
    }
}
