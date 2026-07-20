import React, { useState } from 'react';
import { IMAGE_PLACEHOLDER } from '../../utils/helper';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  Switch,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');
const CAPTION_PREVIEW_HEIGHT = Math.min(width * 0.9, 340);
const CAPTION_PREVIEW_WIDTH = Math.round((CAPTION_PREVIEW_HEIGHT * 9) / 16);

const normalizeHashtag = raw => {
  const clean = String(raw || '')
    .trim()
    .replace(/^#+/, '')
    .replace(/[^A-Za-z0-9_]/g, '');
  return clean ? `#${clean}` : '';
};

const extractCaptionHashtags = text => {
  const matches = String(text || '').match(/#[A-Za-z0-9_]+/g) || [];
  return matches.map(normalizeHashtag).filter(Boolean);
};

const WriteCaptionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const incomingDraft = route.params?.draft || {};
  const [caption, setCaption] = useState('');
  const [isOrderButtonEnabled, setIsOrderButtonEnabled] = useState(true);
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState(
    Array.isArray(incomingDraft.hashtags) && incomingDraft.hashtags.length
      ? incomingDraft.hashtags
      : ['#curry', '#biryani', '#LondonEats', '#foodie'],
  );

  const steps = ['Upload', 'Edit', 'Caption', 'Preview', 'Schedule'];
  React.useEffect(() => {
    if (incomingDraft.caption) setCaption(String(incomingDraft.caption));
    if (incomingDraft.orderNow != null) {
      setIsOrderButtonEnabled(Boolean(incomingDraft.orderNow));
    }
  }, [incomingDraft.caption, incomingDraft.orderNow]);

  const addHashtag = React.useCallback(() => {
    const tag = normalizeHashtag(hashtagInput);
    if (!tag) return;
    setHashtags(prev => {
      if (prev.some(x => x.toLowerCase() === tag.toLowerCase())) return prev;
      return [...prev, tag];
    });
    setHashtagInput('');
  }, [hashtagInput]);

  const insertTagIntoCaption = React.useCallback(tag => {
    const cleanTag = normalizeHashtag(tag);
    if (!cleanTag) return;
    setCaption(prev => {
      const t = String(prev || '').trimEnd();
      if (!t) return `${cleanTag} `;
      if (new RegExp(`(^|\\s)${cleanTag}(\\s|$)`, 'i').test(t)) return `${t} `;
      return `${t} ${cleanTag} `;
    });
  }, []);

  const removeHashtag = React.useCallback(tag => {
    setHashtags(prev => prev.filter(x => x !== tag));
  }, []);

  return (
    <SafeAreaView style={styles.safeTop} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" color="white" size={28} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Write Caption</Text>
          <Text style={styles.headerSubtitle}>
            Upload, edit and Publish to all platforms
          </Text>
        </View>
        <Image
          source={{ uri: IMAGE_PLACEHOLDER }}
          style={styles.profilePic}
        />
        </View>

        <View style={styles.stepperContainer}>
        {steps.map((label, index) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepCircle, index === 2 && styles.activeStepCircle]}>
              <Text style={[styles.stepNumber, index === 2 && styles.activeStepText]}>
                {index + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, index === 2 && styles.activeLabel]}>
              {label}
            </Text>
          </View>
        ))}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.videoPreviewContainer}>
          <Image
            source={{
              uri:
                incomingDraft?.thumbnail?.uri ||
                'https://images.unsplash.com/photo-1547584370-2cc98b8b8dc8?q=80&w=800',
            }}
            style={styles.previewImage}
          />
          <View style={styles.playOverlay}>
            <View style={styles.pauseCircle}>
              <Icon name="pause" color="black" size={20} />
            </View>
          </View>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.captionHeader}>
            <TextInput
              style={styles.textInput}
              placeholder="Write a caption..."
              placeholderTextColor="#AAA"
              multiline
              maxLength={150}
              onChangeText={setCaption}
              value={caption}
            />
            <Text style={styles.charCount}>{caption.length}/150</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelContainer}>
              <Icon name="plus-circle" color="#F5A623" size={20} />
              <Text style={styles.toggleTitle}>Order Now button</Text>
            </View>
            <Switch
              trackColor={{ false: '#767577', true: '#F5A623' }}
              thumbColor={isOrderButtonEnabled ? '#fff' : '#f4f3f4'}
              onValueChange={() => setIsOrderButtonEnabled(prev => !prev)}
              value={isOrderButtonEnabled}
            />
          </View>
          <Text style={styles.toggleSubtitle}>
            Make it easy for people to order direct.
          </Text>

          <View style={styles.hashtagContainer}>
            {hashtags.map(tag => (
              <TouchableOpacity
                key={tag}
                style={styles.tagChip}
                activeOpacity={0.8}
                onPress={() => insertTagIntoCaption(tag)}
                onLongPress={() => removeHashtag(tag)}
              >
                <Text style={styles.tagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.addTagRow}>
            <TextInput
              style={styles.addTagInput}
              placeholder="Type hashtag (e.g. londonEats)"
              placeholderTextColor="#AAA"
              value={hashtagInput}
              onChangeText={setHashtagInput}
              onSubmitEditing={addHashtag}
              returnKeyType="done"
              maxLength={32}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.addTagButton} onPress={addHashtag}>
              <Icon name="plus" color="#F5A623" size={14} />
              <Text style={styles.addTagText}>Add Hashtag</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hashtagHint}>
            Tap a hashtag to insert into caption. Long press to remove.
          </Text>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={() =>
              (() => {
                const normalized = hashtags
                  .map(normalizeHashtag)
                  .filter(Boolean);
                const fromCaption = extractCaptionHashtags(caption);
                const finalTags = [...normalized];
                fromCaption.forEach(tag => {
                  if (!finalTags.some(x => x.toLowerCase() === tag.toLowerCase())) {
                    finalTags.push(tag);
                  }
                });
                navigation.navigate('PostPreviewNew', {
                  draft: {
                    ...incomingDraft,
                    caption: caption.trim(),
                    hashtags: finalTags,
                    orderNow: isOrderButtonEnabled,
                  },
                });
              })()
            }
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Icon name="arrow-right" color="white" size={20} />
          </TouchableOpacity>

          <View style={styles.safetyFooter}>
            <Icon name="shield-check" size={14} color="#AAA" />
            <Text style={styles.safetyText}>
              you content is safe and only visible to you
            </Text>
          </View>
        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: '#F5A623' },
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    backgroundColor: '#F5A623',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: { flex: 1, marginLeft: 15 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: 'white', fontSize: 12, opacity: 0.9 },
  profilePic: { width: 40, height: 40, borderRadius: 20 },

  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStepCircle: { borderColor: '#F5A623', borderWidth: 2 },
  stepNumber: { color: '#AAA', fontSize: 12 },
  activeStepText: { color: '#F5A623', fontWeight: 'bold' },
  stepLabel: { fontSize: 11, marginTop: 4, color: '#AAA' },
  activeLabel: { color: '#F5A623', fontWeight: 'bold' },

  scrollContent: { paddingBottom: 20, backgroundColor: 'white' },
  videoPreviewContainer: {
    width: CAPTION_PREVIEW_WIDTH,
    height: CAPTION_PREVIEW_HEIGHT,
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000',
    borderRadius: 12,
    marginTop: 8,
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  inputSection: { padding: 20 },
  captionHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  textInput: { flex: 1, fontSize: 14, color: '#333', height: 40, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#AAA', marginLeft: 10 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 15 },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabelContainer: { flexDirection: 'row', alignItems: 'center' },
  toggleTitle: { fontSize: 15, fontWeight: '500', color: '#333', marginLeft: 10 },
  toggleSubtitle: { fontSize: 12, color: '#999', marginTop: 4, marginLeft: 30 },

  hashtagContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 },
  tagChip: {
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFE6C0',
  },
  tagText: { color: '#666', fontSize: 12 },
  addTagRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addTagInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: '#FFE6C0',
    borderRadius: 6,
    paddingHorizontal: 10,
    color: '#444',
    marginRight: 8,
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFE6C0',
  },
  addTagText: { color: '#666', fontSize: 12, marginLeft: 4 },
  hashtagHint: { fontSize: 11, color: '#999', marginTop: 4 },

  nextButton: {
    backgroundColor: '#F5A623',
    flexDirection: 'row',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  nextButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginRight: 10 },

  safetyFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  safetyText: { fontSize: 11, color: '#AAA', marginLeft: 5 },
});

export default WriteCaptionScreen;
