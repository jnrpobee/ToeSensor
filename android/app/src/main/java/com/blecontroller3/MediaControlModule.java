package com.blecontroller3;

import android.content.Context;
import android.media.AudioManager;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.view.KeyEvent;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class MediaControlModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private AudioManager audioManager;

    public MediaControlModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.audioManager = (AudioManager) reactContext.getSystemService(Context.AUDIO_SERVICE);
    }

    @Override
    public String getName() {
        return "MediaControlModule";
    }

    @ReactMethod
    public void sendMediaKeyEvent(String action, Promise promise) {
        try {
            int keyCode;
            if ("play".equals(action) || "pause".equals(action)) {
                keyCode = KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE;
            } else if ("play".equals(action)) {
                keyCode = KeyEvent.KEYCODE_MEDIA_PLAY;
            } else if ("pause".equals(action)) {
                keyCode = KeyEvent.KEYCODE_MEDIA_PAUSE;
            } else if ("skip".equals(action)){
                keyCode = KeyEvent.KEYCODE_MEDIA_NEXT;
            } else {
                promise.reject("INVALID_ACTION", "Invalid action: " + action);
                return;
            }

            // Send the media key event
            KeyEvent downEvent = new KeyEvent(KeyEvent.ACTION_DOWN, keyCode);
            KeyEvent upEvent = new KeyEvent(KeyEvent.ACTION_UP, keyCode);
            
            audioManager.dispatchMediaKeyEvent(downEvent);
            audioManager.dispatchMediaKeyEvent(upEvent);
            
            promise.resolve("Media key event sent: " + action);
        } catch (Exception e) {
            promise.reject("MEDIA_CONTROL_ERROR", "Failed to send media key event: " + e.getMessage());
        }
    }
} 