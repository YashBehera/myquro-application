/**
 * Favourites Screen.
 * Displays persistent favorited dining locations with direct expansion panels and bookmark toggles.
 *
 * Original Java/Kotlin Path:
 * - /app/src/main/java/com/example/ui/screens/FavouritesScreen.kt
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useViewModel } from '../state/MainViewModel';
import { THEME, COLORS } from '../theme/Theme';
import {
  Heart,
  Star,
  MapPin,
  Phone,
  Mail,
  Frown,
  ChevronRight,
} from 'lucide-react-native';

interface FavouritesScreenProps {
  onNavigateToExplore: () => void;
  onNavigateToRestaurant?: (id: string) => void;
}

export const FavouritesScreen: React.FC<FavouritesScreenProps> = ({
  onNavigateToExplore,
  onNavigateToRestaurant,
}) => {
  const { isDarkMode, favouriteRestaurantsList, toggleFavourite } = useViewModel();
  const theme = isDarkMode ? THEME.dark : THEME.light;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Title Header */}
      <View style={styles.header}>
        <Text style={styles.screenTag}>Saved dining bookmarks</Text>
        <Text style={[styles.screenTitle, { color: theme.text }]}>My Favorites</Text>
      </View>

      {/* Conditional state listing */}
      {favouriteRestaurantsList.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.frownBackground}>
            <Frown size={52} color={COLORS.quroRedPrimary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Bookmarks Saved Yet</Text>
          <Text style={styles.emptySub}>
            Your bookmarked fine dining spaces and cafes will appear here for rapid premium reservations and table bookings.
          </Text>

          {/* Guide Button */}
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={onNavigateToExplore}
            accessibilityLabel="explore_now_btn"
          >
            <Text style={styles.exploreBtnText}>Explore Fine Spots</Text>
            <ChevronRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {favouriteRestaurantsList.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            return (
              <View
                key={idx}
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderColor }]}
              >
                {/* Media Image */}
                <Image source={{ uri: item.image }} style={styles.image} />

                {/* Rating Badge */}
                <View style={styles.ratingBadge}>
                  <Star size={11} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                </View>

                {/* Un-Bookmark button */}
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => toggleFavourite(item.id)}
                  accessibilityLabel={`remove_bookmark_${item.id}`}
                >
                  <Heart size={20} color={COLORS.quroRedPrimary} fill={COLORS.quroRedPrimary} />
                </TouchableOpacity>

                {/* Body Details */}
                <TouchableOpacity
                  style={styles.cardClick}
                  onPress={() => toggleExpand(item.id)}
                >
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{item.name}</Text>
                  <Text style={styles.itemCuisine}>{item.cuisine} • {item.category}</Text>
                  <Text style={styles.itemMetadata}>{item.city} City • {item.reviewCount} reviews</Text>

                  <Text style={styles.itemDesc} numberOfLines={isExpanded ? undefined : 2}>
                    {item.description}
                  </Text>

                  {/* Expand Block */}
                  {isExpanded && (
                    <View style={[styles.expandedArea, { borderTopColor: theme.borderColor }]}>
                      <View style={styles.detailRow}>
                        <MapPin size={13} color={COLORS.quroRedPrimary} style={styles.iconShift} />
                        <Text style={[styles.detailText, { color: theme.text }]}>{item.address}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Phone size={13} color={COLORS.quroRedPrimary} style={styles.iconShift} />
                        <Text style={[styles.detailText, { color: theme.text }]}>{item.phone}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Mail size={13} color={COLORS.quroRedPrimary} style={styles.iconShift} />
                        <Text style={[styles.detailText, { color: theme.text }]}>{item.email}</Text>
                      </View>

                      {/* Direct Actions Buttons */}
                      <TouchableOpacity
                        style={styles.bookBtn}
                        onPress={() => Alert.alert('Action Success', `Sleek table seating booked at ${item.name}!`)}
                      >
                        <Text style={styles.bookBtnText}>Book Seating Now</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.orderBtn}
                        onPress={() => onNavigateToRestaurant?.(item.id)}
                      >
                        <Text style={styles.orderBtnText}>Order Online & View Menu</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  screenTag: {
    color: COLORS.quroRedPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  frownBackground: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(211, 47, 47, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySub: {
    color: COLORS.quroTextSub,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  exploreBtn: {
    backgroundColor: COLORS.quroRedPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 4,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 24,
    gap: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.quroRedPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  removeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardClick: {
    padding: 16,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  itemCuisine: {
    color: COLORS.quroRedPrimary,
    fontWeight: '600',
    fontSize: 12,
    marginTop: 2,
  },
  itemMetadata: {
    color: COLORS.quroTextSub,
    fontSize: 12,
    marginTop: 4,
  },
  itemDesc: {
    color: COLORS.quroTextSub,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  expandedArea: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconShift: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  bookBtn: {
    backgroundColor: COLORS.quroRedPrimary,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  orderBtn: {
    backgroundColor: '#1E293B',
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  orderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
