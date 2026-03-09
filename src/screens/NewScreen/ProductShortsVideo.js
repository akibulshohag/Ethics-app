import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Dimensions,
    FlatList,
    TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Video from 'react-native-video';

const { width, height } = Dimensions.get('window');

const DUMMY_VIDEOS = [
    {
        id: '1',
        title: 'Tandoori Planet',
        location: 'Birmingham, UK',
        videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        user: 'tandooriplanet',
        desc: 'Description goes here',
        hashtags: '#hashtags #music #dance',
        likes: '100k',
        comments: 'Com',
        shares: 'Share',
        audio: 'Original Sound'
    },
    {
        id: '2',
        title: 'Abbots Burger',
        location: 'Birmingham, UK',
        videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        user: 'abbotsburger',
        desc: 'Description goes here',
        hashtags: '#food #burger #yummy',
        likes: '250k',
        comments: '99k+',
        shares: 'Share',
        audio: 'Original Sound'
    },
    {
        id: '3',
        title: 'Pizza Hut',
        location: 'London, UK',
        videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        user: 'pizzahut',
        desc: 'Best pizza in town',
        hashtags: '#pizza #cheese #party',
        likes: '1.2M',
        comments: '10k',
        shares: '1k',
        audio: 'Trending Sound'
    }
];

