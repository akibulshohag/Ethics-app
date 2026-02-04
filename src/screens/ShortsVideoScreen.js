/* eslint-disable react-native/no-inline-styles */
import React, { useRef, useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    Dimensions, 
    TouchableOpacity, 
    Image, 
    StatusBar,
    Platform
} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import CommentsModal from '../components/CommentsModal';
import SettingsModal from '../components/SettingsModal';
import CreateVideoModal from '../components/CreateVideoModal';

const { width, height: windowHeight } = Dimensions.get('window');

// Mock Data
const MOCK_VIDEOS = [
    {
        id: '1',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        user: {
            id: 'u1',
            username: 'Jenny Wilson',
            avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
            isSubscribed: false
        },
        description: "Hello everyone, in this video I will See one of my favorite Foods ❤️❤️",
        hashtags: ['#Foods', '#resturent', '#love', '#eat'],
        likes: '27.8K',
        dislikes: '3.6K',
        comments: '2.4K',
        shares: '2.2K',
    },
    {
        id: '2',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        user: {
            id: 'u2',
            username: 'Foodie Life',
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
            isSubscribed: true
        },
        description: "Best burger in town! You have to try this out. 🍔🍟",
        hashtags: ['#Burger', '#FoodPorn', '#Yummy'],
        likes: '125K',
        dislikes: '1.2K',
        comments: '8K',
        shares: '15K',
    },
    {
        id: '3',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        user: {
            id: 'u3',
            username: 'Nature Lover',
            avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
            isSubscribed: false
        },
        description: "The beauty of nature is unmatched. 🌲🍃",
        hashtags: ['#Nature', '#Peace', '#Forest'],
        likes: '50K',
        dislikes: '200',
        comments: '500',
        shares: '3K',
    }
];

