import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export interface RazorpaySuccessPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutModalProps {
  visible: boolean;
  keyId: string;
  orderId: string;
  amountPaise: number;
  title?: string;
  description?: string;
  prefill?: {
    name?: string;
    contact?: string;
    method?: 'upi' | 'card' | 'netbanking';
  };
  onSuccess: (payload: RazorpaySuccessPayload) => void;
  onCancel: () => void;
  onFailure?: (message: string) => void;
}

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  visible,
  keyId,
  orderId,
  amountPaise,
  title = 'MyQuro Delivery Settlement',
  description = 'Floating Cash Deposit',
  prefill,
  onSuccess,
  onCancel,
  onFailure,
}) => {
  const insets = useSafeAreaInsets();
  const [webLoading, setWebLoading] = useState(true);

  const checkoutHtml = useMemo(() => {
    const serialized = JSON.stringify({
      key: keyId,
      amount: Math.round(amountPaise),
      currency: 'INR',
      name: title,
      description,
      order_id: orderId,
      prefill: {
        name: prefill?.name || 'MyQuro Rider',
        contact: prefill?.contact || '',
        ...(prefill?.method ? { method: prefill.method } : {}),
      },
      theme: { color: '#F2CA50' },
      modal: { confirm_close: true, escape: true },
    });

    return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
      html, body {
        margin: 0; padding: 0; background: #0E0C0A; color: #FFFFFF;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        height: 100%; display: flex; align-items: center; justify-content: center;
      }
      .wrap { text-align: center; padding: 24px; }
      .title { font-size: 16px; font-weight: 700; color: #F2CA50; margin-bottom: 8px; }
      .sub { font-size: 13px; color: #9CA3AF; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="title">Opening Razorpay Settlement...</div>
      <div class="sub">Please complete your payment securely.</div>
    </div>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <script>
      (function () {
        function send(payload) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        }
        try {
          if (typeof Razorpay === 'undefined') {
            send({ status: 'failed', message: 'Failed to load Razorpay Checkout script.' });
            return;
          }
          var opts = ${serialized};
          opts.handler = function (response) {
            send({
              status: 'success',
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id || opts.order_id,
              razorpay_signature: response.razorpay_signature
            });
          };
          opts.modal = opts.modal || {};
          opts.modal.ondismiss = function () { send({ status: 'cancelled' }); };
          var rzp = new Razorpay(opts);
          rzp.on('payment.failed', function (resp) {
            var errMsg = (resp && resp.error && (resp.error.description || resp.error.reason)) || 'Payment failed';
            send({ status: 'failed', message: errMsg });
          });
          rzp.open();
        } catch (err) {
          send({ status: 'failed', message: (err && err.message) || 'Checkout error' });
        }
      })();
    </script>
  </body>
</html>`;
  }, [keyId, orderId, amountPaise, title, description, prefill?.name, prefill?.contact, prefill?.method]);

  const handleMessage = (event: any) => {
    try {
      const payload = JSON.parse(event?.nativeEvent?.data || '{}');
      if (payload.status === 'success' && payload.razorpay_payment_id && payload.razorpay_signature) {
        onSuccess({
          razorpay_order_id: payload.razorpay_order_id || orderId,
          razorpay_payment_id: payload.razorpay_payment_id,
          razorpay_signature: payload.razorpay_signature,
        });
      } else if (payload.status === 'cancelled') {
        onCancel();
      } else if (payload.status === 'failed') {
        if (onFailure) onFailure(payload.message || 'Payment failed');
        else onCancel();
      }
    } catch {}
  };

  const handleShouldStartLoad = (req: any): boolean => {
    const url = String(req?.url || '');
    if (
      url.startsWith('upi://') ||
      url.startsWith('tez://') ||
      url.startsWith('phonepe://') ||
      url.startsWith('paytmmp://') ||
      url.startsWith('bhim://')
    ) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    return true;
  };

  if (!visible || !keyId || !orderId) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancel}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top > 0 ? insets.top : Platform.OS === 'ios' ? 44 : 12 },
        ]}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0E0C0A" />
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <Ionicons name="shield-checkmark" size={18} color="#22C55E" />
            <Text style={styles.headerTitle}>Razorpay Secure Pay • ₹{(amountPaise / 100).toFixed(2)}</Text>
          </View>
          <TouchableOpacity onPress={onCancel} style={styles.closeBtn} activeOpacity={0.8}>
            <Ionicons name="close" size={20} color="#F2CA50" />
          </TouchableOpacity>
        </View>

        <View style={styles.webWrap}>
          {webLoading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color="#F2CA50" />
              <Text style={styles.loaderText}>Connecting to Razorpay...</Text>
            </View>
          )}
          <WebView
            originWhitelist={['*']}
            source={{ html: checkoutHtml, baseUrl: 'https://checkout.razorpay.com' }}
            onLoadEnd={() => setWebLoading(false)}
            onMessage={handleMessage}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            setSupportMultipleWindows={false}
            style={styles.webview}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0C0A' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#26231F',
    backgroundColor: '#141210',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  closeBtn: { padding: 6, borderRadius: 16, backgroundColor: '#26231F' },
  webWrap: { flex: 1, backgroundColor: '#0E0C0A' },
  webview: { flex: 1, backgroundColor: '#0E0C0A' },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0E0C0A',
    zIndex: 10,
  },
  loaderText: { color: '#D1D5DB', marginTop: 12, fontSize: 13 },
});
