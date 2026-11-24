import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRider } from '@/context/RiderContext';
import { BACKEND_URL } from '@/config';

export default function HelpSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessionToken, driverProfile } = useRider();

  const [activeTab, setActiveTab] = useState<'issues' | 'my_tickets'>('issues');
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [isSendingReply, setIsSendingReply] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/more');
    }
  };

  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    try {
      if (sessionToken) {
        const res = await fetch(`${BACKEND_URL}/api/delivery/rider/support-tickets`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            Origin: 'http://localhost:3000',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.tickets && Array.isArray(data.tickets)) {
            setTickets(data.tickets);
            return;
          }
        }
      }

      const rId = driverProfile?.id || driverProfile?.deId;
      if (rId) {
        const res = await fetch(`${BACKEND_URL}/api/complaints/rider/${rId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.tickets && Array.isArray(data.tickets)) {
            setTickets(data.tickets);
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching rider support tickets:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [sessionToken]);

  const handleSendTicketReply = async (ticketId: string) => {
    const text = replyTextMap[ticketId]?.trim();
    if (!text) return;

    setIsSendingReply(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/complaints/${ticketId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          senderId: driverProfile?.id || driverProfile?.deId || 'RIDER',
          senderName: driverProfile?.name || 'Rider',
          senderType: 'CUSTOMER',
          message: text,
        }),
      });

      if (res.ok) {
        setReplyTextMap((prev) => ({ ...prev, [ticketId]: '' }));
        fetchTickets();
      } else {
        Alert.alert('Error', 'Failed to send message.');
      }
    } catch (err) {
      console.error('Error replying to ticket:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  const issuesList = [
    { id: '1', title: 'Order earning issue', icon: 'cash-outline', route: '/trip-earning' },
    { id: '2', title: 'Incentives and Payout issue', icon: 'wallet-outline', route: '/payout-issue' },
    { id: '3', title: 'Daily incentive issue', icon: 'calendar-outline', route: '/daily-incentive' },
    { id: '4', title: 'Incorrect Payout to Bank', icon: 'business-outline', route: '/bank-payout-issue' },
    { id: '5', title: 'Minimum Guarantee issue', icon: 'shield-checkmark-outline', route: '/min-guarantee' },
    { id: '6', title: 'Petrol incentive issue', icon: 'speedometer-outline', route: '/petrol-issue' },
    { id: '7', title: 'Penalty or Deduction issue', icon: 'alert-circle-outline', route: '/penalty-issue' },
    { id: '8', title: 'Referral Bonus issue', icon: 'people-outline', route: '/referral-issue' },
    { id: '9', title: 'Joining Bonus issue', icon: 'gift-outline', route: '/joining-issue' },
    { id: '10', title: 'Floating cash issue', icon: 'card-outline', route: '/floating-cash' },
  ];

  const handleIssuePress = (item: any) => {
    if (item.route) {
      router.push(item.route as any);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':
      case 'SUBMITTED':
        return { label: 'Open', color: '#F2CA50', bg: 'rgba(242, 202, 80, 0.15)' };
      case 'IN_PROGRESS':
        return { label: 'In Review', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
      case 'RESOLVED':
        return { label: 'Resolved', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'ESCALATED':
        return { label: 'Escalated', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      default:
        return { label: status || 'Pending', color: '#F2CA50', bg: 'rgba(242, 202, 80, 0.15)' };
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Help & Support</Text>
        <TouchableOpacity onPress={fetchTickets} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="refresh" size={20} color="#F2CA50" />
        </TouchableOpacity>
      </View>

      {/* TAB SELECTOR */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'issues' && styles.tabButtonActive]}
          onPress={() => setActiveTab('issues')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabButtonText, activeTab === 'issues' && styles.tabButtonTextActive]}>
            Raise an Issue
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'my_tickets' && styles.tabButtonActive]}
          onPress={() => setActiveTab('my_tickets')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabButtonText, activeTab === 'my_tickets' && styles.tabButtonTextActive]}>
            My Tickets {tickets.length > 0 ? `(${tickets.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <Text style={styles.welcomeSubtitle}>Welcome to the</Text>
          <Text style={styles.heroTitleText}>
            Delivery Partner <Text style={styles.heroTitleGold}>Help Center</Text>
          </Text>

          {/* Underline Gold Arc Line */}
          <View style={styles.goldArcLine} />

          {/* 3D Support Agent Mascot Graphic */}
          <View style={styles.agentCircleWrapper}>
            <View style={styles.agentOuterCircle}>
              <Image
                source={require('../../assets/images/3d_support_agent_namaste.png')}
                style={styles.agentImage}
                resizeMode="cover"
              />
            </View>

            {/* Sparkles */}
            <Ionicons name="sparkles" size={16} color="#F2CA50" style={styles.sparkleLeft} />
            <Ionicons name="sparkles" size={14} color="#F2CA50" style={styles.sparkleRight} />
          </View>

          <Text style={styles.needHelpText}>Need any help?</Text>
          <Text style={styles.myQuroText}>My Quro is here for you 24x7.</Text>
        </View>

        {activeTab === 'my_tickets' ? (
          /* MY TICKETS VIEW */
          <View>
            <Text style={styles.sectionHeaderTitle}>Your Raised Support Tickets</Text>
            {isLoadingTickets ? (
              <ActivityIndicator size="small" color="#F2CA50" style={{ marginVertical: 20 }} />
            ) : tickets.length === 0 ? (
              <View style={styles.emptyTicketsCard}>
                <Ionicons name="checkmark-circle-outline" size={44} color="#F2CA50" />
                <Text style={styles.emptyTicketsTitle}>No Active Tickets</Text>
                <Text style={styles.emptyTicketsSubtitle}>
                  You have no pending support tickets. If you encounter any payout, trip, or penalty issue, raise a ticket from the issues list.
                </Text>
                <TouchableOpacity
                  style={styles.raiseIssueBtn}
                  onPress={() => setActiveTab('issues')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.raiseIssueBtnText}>Raise an Issue</Text>
                </TouchableOpacity>
              </View>
            ) : (
              tickets.map((t) => {
                const badge = getStatusBadge(t.status);
                const isExpanded = expandedTicketId === t.id;
                const messages = Array.isArray(t.messages) ? t.messages : [];

                return (
                  <View key={t.id} style={styles.ticketCard}>
                    <TouchableOpacity
                      style={styles.ticketCardHeader}
                      onPress={() => setExpandedTicketId(isExpanded ? null : t.id)}
                      activeOpacity={0.85}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.ticketIdRow}>
                          <Text style={styles.ticketIdText}>#{t.id}</Text>
                          <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                          </View>
                        </View>
                        <Text style={styles.ticketSubjectText}>{t.reason || t.subject || 'Support Ticket'}</Text>
                        <Text style={styles.ticketCategoryText}>Category: {t.category || 'General'}</Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#F2CA50"
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.ticketCardBody}>
                        <View style={styles.divider} />
                        <Text style={styles.bodyLabel}>Description</Text>
                        <Text style={styles.bodyDesc}>{t.description || 'No description provided.'}</Text>

                        {/* MESSAGES THREAD */}
                        {messages.length > 0 && (
                          <View style={styles.chatThreadWrap}>
                            <Text style={styles.bodyLabel}>Conversation</Text>
                            {messages.map((m: any, mIdx: number) => {
                              const isRider = m.senderType === 'CUSTOMER' || m.senderId === driverProfile?.id;
                              return (
                                <View
                                  key={m.id || mIdx}
                                  style={[
                                    styles.chatMsgBubble,
                                    isRider ? styles.chatMsgBubbleRider : styles.chatMsgBubbleSupport,
                                  ]}
                                >
                                  <Text style={styles.chatMsgSender}>
                                    {isRider ? 'You' : 'MyQuro Partner Support'}
                                  </Text>
                                  <Text style={styles.chatMsgText}>{m.message}</Text>
                                </View>
                              );
                            })}
                          </View>
                        )}

                        {/* REPLY INPUT */}
                        {t.status !== 'RESOLVED' && (
                          <View style={styles.ticketReplyRow}>
                            <TextInput
                              placeholder="Add follow-up details..."
                              placeholderTextColor="#666"
                              value={replyTextMap[t.id] || ''}
                              onChangeText={(txt) => setReplyTextMap((prev) => ({ ...prev, [t.id]: txt }))}
                              style={styles.ticketReplyInput}
                            />
                            <TouchableOpacity
                              style={styles.ticketSendBtn}
                              onPress={() => handleSendTicketReply(t.id)}
                              disabled={isSendingReply}
                              activeOpacity={0.85}
                            >
                              {isSendingReply ? (
                                <ActivityIndicator size="small" color="#000000" />
                              ) : (
                                <Ionicons name="send" size={16} color="#000000" />
                              )}
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        ) : (
          /* RAISE A NEW ISSUE SECTION */
          <View>
            <Text style={styles.sectionHeaderTitle}>Raise a new issue</Text>

            <View style={styles.issuesCardContainer}>
              {issuesList.map((item, index) => {
                const isLast = index === issuesList.length - 1;

                return (
                  <View key={item.id}>
                    <TouchableOpacity
                      onPress={() => handleIssuePress(item)}
                      style={styles.issueRow}
                      activeOpacity={0.8}
                    >
                      <View style={styles.issueLeftGroup}>
                        <View style={styles.iconCircleBox}>
                          <Ionicons name={item.icon as any} size={20} color="#F2CA50" />
                        </View>
                        <Text style={styles.issueTitleText}>{item.title}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
                    </TouchableOpacity>
                    {!isLast && <View style={styles.dottedDivider} />}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.2)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.4)',
  },
  tabButtonText: {
    fontSize: 13,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#F2CA50',
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 4,
  },
  welcomeSubtitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#EAE1D4',
    marginBottom: 3,
  },
  heroTitleText: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroTitleGold: {
    color: '#F2CA50',
  },
  goldArcLine: {
    width: 60,
    height: 3,
    backgroundColor: '#F2CA50',
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 14,
  },
  agentCircleWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  agentOuterCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(242, 202, 80, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(242, 202, 80, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  agentImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  sparkleLeft: {
    position: 'absolute',
    top: 6,
    left: -10,
  },
  sparkleRight: {
    position: 'absolute',
    bottom: 12,
    right: -10,
  },
  needHelpText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  myQuroText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#A99260',
    marginTop: 2,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    marginTop: 6,
  },
  emptyTicketsCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.2)',
    padding: 24,
    alignItems: 'center',
  },
  emptyTicketsTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginTop: 10,
  },
  emptyTicketsSubtitle: {
    fontSize: 12,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  raiseIssueBtn: {
    marginTop: 16,
    backgroundColor: '#F2CA50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  raiseIssueBtnText: {
    fontSize: 13,
    color: '#000000',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  ticketCard: {
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.25)',
    marginBottom: 10,
    overflow: 'hidden',
  },
  ticketCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  ticketIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ticketIdText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  ticketSubjectText: {
    fontSize: 14,
    color: '#EAE1D4',
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
  },
  ticketCategoryText: {
    fontSize: 11,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-Regular',
    marginTop: 2,
  },
  ticketCardBody: {
    padding: 14,
    paddingTop: 0,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  bodyLabel: {
    fontSize: 11,
    color: '#A99260',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 4,
  },
  bodyDesc: {
    fontSize: 13,
    color: '#D4AF37',
    fontFamily: 'Urbanist-Regular',
    lineHeight: 18,
    marginBottom: 10,
  },
  chatThreadWrap: {
    marginTop: 6,
    gap: 6,
  },
  chatMsgBubble: {
    padding: 10,
    borderRadius: 10,
    maxWidth: '85%',
  },
  chatMsgBubbleRider: {
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  chatMsgBubbleSupport: {
    backgroundColor: '#1E1E1E',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  chatMsgSender: {
    fontSize: 10,
    color: '#A99260',
    fontFamily: 'Urbanist-Bold',
    marginBottom: 2,
  },
  chatMsgText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Regular',
  },
  ticketReplyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  ticketReplyInput: {
    flex: 1,
    backgroundColor: '#181818',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
  },
  ticketSendBtn: {
    backgroundColor: '#F2CA50',
    borderRadius: 10,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  issuesCardContainer: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  issueLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircleBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(242, 202, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  issueTitleText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Medium',
  },
  dottedDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
});