const VideoItem = ({ item, isActive, index, screenHeight, onOpenComments, onOpenSettings, onOpenCreate, navigation }) => {
    const [paused, setPaused] = useState(!isActive);
    const insets = useSafeAreaInsets();
    
    // Manage play/pause based on active state
    useEffect(() => {
        setPaused(!isActive);
    }, [isActive]);

    const togglePause = () => {
        setPaused(prev => !prev);
    };

    return (
        <View style={[styles.videoContainer, { height: screenHeight, width: width }]}>
            <Video
                source={{ uri: item.videoUrl }}
                style={styles.video}
                resizeMode="cover"
                repeat
                paused={paused}
                playInBackground={false}
                playWhenInactive={false}
                ignoreSilentSwitch="ignore"
            />
            
            {/* Transparent Touch Overlay for Play/Pause - ZIndex 1 */}
            <TouchableOpacity 
                activeOpacity={1} 
                onPress={togglePause} 
                style={styles.touchOverlay}
            >
                {paused && (
                    <View style={styles.pauseIconContainer}>
                        <Ionicons name="play" size={50} color="rgba(255,255,255,0.6)" />
                    </View>
                )}
            </TouchableOpacity>

            {/* Gradient Overlay - ZIndex 5 */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
                style={styles.gradient}
                pointerEvents="none"
            />

            {/* Top Right Icons - ZIndex 10 */}
            <View style={[styles.topRightIcons, { top: insets.top + 10 }]} pointerEvents="box-none">
                <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="search-outline" size={26} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={onOpenCreate}>
                    <Ionicons name="camera-outline" size={26} color="white" />
                </TouchableOpacity>
            </View>

            {/* Right Side Action Bar - ZIndex 10 */}
            <View style={[styles.rightSideBar, { bottom: 100 }]} pointerEvents="box-none">
                <TouchableOpacity style={styles.actionItem}>
                    <Ionicons name="flag-outline" size={28} color="white" style={styles.shadow} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem}>
                    <Ionicons name="thumbs-up" size={30} color="white" style={styles.shadow} />
                    <Text style={styles.actionText}>{item.likes}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem}>
                    <Ionicons name="thumbs-down" size={30} color="white" style={styles.shadow} />
                    <Text style={styles.actionText}>{item.dislikes}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={onOpenComments}>
                    <Ionicons name="chatbubble-ellipses-outline" size={28} color="white" style={styles.shadow} />
                    <Text style={styles.actionText}>{item.comments}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem}>
                    <FontAwesome name="share" size={28} color="white" style={styles.shadow} />
                    <Text style={styles.actionText}>{item.shares}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={onOpenSettings}>
                    <Ionicons name="ellipsis-horizontal" size={28} color="white" style={styles.shadow} />
                </TouchableOpacity>
            </View>

            {/* Bottom Info Section - ZIndex 10 */}
            <View style={[styles.bottomInfo, { bottom: 20 }]} pointerEvents="box-none">
                {/* Description */}
                <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionText}>
                        {item.description}
                    </Text>
                    <Text style={styles.hashtagsText}>
                        {item.hashtags.map((tag, idx) => (
                             <Text key={idx} style={styles.hashtag}>{tag} </Text>
                        ))}
                    </Text>
                </View>

                {/* User Row */}
                <View style={styles.userRow}>
                    <TouchableOpacity onPress={() => navigation.navigate('ChannelProfileScreen')}>
                         <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('ChannelProfileScreen')}>
                        <Text style={styles.username}>{item.user.username}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.subscribeButton}>
                        <Text style={styles.subscribeText}>Subscribe</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const ShortsVideoScreen = ({ navigation }) => {
    const [activeVideoIndex, setActiveVideoIndex] = useState(0);
    const [commentsVisible, setCommentsVisible] = useState(false);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [createVisible, setCreateVisible] = useState(false);
    
    // Standard Tab Bar Height calculation
    const tabHeight = Platform.OS === 'ios' ? 82 : 68;

    // Calculate actual video height: Window Height - Tab Bar Height
    // This allows the video to fill the space ABOVE the tab bar.
    const screenHeight = windowHeight - tabHeight;

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            setActiveVideoIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 80 // Increased to ensure clear winner
    }).current;

    return (
        <View style={[styles.container, { height: screenHeight }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <FlatList
                data={MOCK_VIDEOS}
                renderItem={({ item, index }) => (
                    <VideoItem 
                        item={item} 
                        isActive={activeVideoIndex === index} 
                        index={index} 
                        screenHeight={screenHeight}
                        onOpenComments={() => setCommentsVisible(true)}
                        onOpenSettings={() => setSettingsVisible(true)}
                        onOpenCreate={() => setCreateVisible(true)}
                        navigation={navigation}
                    />
                )}
                keyExtractor={item => item.id}
                pagingEnabled
                vertical
                showsVerticalScrollIndicator={false}
                snapToInterval={screenHeight}
                snapToAlignment="center"
                decelerationRate="fast"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                initialNumToRender={2} // Increased
                maxToRenderPerBatch={3} // Increased
                windowSize={10} // Increased to keep more videos ready
                removeClippedSubviews={false} // Disabled for Android reliability
                extraData={activeVideoIndex}
                getItemLayout={(data, index) => (
                    {length: screenHeight, offset: screenHeight * index, index}
                )}
            />
            <CommentsModal 
                visible={commentsVisible}
                onClose={() => setCommentsVisible(false)}
            />
            <SettingsModal
                visible={settingsVisible}
                onClose={() => setSettingsVisible(false)}
            />
            <CreateVideoModal 
                visible={createVisible}
                onClose={() => setCreateVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'black',
    },
    videoContainer: {
        position: 'relative',
        backgroundColor: 'black',
        overflow: 'hidden',
    },
    touchOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    pauseIconContainer: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 20,
        borderRadius: 50,
    },
    video: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        zIndex: 0,
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 300, 
        zIndex: 5,
    },
    topRightIcons: {
        position: 'absolute',
        right: 15,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
    },
    iconButton: {
        marginLeft: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
    },
    rightSideBar: {
        position: 'absolute',
        right: 10,
        alignItems: 'center',
        zIndex: 10,
    },
    actionItem: {
        marginBottom: 20,
        alignItems: 'center',
    },
    actionText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 5,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    },
    shadow: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    },
    bottomInfo: {
        position: 'absolute',
        left: 15,
        right: 80, 
        justifyContent: 'flex-end',
        zIndex: 10,
    },
    descriptionContainer: {
        marginBottom: 15,
    },
    descriptionText: {
        color: 'white',
        fontSize: 14,
        lineHeight: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
        marginBottom: 5,
    },
    hashtagsText: {
        color: 'white',
        fontSize: 14,
        lineHeight: 20,
    },
    hashtag: {
        fontWeight: 'bold',
        color: '#fff', 
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'white',
        marginRight: 10,
    },
    username: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        marginRight: 10,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    },
    subscribeButton: {
        backgroundColor: '#cc0000', 
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    subscribeText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
    }
});

export default ShortsVideoScreen;