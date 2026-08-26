import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ArrowLeft, Heart, Star, MapPin, MoreVertical, X, ChevronDown } from 'lucide-react-native';
import { scale } from './profileUtils';

interface FavouritesSubViewProps {
  isDarkMode: boolean;
  favouriteRestaurantsList: any[];
  toggleFavourite: (id: string) => void;
  onBack: () => void;
}

export const FavouritesSubView: React.FC<FavouritesSubViewProps> = ({
  isDarkMode,
  favouriteRestaurantsList,
  toggleFavourite,
  onBack,
}) => {
  const favPlateImg = require('../../assets/favorite_plate.png');
  const favQuroImg = require('../../assets/favorite_quro.png');
  const favBannerBowl = require('../../assets/fav_banner_bowl.png');

  // Favourites Filter & Sort state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'sort' | 'delivery' | 'veg' | 'ratings' | 'cuisines' | 'cost'>('sort');

  // Selected options state (temporary until Apply is clicked)
  const [tempSortBy, setTempSortBy] = useState<'relevance' | 'deliveryTime' | 'rating' | 'costL2H' | 'costH2L'>('relevance');
  const [tempDeliveryTime, setTempDeliveryTime] = useState<string | null>(null);
  const [tempVegPreference, setTempVegPreference] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [tempRatingPreference, setTempRatingPreference] = useState<number | null>(null);
  const [tempSelectedCuisines, setTempSelectedCuisines] = useState<string[]>([]);
  const [tempCostForTwo, setTempCostForTwo] = useState<string | null>(null);

  // Applied options state (actually filters the list)
  const [appliedSortBy, setAppliedSortBy] = useState<'relevance' | 'deliveryTime' | 'rating' | 'costL2H' | 'costH2L'>('relevance');
  const [appliedDeliveryTime, setAppliedDeliveryTime] = useState<string | null>(null);
  const [appliedVegPreference, setAppliedVegPreference] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [appliedRatingPreference, setAppliedRatingPreference] = useState<number | null>(null);
  const [appliedSelectedCuisines, setAppliedSelectedCuisines] = useState<string[]>([]);
  const [appliedCostForTwo, setAppliedCostForTwo] = useState<string | null>(null);

  // Filter and sort computation
  const displayedRestaurants = useMemo(() => {
    let list = [...favouriteRestaurantsList];

    // Apply Veg filter
    if (appliedVegPreference === 'veg') {
      list = list.filter(r => r.cuisine.toLowerCase().includes('veg') && !r.cuisine.toLowerCase().includes('non-veg') && !r.cuisine.toLowerCase().includes('non veg'));
    } else if (appliedVegPreference === 'nonveg') {
      list = list.filter(r => r.cuisine.toLowerCase().includes('chicken') || r.cuisine.toLowerCase().includes('mutton') || r.cuisine.toLowerCase().includes('fish') || r.cuisine.toLowerCase().includes('meat') || r.cuisine.toLowerCase().includes('non-veg') || r.cuisine.toLowerCase().includes('non veg'));
    }

    // Apply Rating filter
    if (appliedRatingPreference) {
      list = list.filter(r => r.rating >= appliedRatingPreference);
    }

    // Apply Delivery Time filter
    if (appliedDeliveryTime === '30') {
      list = list.filter(r => (r.deliveryTime || 30) <= 30);
    }

    // Apply Cuisine filter
    if (appliedSelectedCuisines.length > 0) {
      list = list.filter(r => appliedSelectedCuisines.some(c => r.cuisine.toLowerCase().includes(c.toLowerCase())));
    }

    // Apply Cost for two filter
    if (appliedCostForTwo) {
      list = list.filter(r => {
        const costStr = r.costForTwo || '₹200 for two';
        const numericCost = parseInt(costStr.replace(/[^0-9]/g, '')) || 200;
        if (appliedCostForTwo === 'less_250') return numericCost < 250;
        if (appliedCostForTwo === '250_500') return numericCost >= 250 && numericCost <= 500;
        if (appliedCostForTwo === 'more_500') return numericCost > 500;
        return true;
      });
    }

    // Apply Sorting
    if (appliedSortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (appliedSortBy === 'deliveryTime') {
      list.sort((a, b) => (a.deliveryTime || 30) - (b.deliveryTime || 30));
    } else if (appliedSortBy === 'costL2H') {
      list.sort((a, b) => {
        const costA = parseInt((a.costForTwo || '').replace(/[^0-9]/g, '')) || 200;
        const costB = parseInt((b.costForTwo || '').replace(/[^0-9]/g, '')) || 200;
        return costA - costB;
      });
    } else if (appliedSortBy === 'costH2L') {
      list.sort((a, b) => {
        const costA = parseInt((a.costForTwo || '').replace(/[^0-9]/g, '')) || 200;
        const costB = parseInt((b.costForTwo || '').replace(/[^0-9]/g, '')) || 200;
        return costB - costA;
      });
    }

    return list;
  }, [favouriteRestaurantsList, appliedSortBy, appliedDeliveryTime, appliedVegPreference, appliedRatingPreference, appliedSelectedCuisines, appliedCostForTwo]);

  const openFilterSheet = (tab: typeof activeFilterTab) => {
    setActiveFilterTab(tab);
    setTempSortBy(appliedSortBy);
    setTempDeliveryTime(appliedDeliveryTime);
    setTempVegPreference(appliedVegPreference);
    setTempRatingPreference(appliedRatingPreference);
    setTempSelectedCuisines(appliedSelectedCuisines);
    setTempCostForTwo(appliedCostForTwo);
    setFilterModalVisible(true);
  };

  // Empty state: exact Figma 229-104 design
  if (favouriteRestaurantsList.length === 0) {
    return (
      <View style={styles.favContainer}>
        {/* Header */}
        <View style={styles.favHeader}>
          <TouchableOpacity onPress={onBack} style={styles.favHeaderBackBtn}>
            <ArrowLeft size={22} color="#eae1d4" />
          </TouchableOpacity>
          <Text style={styles.favHeaderTitle}>favorites</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.favLogoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={styles.favLogoMy}>My</Text>
              <View style={styles.favQuroCropContainer}>
                <Image source={favQuroImg} style={styles.favQuroCropImage} resizeMode="stretch" />
              </View>
            </View>
          </View>

          <View style={styles.favHeroArea}>
            <Image source={favPlateImg} style={styles.favPlateImg} resizeMode="contain" />

            <View style={styles.favFloatingHeart}>
              <Heart size={14} color="#d4af37" strokeWidth={1.5} />
            </View>

            <View style={styles.favFloatingSparkle}>
              <Svg width={24} height={24} viewBox="0 0 12.8333 12.8333" fill="none">
                <Path
                  d="M10.5 4.66667L9.77083 3.0625L8.16667 2.33333L9.77083 1.60417L10.5 0L11.2292 1.60417L12.8333 2.33333L11.2292 3.0625L10.5 4.66667V4.66667M10.5 12.8333L9.77083 11.2292L8.16667 10.5L9.77083 9.77083L10.5 8.16667L11.2292 9.77083L12.8333 10.5L11.2292 11.2292L10.5 12.8333V12.8333M4.66667 11.0833L3.20833 7.875L0 6.41667L3.20833 4.95833L4.66667 1.75L6.125 4.95833L9.33333 6.41667L6.125 7.875L4.66667 11.0833V11.0833M4.66667 8.25417L5.25 7L6.50417 6.41667L5.25 5.83333L4.66667 4.57917L4.08333 5.83333L2.82917 6.41667L4.08333 7L4.66667 8.25417V8.25417M4.66667 6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667"
                  fill="#D4AF37"
                  fillOpacity={0.8}
                />
              </Svg>
            </View>

            <View style={styles.favFloatingSparkleBottomLeft}>
              <Svg width={20} height={20} viewBox="0 0 11 11" fill="none">
                <Path
                  d="M0 6V5H3V6H0V6M3.375 4.075L2.325 3.025L3.025 2.325L4.075 3.375L3.375 4.075V4.075M5 3V0H6V3H5V3M7.625 4.075L6.925 3.375L7.975 2.325L8.675 3.025L7.625 4.075V4.075M8 6V5H11V6H8V6M5.5 7C5.08333 7 4.72917 6.85417 4.4375 6.5625C4.14583 6.27083 4 5.91667 4 5.5C4 5.08333 4.14583 4.72917 4.4375 4.4375C4.72917 4.14583 5.08333 4 5.5 4C5.91667 4 6.27083 4.14583 6.5625 4.4375C6.85417 4.72917 7 5.08333 7 5.5C7 5.91667 6.85417 6.27083 6.5625 6.5625C6.27083 6.85417 5.91667 7 5.5 7V7M7.975 8.675L6.925 7.625L7.625 6.925L8.675 7.975L7.975 8.675V8.675M3.025 8.675L2.325 7.975L3.375 6.925L4.075 7.625L3.025 8.675V8.675M5 11V8H6V11H5V11"
                  fill="#D4AF37"
                  fillOpacity={0.8}
                />
              </Svg>
            </View>

            <View style={styles.favRightButtons}>
              <View style={styles.favRightBtnActive}>
                <Heart size={18} color="#d4af37" fill="#d4af37" />
              </View>
              <View style={styles.favRightBtnInactive}>
                <Star size={18} color="#d4af37" strokeWidth={1.5} />
              </View>
              <View style={styles.favRightBtnInactive}>
                <Star size={18} color="#d4af37" strokeWidth={1.5} />
              </View>
            </View>
          </View>

          <View style={styles.favEmptyStateContent}>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.favEmptyHeadline}>WHERE IS THE</Text>
              <Text style={styles.favEmptyHeadlineGold}>LOVE?</Text>
            </View>

            <View style={styles.favDividerRow}>
              <View style={styles.favDividerLineLeft} />
              <Heart size={10} color="#d4af37" fill="#d4af37" />
              <View style={styles.favDividerLineRight} />
            </View>

            <Text style={styles.favEmptySubtitle}>
              Once you favorite a restaurant, it{"\n"}will appear here.
            </Text>

            <TouchableOpacity
              style={styles.favEmptyActionBtn}
              activeOpacity={0.8}
              onPress={onBack}
            >
              <Text style={styles.favEmptyActionBtnText}>explore restaurants</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.favFooter}>
            <Svg
              width="100%"
              height={100}
              viewBox="0 0 440 128"
              preserveAspectRatio="xMidYMid meet"
              style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
            >
              <Path
                d="M0 60C66.6667 33.3333 133.333 36.6667 200 70C266.667 103.333 346.667 93.3333 440 40"
                stroke="#D4AF37"
                strokeWidth={1.5}
                strokeDasharray="2 4"
                opacity={0.5}
                fill="none"
              />
            </Svg>

            <View style={styles.favFooterIconsRow}>
              <Svg width={23} height={21} viewBox="0 0 23.3333 21" fill="none">
                <Path d="M2.33333 21C1.69167 21 1.14236 20.7715 0.685417 20.3146C0.228472 19.8576 0 19.3083 0 18.6667V15.1667H23.3333V18.6667C23.3333 19.3083 23.1049 19.8576 22.6479 20.3146C22.191 20.7715 21.6417 21 21 21H2.33333V21M2.33333 17.5V18.6667V18.6667V18.6667H21V18.6667V18.6667V17.5H2.33333V17.5M11.6667 12.25C10.9667 12.25 10.4125 12.4444 10.0042 12.8333C9.59583 13.2222 8.84722 13.4167 7.75833 13.4167C6.66944 13.4167 5.93056 13.2222 5.54167 12.8333C5.15278 12.4444 4.60833 12.25 3.90833 12.25C3.20833 12.25 2.65417 12.4444 2.24583 12.8333C1.8375 13.2222 1.08889 13.4167 0 13.4167V11.0833C0.7 11.0833 1.25417 10.8889 1.6625 10.5C2.07083 10.1111 2.81944 9.91667 3.90833 9.91667C4.99722 9.91667 5.73611 10.1111 6.125 10.5C6.51389 10.8889 7.05833 11.0833 7.75833 11.0833C8.45833 11.0833 9.0125 10.8889 9.42083 10.5C9.82917 10.1111 10.5778 9.91667 11.6667 9.91667C12.7556 9.91667 13.5042 10.1111 13.9125 10.5C14.3208 10.8889 14.875 11.0833 15.575 11.0833C16.275 11.0833 16.8194 10.8889 17.2083 10.5C17.5972 10.1111 18.3361 9.91667 19.425 9.91667C20.5139 9.91667 21.2819 10.1111 21.7292 10.5C22.1764 10.8889 22.7111 11.0833 23.3333 11.0833V13.4167C22.2444 13.4167 21.5153 13.2222 21.1458 12.8333C20.7764 12.4444 20.2417 12.25 19.5417 12.25C18.8417 12.25 18.2778 12.4444 17.85 12.8333C17.4222 13.2222 16.6639 13.4167 15.575 13.4167C14.4861 13.4167 13.7375 13.2222 13.3292 12.8333C12.9208 12.4444 12.3667 12.25 11.6667 12.25V12.25M0 8.16667V7C0 4.76389 1.05486 3.03819 3.16458 1.82292C5.27431 0.607639 8.10833 0 11.6667 0C15.225 0 18.059 0.607639 20.1688 1.82292C22.2785 3.03819 23.3333 4.76389 23.3333 7V8.16667H0V8.16667M11.6667 2.33333C9.25556 2.33333 7.23819 2.63472 5.61458 3.2375C3.99097 3.84028 2.95556 4.70556 2.50833 5.83333H20.825C20.3778 4.70556 19.3424 3.84028 17.7188 3.2375C16.0951 2.63472 14.0778 2.33333 11.6667 2.33333V2.33333" fill="#CEB461" fillOpacity={0.8} />
              </Svg>
              <Svg width={20} height={19} viewBox="0 0 20 19" fill="none">
                <Path d="M10 19L0 4C1.41667 2.8 2.97083 1.83333 4.6625 1.1C6.35417 0.366667 8.13333 0 10 0C11.8667 0 13.6458 0.3625 15.3375 1.0875C17.0292 1.8125 18.5833 2.78333 20 4L10 19V19M10 15.4L17.3 4.45C16.2167 3.7 15.0583 3.10417 13.825 2.6625C12.5917 2.22083 11.3167 2 10 2C8.68333 2 7.4125 2.22083 6.1875 2.6625C4.9625 3.10417 3.8 3.7 2.7 4.45L10 15.4V15.4M7.5 7C7.91667 7 8.27083 6.85417 8.5625 6.5625C8.85417 6.27083 9 5.91667 9 5.5C9 5.08333 8.85417 4.72917 8.5625 4.4375C8.27083 4.14583 7.91667 4 7.5 4C7.08333 4 6.72917 4.14583 6.4375 4.4375C6.14583 4.72917 6 5.08333 6 5.5C6 5.91667 6.14583 6.27083 6.4375 6.5625C6.72917 6.85417 7.08333 7 7.5 7V7M10 12C10.4167 12 10.7708 11.8542 11.0625 11.5625C11.3542 11.2708 11.5 10.9167 11.5 10.5C11.5 10.0833 11.3542 9.72917 11.0625 9.4375C10.7708 9.14583 10.4167 9 10 9C9.58333 9 9.22917 9.14583 8.9375 9.4375C8.64583 9.72917 8.5 10.0833 8.5 10.5C8.5 10.9167 8.64583 11.2708 8.9375 11.5625C9.22917 11.8542 9.58333 12 10 12V12" fill="#CEB461" fillOpacity={0.8} />
              </Svg>
              <Svg width={19.5} height={19.5} viewBox="0 0 19.5 19.5" fill="none">
                <Path d="M7.58333 16.25C5.47083 16.25 3.67882 15.5142 2.20729 14.0427C0.735764 12.5712 0 10.7792 0 8.66667V2.16667C0 1.57083 0.212153 1.06076 0.636458 0.636458C1.06076 0.212153 1.57083 0 2.16667 0H15.7083C16.7556 0 17.6493 0.370139 18.3896 1.11042C19.1299 1.85069 19.5 2.74444 19.5 3.79167C19.5 4.83889 19.1299 5.73264 18.3896 6.47292C17.6493 7.21319 16.7556 7.58333 15.7083 7.58333H15.1667V8.66667C15.1667 10.7792 14.4309 12.5712 12.9594 14.0427C11.4878 15.5142 9.69583 16.25 7.58333 16.25V16.25M2.16667 5.41667H13V2.16667H2.16667V5.41667V5.41667M7.58333 14.0833C9.08194 14.0833 10.3594 13.5552 11.4156 12.499C12.4719 11.4427 13 10.1653 13 8.66667V7.58333H2.16667V8.66667C2.16667 10.1653 2.69479 11.4427 3.75104 12.499C4.80729 13.5552 6.08472 14.0833 7.58333 14.0833V14.0833M15.1667 5.41667H15.7083C16.1597 5.41667 16.5434 5.25868 16.8594 4.94271C17.1753 4.62674 17.3333 4.24306 17.3333 3.79167C17.3333 3.34028 17.1753 2.9566 16.8594 2.64062C16.5434 2.32465 16.1597 2.16667 15.7083 2.16667H15.1667V5.41667V5.41667M0 19.5V17.3333H17.3333V19.5H0V19.5" fill="#CEB461" fillOpacity={0.8} />
              </Svg>
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Path d="M8 18H12V16.9L13.25 16.4C14.3333 15.9667 15.2542 15.3625 16.0125 14.5875C16.7708 13.8125 17.3167 12.95 17.65 12H2.35C2.68333 12.95 3.225 13.8125 3.975 14.5875C4.725 15.3625 5.65 15.9667 6.75 16.4L8 16.9V18V18M6 20V18.25C4.21667 17.55 2.77083 16.4667 1.6625 15C0.554167 13.5333 0 11.8667 0 10V10H2V2L20 0V1.5L8.5 2.8V4.5H20V6H8.5V10H20V10C20 11.8667 19.4458 13.5333 18.3375 15C17.2292 16.4667 15.7833 17.55 14 18.25V20H6V20" fill="#CEB461" fillOpacity={0.8} />
              </Svg>
            </View>
          </View>

          <View style={styles.favPremiumFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={styles.favPremiumFooterSignature}>Live it</Text>
              <Text style={[styles.favPremiumFooterSignature, styles.favPremiumFooterUp, { fontSize: 58, marginLeft: -8 * scale }]}> up!</Text>
            </View>
            <Text style={styles.favPremiumFooterSubtitle}>
              Crafted with 💛 in{"\n"}Jharkhand, India
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.favContainer}>
      {/* Header */}
      <View style={styles.favHeader}>
        <TouchableOpacity onPress={onBack} style={styles.favHeaderBackBtn}>
          <ArrowLeft size={22} color="#eae1d4" />
        </TouchableOpacity>
        <Text style={styles.favHeaderTitle}>favorites</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Hero Banner div (Figma 233-364 Rectangle 851 copy) */}
        <View style={styles.favHeroBanner}>
          <View style={styles.favHeroBannerLeft}>
            <Text style={styles.favHeroBannerTitle}>
              We know{"\n"}you <Text style={styles.favHeroBannerLove}>love it!</Text>
            </Text>
            <Text style={styles.favHeroBannerSubtitle}>
              Browse your favourite restaurants & feast like never before.
            </Text>
          </View>
          <View style={styles.favHeroBannerRight}>
            <Image source={favBannerBowl} style={styles.favHeroBannerImage} resizeMode="contain" />
          </View>
        </View>

        {/* Carousel Indicators */}
        <View style={styles.favCarouselIndicators}>
          <View style={[styles.favCarouselDot, styles.favCarouselDotActive]} />
          <View style={styles.favCarouselDot} />
          <View style={styles.favCarouselDot} />
        </View>

        {/* Filter Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.favFilterScrollView}
          contentContainerStyle={styles.favFilterContentContainer}
        >
          <TouchableOpacity style={styles.favFilterBtn} activeOpacity={0.8} onPress={() => openFilterSheet('sort')}>
            <View style={{ marginRight: 6 }}>
              <Svg width={13.5} height={13.5} viewBox="0 0 13.5 13.5" fill="none">
                <Path d="M0 2.25H4.5M4.5 2.25C4.5 3.5 5.5 4.5 6.75 4.5C8 4.5 9 3.5 9 2.25M4.5 2.25C4.5 1 5.5 0 6.75 0C8 0 9 1 9 2.25M9 2.25H13.5M0 11.25H9M9 11.25C9 12.5 10 13.5 11.25 13.5C12.5 13.5 13.5 12.5 13.5 11.25M9 11.25C9 10 10 9 11.25 9C12.5 9 13.5 10 13.5 11.25" stroke="#FFFFFF" strokeWidth={1.2} />
              </Svg>
            </View>
            <Text style={styles.favFilterBtnText}>Filter</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.favFilterBtn} activeOpacity={0.8} onPress={() => openFilterSheet('sort')}>
            <Text style={styles.favFilterBtnText}>Sort by</Text>
            <ChevronDown size={14} color="#ffffff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.favFilterBtn} activeOpacity={0.8} onPress={() => openFilterSheet('delivery')}>
            <Text style={styles.favFilterBtnText}>Fast Delivery</Text>
            <ChevronDown size={14} color="#ffffff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.favFilterBtn} activeOpacity={0.8} onPress={() => openFilterSheet('ratings')}>
            <Text style={styles.favFilterBtnText}>Rating 4.0</Text>
            <ChevronDown size={14} color="#ffffff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </ScrollView>

        {/* Restaurant Cards List */}
        <View style={styles.favCardsContainer}>
          {displayedRestaurants.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ color: '#eae1d4', fontFamily: 'Urbanist-SemiBold', fontSize: 16 }}>No restaurants match your filters.</Text>
            </View>
          ) : (
            displayedRestaurants.map((item, idx) => {
              const isEven = idx % 2 === 0;
              const discountText = isEven ? '50% OFF' : '40% OFF';
              return (
                <View key={item.id || idx} style={styles.favPremiumCard}>
                  <View style={{ flex: 1, flexDirection: 'row', padding: 12, alignItems: 'center' }}>
                    <View style={styles.favPremiumCardLeft}>
                      <Image source={{ uri: item.image }} style={styles.favPremiumCardImg} resizeMode="cover" />
                      <View style={styles.favPremiumDiscountTag}>
                        <Text style={styles.favPremiumDiscountText}>{discountText}</Text>
                      </View>
                    </View>

                    <View style={styles.favPremiumCardRight}>
                      <View style={{ position: 'absolute', top: -4, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 1 }}>
                        {isEven && (
                          <View style={[styles.favQuroBoltBadge, { marginRight: 12 }]}>
                            <Svg width={8} height={10} viewBox="0 0 8 10" fill="none" style={{ marginRight: 4 }}>
                              <Path d="M4.5 0L0 5.5H3.5L3 10L8 4.5H4.5L4.5 0Z" fill="#f2ca50" />
                            </Svg>
                            <Text style={styles.favQuroBoltText}>MY QURO BOLT</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() => toggleFavourite(item.id)}
                          activeOpacity={0.7}
                          style={{ padding: 4, marginRight: -4 }}
                        >
                          <MoreVertical size={18} color="#d0c5af" />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.favPremiumRestaurantName} numberOfLines={1}>
                        {item.name}
                      </Text>

                      <View style={styles.favPremiumRatingRow}>
                        <Star size={11} color="#f2ca50" fill="#f2ca50" style={{ marginRight: 4, marginTop: 1 }} />
                        <Text style={styles.favPremiumRatingVal}>{item.rating ? item.rating.toFixed(1) : '4.1'}</Text>
                        <Text style={styles.favPremiumRatingMeta}>
                          ({item.reviewCount || '12K+'}) • 25-30 mins
                        </Text>
                      </View>

                      <Text style={styles.favPremiumCuisineText} numberOfLines={1}>
                        {item.cuisine || 'Burgers, Fast Food,…'}
                      </Text>

                      <View style={styles.favPremiumLocRow}>
                        <MapPin size={11} color="#d0c5af" style={{ marginRight: 4, marginTop: 1 }} />
                        <Text style={styles.favPremiumLocText} numberOfLines={1}>
                          {item.address || `${item.city || 'Bangalore'} • 2.1 km`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Signature Footer */}
        <View style={styles.favPremiumFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={styles.favPremiumFooterSignature}>Live it</Text>
            <Text style={[styles.favPremiumFooterSignature, styles.favPremiumFooterUp, { fontSize: 58, marginLeft: -8 * scale }]}> up!</Text>
          </View>
          <Text style={styles.favPremiumFooterSubtitle}>
            Crafted with 💛 in{"\n"}Jharkhand, India
          </Text>
        </View>
      </ScrollView>

      {/* Filter / Sort Bottom Sheet Modal */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalOverlayScrimTouch}
            activeOpacity={1}
            onPress={() => setFilterModalVisible(false)}
          />
          <View style={styles.filterBottomSheet}>
            <View style={styles.filterModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterModalTitle}>Filter</Text>
              </View>
              <TouchableOpacity
                style={styles.filterCloseBtn}
                onPress={() => setFilterModalVisible(false)}
              >
                <X size={16} color="#eae1d4" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterContentSplit}>
              <View style={styles.filterLeftPanel}>
                {[
                  { key: 'sort', label: 'Sort' },
                  { key: 'delivery', label: 'Delivery Time' },
                  { key: 'veg', label: 'Veg/Non-Veg' },
                  { key: 'ratings', label: 'Ratings' },
                  { key: 'cuisines', label: 'Cuisines' },
                  { key: 'cost', label: 'Cost for two' },
                ].map(tab => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.filterLeftItem, activeFilterTab === tab.key && styles.filterLeftItemActive]}
                    onPress={() => setActiveFilterTab(tab.key as any)}
                  >
                    <Text style={[styles.filterLeftText, activeFilterTab === tab.key && styles.filterLeftTextActive]}>
                      {tab.label}
                    </Text>
                    {activeFilterTab === tab.key && <View style={styles.filterLeftActiveIndicator} />}
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView style={styles.filterRightPanel} contentContainerStyle={styles.filterRightContent}>
                {activeFilterTab === 'sort' && (
                  <View style={{ gap: 24 }}>
                    <Text style={styles.filterRightHeader}>SORT BY</Text>
                    {[
                      { label: 'Relevance (Default)', value: 'relevance' },
                      { label: 'Delivery Time', value: 'deliveryTime' },
                      { label: 'Rating', value: 'rating' },
                      { label: 'Cost: Low to High', value: 'costL2H' },
                      { label: 'Cost: High to Low', value: 'costH2L' },
                    ].map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={styles.filterRadioOption}
                        onPress={() => setTempSortBy(opt.value as any)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.filterRadioOuter, tempSortBy === opt.value && styles.filterRadioOuterSelected]}>
                          {tempSortBy === opt.value && <View style={styles.filterRadioInner} />}
                        </View>
                        <Text style={[styles.filterRadioLabel, tempSortBy === opt.value && styles.filterRadioLabelSelected]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {activeFilterTab === 'delivery' && (
                  <View style={{ gap: 24 }}>
                    <Text style={styles.filterRightHeader}>DELIVERY TIME</Text>
                    {[
                      { label: 'All Delivery Times', value: null },
                      { label: 'Fast Delivery (≤ 30 mins)', value: '30' },
                    ].map(opt => (
                      <TouchableOpacity
                        key={String(opt.value)}
                        style={styles.filterRadioOption}
                        onPress={() => setTempDeliveryTime(opt.value)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.filterRadioOuter, tempDeliveryTime === opt.value && styles.filterRadioOuterSelected]}>
                          {tempDeliveryTime === opt.value && <View style={styles.filterRadioInner} />}
                        </View>
                        <Text style={[styles.filterRadioLabel, tempDeliveryTime === opt.value && styles.filterRadioLabelSelected]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {activeFilterTab === 'veg' && (
                  <View style={{ gap: 24 }}>
                    <Text style={styles.filterRightHeader}>VEG / NON-VEG</Text>
                    {[
                      { label: 'All Preferences', value: 'all' },
                      { label: 'Pure Veg', value: 'veg' },
                      { label: 'Non-Veg', value: 'nonveg' },
                    ].map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={styles.filterRadioOption}
                        onPress={() => setTempVegPreference(opt.value as any)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.filterRadioOuter, tempVegPreference === opt.value && styles.filterRadioOuterSelected]}>
                          {tempVegPreference === opt.value && <View style={styles.filterRadioInner} />}
                        </View>
                        <Text style={[styles.filterRadioLabel, tempVegPreference === opt.value && styles.filterRadioLabelSelected]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {activeFilterTab === 'ratings' && (
                  <View style={{ gap: 24 }}>
                    <Text style={styles.filterRightHeader}>RATINGS</Text>
                    {[
                      { label: 'All Ratings', value: null },
                      { label: 'Rating 4.0+', value: 4.0 },
                      { label: 'Rating 4.5+', value: 4.5 },
                    ].map(opt => (
                      <TouchableOpacity
                        key={String(opt.value)}
                        style={styles.filterRadioOption}
                        onPress={() => setTempRatingPreference(opt.value)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.filterRadioOuter, tempRatingPreference === opt.value && styles.filterRadioOuterSelected]}>
                          {tempRatingPreference === opt.value && <View style={styles.filterRadioInner} />}
                        </View>
                        <Text style={[styles.filterRadioLabel, tempRatingPreference === opt.value && styles.filterRadioLabelSelected]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {activeFilterTab === 'cuisines' && (
                  <View style={{ gap: 24 }}>
                    <Text style={styles.filterRightHeader}>CUISINES</Text>
                    {[
                      'Indian', 'Chinese', 'Continental', 'American', 'Fast Food', 'Shakes', 'Desserts'
                    ].map(cuisine => {
                      const isSelected = tempSelectedCuisines.includes(cuisine);
                      return (
                        <TouchableOpacity
                          key={cuisine}
                          style={styles.filterRadioOption}
                          onPress={() => {
                            if (isSelected) {
                              setTempSelectedCuisines(tempSelectedCuisines.filter(c => c !== cuisine));
                            } else {
                              setTempSelectedCuisines([...tempSelectedCuisines, cuisine]);
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.filterCheckboxOuter, isSelected && styles.filterCheckboxOuterSelected]}>
                            {isSelected && (
                              <View style={styles.filterCheckboxInner}>
                                <Svg width={10} height={8} viewBox="0 0 10 8" fill="none">
                                  <Path d="M1 4L3.5 6.5L9 1" stroke="#000000" strokeWidth={1.5} />
                                </Svg>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.filterRadioLabel, isSelected && styles.filterRadioLabelSelected]}>
                            {cuisine}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {activeFilterTab === 'cost' && (
                  <View style={{ gap: 24 }}>
                    <Text style={styles.filterRightHeader}>COST FOR TWO</Text>
                    {[
                      { label: 'All Prices', value: null },
                      { label: 'Less than ₹250', value: 'less_250' },
                      { label: '₹250 to ₹500', value: '250_500' },
                      { label: 'More than ₹500', value: 'more_500' },
                    ].map(opt => (
                      <TouchableOpacity
                        key={String(opt.value)}
                        style={styles.filterRadioOption}
                        onPress={() => setTempCostForTwo(opt.value)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.filterRadioOuter, tempCostForTwo === opt.value && styles.filterRadioOuterSelected]}>
                          {tempCostForTwo === opt.value && <View style={styles.filterRadioInner} />}
                        </View>
                        <Text style={[styles.filterRadioLabel, tempCostForTwo === opt.value && styles.filterRadioLabelSelected]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={styles.filterClearBtn}
                onPress={() => {
                  setTempSortBy('relevance');
                  setTempDeliveryTime(null);
                  setTempVegPreference('all');
                  setTempRatingPreference(null);
                  setTempSelectedCuisines([]);
                  setTempCostForTwo(null);
                }}
              >
                <Text style={styles.filterClearBtnText}>Clear Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterApplyBtn}
                onPress={() => {
                  setAppliedSortBy(tempSortBy);
                  setAppliedDeliveryTime(tempDeliveryTime);
                  setAppliedVegPreference(tempVegPreference);
                  setAppliedRatingPreference(tempRatingPreference);
                  setAppliedSelectedCuisines(tempSelectedCuisines);
                  setAppliedCostForTwo(tempCostForTwo);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.filterApplyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  favContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  favHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 13,
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    backgroundColor: '#000000',
  },
  favHeaderBackBtn: {
    padding: 6,
  },
  favHeaderTitle: {
    fontSize: 20,
    color: '#d0c5af',
    fontFamily: 'Urbanist-SemiBold',
    textAlign: 'center',
  },
  favLogoRow: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 16,
  },
  favLogoMy: {
    fontSize: 50,
    color: '#deb853',
    fontFamily: 'Fasthand-Regular',
    letterSpacing: -1.5,
    height: 60,
    lineHeight: 70,
  },
  favQuroCropContainer: {
    width: 107,
    height: 60,
    overflow: 'hidden',
    marginLeft: 0,
  },
  favQuroCropImage: {
    width: 167,
    height: 90,
    marginLeft: -65,
    bottom: 20,
  },
  favHeroArea: {
    position: 'relative',
    width: '100%',
    height: 350,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  favPlateImg: {
    width: 300,
    height: 300,
  },
  favFloatingHeart: {
    position: 'absolute',
    top: 30,
    left: 50,
  },
  favFloatingSparkle: {
    position: 'absolute',
    top: 60,
    right: 65,
  },
  favFloatingSparkleBottomLeft: {
    position: 'absolute',
    bottom: 40,
    left: 75,
  },
  favRightButtons: {
    position: 'absolute',
    right: 20,
    top: '33%',
    gap: 14,
    flexDirection: 'column',
  },
  favRightBtnActive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(18,18,18,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favRightBtnInactive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(18,18,18,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favEmptyStateContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
    marginTop: 4,
  },
  favEmptyActionBtn: {
    borderWidth: 1,
    borderColor: '#d4af37',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  favEmptyActionBtnText: {
    color: '#d4af37',
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  favEmptyHeadline: {
    fontSize: 32,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
    letterSpacing: -0.64,
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 40,
  },
  favEmptyHeadlineGold: {
    fontSize: 32,
    color: '#d4af37',
    fontFamily: 'Urbanist-Bold',
    letterSpacing: -0.64,
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 40,
  },
  favDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  favDividerLineLeft: {
    width: 48,
    height: 1,
    backgroundColor: '#d4af37',
    opacity: 0.6,
  },
  favDividerLineRight: {
    width: 48,
    height: 1,
    backgroundColor: '#d4af37',
    opacity: 0.6,
  },
  favEmptySubtitle: {
    fontSize: 15,
    color: '#787878',
    fontFamily: 'Urbanist-Medium',
    textAlign: 'center',
    lineHeight: 24,
    paddingTop: 8,
  },
  favFooter: {
    marginTop: 'auto',
    paddingTop: 24,
    paddingBottom: 32,
    height: 100,
    position: 'relative',
  },
  favFooterIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 44,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 40,
    opacity: 0.4,
  },
  favHeroBanner: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(77, 70, 53, 0.3)',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginHorizontal: 22,
    marginTop: 12,
  },
  favHeroBannerLeft: {
    flex: 1.2,
    paddingRight: 8,
  },
  favHeroBannerTitle: {
    fontSize: 28,
    color: '#ffffff',
    fontFamily: 'Urbanist-ExtraBold',
    lineHeight: 32,
    letterSpacing: -0.7,
    marginBottom: 8,
  },
  favHeroBannerLove: {
    fontFamily: 'Fasthand-Regular',
    color: '#f2ca50',
  },
  favHeroBannerSubtitle: {
    fontSize: 12,
    color: '#d0c5af',
    fontFamily: 'Urbanist-SemiBold',
    lineHeight: 16,
    opacity: 0.8,
    letterSpacing: 0.6,
  },
  favHeroBannerRight: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favHeroBannerImage: {
    width: 120,
    height: 120,
    transform: [{ scale: 1.35 }],
  },
  favCarouselIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 24,
  },
  favCarouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4d4635',
  },
  favCarouselDotActive: {
    backgroundColor: '#f2ca50',
  },
  favFilterScrollView: {
    marginBottom: 20,
    paddingLeft: 22,
  },
  favFilterContentContainer: {
    gap: 12,
    paddingRight: 44,
  },
  favFilterBtn: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.4)',
    borderRadius: 20,
    paddingHorizontal: 17,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favFilterBtnText: {
    fontSize: 15,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
  },
  favCardsContainer: {
    gap: 16,
    paddingHorizontal: 22,
    marginBottom: 32,
  },
  favPremiumCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.4)',
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    position: 'relative',
    height: 148,
    alignItems: 'center',
  },
  favPremiumCardLeft: {
    width: 124,
    height: 124,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  favPremiumCardImg: {
    width: '100%',
    height: '100%',
  },
  favPremiumDiscountTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f2ca50',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favPremiumDiscountText: {
    fontSize: 14,
    color: '#000000',
    fontFamily: 'Urbanist-ExtraBold',
    fontStyle: 'italic',
    letterSpacing: -0.22,
  },
  favPremiumCardRight: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  favPremiumRestaurantName: {
    fontSize: 18,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
    maxWidth: '65%',
  },
  favQuroBoltBadge: {
    backgroundColor: 'rgba(242, 202, 80, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  favQuroBoltText: {
    fontSize: 10,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
    letterSpacing: 0.5,
  },
  favPremiumRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  favPremiumRatingVal: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
    marginRight: 4,
  },
  favPremiumRatingMeta: {
    fontSize: 12,
    color: '#d0c5af',
    fontFamily: 'Urbanist-SemiBold',
    letterSpacing: 0.6,
  },
  favPremiumCuisineText: {
    fontSize: 12,
    color: '#d0c5af',
    fontFamily: 'Urbanist-SemiBold',
    letterSpacing: 0.6,
    marginTop: 6,
  },
  favPremiumLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  favPremiumLocText: {
    fontSize: 11,
    color: '#d0c5af',
    fontFamily: 'Urbanist-Regular',
  },
  favPremiumFooter: {
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingVertical: 24,
    marginTop: 8,
    marginBottom: 40,
  },
  favPremiumFooterSignature: {
    fontSize: 50,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
    letterSpacing: -0.22,
    lineHeight: 65,
    paddingTop: 10,
  },
  favPremiumFooterUp: {
    fontFamily: 'Fasthand-Regular',
    color: '#f2ca50',
  },
  favPremiumFooterSubtitle: {
    fontSize: 18,
    color: '#d0c5af',
    fontFamily: 'Urbanist-SemiBold',
    textAlign: 'left',
    lineHeight: 22,
    letterSpacing: 0.6,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayScrimTouch: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  filterBottomSheet: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: 480,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  filterModalTitle: {
    fontSize: 20,
    color: '#eae1d4',
    fontFamily: 'Urbanist-Bold',
  },
  filterCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContentSplit: {
    flex: 1,
    flexDirection: 'row',
  },
  filterLeftPanel: {
    width: 140,
    backgroundColor: '#070707',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
  },
  filterLeftItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    position: 'relative',
  },
  filterLeftItemActive: {
    backgroundColor: '#0f0f0f',
  },
  filterLeftText: {
    fontSize: 14,
    color: '#8a8a8a',
    fontFamily: 'Urbanist-Medium',
  },
  filterLeftTextActive: {
    color: '#eae1d4',
    fontFamily: 'Urbanist-Bold',
  },
  filterLeftActiveIndicator: {
    position: 'absolute',
    left: 0,
    top: '30%',
    bottom: '30%',
    width: 4,
    backgroundColor: '#d4af37',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  filterRightPanel: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  filterRightContent: {
    padding: 24,
    paddingBottom: 40,
  },
  filterRightHeader: {
    fontSize: 12,
    color: '#8a8a8a',
    letterSpacing: 0.6,
    fontFamily: 'Urbanist-Bold',
    marginBottom: 8,
  },
  filterRadioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  filterRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4a4a4a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  filterRadioOuterSelected: {
    borderColor: '#d4af37',
  },
  filterRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#d4af37',
  },
  filterRadioLabel: {
    fontSize: 16,
    color: '#8a8a8a',
    fontFamily: 'Urbanist-Medium',
  },
  filterRadioLabelSelected: {
    color: '#eae1d4',
    fontFamily: 'Urbanist-Bold',
  },
  filterCheckboxOuter: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4a4a4a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  filterCheckboxOuterSelected: {
    borderColor: '#d4af37',
    backgroundColor: '#d4af37',
  },
  filterCheckboxInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0a0a0a',
    gap: 16,
  },
  filterClearBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterClearBtnText: {
    fontSize: 16,
    color: '#eae1d4',
    fontFamily: 'Urbanist-Bold',
  },
  filterApplyBtn: {
    flex: 1.2,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#d4af37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterApplyBtnText: {
    fontSize: 16,
    color: '#554300',
    fontFamily: 'Urbanist-Bold',
  },
});
