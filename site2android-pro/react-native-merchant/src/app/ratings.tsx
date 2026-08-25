import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface Review {
  id: string;
  customerName: string;
  rating: number;
  date: string;
  comment: string;
  itemsOrdered: string;
  category: 'Food' | 'Outlet' | 'Delivery';
  tags: string[];
  reply?: string;
}

export default function RatingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Filters state
  const [ratingFilter, setRatingFilter] = useState<'All' | 5 | 4 | 3 | 2 | 1>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Food' | 'Outlet' | 'Delivery'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reply modal state
  const [replyTarget, setReplyTarget] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');

  // Rich list of mock customer reviews
  const [reviews, setReviews] = useState<Review[]>([
    {
      id: 'REV-101',
      customerName: 'Deepak Kumar',
      rating: 5,
      date: 'Today',
      comment: 'The Butter Chicken was absolutely delicious! Rich gravy and perfectly cooked chicken. Highly recommend this outlet for authentic Indian food.',
      itemsOrdered: 'Butter Chicken, Garlic Naan',
      category: 'Food',
      tags: ['Great Taste', 'Packaging', 'Hot Food'],
      reply: 'Thank you Deepak! Glad you loved the Butter Chicken.',
    },
    {
      id: 'REV-102',
      customerName: 'Sneha Reddy',
      rating: 5,
      date: 'Yesterday',
      comment: 'Dosa was extremely crispy and sambar was piping hot! The delivery was also very fast. Five stars for service.',
      itemsOrdered: 'Masala Dosa, Samosa',
      category: 'Delivery',
      tags: ['Super Fast', 'Crispy Dosa', 'Piping Hot'],
    },
    {
      id: 'REV-103',
      customerName: 'Rajesh Kumar',
      rating: 4,
      date: '2 days ago',
      comment: 'Loved the Dal Makhani. The portions were large and packaging was clean. Only concern was Garlic Naan got a bit chewy.',
      itemsOrdered: 'Dal Makhani, Garlic Naan, Veg Pulao',
      category: 'Food',
      tags: ['Good Portions', 'Chewy Naan', 'Clean Box'],
    },
    {
      id: 'REV-104',
      customerName: 'Neha Sharma',
      rating: 5,
      date: '4 days ago',
      comment: 'Super clean packaging, prompt delivery agent, and the food quality is always top-notch. My family loves this restaurant.',
      itemsOrdered: 'Kadhai Paneer, Tandoori Roti',
      category: 'Outlet',
      tags: ['Family Favorite', 'Hygienic', 'Friendly Service'],
    },
    {
      id: 'REV-105',
      customerName: 'Aarav Gupta',
      rating: 3,
      date: '1 week ago',
      comment: 'Food was decent but delivery was delayed by 25 minutes. Paneer was soft but the gravy could be spicier.',
      itemsOrdered: 'Kadhai Paneer, Veg Pulao',
      category: 'Delivery',
      tags: ['Delayed Delivery', 'Mild Gravy'],
      reply: 'Apologies Aarav, we are addressing delivery delays with our logistics partner.',
    },
    {
      id: 'REV-106',
      customerName: 'Priya Patel',
      rating: 4,
      date: '1 week ago',
      comment: 'The Samosas are highly addictive! Very crunchy and fresh chutney. Paneer butter masala was good too.',
      itemsOrdered: 'Samosa, Paneer Butter Masala',
      category: 'Food',
      tags: ['Crunchy Samosa', 'Tasty Chutney'],
    },
    {
      id: 'REV-107',
      customerName: 'Rohan Joshi',
      rating: 2,
      date: '2 weeks ago',
      comment: 'Disappointed with the order. The naan was burnt and cold when delivered. Dal Makhani tasted okay but could be better.',
      itemsOrdered: 'Dal Makhani, Garlic Naan',
      category: 'Food',
      tags: ['Burnt Naan', 'Cold Food'],
    },
  ]);

  // Overall Statistics
  const ratingStats = useMemo(() => {
    const total = reviews.length;
    const defaultCounts: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const defaultBreakdown: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (total === 0) return { avg: 0, breakdown: defaultBreakdown, counts: defaultCounts, total: 0 };

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = Math.round((sum / total) * 10) / 10;

    const counts: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (counts[r.rating] !== undefined) {
        counts[r.rating]++;
      }
    });

    const breakdown: { [key: number]: number } = {};
    for (let stars = 1; stars <= 5; stars++) {
      breakdown[stars] = Math.round((counts[stars] / total) * 100);
    }

    return { avg, breakdown, counts, total };
  }, [reviews]);

  // Category average ratings (calculated)
  const categoryRatings = useMemo(() => {
    const food = reviews.filter(r => r.category === 'Food');
    const outlet = reviews.filter(r => r.category === 'Outlet');
    const delivery = reviews.filter(r => r.category === 'Delivery');

    const getAvg = (list: Review[]) => {
      if (list.length === 0) return 0;
      return Math.round((list.reduce((acc, r) => acc + r.rating, 0) / list.length) * 10) / 10;
    };

    return {
      Food: getAvg(food) || 4.7,
      Outlet: getAvg(outlet) || 4.8,
      Delivery: getAvg(delivery) || 4.4,
    };
  }, [reviews]);

  // Filtering reviews list
  const filteredReviews = useMemo(() => {
    let list = [...reviews];

    if (ratingFilter !== 'All') {
      list = list.filter((r) => r.rating === ratingFilter);
    }

    if (categoryFilter !== 'All') {
      list = list.filter((r) => r.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => 
        r.customerName.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q) ||
        r.itemsOrdered.toLowerCase().includes(q) ||
        r.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    return list;
  }, [reviews, ratingFilter, categoryFilter, searchQuery]);

  const handlePostReply = () => {
    if (!replyTarget || !replyText.trim()) return;

    setReviews(prev => prev.map(r => 
      r.id === replyTarget.id ? { ...r, reply: replyText.trim() } : r
    ));

    Alert.alert('Success', 'Your reply has been posted successfully.');
    setReplyTarget(null);
    setReplyText('');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#E8C547" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Ratings & Reviews</Text>
            <Text style={styles.headerSubtitle}>
              Monitor customer feedback and response reviews
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          
          {/* Summary Ratings Statistics Cards */}
          <View style={styles.summaryBlock}>
            <View style={styles.avgStarsCard}>
              <Text style={styles.starsValText}>{ratingStats.avg}</Text>
              <View style={styles.starsIconRow}>
                {Array.from({ length: 5 }).map((_, idx) => {
                  const filled = idx < Math.round(ratingStats.avg);
                  return (
                    <Ionicons
                      key={idx}
                      name={filled ? 'star' : 'star-outline'}
                      size={18}
                      color="#E8C547"
                      style={{ marginRight: 2 }}
                    />
                  );
                })}
              </View>
              <Text style={styles.reviewsCountTotal}>{ratingStats.total} Total Reviews</Text>
            </View>

            {/* Star Distribution Breakdown bars */}
            <View style={styles.breakdownCard}>
              {[5, 4, 3, 2, 1].map((stars) => {
                const percent = ratingStats.breakdown[stars] || 0;
                const count = ratingStats.counts[stars] || 0;
                return (
                  <View key={stars} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{stars} ★</Text>
                    <View style={styles.breakdownTrack}>
                      <View style={[styles.breakdownFill, { width: `${percent}%` }]} />
                    </View>
                    <Text style={styles.breakdownPctText}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Ratings by Department Categories */}
          <View style={styles.categoriesRatingsGrid}>
            <View style={styles.catRatingCard}>
              <Ionicons name="fast-food-outline" size={18} color="#E8C547" />
              <Text style={styles.catRatingName}>Food Quality</Text>
              <Text style={styles.catRatingStars}>{categoryRatings.Food} ★</Text>
            </View>

            <View style={styles.catRatingCard}>
              <Ionicons name="storefront-outline" size={18} color="#E8C547" />
              <Text style={styles.catRatingName}>Outlet Prep</Text>
              <Text style={styles.catRatingStars}>{categoryRatings.Outlet} ★</Text>
            </View>

            <View style={styles.catRatingCard}>
              <Ionicons name="bicycle-outline" size={18} color="#E8C547" />
              <Text style={styles.catRatingName}>Delivery Speed</Text>
              <Text style={styles.catRatingStars}>{categoryRatings.Delivery} ★</Text>
            </View>
          </View>

          {/* Filter Controls Row */}
          <View style={styles.filtersBlock}>
            <Text style={styles.blockTitle}>Filter Reviews</Text>
            
            {/* Star Filters Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.starsFilterRow}>
              {(['All', 5, 4, 3, 2, 1] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterBtn, ratingFilter === s && styles.filterBtnActive]}
                  onPress={() => setRatingFilter(s)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterBtnText, ratingFilter === s && styles.filterBtnTextActive]}>
                    {s === 'All' ? 'All Stars' : `${s} ★`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Category Filters Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catFilterRow}>
              {(['All', 'Food', 'Outlet', 'Delivery'] as const).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.filterBtn, categoryFilter === c && styles.filterBtnActive]}
                  onPress={() => setCategoryFilter(c)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterBtnText, categoryFilter === c && styles.filterBtnTextActive]}>
                    {c === 'All' ? 'All Categories' : c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Text Search Input */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color="#E8C547" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search reviews (e.g. food quality, cold, naan)..."
                placeholderTextColor="#8E8E8E"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Customer Reviews Feed */}
          <View style={styles.feedBlock}>
            <Text style={styles.blockTitle}>Customer Feedback Feed ({filteredReviews.length})</Text>

            {filteredReviews.length > 0 ? (
              filteredReviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  {/* Name and Stars */}
                  <View style={styles.reviewHeader}>
                    <View>
                      <Text style={styles.reviewerName}>{review.customerName}</Text>
                      <Text style={styles.reviewDate}>{review.date} • {review.category}</Text>
                    </View>
                    <View style={styles.reviewerStarsBadge}>
                      <Text style={styles.reviewerStarsText}>{review.rating} ★</Text>
                    </View>
                  </View>

                  {/* Comment */}
                  <Text style={styles.reviewComment}>"{review.comment}"</Text>

                  {/* Ordered Items */}
                  <View style={styles.orderedItemsContainer}>
                    <Ionicons name="receipt-outline" size={12} color="#8E8E8E" style={{ marginRight: 6 }} />
                    <Text style={styles.orderedItemsText}>{review.itemsOrdered}</Text>
                  </View>

                  {/* Tags */}
                  <View style={styles.tagsContainer}>
                    {review.tags.map((tag, idx) => (
                      <View key={idx} style={styles.tagBadge}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Owner Reply */}
                  {review.reply ? (
                    <View style={styles.ownerReplyBox}>
                      <View style={styles.replyHeaderRow}>
                        <Ionicons name="chatbubble-ellipses-outline" size={13} color="#E8C547" style={{ marginRight: 6 }} />
                        <Text style={styles.replyHeaderLabel}>Your Response</Text>
                      </View>
                      <Text style={styles.replyTextBody}>{review.reply}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.replyActionBtn}
                      onPress={() => setReplyTarget(review)}
                    >
                      <Ionicons name="arrow-undo-outline" size={14} color="#E8C547" style={{ marginRight: 6 }} />
                      <Text style={styles.replyActionText}>Reply to review</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.noReviewsText}>No reviews match the selected filters.</Text>
            )}
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Reply Modal */}
      {replyTarget && (
        <Modal
          visible={replyTarget !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setReplyTarget(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reply to {replyTarget.customerName}</Text>
                <TouchableOpacity onPress={() => setReplyTarget(null)}>
                  <Ionicons name="close" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.reviewCommentQuote}>"{replyTarget.comment}"</Text>
                
                <Text style={styles.inputLabel}>Write your reply</Text>
                <TextInput
                  style={styles.replyInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Thank you for your feedback! We will try to improve..."
                  placeholderTextColor="#8E8E8E"
                  value={replyText}
                  onChangeText={setReplyText}
                />

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.postReplyBtn}
                  onPress={handlePostReply}
                >
                  <Text style={styles.postReplyBtnText}>Post Response</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#000000',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 1,
  },
  mainScroll: {
    flex: 1,
  },

  /* Summary blocks */
  summaryBlock: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 18,
    justifyContent: 'space-between',
  },
  avgStarsCard: {
    flex: 1,
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 14,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starsValText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  starsIconRow: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  reviewsCountTotal: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  breakdownCard: {
    flex: 1.2,
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    justifyContent: 'center',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2.5,
  },
  breakdownLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E8E',
    width: 25,
  },
  breakdownTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#141414',
    marginHorizontal: 8,
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#E8C547',
  },
  breakdownPctText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    width: 15,
    textAlign: 'right',
  },

  /* Department Ratings */
  categoriesRatingsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  catRatingCard: {
    flex: 1,
    backgroundColor: '#191919',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 10,
    marginRight: 6,
    alignItems: 'center',
  },
  catRatingName: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 4,
  },
  catRatingStars: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#E8C547',
    marginTop: 2,
  },

  /* Filters styling */
  filtersBlock: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  blockTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  starsFilterRow: {
    paddingVertical: 2,
  },
  catFilterRow: {
    paddingVertical: 2,
    marginTop: 6,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#191919',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  filterBtnActive: {
    backgroundColor: '#E8C547',
    borderColor: '#E8C547',
  },
  filterBtnText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  filterBtnTextActive: {
    color: '#0B0B0B',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    fontWeight: '400',
  },

  /* Feed Reviews Cards */
  feedBlock: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  reviewCard: {
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 14,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewerName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reviewDate: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 2,
  },
  reviewerStarsBadge: {
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reviewerStarsText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#E8C547',
  },
  reviewComment: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    fontWeight: '400',
    color: '#FFFFFF',
    marginVertical: 10,
    lineHeight: 18,
  },
  orderedItemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderedItemsText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  tagBadge: {
    backgroundColor: '#141414',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  tagText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  ownerReplyBox: {
    backgroundColor: '#141414',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 10,
    marginTop: 8,
  },
  replyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyHeaderLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E8C547',
  },
  replyTextBody: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#8E8E8E',
    lineHeight: 16,
  },
  replyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 4,
  },
  replyActionText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#E8C547',
  },
  noReviewsText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E8E',
    textAlign: 'center',
    paddingVertical: 24,
  },

  /* Reply Dialog modal styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 11, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5,
    fontWeight: '700',
    color: '#E8C547',
  },
  modalBody: {
    padding: 16,
  },
  reviewCommentQuote: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#8E8E8E',
    lineHeight: 16,
    marginBottom: 16,
    backgroundColor: '#141414',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  inputLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  replyInput: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    fontWeight: '400',
    textAlignVertical: 'top',
    height: 100,
    marginBottom: 16,
  },
  postReplyBtn: {
    backgroundColor: '#E8C547',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  postReplyBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#0B0B0B',
  },
});
