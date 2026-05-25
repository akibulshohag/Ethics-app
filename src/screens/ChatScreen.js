import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  PermissionsAndroid,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { COLORS } from '../constants/theme';

const ActionSheetIOS =
  Platform.OS === 'ios' ? require('react-native').ActionSheetIOS : null;
import {
  getThreadMessages,
  uploadChatFiles,
  getAttachmentFullUrl,
} from '../services/chatService';
import { recordRecentChatPartner } from '../services/chatRecentStorage';
import {
  connectChatSocket,
  disconnectChatSocket,
  sendChatMessage,
  onChatMessage,
  onChatTyping,
  emitTyping,
} from '../services/chatSocket';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  pick as pickDocumentNative,
  types as docTypes,
  errorCodes as docErrorCodes,
  isErrorWithCode,
} from '@react-native-documents/picker';
import Sound from 'react-native-nitro-sound';

const normalizeId = id =>
  String(id ?? '')
    .trim()
    .toLowerCase();

function formatTime(dateOrStamp) {
  const d = dateOrStamp instanceof Date ? dateOrStamp : new Date(dateOrStamp);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

const EMOJI_LIST = [
  '😀',
  '😃',
  '😄',
  '😁',
  '😅',
  '😂',
  '🤣',
  '😊',
  '😇',
  '🙂',
  '😉',
  '😍',
  '🥰',
  '😘',
  '😗',
  '😋',
  '😛',
  '😜',
  '🤪',
  '😝',
  '👍',
  '👎',
  '👏',
  '🙌',
  '🤝',
  '🙏',
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🖤',
  '🤍',
  '🤎',
  '💔',
  '❣️',
  '💕',
  '💞',
  '💓',
  '🔥',
  '⭐',
  '🌟',
  '✨',
  '💫',
  '✅',
  '❌',
  '❗',
  '❓',
  '💬',
  '📷',
  '📎',
  '🎤',
  '🔊',
  '📌',
  '🕐',
  '📅',
];

const ChatScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const {
    partnerId: rawPartnerId,
    partnerName = 'Channel',
    partnerAvatar,
    orderId,
    orderDetails,
  } = route.params || {};
  const partnerId = normalizeId(rawPartnerId);
  const partnerIdForApi = String(rawPartnerId ?? '').trim() || partnerId;
  const user = useSelector(s => s?.app?.user);
  const myId = user?.id ? normalizeId(user.id) : '';
  const myIdForApi = String(user?.id ?? '').trim() || myId;
  const displayName = partnerName || 'Chat';
  const isOrderChat = !!orderId;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const recordingDurationRef = useRef(0);

  const apiToMessage = useCallback(
    m => {
      const isMe = normalizeId(m.senderId) === myId;
      return {
        id: m.id,
        isMe,
        senderId: m.senderId,
        text: m.content || '',
        type: m.type || 'text',
        attachments: Array.isArray(m.attachments) ? m.attachments : [],
        voiceUrl: m.voiceUrl,
        duration: m.duration,
        time: formatTime(m.createdAt),
      };
    },
    [myId],
  );

  useEffect(() => {
    if (!partnerId) return;
    recordRecentChatPartner({
      partnerId: partnerIdForApi,
      partnerName: displayName,
      partnerAvatar,
    });
  }, [partnerIdForApi, displayName, partnerAvatar]);

  useEffect(() => {
    if (!myId || !partnerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    connectChatSocket(user.id);
    (async () => {
      try {
        const list = await getThreadMessages(
          user?.token,
          myIdForApi,
          partnerIdForApi,
        );
        if (cancelled) return;
        const next = (list || []).map(apiToMessage);
        setMessages(next);
      } catch (e) {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      disconnectChatSocket();
    };
  }, [myId, partnerId, myIdForApi, partnerIdForApi, user?.token, user?.id, apiToMessage]);

  useEffect(() => {
    const unsubMsg = onChatMessage(payload => {
      const from = normalizeId(payload.from);
      if (from !== partnerId) return;
      setMessages(prev => [
        ...prev,
        {
          id: `recv-${payload.timestamp}-${from}`,
          isMe: false,
          senderId: from,
          text: payload.message || '',
          type: payload.type || 'text',
          attachments: payload.attachments || [],
          voiceUrl: payload.voiceUrl,
          duration: payload.duration,
          time: formatTime(payload.timestamp),
        },
      ]);
    });
    const unsubTyping = onChatTyping(payload => {
      if (normalizeId(payload.userId) === partnerId) setPartnerTyping(true);
    });
    return () => {
      unsubMsg();
      unsubTyping();
    };
  }, [partnerId]);

  useEffect(() => {
    if (!partnerTyping) return;
    const t = setTimeout(() => setPartnerTyping(false), 3000);
    return () => clearTimeout(t);
  }, [partnerTyping]);

  useEffect(() => {
    const onShow = e => {
      const h = Number(e?.endCoordinates?.height || 0);
      setKeyboardHeight(h > 0 ? h : 0);
      setShowEmoji(false);
    };
    const onHide = () => setKeyboardHeight(0);
    const showEvt =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, onShow);
    const hideSub = Keyboard.addListener(hideEvt, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const sendText = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !myId || !partnerId || sending) return;
    const timestamp = Date.now();
    const tempId = `temp-${timestamp}`;
    const newMsg = {
      id: tempId,
      isMe: true,
      senderId: myId,
      text,
      type: 'text',
      time: formatTime(timestamp),
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setSending(true);
    try {
      await sendChatMessage({
        to: partnerId,
        from: myId,
        message: text,
        timestamp,
        type: 'text',
      });
      recordRecentChatPartner({
        partnerId: partnerIdForApi,
        partnerName: displayName,
        partnerAvatar,
        lastMessage: text,
      });
      setMessages(prev =>
        prev.map(m =>
          m.id === tempId ? { ...m, id: `sent-${timestamp}` } : m,
        ),
      );
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      Alert.alert('Send failed', e?.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  }, [inputText, myId, partnerId, sending]);

  const sendWithAttachments = useCallback(
    async (urls, type = 'image') => {
      if (!myId || !partnerId || sending || !urls?.length) return;
      const timestamp = Date.now();
      const tempId = `temp-${timestamp}`;
      const newMsg = {
        id: tempId,
        isMe: true,
        senderId: myId,
        text: '',
        type,
        attachments: urls,
        time: formatTime(timestamp),
      };
      setMessages(prev => [...prev, newMsg]);
      setSending(true);
      try {
        await sendChatMessage({
          to: partnerId,
          from: myId,
          message: '',
          timestamp,
          type,
          attachments: urls,
        });
        setMessages(prev =>
          prev.map(m =>
            m.id === tempId ? { ...m, id: `sent-${timestamp}` } : m,
          ),
        );
      } catch (e) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        Alert.alert('Send failed', e?.message || 'Could not send');
      } finally {
        setSending(false);
      }
    },
    [myId, partnerId, sending],
  );

  const sendVoice = useCallback(
    async (voiceUrl, durationSec) => {
      if (!myId || !partnerId || sending) return;
      const timestamp = Date.now();
      const tempId = `temp-${timestamp}`;
      const newMsg = {
        id: tempId,
        isMe: true,
        senderId: myId,
        text: '🎤 Voice message',
        type: 'voice',
        voiceUrl,
        duration: Math.round(durationSec || 0),
        time: formatTime(timestamp),
      };
      setMessages(prev => [...prev, newMsg]);
      setSending(true);
      try {
        await sendChatMessage({
          to: partnerId,
          from: myId,
          message: 'Voice message',
          timestamp,
          type: 'voice',
          voiceUrl,
          duration: Math.round(durationSec || 0),
        });
        setMessages(prev =>
          prev.map(m =>
            m.id === tempId ? { ...m, id: `sent-${timestamp}` } : m,
          ),
        );
      } catch (e) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        Alert.alert('Send failed', e?.message || 'Could not send voice');
      } finally {
        setSending(false);
      }
    },
    [myId, partnerId, sending],
  );

  const onPlus = useCallback(() => {
    const options = [
      { text: 'Photo', onPress: pickImage },
      { text: 'File', onPress: pickDocument },
      { text: 'Record voice', onPress: toggleRecordVoice },
      { text: 'Cancel', style: 'cancel' },
    ];
    if (
      Platform.OS === 'ios' &&
      ActionSheetIOS &&
      typeof ActionSheetIOS.showActionSheetWithOptions === 'function'
    ) {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Photo', 'File', 'Record voice', 'Cancel'],
          cancelButtonIndex: 3,
        },
        idx => {
          if (idx === 0) pickImage();
          else if (idx === 1) pickDocument();
          else if (idx === 2) toggleRecordVoice();
        },
      );
    } else {
      Alert.alert('Send', 'Choose an option', options);
    }
  }, [pickImage, pickDocument, toggleRecordVoice]);

  const pickImage = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 5,
      });
      const assets = result?.assets || [];
      if (assets.length === 0) return;
      setUploading(true);
      const formData = new FormData();
      assets.forEach((a, i) => {
        formData.append('files', {
          uri: a.uri,
          type: a.type || 'image/jpeg',
          name: a.fileName || `image-${i}.jpg`,
        });
      });
      const { files } = await uploadChatFiles(user?.token, formData);
      const urls = files.map(f => f.url).filter(Boolean);
      if (urls.length) await sendWithAttachments(urls, 'image');
    } catch (e) {
      Alert.alert('Upload failed', e?.message || 'Could not upload image');
    } finally {
      setUploading(false);
    }
  }, [user?.token, sendWithAttachments]);

  const pickDocument = useCallback(async () => {
    try {
      const res = await pickDocumentNative({
        type: [docTypes.pdf, docTypes.plainText, docTypes.images],
        allowMultiSelection: true,
      });
      const picked = Array.isArray(res) ? res : res ? [res] : [];
      if (picked.length === 0) return;
      setUploading(true);
      const formData = new FormData();
      picked.forEach((f, i) => {
        formData.append('files', {
          uri: f.uri,
          type: f.type || 'application/octet-stream',
          name: f.name || `file-${i}`,
        });
      });
      const { files } = await uploadChatFiles(user?.token, formData);
      const urls = files.map(f => f.url).filter(Boolean);
      if (urls.length) await sendWithAttachments(urls, 'file');
    } catch (e) {
      if (isErrorWithCode(e) && e.code === docErrorCodes.OPERATION_CANCELED)
        return;
      Alert.alert('Upload failed', e?.message || 'Could not upload file');
    } finally {
      setUploading(false);
    }
  }, [user?.token, sendWithAttachments]);

  const toggleRecordVoice = useCallback(async () => {
    if (recording) {
      try {
        const path = await Sound.stopRecorder();
        Sound.removeRecordBackListener();
        if (!path) {
          setRecording(false);
          return;
        }
        setUploading(true);
        const uri =
          typeof path === 'string' && !path.startsWith('file://')
            ? `file://${path}`
            : path;
        const formData = new FormData();
        formData.append('files', { uri, type: 'audio/m4a', name: 'voice.m4a' });
        const { files } = await uploadChatFiles(user?.token, formData);
        const url = files?.[0]?.url;
        if (url) await sendVoice(url, recordingDurationRef.current || 0);
      } catch (e) {
        Alert.alert('Voice send failed', e?.message || 'Could not send voice');
      } finally {
        setRecording(false);
        setUploading(false);
        recordingDurationRef.current = 0;
      }
      return;
    }
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone permission',
            message:
              'This app needs microphone access to record voice messages.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission needed',
            'Microphone access is required to record voice messages. Enable it in Settings > App > Permissions.',
          );
          return;
        }
      }
      recordingDurationRef.current = 0;
      Sound.addRecordBackListener(e => {
        recordingDurationRef.current = e.currentPosition;
      });
      await Sound.startRecorder(undefined, undefined, true);
      setRecording(true);
    } catch (e) {
      const msg = e?.message || '';
      const hint =
        msg.includes('setAudioSource') || msg.includes('MediaRecorder')
          ? ' On emulators, recording often fails; try on a real device. Otherwise enable microphone permission in Settings.'
          : '';
      Alert.alert(
        'Recording failed',
        (msg || 'Could not start recording') + hint,
      );
    }
  }, [recording, user?.token, sendVoice]);

  const onInputChange = useCallback(
    t => {
      setInputText(t);
      if (partnerId) emitTyping(partnerId);
    },
    [partnerId],
  );

  const insertEmoji = useCallback(emoji => {
    setInputText(prev => prev + emoji);
  }, []);

  if (!user?.id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.helperText}>Sign in to chat</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {displayName}
            </Text>
          </View>
          {/* <View style={styles.headerRight}>
            {partnerTyping ? (
              <Text style={styles.headerTime}>typing...</Text>
            ) : (
              <Text style={styles.headerTime}>7m</Text>
            )}
            <TouchableOpacity style={styles.headerIconBtn}>
              <MaterialCommunityIcons
                name="store-minus-outline"
                size={24}
                color="#000"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn}>
              <Ionicons
                name="ellipsis-horizontal-circle"
                size={24}
                color="#000"
              />
            </TouchableOpacity>
          </View> */}
        </View>

        {/* {isOrderChat && orderDetails && (
          <>
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderTitle}>Order Information</Text>
                <TouchableOpacity>
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={20}
                    color="#000"
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />
              <View style={styles.orderItem}>
                <Image
                  source={{
                    uri:
                      orderDetails.itemImage ||
                      'https://via.placeholder.com/50',
                  }}
                  style={styles.orderImage}
                />
                <Text style={styles.orderName} numberOfLines={1}>
                  {orderDetails.itemName || 'Order item'}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.orderFooter}>
                <Text style={styles.orderLabel}>Order ID</Text>
                <Text style={styles.orderValue} numberOfLines={1}>
                  {orderId}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.viewDetailsBtn}
                onPress={() =>
                  orderId &&
                  navigation.navigate('Library', {
                    screen: 'OrderListScreen',
                    params: { highlightOrderId: orderId },
                  })
                }
              >
                <Text style={styles.viewDetailsText}>View Order Details</Text>
                <Ionicons name="chevron-forward" size={16} color="#999" />
              </TouchableOpacity>
            </View>
            <Text style={styles.timestamp}>{formatTime(new Date())}</Text>
          </>
        )} */}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primaryOrange} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.chatContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          >
            {messages.map(msg => (
              <View key={msg.id}>
                {!msg.isMe ? (
                  <View style={styles.leftMessageRow}>
                    <Image
                      source={{
                        uri:
                          partnerAvatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            displayName,
                          )}&background=111&color=fff`,
                      }}
                      style={styles.avatar}
                    />
                    <View style={styles.messageContent}>
                      <Text style={styles.senderName}>{displayName}</Text>
                      <View style={styles.leftBubble}>
                        {msg.type === 'voice' && msg.voiceUrl ? (
                          <View style={styles.voiceRow}>
                            <Ionicons
                              name="play-circle"
                              size={28}
                              color={COLORS.primaryOrange}
                            />
                            <Text style={styles.voiceLabel}>
                              {msg.duration ? `${msg.duration}s` : 'Voice'}
                            </Text>
                          </View>
                        ) : msg.attachments?.length > 0 ? (
                          <>
                            {msg.attachments.map((url, i) => (
                              <Image
                                key={i}
                                source={{ uri: getAttachmentFullUrl(url) }}
                                style={styles.msgImage}
                              />
                            ))}
                            {msg.text ? (
                              <Text style={styles.messageText}>{msg.text}</Text>
                            ) : null}
                          </>
                        ) : (
                          <Text style={styles.messageText}>{msg.text}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.rightMessageRow}>
                    <View style={styles.rightBubble}>
                      {msg.type === 'voice' && msg.voiceUrl ? (
                        <View style={styles.voiceRow}>
                          <Ionicons
                            name="play-circle"
                            size={28}
                            color={COLORS.primaryOrange}
                          />
                          <Text style={styles.voiceLabel}>
                            {msg.duration ? `${msg.duration}s` : 'Voice'}
                          </Text>
                        </View>
                      ) : msg.attachments?.length > 0 ? (
                        <>
                          {msg.attachments.map((url, i) => (
                            <Image
                              key={i}
                              source={{ uri: getAttachmentFullUrl(url) }}
                              style={styles.msgImage}
                            />
                          ))}
                          {msg.text ? (
                            <Text style={styles.messageText}>{msg.text}</Text>
                          ) : null}
                        </>
                      ) : (
                        <Text style={styles.messageText}>{msg.text}</Text>
                      )}
                    </View>
                    <View style={styles.smallAvatar} />
                  </View>
                )}
                <Text style={styles.timestamp}>{msg.time}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View
          style={[
            styles.inputWrapper,
            Platform.OS === 'android' && keyboardHeight > 0
              ? {
                  marginBottom: Math.max(0, keyboardHeight - insets.bottom),
                }
              : null,
          ]}
        >
          <TouchableOpacity
            style={styles.plusButton}
            onPress={onPlus}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#1A1A1A" />
            ) : (
              <Ionicons name="add-circle" size={32} color="#1A1A1A" />
            )}
          </TouchableOpacity>
          <View style={styles.inputContainer}>
            <TouchableOpacity onPress={() => setShowEmoji(s => !s)}>
              <MaterialCommunityIcons
                name="emoticon-happy-outline"
                size={24}
                color={COLORS.primaryOrange}
              />
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Chat publicly..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={onInputChange}
              multiline
              maxLength={1000}
              textAlignVertical="center"
              onFocus={() => setShowEmoji(false)}
            />
            <TouchableOpacity
              onPress={sendText}
              disabled={sending || !inputText.trim()}
            >
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() ? COLORS.primaryOrange : '#ccc'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {recording && (
          <View style={styles.recordingBar}>
            <MaterialCommunityIcons
              name="microphone"
              size={24}
              color={COLORS.primaryOrange}
            />
            <Text style={styles.recordingText}>
              Recording... Tap + again to send
            </Text>
          </View>
        )}

        <Modal visible={showEmoji} transparent animationType="fade">
          <TouchableOpacity
            style={styles.emojiOverlay}
            activeOpacity={1}
            onPress={() => setShowEmoji(false)}
          >
            <View style={styles.emojiPanel}>
              <FlatList
                data={EMOJI_LIST}
                numColumns={8}
                keyExtractor={(item, i) => `${item}-${i}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.emojiCell}
                    onPress={() => insertEmoji(item)}
                  >
                    <Text style={styles.emojiText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
    color: '#000',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerTime: { fontSize: 14, color: '#666', marginLeft: 4 },
  headerIconBtn: { marginLeft: 15 },

  chatContainer: { flexGrow: 1, padding: 15, paddingBottom: 10 },
  timestamp: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginVertical: 15,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  helperText: { fontSize: 16, color: '#666' },

  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 15,
    marginBottom: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  orderTitle: { fontSize: 16, fontWeight: '600', color: '#444' },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  orderImage: { width: 40, height: 40, borderRadius: 6 },
  orderName: { marginLeft: 12, fontSize: 16, fontWeight: '500', flex: 1 },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  orderLabel: { color: '#444', fontSize: 15 },
  orderValue: { color: '#999', fontSize: 14, maxWidth: '60%' },
  divider: { height: 1, backgroundColor: '#F0F0F0' },
  viewDetailsBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  viewDetailsText: { color: '#999', marginRight: 5, fontSize: 14 },

  leftMessageRow: { flexDirection: 'row', marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  messageContent: { marginLeft: 10, flex: 1 },
  senderName: { fontWeight: '600', marginBottom: 5, color: '#666' },
  leftBubble: {
    backgroundColor: '#FFF1E8',
    padding: 12,
    borderRadius: 12,
    borderTopLeftRadius: 0,
  },
  rightMessageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  rightBubble: {
    backgroundColor: '#F3EFFF',
    padding: 12,
    borderRadius: 12,
    borderTopRightRadius: 0,
    maxWidth: '85%',
  },
  messageText: { lineHeight: 20, color: '#333' },
  msgImage: { width: 180, height: 180, borderRadius: 8, marginVertical: 4 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voiceLabel: { fontSize: 14, color: '#333' },
  smallAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1A1A1A',
    marginLeft: 10,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    paddingBottom: Platform.OS === 'android' ? 18 : 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  plusButton: { padding: 4 },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFF1E8',
    borderRadius: 30,
    paddingHorizontal: 15,
    alignItems: 'center',
    minHeight: 50,
    maxHeight: 100,
    marginLeft: 10,
  },
  input: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 14,
    lineHeight: 20,
    color: '#111',
    paddingVertical: 10,
  },

  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#FFF1E8',
    gap: 8,
  },
  recordingText: { fontSize: 14, color: '#333' },

  emojiOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  emojiPanel: { backgroundColor: '#fff', maxHeight: 280, padding: 12 },
  emojiCell: { padding: 8, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 24 },
});

export default ChatScreen;
