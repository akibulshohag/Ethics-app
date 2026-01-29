import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { height } = Dimensions.get('window');

const DescriptionModal = ({ visible, onClose, video }) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.dragHandle} />
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>Description</Text>
                    <TouchableOpacity onPress={onClose}>
                        <MaterialCommunityIcons name="close" size={24} color="#212121" />
                    </TouchableOpacity>
                </View>
                <View style={styles.divider} />
              </View>

              <ScrollView removeClippedSubviews={true} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Video Title */}
                <Text style={styles.videoTitle}>
                  {video.title}
                </Text>

                {/* Channel Info */}
                <View style={styles.channelRow}>
                  <Image
                    source={{ uri: video.channelAvatar }}
                    style={styles.channelAvatar}
                  />
                  <Text style={styles.channelName}>{video.channelName}</Text>
                  <MaterialCommunityIcons name="check-decagram" size={14} color="#3ea6ff" style={{ marginLeft: 4 }} />
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>20K</Text>
                        <Text style={styles.statLabel}>Likes</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>879</Text>
                        <Text style={styles.statLabel}>Dislikes</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{video.views.split(' ')[0]}</Text>
                        <Text style={styles.statLabel}>Views</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>Dec 24</Text>
                        <Text style={styles.statLabel}>2022</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Tags */}
                <Text style={styles.tags}>
                    #food #restaurant #bbq #chicken
                </Text>

                {/* Description Body */}
                <Text style={styles.descriptionText}>
                    Taken Kristo Restauranth II
                    {'\n\n'}
                    A cozy restaurant serving fresh, delicious food made with quality ingredients. Enjoy great taste, warm service, and a comfortable dining experience.
                    {'\n\n'}
                    We offer a modern dining experience with carefully crafted dishes, fresh ingredients, and excellent service. A perfect place for family, friends, and food lovers.
                    {'\n\n'}
                    Good food, good mood! Our restaurant is all about tasty meals, friendly vibes, and moments worth sharing with your loved ones.
                    Good food, good mood! Our restaurant is all about tasty meals, friendly vibes, and moments worth sharing with your loved ones.
                    Good food, good mood! Our restaurant is all about tasty meals, friendly vibes, and moments worth sharing with your loved ones.
                </Text>

              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    height: height * 0.67, // Occupy 75% of screen height
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: {
    paddingTop: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  divider: {
      height: 0.5,
      backgroundColor: '#f2f2f2',
      marginBottom: 16,
  },
  content: {
    paddingBottom: 24,
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: '700', // Using user's updated font weight
    color: '#212121', // Using user's updated color
    marginBottom: 12,
    lineHeight: 26,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  channelAvatar: {
    width: 30,
    height: 30,
    borderRadius: 50,
    marginRight: 8,
    backgroundColor: '#111',
  },
  channelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
      paddingHorizontal: 10,
  },
  statItem: {
      alignItems: 'center',
  },
  statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: '#212121',
      marginBottom: 4,
  },
  statLabel: {
      fontSize: 12,
      color: '#424242', // User's secondary color
      fontWeight: '500',
  },
  tags: {
      color: '#246BFD',
      fontSize: 14,
      marginBottom: 16,
      lineHeight: 20,
  },
  descriptionText: {
      fontSize: 14,
      color: '#212121',
      lineHeight: 22,
  },
});

export default DescriptionModal;
