import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { StyleSheet, View, Modal, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { FIREBASE_CONFIG } from '../config';

export interface FirebasePhoneAuthRef {
  sendOtp: (phoneNumber: string) => Promise<string>;
  verifyOtp: (code: string) => Promise<string>;
}

export const FirebaseRecaptcha = forwardRef<FirebasePhoneAuthRef, {}>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [sendResolver, setSendResolver] = useState<{ resolve: (verificationId: string) => void; reject: (err: any) => void } | null>(null);
  const [verifyResolver, setVerifyResolver] = useState<{ resolve: (idToken: string) => void; reject: (err: any) => void } | null>(null);
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const pendingPhoneRef = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    sendOtp: (phoneNumber: string) => {
      return new Promise<string>((resolve, reject) => {
        setSendResolver({ resolve, reject });
        pendingPhoneRef.current = phoneNumber;
        setVisible(true);

        // If webview is already loaded, trigger immediately
        if (isReady && webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            if (window.sendPhoneOtp) {
              window.sendPhoneOtp(${JSON.stringify(phoneNumber)});
            }
            true;
          `);
        }
      });
    },
    verifyOtp: (code: string) => {
      return new Promise<string>((resolve, reject) => {
        setVerifyResolver({ resolve, reject });
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            if (window.confirmOtpCode) {
              window.confirmOtpCode(${JSON.stringify(code)});
            }
            true;
          `);
        } else {
          reject(new Error("Firebase verification bridge is not active."));
        }
      });
    },
  }));

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
        <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
        <style>
          * { box-sizing: border-box; }
          body {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            background-color: #12141a;
            color: #d4af37;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            text-align: center;
          }
          #recaptcha-container {
            display: flex;
            justify-content: center;
            margin: 10px auto;
          }
          .status {
            font-size: 14px;
            color: #a0a5b5;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div id="recaptcha-container"></div>
        <div id="status-text" class="status">Initializing secure verification...</div>

        <script>
          const postMsg = (obj) => {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify(obj));
            }
          };

          try {
            const firebaseConfig = ${JSON.stringify(FIREBASE_CONFIG)};
            if (!firebase.apps.length) {
              firebase.initializeApp(firebaseConfig);
            }

            window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
              size: 'invisible',
              callback: function(response) {
                console.log("reCAPTCHA solved");
              },
              'expired-callback': function() {
                postMsg({ type: 'EXPIRED' });
              }
            });

            window.recaptchaVerifier.render().then(function() {
              document.getElementById('status-text').innerText = "Verification ready";
              postMsg({ type: 'READY' });
            }).catch(function(err) {
              postMsg({ type: 'READY' });
            });

            window.sendPhoneOtp = function(phoneNumber) {
              document.getElementById('status-text').innerText = "Sending SMS code to " + phoneNumber + "...";
              
              if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                  size: 'invisible'
                });
              }

              firebase.auth().signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)
                .then(function(confirmationResult) {
                  window.confirmationResult = confirmationResult;
                  document.getElementById('status-text').innerText = "SMS sent successfully!";
                  postMsg({
                    type: 'CODE_SENT',
                    verificationId: confirmationResult.verificationId
                  });
                })
                .catch(function(error) {
                  console.error("signInWithPhoneNumber error:", error);
                  document.getElementById('status-text').innerText = "Error: " + error.message;
                  postMsg({
                    type: 'SEND_ERROR',
                    message: error.message
                  });
                });
            };

            window.confirmOtpCode = function(code) {
              document.getElementById('status-text').innerText = "Verifying code...";
              if (!window.confirmationResult) {
                postMsg({ type: 'VERIFY_ERROR', message: "Session expired. Please request a new OTP." });
                return;
              }

              window.confirmationResult.confirm(code)
                .then(function(result) {
                  return result.user.getIdToken();
                })
                .then(function(idToken) {
                  document.getElementById('status-text').innerText = "Verified successfully!";
                  postMsg({
                    type: 'VERIFY_SUCCESS',
                    idToken: idToken
                  });
                })
                .catch(function(error) {
                  console.error("confirm error:", error);
                  postMsg({
                    type: 'VERIFY_ERROR',
                    message: error.message
                  });
                });
            };

          } catch (initErr) {
            console.error("Init error:", initErr);
            postMsg({ type: 'INIT_ERROR', message: initErr.message });
          }
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'READY') {
        setIsReady(true);
        if (pendingPhoneRef.current && webViewRef.current) {
          const phone = pendingPhoneRef.current;
          pendingPhoneRef.current = null;
          webViewRef.current.injectJavaScript(`
            if (window.sendPhoneOtp) {
              window.sendPhoneOtp(${JSON.stringify(phone)});
            }
            true;
          `);
        }
      } else if (data.type === 'CODE_SENT') {
        setVisible(false);
        if (sendResolver) {
          sendResolver.resolve(data.verificationId || "firebase_session");
          setSendResolver(null);
        }
      } else if (data.type === 'SEND_ERROR') {
        setVisible(false);
        if (sendResolver) {
          sendResolver.reject(new Error(data.message || "Failed to send SMS code"));
          setSendResolver(null);
        }
      } else if (data.type === 'VERIFY_SUCCESS') {
        if (verifyResolver) {
          verifyResolver.resolve(data.idToken);
          setVerifyResolver(null);
        }
      } else if (data.type === 'VERIFY_ERROR') {
        if (verifyResolver) {
          verifyResolver.reject(new Error(data.message || "Invalid verification code"));
          setVerifyResolver(null);
        }
      }
    } catch (e) {
      console.error("Error parsing recaptcha message:", e);
    }
  };

  const RNWebView = WebView as any;

  return (
    <View style={visible ? styles.hiddenContainer : styles.offscreen}>
      <RNWebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{
          html: htmlContent,
          baseUrl: `https://${FIREBASE_CONFIG.authDomain || 'myquro-89e0b.firebaseapp.com'}`,
        }}
        onMessage={handleMessage}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.01,
    overflow: 'hidden',
  },
  offscreen: {
    position: 'absolute',
    bottom: -1000,
    left: -1000,
    width: 1,
    height: 1,
    opacity: 0,
  },
  webView: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
