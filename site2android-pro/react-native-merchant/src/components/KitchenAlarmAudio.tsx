import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { soundService } from '../utils/soundService';

const CHIME_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script>
    let audioCtx = null;
    let alarmTimer = null;

    function initAudio() {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      } catch (e) {}
    }

    function playKitchenChime() {
      try {
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        // 3-tone high pitch kitchen order bell
        // Tone 1: 1046.5 Hz (C6), Tone 2: 1318.5 Hz (E6), Tone 3: 1760 Hz (A6)
        const notes = [
          { f: 1046.5, s: 0.00, d: 0.22 },
          { f: 1318.5, s: 0.16, d: 0.28 },
          { f: 1760.0, s: 0.32, d: 0.65 }
        ];

        notes.forEach(note => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(note.f, now + note.s);
          
          gain.gain.setValueAtTime(0.85, now + note.s);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.s + note.d);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(now + note.s);
          osc.stop(now + note.s + note.d);
        });
      } catch (err) {
        console.error('Audio chime error:', err);
      }
    }

    function handleCommand(msg) {
      if (msg === 'START_ALARM') {
        playKitchenChime();
        if (alarmTimer) clearInterval(alarmTimer);
        alarmTimer = setInterval(playKitchenChime, 1800);
      } else if (msg === 'STOP_ALARM') {
        if (alarmTimer) clearInterval(alarmTimer);
        alarmTimer = null;
      } else if (msg === 'PLAY_ONCE') {
        playKitchenChime();
      }
    }

    document.addEventListener('message', function(event) {
      handleCommand(event.data);
    });
    window.addEventListener('message', function(event) {
      handleCommand(event.data);
    });

    window.addEventListener('touchstart', function() {
      initAudio();
    }, { once: true });
    window.addEventListener('click', function() {
      initAudio();
    }, { once: true });
  </script>
</head>
<body style="margin:0;padding:0;background:transparent;"></body>
</html>
`;

export default function KitchenAlarmAudio() {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    soundService.registerBridge((command) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(command);
      }
    });

    return () => {
      soundService.unregisterBridge();
    };
  }, []);

  return (
    <View style={styles.hiddenContainer} pointerEvents="none">
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: CHIME_HTML }}
        style={styles.hiddenWebView}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenContainer: {
    width: 0,
    height: 0,
    position: 'absolute',
    opacity: 0,
  },
  hiddenWebView: {
    width: 1,
    height: 1,
    opacity: 0,
  },
});
