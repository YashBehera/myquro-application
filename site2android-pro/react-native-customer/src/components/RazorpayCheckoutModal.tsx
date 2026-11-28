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
import { X, ShieldCheck } from 'lucide-react-native';
import { BACKEND_URL } from '../config';

export interface RazorpaySuccessPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function createRazorpayOrderOnBackend(params: {
  amountPaise: number;
  paymentMethod?: string;
  receipt: string;
  sessionToken?: string;
  notes?: Record<string, string>;
}): Promise<{ keyId: string; orderId: string; amountPaise: number }> {
  const safePaise = Math.max(100, Math.round(params.amountPaise));
  const resp = await fetch(`${BACKEND_URL}/api/payments/razorpay/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(params.sessionToken ? { Authorization: `Bearer ${params.sessionToken}` } : {}),
    },
    body: JSON.stringify({
      amountPaise: safePaise,
      paymentMethod: params.paymentMethod || 'UPI',
      receipt: params.receipt,
      notes: params.notes || {},
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.keyId || !data?.orderId) {
    if (resp.status === 404) {
      throw new Error(
        `Payment API (HTTP 404) is not deployed on ${BACKEND_URL} yet. Deploy the updated backend to Render or set EXPO_PUBLIC_BACKEND_URL to your local backend.`
      );
    }
    throw new Error(
      data?.message || `Payment gateway returned HTTP ${resp.status} from ${BACKEND_URL}.`
    );
  }
  return {
    keyId: String(data.keyId),
    orderId: String(data.orderId),
    amountPaise: Number(data.amount || safePaise),
  };
}

interface RazorpayCheckoutModalProps {
  visible: boolean;
  keyId: string;
  orderId: string;
  amountPaise: number;
  currency?: string;
  title?: string;
  description?: string;
  prefill?: {
    name?: string;
    contact?: string;
    email?: string;
    method?: 'upi' | 'card' | 'netbanking' | 'wallet';
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
  currency = 'INR',
  title = 'MyQuro',
  description = 'Order Payment',
  prefill,
  onSuccess,
  onCancel,
  onFailure,
}) => {
  const insets = useSafeAreaInsets();
  const [webLoading, setWebLoading] = useState(true);

  const checkoutHtml = useMemo(() => {
    const options = {
      key: keyId,
      amount: Math.round(amountPaise),
      currency,
      name: title,
      description,
      order_id: orderId,
      prefill: {
        name: prefill?.name || 'MyQuro Customer',
        contact: prefill?.contact || '',
        email: prefill?.email || '',
        ...(prefill?.method ? { method: prefill.method } : {}),
      },
      theme: {
        color: '#DEA430',
      },
      modal: {
        confirm_close: true,
        escape: true,
      },
    };

    const serializedOptions = JSON.stringify(options);

    return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #0B0B0B;
        color: #FFFFFF;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .wrap {
        text-align: center;
        padding: 24px;
      }
      .title {
        font-size: 16px;
        font-weight: 700;
        color: #DEA430;
        margin-bottom: 8px;
      }
      .sub {
        font-size: 13px;
        color: #9CA3AF;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="title">Opening Secure Razorpay Checkout...</div>
      <div class="sub">Please wait while we connect to Razorpay.</div>
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
            send({ status: 'failed', message: 'Failed to load Razorpay Checkout script. Please check internet connectivity.' });
            return;
          }
          var opts = ${serializedOptions};
          opts.handler = function (response) {
            send({
              status: 'success',
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id || opts.order_id,
              razorpay_signature: response.razorpay_signature
            });
          };
          opts.modal = opts.modal || {};
          opts.modal.ondismiss = function () {
            send({ status: 'cancelled' });
          };
          var rzp = new Razorpay(opts);
          rzp.on('payment.failed', function (resp) {
            var errMsg = (resp && resp.error && (resp.error.description || resp.error.reason)) || 'Payment failed';
            send({ status: 'failed', message: errMsg });
          });
          rzp.open();
        } catch (err) {
          send({ status: 'failed', message: (err && err.message) || 'Razorpay checkout error' });
        }
      })();
    </script>
  </body>
</html>`;
  }, [keyId, orderId, amountPaise, currency, title, description, prefill?.name, prefill?.contact, prefill?.email, prefill?.method]);

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
        if (onFailure) {
          onFailure(payload.message || 'Payment failed');
        } else {
          onCancel();
        }
      }
    } catch {
      // Ignore malformed messages
    }
  };

  const handleShouldStartLoad = (req: any): boolean => {
    const url = String(req?.url || '');
    if (
      url.startsWith('upi://') ||
      url.startsWith('tez://') ||
      url.startsWith('phonepe://') ||
      url.startsWith('paytmmp://') ||
      url.startsWith('bhim://') ||
      url.startsWith('credpay://')
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
        <StatusBar barStyle="light-content" backgroundColor="#0B0B0B" />
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <ShieldCheck size={18} color="#22C55E" />
            <Text style={styles.headerTitle}>Razorpay Secure Pay • ₹{(amountPaise / 100).toFixed(2)}</Text>
          </View>
          <TouchableOpacity onPress={onCancel} style={styles.closeBtn} activeOpacity={0.8}>
            <X size={20} color="#DEA430" />
          </TouchableOpacity>
        </View>

        <View style={styles.webWrap}>
          {webLoading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color="#DEA430" />
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
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    backgroundColor: '#121212',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#1F2937',
  },
  webWrap: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0B0B',
    zIndex: 10,
  },
  loaderText: {
    color: '#D1D5DB',
    marginTop: 12,
    fontSize: 13,
  },
});