const ProductShortsVideo = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const initialItem = route.params?.item;

    const [videos, setVideos] = useState(() => {
        if (!initialItem) return DUMMY_VIDEOS;

        const existingIndex = DUMMY_VIDEOS.findIndex(v => v.title === initialItem.title);
        if (existingIndex > -1) {
            const newVideos = [...DUMMY_VIDEOS];
            const item = newVideos.splice(existingIndex, 1)[0];
            newVideos.unshift(item);
            return newVideos;
        } else {
            return [
                {
                    ...initialItem,
                    id: initialItem.id || '0',
                    user: initialItem.user?.nickname || initialItem.title?.toLowerCase().replace(/\s+/g, ''),
                    videoUrl: initialItem.videoUrl || 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                    likes: initialItem.likes || '100k',
                    comments: initialItem.comments || 'Com',
                    shares: initialItem.shares || 'Share',
                    hashtags: initialItem.hashtags || '#hashtags #food #ethics',
                    audio: initialItem.audio || 'Original Sound',
                    desc: initialItem.title || 'Description goes here'
                },
                ...DUMMY_VIDEOS
            ];
        }
    });

    const [currentIndex, setCurrentIndex] = useState(0);

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    });

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    });

    const VideoItem = ({ item, index, currentIndex }) => {
        const isCurrentlyViewable = currentIndex === index;
        const [isPausedLocally, setIsPausedLocally] = useState(false);

        useEffect(() => {
            if (!isCurrentlyViewable) {
                setIsPausedLocally(false);
            } else {
                setIsPausedLocally(false); // Force autoplay when coming back into view
            }
        }, [isCurrentlyViewable]);

        const togglePause = () => {
            if (isCurrentlyViewable) {
                setIsPausedLocally(!isPausedLocally);
            }
        };

        const isPaused = !isCurrentlyViewable || isPausedLocally;

        return (
            <View style={styles.videoContainer}>
                <Video
                    source={{ uri: item.videoUrl }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                    repeat={true}
                    paused={isPaused}
                    muted={false}
                    playInBackground={false}
                    playWhenInactive={false}
                    ignoreSilentSwitch="ignore"
                    controls={false}
                />

                <TouchableOpacity
                    activeOpacity={1}
                    onPress={togglePause}
                    style={styles.touchOverlay}
                >
                    {isPausedLocally && isCurrentlyViewable && (
                        <View style={styles.pauseIconContainer}>
                            <Icon name="play" size={50} color="rgba(255,255,255,0.6)" />
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.videoOverlay} pointerEvents="box-none">
                    <View style={styles.videoHeader}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Icon name="chevron-left" size={20} color="#FFF" />
                            <Text style={styles.backText}>Back</Text>
                        </TouchableOpacity>
                        <View style={styles.videoHeaderIcons}>
                            <Icon name="magnify" size={20} color="#FFF" style={{ marginRight: 15 }} />
                            <Icon name="dots-vertical" size={20} color="#FFF" />
                        </View>
                    </View>

                    <View style={styles.rightActions}>
                        <View style={styles.actionItem}>
                            <Icon name="eye" size={20} color="#FFF" />
                            <Text style={styles.actionText}>{item.likes || '100k'}</Text>
                        </View>
                        <View style={styles.actionItem}>
                            <Icon name="heart" size={20} color="#FF4D4D" />
                            <Text style={styles.actionText}>{item.likes || '100k'}</Text>
                        </View>
                        <View style={styles.actionItem}>
                            <Icon name="comment-text" size={20} color="#FFF" />
                            <Text style={styles.actionText}>{item.comments || 'Com'}</Text>
                        </View>
                        <View style={styles.actionItem}>
                            <Icon name="share" size={20} color="#FFF" />
                            <Text style={styles.actionText}>{item.shares || 'Share'}</Text>
                        </View>
                    </View>

                    <View style={styles.videoFooter}>
                        <Text style={styles.videoUser}>@{item.user || item.title?.toLowerCase().replace(' ', '')}</Text>
                        <Text style={styles.videoDesc}>{item.desc || 'Description goes here'}</Text>
                        <Text style={styles.videoHashtags}>{item.hashtags || '#hashtags #music #dance'}</Text>
                        <Text style={styles.translationText}>See translation</Text>
                        <View style={styles.footerRow}>
                            <View style={styles.audioRow}>
                                <Icon name="music" size={18} color="#FFF" />
                                <Text style={styles.audioText}>{item.audio || 'Original Sound'}</Text>
                                <Icon name="volume-off" size={18} color="#FFF" style={{ marginLeft: 15 }} />
                                <Text style={styles.audioText}>Mute</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.orderNowBtn}
                                onPress={() => {
                                    const ownerId =
                                        initialItem?.user?.id ?? initialItem?.userId ?? null;
                                    if (ownerId) {
                                        navigation.navigate('HomeThreeScreen', {
                                            ownerId,
                                            title: initialItem?.title,
                                            location:
                                                initialItem?.location ||
                                                initialItem?.creatorAddress ||
                                                '',
                                        });
                                    } else {
                                        navigation.navigate('HomeThreeScreen');
                                    }
                                }}
                            >
                                <Text style={styles.orderNowText}>Order Now</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.bottomArrow}>
                            <Icon name="chevron-down" size={40} color="#FFF" />
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderItem = ({ item, index }) => (
        <VideoItem item={item} index={index} currentIndex={currentIndex} />
    );

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <FlatList
                data={videos}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                snapToAlignment="start"
                decelerationRate="fast"
                onViewableItemsChanged={onViewableItemsChanged.current}
                viewabilityConfig={viewabilityConfig.current}
                initialNumToRender={2}
                maxToRenderPerBatch={3}
                windowSize={10}
                removeClippedSubviews={false}
                extraData={currentIndex}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    videoContainer: { width: width, height: height, position: 'relative' },
    videoBackground: { ...StyleSheet.absoluteFillObject },
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
    videoOverlay: { flex: 1, justifyContent: 'space-between', paddingBottom: 20, zIndex: 10 },
    videoHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, marginTop: 40, alignItems: 'center' },
    backBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 5 },
    backText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
    videoHeaderIcons: { flexDirection: 'row', alignItems: 'center' },
    rightActions: { position: 'absolute', right: 15, bottom: height * 0.25, alignItems: 'center' },
    actionItem: { alignItems: 'center', marginBottom: 20 },
    actionText: { color: '#FFF', fontSize: 12, marginTop: 5, fontWeight: '600' },
    videoFooter: { padding: 20, paddingBottom: 20 },
    videoUser: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
    videoDesc: { color: '#FFF', fontSize: 14, marginBottom: 5 },
    videoHashtags: { color: '#FFF', fontSize: 14, fontWeight: '500', marginBottom: 5 },
    translationText: { color: '#FFF', fontSize: 14, textDecorationLine: 'underline', marginBottom: 15 },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    audioRow: { flexDirection: 'row', alignItems: 'center' },
    audioText: { color: '#FFF', fontSize: 13, marginLeft: 5 },
    orderNowBtn: { backgroundColor: '#F5A623', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
    orderNowText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
    bottomArrow: { alignItems: 'center', marginTop: 20 }
});

export default ProductShortsVideo;