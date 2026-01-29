import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ScrollView,
  TextInput,
  Share,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VideoCard from '../components/VideoCard';
import DescriptionModal from '../components/DescriptionModal';
import SaveModal from '../components/SaveModal';
import CommentsModal from '../components/CommentsModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


const { width } = Dimensions.get('window');

const MOCK_VIDEO_DATA = [
  {
    id: '1',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'Kristo Restaurant',
    views: '2.5M views',
    publishedAt: '1 year ago',
    thumbnail: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    channelAvatar: 'https://ui-avatars.com/api/?name=Kristo+Restaurant&background=111&color=fff',
    duration: '15:27',
  },
  {
    id: '2',
    title: 'How to Cook the Perfect Steak',
    channelName: 'Chef Ramsay',
    views: '1.2M views',
    publishedAt: '2 days ago',
    thumbnail: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    channelAvatar: 'https://ui-avatars.com/api/?name=Chef+Ramsay&background=random',
    duration: '08:45',
  },
  {
    id: '3',
    title: 'Traditional Italian Carbonara',
    channelName: 'Pasta Lover',
    views: '500K views',
    publishedAt: '1 month ago',
    thumbnail: 'https://images.unsplash.com/photo-1612874742237-982867143851?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    channelAvatar: 'https://ui-avatars.com/api/?name=Pasta+Lover&background=random',
    duration: '12:30',
  },
  {
    id: '4',
    title: 'Best Street Food in Tokyo',
    channelName: 'Food Explorer',
    views: '3.1M views',
    publishedAt: '3 weeks ago',
    thumbnail: 'https://images.unsplash.com/photo-1549488344-c7079f2795e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    channelAvatar: 'https://ui-avatars.com/api/?name=Food+Explorer&background=random',
    duration: '22:15',
  },
   {
    id: '5',
    title: 'Chocolate Lava Cake',
    channelName: 'Sweet Tooth',
    views: '800K views',
    publishedAt: '5 months ago',
    thumbnail: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    channelAvatar: 'https://ui-avatars.com/api/?name=Sweet+Tooth&background=random',
    duration: '05:45',
  },
];

const ActionButton = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={24} color="#212121" />
    <Text style={styles.actionText}>{label}</Text>
  </TouchableOpacity>
);

