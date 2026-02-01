import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING } from '../constants/theme';

const TRENDING_SUB_CATS = ['Music', 'Gaming', 'News', 'Movies', 'Fashion'];

const TrendingView = ({ onBack, renderVideoItem, videoData }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="arrow-left" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Trending</Text>
        <View style={styles.rightIcons}>
          <Icon name="magnify" size={26} color="#000" style={{ marginRight: 15 }} />
          <Icon name="dots-vertical" size={26} color="#000" />
        </View>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <TouchableOpacity style={[styles.chip, styles.chipActive]}>
            <Text style={[styles.chipText, styles.chipTextActive]}>Top</Text>
          </TouchableOpacity>
          {TRENDING_SUB_CATS.map((cat) => (
            <TouchableOpacity key={cat} style={styles.chip}>
              <Text style={styles.chipText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={videoData}
        keyExtractor={(item) => item.id}
        renderItem={renderVideoItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
  },
  backBtn: { padding: 5 },
  title: { fontSize: 22, fontWeight: 'bold', marginLeft: 15, flex: 1, color: '#000' },
  rightIcons: { flexDirection: 'row' },
  chipScroll: { marginVertical: 10, paddingLeft: SPACING.lg },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 25,
    backgroundColor: '#F2F2F2',
    marginRight: 10,
  },
  chipActive: { backgroundColor: '#000' },
  chipText: { color: '#000', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
});

export default TrendingView;