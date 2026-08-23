import React, { useState, useEffect } from 'react';
import { Modal, StatusBar } from 'react-native';
import { OrderPaymentLoaderScreen } from './OrderPaymentLoaderScreen';
import { OrderSendingLoaderScreen } from './OrderSendingLoaderScreen';
import { OrderAcceptanceLoaderScreen } from './OrderAcceptanceLoaderScreen';
import { OrderConfirmationScreen } from './OrderConfirmationScreen';

interface OrderLoaderScreenProps {
  visible: boolean;
  amount: number;
  onComplete: () => void;
  onTrackDelivery: () => void;
  onBrowse: () => void;
  onReorder: () => void;
  onShare: () => void;
  orderId: string;
  restaurantName: string;
  deliveryAddress: string;
  paymentMethod: string;
}

export const OrderLoaderScreen: React.FC<OrderLoaderScreenProps> = ({
  visible,
  amount,
  onComplete,
  onTrackDelivery,
  onBrowse,
  onReorder,
  onShare,
  orderId,
  restaurantName,
  deliveryAddress,
  paymentMethod,
}) => {
  const [phase, setPhase] = useState<'payment' | 'sending' | 'acceptance' | 'confirmation'>('payment');

  useEffect(() => {
    if (visible) {
      setPhase('payment');
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FBFBFD" translucent={false} />
      
      {phase === 'payment' && (
        <OrderPaymentLoaderScreen
          visible={visible}
          amount={amount}
          orderId={orderId}
          onComplete={() => setPhase('sending')}
        />
      )}
      {phase === 'sending' && (
        <OrderSendingLoaderScreen
          visible={visible}
          onComplete={() => setPhase('confirmation')}
        />
      )}
      {phase === 'acceptance' && (
        <OrderAcceptanceLoaderScreen
          visible={visible}
          orderId={orderId}
          onComplete={() => setPhase('confirmation')}
        />
      )}
      {phase === 'confirmation' && (
        <OrderConfirmationScreen
          visible={visible}
          onClose={onComplete}
          onTrackDelivery={onTrackDelivery}
          onBrowse={onBrowse}
          onReorder={onReorder}
          onShare={onShare}
          orderAmount={amount}
          orderId={orderId}
          restaurantName={restaurantName}
          deliveryAddress={deliveryAddress}
          paymentMethod={paymentMethod}
        />
      )}
    </Modal>
  );
};

export default OrderLoaderScreen;