const VideoDetailsScreen = () => {
  const navigation = useNavigation();
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  
  // Using the first mock video for the details
  const currentVideo = MOCK_VIDEO_DATA[0];

  const onShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out this video: ${currentVideo.title}`,
        url: 'https://youtube.com', // Placeholder URL
        title: currentVideo.title,
      });
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
        } else {
          // shared
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Video Player Placeholder */}
      <View style={styles.videoPlayer}>
        <Image
            source={{ uri: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' }}
            style={styles.videoThumbnail}
        />
        <View style={styles.videoOverlay}>
             <View style={styles.videoControlsTop}>
                 <TouchableOpacity onPress={() => navigation.goBack()}>
                     <MaterialCommunityIcons name="chevron-down" size={32} color="#fff" />
                 </TouchableOpacity>
                 <View style={styles.topRightControls}>
                     <MaterialCommunityIcons name="cast" size={24} color="#fff" style={styles.iconSpacing} />
                     <MaterialCommunityIcons name="closed-caption" size={24} color="#fff" style={styles.iconSpacing} />
                     <MaterialCommunityIcons name="cog" size={24} color="#fff" />
                 </View>
             </View>
             <MaterialCommunityIcons name="play-circle-outline" size={64} color="rgba(255,255,255,0.8)" style={styles.playIcon} />
             <View style={styles.progressBarContainer}>
                <View style={styles.progressBar} />
                <View style={styles.progressCircle} />
                <Text style={styles.timeText}>00:00 / 15:27</Text>
                <MaterialCommunityIcons name="fullscreen" size={24} color="#fff" style={{marginLeft: 'auto'}} />
             </View>
        </View>
      </View>

      <View style={styles.infoContainer}>
        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={styles.videoTitle}>
            {currentVideo.title}
          </Text>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
             <MaterialCommunityIcons name="chevron-down" size={24} color="#212121" />
          </TouchableOpacity>
        </View>

        <Text style={styles.viewCount}>{currentVideo.views} • {currentVideo.publishedAt}</Text>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <ActionButton icon="thumb-up-outline" label="20K" />
          <ActionButton icon="thumb-down-outline" label="879" />
          <ActionButton icon="comment-text-outline" label="Chat" onPress={() => setCommentsModalVisible(true)} />
          <ActionButton icon="share-outline" label="Share" onPress={onShare} />
          <ActionButton icon="download-outline" label="Download" />
          <ActionButton icon="plus-box-outline" label="Save" onPress={() => setSaveModalVisible(true)} />
        </View>

        {/* Channel Info */}
        <View style={styles.channelRow}>
          <View style={styles.channelInfo}>
            <Image
              source={{ uri: 'https://ui-avatars.com/api/?name=Kristo+Restaurant&background=111&color=fff' }}
              style={styles.channelAvatar}
            />
            <View>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <Text style={styles.channelName}>Kristo Restaurant</Text>
                 <MaterialCommunityIcons name="check-decagram" size={12} color="#3ea6ff" style={{marginLeft: 4}} />
              </View>
              <Text style={styles.subscriberCount}>12.9M subscribers</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.subscribeButton}>
            <Text style={styles.subscribeText}>Subscribe</Text>
          </TouchableOpacity>
        </View>

        {/* Comments Preview */}
         <TouchableOpacity style={styles.commentsPreview} onPress={() => setCommentsModalVisible(true)} activeOpacity={0.8}>
            <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Comments <Text style={styles.commentsCount}>3.8K</Text></Text>
                <MaterialCommunityIcons name="unfold-more-horizontal" size={24} color="#212121" />
            </View>
            <View style={styles.addCommentRow}>
                 <Image source={{ uri: 'https://ui-avatars.com/api/?name=My+User' }} style={styles.userAvatarSmall} />
                 <View style={styles.commentInputPlaceholder}>
                     <TextInput
                        placeholder="Add a comment..."
                        placeholderTextColor="#606060"
                        style={styles.commentInputText}
                        editable={false} // Make it just a trigger for the modal
                     />
                 </View>
            </View>
         </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <FlatList
        data={MOCK_VIDEO_DATA}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <VideoCard video={item} onPress={() => {}} />}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
      />
      <DescriptionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        video={currentVideo}
      />
      <SaveModal
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
      />
      <CommentsModal 
        visible={commentsModalVisible}
        onClose={() => setCommentsModalVisible(false)}
      />
    </SafeAreaView>
  );
};

export default VideoDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    marginBottom: 8,
  },
  videoPlayer: {
    width: width,
    height: (width * 9) / 16,
    backgroundColor: '#000',
    position: 'relative',
  },
  videoThumbnail: {
      width: '100%',
      height: '100%',
      opacity: 0.6,
  },
  videoOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'space-between',
      padding: 10,
  },
  videoControlsTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  topRightControls: {
      flexDirection: 'row',
  },
  iconSpacing: {
      marginRight: 16,
  },
  playIcon: {
      alignSelf: 'center',
  },
  progressBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  progressBar: {
      flex: 1,
      height: 3,
      backgroundColor: '#fff',
      marginRight: 10,
  },
  progressCircle: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#fff',
      position: 'absolute',
      left: '30%', 
  },
  timeText: {
      color: '#fff',
      fontSize: 12,
      marginLeft: 8,
  },
  infoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    flex: 1,
    marginRight: 8,
    lineHeight: 24,
  },
  viewCount: {
    fontSize: 12,
    color: '#424242',
    marginTop: 8,
  },
  actionsContainer: {
    marginTop: 16,
    marginBottom: 16,
    flexDirection: 'row',  
    alignItems: 'center',
    justifyContent: 'space-between',    
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    marginTop: 4,
    color: '#212121',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e5e5',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#111',
  },
  channelName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  subscriberCount: {
    fontSize: 12,
    color: '#424242',
  },
  subscribeButton: {
    backgroundColor: '#F97507',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  subscribeText: {      
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  commentsPreview: {
      marginTop: 16,
  },
  commentsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  commentsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#212121',
      lineHeight: 24,
  },
  commentsCount: {
      color: '#212121',
      fontWeight: '700',
      fontSize: 16,
      lineHeight: 24,
  },
  addCommentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
  },
  userAvatarSmall: {
      width: 40,
      height: 40,
      borderRadius: 50,
      marginRight: 12,
  },
  commentInputPlaceholder: {
      backgroundColor: '#FAFAFA',
      paddingHorizontal: 20,
      borderRadius: 40,  
      flex: 1,
      height: 45,
      justifyContent: 'center',
  },
  commentInputText: {
      color: '#212121',
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
  },
});