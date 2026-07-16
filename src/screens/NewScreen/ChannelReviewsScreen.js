import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getChannelOrderReviews } from '../../services/channelService';
import { safeImageUri } from '../../utils/helper';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const formatWhen = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

const ChannelReviewsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { channelUserId, channelName } = route.params || {};

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 20;

  const load = useCallback(
    async (nextPage = 1, append = false) => {
      if (!channelUserId) {
        setItems([]);
        setLoading(false);
        return;
      }
      try {
        if (nextPage === 1 && !append) setLoading(true);
        if (append) setLoadingMore(true);
        const res = await getChannelOrderReviews(channelUserId, nextPage, limit);
        const list = Array.isArray(res?.items) ? res.items : [];
        setTotal(Number(res?.total) || 0);
        if (append) setItems(prev => [...prev, ...list]);
        else setItems(list);
        setPage(nextPage);
      } catch (e) {
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [channelUserId],
  );

  useEffect(() => {
    load(1, false);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(1, false);
  };

  const onEndReached = () => {
    if (loadingMore || loading) return;
    if (items.length >= total) return;
    load(page + 1, true);
  };

  const title = channelName
    ? `Reviews · ${channelName}`
    : 'Channel reviews';

  const renderItem = ({ item }) => {
    const r = Number(item?.rating) || 0;
    const stars = [1, 2, 3, 4, 5];
    const name = item?.user?.name || 'Customer';
    const avatar = safeImageUri(
      item?.user?.avatar,
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name,
      )}&background=E8E8E8&color=333`,
    );

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          <View style={styles.cardTopText}>
            <Text style={styles.reviewerName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.dateText}>{formatWhen(item?.createdAt)}</Text>
          </View>
          <View style={styles.starsRow}>
            {stars.map(s => (
              <Icon
                key={s}
                name={s <= r ? 'star' : 'star-outline'}
                size={16}
                color={s <= r ? '#FFB800' : COLORS.gray300}
              />
            ))}
          </View>
        </View>
        {item?.comment ? (
          <Text style={styles.comment}>{item.comment}</Text>
        ) : (
          <Text style={styles.noComment}>No comment</Text>
        )}
      </View>
    );
  };

  if (!channelUserId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-left" size={26} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Missing channel.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primaryOrange} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={it => String(it.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primaryOrange]}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={{ marginVertical: 12 }}
                color={COLORS.primaryOrange}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Icon name="star-outline" size={48} color={COLORS.gray300} />
              <Text style={styles.emptyText}>No reviews yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundWhite ?? COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gray200,
  },
  cardTopText: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  comment: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  noComment: {
    fontSize: 13,
    color: COLORS.gray400,
    fontStyle: 'italic',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray600,
    textAlign: 'center',
  },
});

export default ChannelReviewsScreen;
