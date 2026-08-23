/**
 * Main Application Entrance for React Native.
 * Connects OAuth/viewModel states, handles onboarding stage,
 * and builds a custom bottom navigation menu designed from Material 3 values.
 *
 * Original Java/Kotlin Path:
 * - /app/src/main/java/com/example/MainActivity.kt
 */

import React, { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  useFonts,
  Urbanist_400Regular,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
  Urbanist_800ExtraBold,
  Urbanist_900Black,
} from '@expo-google-fonts/urbanist';
import { ViewModelProvider, useViewModel } from './src/state/MainViewModel';
import { THEME, COLORS } from './src/theme/Theme';

// Screen Imports
import { SplashScreen } from './src/screens/SplashScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { FavouritesScreen } from './src/screens/FavouritesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { RestaurantDetailScreen } from './src/screens/RestaurantDetailScreen';
import { CartScreen } from './src/screens/CartScreen';
import { CheckoutScreen, SimCartItem } from './src/screens/CheckoutScreen';
import { DiningOutScreen } from './src/screens/DiningOutScreen';
import { TrackingScreen } from './src/screens/TrackingScreen';
import { ReorderScreen } from './src/screens/ReorderScreen';

import {
  ShoppingBag,
  ChevronRight,
  X,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ScreenId = 'home' | 'explore' | 'favourites' | 'profile' | 'login' | 'search' | 'restaurant-detail' | 'cart' | 'checkout' | 'dining' | 'tracking' | 'reorder';

// Direct Figma Bottom Nav Assets
const navFoodImg     = require('./src/assets/home/figma/imgImage7.png');
const navBoltImg     = require('./src/assets/home/figma/imgImage6.png');
const navStoreImg    = require('./src/assets/home/figma/imgImage5.png');
const navEatRightImg = require('./src/assets/home/figma/imgImage2.png');
const navReorderImg  = require('./src/assets/home/figma/imgImage1.png');



const MainAppContent: React.FC = () => {
  const { isDarkMode, authState, cartItems, allRestaurants, syncCartItems } = useViewModel();
  const theme = isDarkMode ? THEME.dark : THEME.light;

  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [activeScreen, setActiveScreen] = useState<ScreenId>('home');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [prevScreen, setPrevScreen] = useState<ScreenId>('home');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [autoOpenCheckout, setAutoOpenCheckout] = useState(false);
  const [checkoutCart, setCheckoutCart] = useState<SimCartItem[]>([]);
  const [checkoutRestaurantId, setCheckoutRestaurantId] = useState<string | null>(null);

  const navigateToRestaurant = (id: string, orderId?: string | null, openCheckout?: boolean) => {
    if (activeScreen !== 'restaurant-detail') {
      setPrevScreen(activeScreen);
    }
    setSelectedRestaurantId(id);
    if (orderId) {
      setActiveOrderId(orderId);
    } else {
      setActiveOrderId(null);
    }
    setAutoOpenCheckout(!!openCheckout);
    setActiveScreen('restaurant-detail');
  };

  const navigateToCheckout = (cartData?: SimCartItem[], rId?: string) => {
    if (activeScreen !== 'checkout') {
      setPrevScreen(activeScreen);
    }
    if (cartData) setCheckoutCart(cartData);
    if (rId) setCheckoutRestaurantId(rId);
    setActiveScreen('checkout');
  };

  const navigateToTracking = (orderId: string) => {
    setActiveOrderId(orderId);
    setActiveScreen('tracking');
  };

  if (showSplash) {
    return <SplashScreen onAnimationEnd={() => setShowSplash(false)} />;
  }

  if (showOnboarding) {
    return <OnboardingScreen onFinished={() => setShowOnboarding(false)} />;
  }

  if (authState.type !== 'Authenticated') {
    return <LoginScreen onBack={() => setActiveScreen('home')} />;
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case 'login':
        return <LoginScreen onBack={() => setActiveScreen('home')} />;
      case 'home':
        return (
          <HomeScreen
            onNavigateToExplore={() => setActiveScreen('explore')}
            onNavigateToFavourites={() => setActiveScreen('favourites')}
            onNavigateToProfile={() => setActiveScreen('profile')}
            onNavigateToSearch={() => setActiveScreen('search')}
            onNavigateToRestaurant={navigateToRestaurant}
            onNavigateToCart={() => setActiveScreen('cart')}
            onNavigateToDining={() => {
              setPrevScreen('home');
              setSelectedRestaurantId(null);
              setActiveScreen('dining');
            }}
          />
        );
      case 'explore':
        return (
          <ExploreScreen
            onNavigateToDining={(restaurantId) => {
              setPrevScreen('explore');
              setSelectedRestaurantId(restaurantId);
              setActiveScreen('dining');
            }}
          />
        );
      case 'favourites':
        return (
          <FavouritesScreen
            onNavigateToExplore={() => setActiveScreen('explore')}
            onNavigateToRestaurant={navigateToRestaurant}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            onBackToHome={() => setActiveScreen('home')}
            onNavigateToTracking={(orderId) => {
              setActiveOrderId(orderId);
              setActiveScreen('tracking');
            }}
          />
        );
      case 'search':
        return <SearchScreen onBack={() => setActiveScreen('home')} onNavigateToRestaurant={navigateToRestaurant} />;
      case 'restaurant-detail':
        return (
          <RestaurantDetailScreen
            restaurantId={selectedRestaurantId}
            onBack={() => {
              setActiveOrderId(null);
              setAutoOpenCheckout(false);
              const target = (prevScreen && prevScreen !== 'restaurant-detail') ? prevScreen : 'home';
              setActiveScreen(target);
            }}
            initialActiveOrderId={activeOrderId}
            initialAutoOpenCheckout={autoOpenCheckout}
            onNavigateToTracking={navigateToTracking}
            onNavigateToCheckout={navigateToCheckout}
          />
        );
      case 'checkout':
        const activeRestId = checkoutRestaurantId || selectedRestaurantId || (cartItems && cartItems.length > 0 ? cartItems[0].restaurantId : null);
        const currentRest = allRestaurants.find(r => r.id === activeRestId);
        return (
          <CheckoutScreen
            cart={checkoutCart.length > 0 ? checkoutCart : (cartItems as any)}
            setCart={setCheckoutCart}
            restaurantId={activeRestId || undefined}
            restaurantName={currentRest?.name || (cartItems && cartItems.length > 0 ? cartItems[0].restaurantName : 'Restaurant')}
            restaurantDistance={currentRest?.distance ? `${currentRest.distance} km` : '2.0 km'}
            onBack={() => setActiveScreen(prevScreen || 'restaurant-detail')}
            onConfirmPay={(finalTotal, orderId) => {
              if (orderId) {
                setActiveOrderId(orderId);
                setActiveScreen('tracking');
              } else {
                setActiveScreen('home');
              }
            }}
          />
        );
      case 'cart':
        return (
          <CartScreen
            onBack={() => setActiveScreen(prevScreen)}
            onNavigateToRestaurant={navigateToRestaurant}
            onNavigateToTracking={navigateToTracking}
          />
        );
      case 'tracking':
        return (
          <TrackingScreen
            orderId={activeOrderId}
            onBack={() => setActiveScreen('home')}
          />
        );
      case 'reorder':
        return (
          <ReorderScreen
            onNavigateToRestaurant={navigateToRestaurant}
            onNavigateToCheckout={navigateToCheckout}
            onNavigateToHome={() => setActiveScreen('home')}
            onNavigateToProfile={() => setActiveScreen('profile')}
            onNavigateToSearch={() => setActiveScreen('search')}
          />
        );
      case 'dining':
        return (
          <DiningOutScreen
            onBack={() => setActiveScreen(prevScreen)}
            onNavigateToRestaurant={navigateToRestaurant}
            initialRestaurantId={selectedRestaurantId}
            onNavigateToHome={() => setActiveScreen('home')}
            onNavigateToSearch={() => setActiveScreen('search')}
            onNavigateToProfile={() => setActiveScreen('profile')}
            onNavigateToDelivery={() => setActiveScreen('home')}
            onNavigateToPickup={() => setActiveScreen('home')}
          />
        );
      default:
        return (
          <HomeScreen
            onNavigateToExplore={() => setActiveScreen('explore')}
            onNavigateToFavourites={() => setActiveScreen('favourites')}
            onNavigateToProfile={() => setActiveScreen('profile')}
            onNavigateToSearch={() => setActiveScreen('search')}
            onNavigateToRestaurant={navigateToRestaurant}
            onNavigateToCart={() => setActiveScreen('cart')}
            onNavigateToDining={() => {
              setPrevScreen('home');
              setSelectedRestaurantId(null);
              setActiveScreen('dining');
            }}
          />
        );
    }
  };

  return (
    <SafeAreaView
      style={[styles.mainContainer, { backgroundColor: '#000000' }]}
      edges={activeScreen === 'tracking' ? [] : ['top', 'left', 'right']}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={activeScreen === 'tracking' ? 'transparent' : '#000000'}
        translucent={activeScreen === 'tracking'}
      />

      {/* Screen Viewport with Crossfade simulator */}
      <View style={styles.viewport}>{renderScreen()}</View>

      {/* ── FIGMA BOTTOM NAV BAR ── (node 3019:296–316) */}
      {activeScreen !== 'restaurant-detail' && activeScreen !== 'checkout' && activeScreen !== 'cart' && activeScreen !== 'search' && activeScreen !== 'dining' && activeScreen !== 'tracking' && activeScreen !== 'profile' && (
        <View style={styles.bottomNavBar}>
          {/* Food */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => setActiveScreen('home')}
          >
            <Image source={navFoodImg} style={styles.navIconFood} />
            <Text style={[styles.navLabel, activeScreen === 'home' && styles.navLabelActive]}>Food</Text>
          </TouchableOpacity>

          {/* Bolt */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => setActiveScreen('explore')}
          >
            <Image source={navBoltImg} style={styles.navIconBolt} />
            <Text style={[styles.navLabel, activeScreen === 'explore' && styles.navLabelActive]}>Bolt</Text>
          </TouchableOpacity>

          {/* Reorder */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => setActiveScreen('reorder')}
          >
            <Image
              source={navReorderImg}
              style={[
                styles.navIconReorder,
                activeScreen === 'reorder' && { tintColor: '#D4AF37' },
              ]}
            />
            <Text style={[styles.navLabel, activeScreen === 'reorder' && styles.navLabelActive]}>Reorder</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Cart Summary Bar with Upsell Banner on Top */}
      {cartItems.length > 0 && activeScreen !== 'checkout' && activeScreen !== 'cart' && activeScreen !== 'login' && activeScreen !== 'dining' && activeScreen !== 'profile' && (
        <View style={[styles.fcWrapper, { bottom: activeScreen === 'restaurant-detail' || activeScreen === 'search' ? 24 : 98 }]}>
          {/* Upsell discount banner directly on top */}
          {(() => {
            const cartTotalPrice = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
            const remainingForFlat300 = Math.max(0, 500 - cartTotalPrice);
            return (
              <View style={styles.fcUpsellCard}>
                <View style={styles.fcDiscountBadge}>
                  <Text style={styles.fcDiscountBadgePercent}>%</Text>
                </View>
                <View style={styles.fcUpsellTextWrap}>
                  {remainingForFlat300 > 0 ? (
                    <>
                      <Text style={styles.fcUpsellTextLine1}>
                        Add items worth <Text style={styles.fcUpsellGoldHighlight}>₹{remainingForFlat300}</Text> to save ₹300
                      </Text>
                      <Text style={styles.fcUpsellTextLine2}>Use code FLAT300 at checkout</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.fcUpsellTextLine1}>
                        <Text style={styles.fcUpsellGoldHighlight}>🎉 ₹300 savings unlocked!</Text>
                      </Text>
                      <Text style={styles.fcUpsellTextLine2}>Apply code FLAT300 at checkout</Text>
                    </>
                  )}
                </View>
              </View>
            );
          })()}

          {/* Global Floating View Cart Bar */}
          <View style={styles.fcContainer}>
            <TouchableOpacity
              style={styles.fcTouchable}
              onPress={() => {
                const restId = cartItems[0]?.restaurantId || selectedRestaurantId;
                navigateToCheckout(
                  cartItems.map((c) => ({
                    foodItem: {
                      id: c.id,
                      name: c.name,
                      price: c.price,
                      rating: 4.8,
                      ratingCount: 120,
                      category: 'Dishes',
                      isVeg: c.isVeg,
                      isEatRight: false,
                      image: c.image,
                      description: c.description,
                    },
                    quantity: c.quantity,
                    variantId: c.variantId,
                    customization: c.customization || undefined,
                  })),
                  restId || undefined
                );
              }}
              activeOpacity={0.9}
            >
              {(() => {
                 const currentRestro = allRestaurants.find(r => r.id === cartItems[0]?.restaurantId) || allRestaurants.find(r => r.id === selectedRestaurantId);
                 const restroName = currentRestro?.name || cartItems[0]?.restaurantName || 'Restaurant';
                 const restroImg = currentRestro?.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80';
                 const totalQty = cartItems.reduce((acc, i) => acc + i.quantity, 0);
                 const cartTotalPrice = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                 return (
                   <>
                     <Image source={{ uri: restroImg }} style={styles.fcImage} />
                     
                     <View style={styles.fcTextCol}>
                       <Text style={styles.fcTitle} numberOfLines={1}>{restroName}</Text>
                       <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <Text style={styles.fcSubtitle}>View Cart</Text>
                         <ChevronRight size={14} color="rgba(255,255,255,0.84)" />
                       </View>
                     </View>
                     
                     <View style={styles.fcRightWrap}>
                       <View style={styles.fcCartBtn}>
                         <Text style={styles.fcCartBtnText}>View Cart</Text>
                         <Text style={styles.fcCartBtnSubText}>{totalQty} {totalQty === 1 ? 'item' : 'items'} • ₹{cartTotalPrice}</Text>
                       </View>
                       
                       <TouchableOpacity
                         style={styles.fcCloseBtn}
                         onPress={(e) => {
                           e.stopPropagation();
                           syncCartItems([]);
                         }}
                       >
                         <X size={20} color="rgba(255,255,255,0.6)" />
                       </TouchableOpacity>
                     </View>
                   </>
                 );
              })()}
            </TouchableOpacity>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    'Urbanist-Regular': require('./src/assets/fonts/Urbanist-Regular.ttf'),
    'Urbanist-SemiBold': require('./src/assets/fonts/Urbanist-SemiBold.ttf'),
    'Urbanist-Bold': require('./src/assets/fonts/Urbanist-Bold.ttf'),
    'Urbanist-ExtraBold': require('./src/assets/fonts/Urbanist-ExtraBold.ttf'),
    'Urbanist-Medium': Urbanist_500Medium,
    'Urbanist-Black': Urbanist_900Black,
    'Fasthand-Regular': require('./src/assets/fonts/Fasthand-Regular.ttf'),
    'BebasNeue-Regular': require('./src/assets/fonts/BebasNeue-Regular.ttf'),
    'Ultra-Regular': require('./src/assets/fonts/Ultra-Regular.ttf'),
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
    Urbanist_800ExtraBold,
    Urbanist_900Black,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ActivityIndicator size="large" color="#E8C547" />
      </View>
    );
  }

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#000000' }}>
      <ViewModelProvider>
        <MainAppContent />
      </ViewModelProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  viewport: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ── FIGMA BOTTOM NAV ──────────────────────────────────────────
  bottomNavBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 10, 9, 0.96)',
    borderWidth: 1.2,
    borderColor: '#262218',
    height: 66,
    paddingHorizontal: 8,
    borderRadius: 33,
    elevation: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    zIndex: 100,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navIconFood: {
    width: 28,
    height: 22,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  navIconBolt: {
    width: 26,
    height: 22,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  navIconStore: {
    width: 26,
    height: 22,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  navEatRightWrap: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 4,
  },
  navIconEatRight: {
    width: 26,
    height: 22,
    resizeMode: 'contain',
  },
  navNewBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#B29645',
    borderRadius: 3,
    paddingHorizontal: 2.5,
    paddingVertical: 0.5,
  },
  navNewBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 6.5,
    color: '#000000',
  },
  navIconReorder: {
    width: 24,
    height: 22,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  navLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#717171',
    textAlign: 'center',
  },
  navLabelActive: {
    color: '#A2883D',
    fontFamily: 'Urbanist-Bold',
  },

  fcWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 25,
    gap: 8,
  },
  fcUpsellCard: {
    backgroundColor: '#12110D',
    borderWidth: 1.2,
    borderColor: '#3D3216',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  fcDiscountBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#35270A',
    borderWidth: 1,
    borderColor: '#DEA430',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  fcDiscountBadgePercent: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#E8C547',
  },
  fcUpsellTextWrap: {
    flex: 1,
  },
  fcUpsellTextLine1: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  fcUpsellGoldHighlight: {
    color: '#E8C547',
    fontFamily: 'Urbanist-Bold',
  },
  fcUpsellTextLine2: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    color: '#8E8E8E',
    marginTop: 1,
  },
  fcContainer: {
    backgroundColor: '#191919',
    borderRadius: 20,
    minHeight: 64,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  fcTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  fcImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
  },
  fcTextCol: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  fcTitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    color: '#FFF',
  },
  fcSubtitle: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Medium',
    color: 'rgba(255,255,255,0.7)',
  },
  fcRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fcCartBtn: {
    backgroundColor: '#E8C547',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fcCartBtnText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    color: '#000000',
  },
  fcCartBtnSubText: {
    fontSize: 10,
    fontFamily: 'Urbanist-Medium',
    color: 'rgba(0,0,0,0.7)',
  },
  fcCloseBtn: {
    padding: 6,
  },
});
