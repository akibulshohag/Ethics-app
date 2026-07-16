import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { getMessages, uploadChatFiles, getAttachmentFullUrl } from '../services/chatService';
import {
  connectChatSocket,
  disconnectChatSocket,
  sendChatMessage,
  onChatMessage,
  onChatTyping,
  emitTyping,
} from '../services/chatSocket';
import { launchImageLibrary } from 'react-native-image-picker';
import { COLORS } from '../constants/theme';
import { safeImageUri } from '../utils/helper';

let pickDocumentNative = null;
let docTypes = {};
let docErrorCodes = {};
let isErrorWithCode = () => false;
try {
  const dp = require('@react-native-documents/picker');
  pickDocumentNative = dp.pick;
  docTypes = dp.types || {};
  docErrorCodes = dp.errorCodes || {};
  isErrorWithCode = dp.isErrorWithCode || (() => false);
} catch (_) {}
let Sound = null;
try {
  Sound = require('react-native-nitro-sound').default;
} catch (_) {}

const normalizeId = (id) => String(id ?? '').trim().toLowerCase();

function formatTime(dateOrStamp) {
  const d = dateOrStamp instanceof Date ? dateOrStamp : new Date(dateOrStamp);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Format seconds as m:ss for playback display (e.g. 0:03, 1:23). */
function formatPlaybackSec(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** Normalize duration from API (may be seconds or ms) to seconds. */
function durationToSec(duration) {
  const n = Number(duration);
  if (n <= 0) return 0;
  return n >= 1000 ? n / 1000 : n;
}

const EMOJI_LIST = [
  '😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','👍','👎','❤️','🔥','⭐','✨',
  '✅','❌','💬','📷','📎','🎤','🔊',
];

export default function DetailedChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { partnerId: rawPartnerId, partnerName = 'Channel', partnerAvatar } = route.params || {};
  const partnerId = normalizeId(rawPartnerId);
  const user = useSelector((s) => s?.app?.user);
  const myId = user?.id ? normalizeId(user.id) : '';
  const partnerImage = safeImageUri(
    partnerAvatar,
    `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName || '')}&background=111&color=fff`,
  );
  const myImage = safeImageUri(
    user?.photos?.[0],
    'https://i.pravatar.cc/150?u=me',
  );

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [playingPositionSec, setPlayingPositionSec] = useState(0);
  const [playingDurationSec, setPlayingDurationSec] = useState(0);
  const scrollRef = useRef(null);
  const recordingDurationRef = useRef(0);
  const recordingStartedRef = useRef(false);
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0);
  const [waveformBars, setWaveformBars] = useState([]);
  const waveformRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const waveformIntervalRef = useRef(null);

  const apiToMessage = useCallback((m) => {
    const isMe = normalizeId(m.senderId) === myId;
    return {
      id: m.id,
      isMe,
      text: m.content || '',
      type: m.type || 'text',
      attachments: Array.isArray(m.attachments) ? m.attachments : [],
      voiceUrl: m.voiceUrl,
      duration: m.duration,
      time: formatTime(m.createdAt),
    };
  }, [myId]);

  useEffect(() => {
    if (!myId || !partnerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    connectChatSocket(user.id);
    (async () => {
      try {
        const list = await getMessages(user?.token, myId, partnerId);
        if (cancelled) return;
        setMessages((list || []).map(apiToMessage));
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
  }, [myId, partnerId]);

  useEffect(() => {
    const unsubMsg = onChatMessage((payload) => {
      const from = normalizeId(payload.from);
      if (from !== partnerId) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `recv-${payload.timestamp}-${from}`,
          isMe: false,
          text: payload.message || '',
          type: payload.type || 'text',
          attachments: payload.attachments || [],
          voiceUrl: payload.voiceUrl,
          duration: payload.duration,
          time: formatTime(payload.timestamp),
        },
      ]);
    });
    const unsubTyping = onChatTyping((payload) => {
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
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    };
  }, []);

  const sendText = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !myId || !partnerId || sending) return;
    const timestamp = Date.now();
    const tempId = `temp-${timestamp}`;
    setMessages((prev) => [...prev, { id: tempId, isMe: true, text, type: 'text', time: formatTime(timestamp) }]);
    setInputText('');
    setSending(true);
    try {
      await sendChatMessage({ to: partnerId, from: myId, message: text, timestamp, type: 'text' });
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: `sent-${timestamp}` } : m)));
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert('Send failed', e?.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  }, [inputText, myId, partnerId, sending]);

  const sendWithAttachments = useCallback(async (urls, type = 'image') => {
    if (!myId || !partnerId || sending || !urls?.length) return;
    const timestamp = Date.now();
    const tempId = `temp-${timestamp}`;
    setMessages((prev) => [...prev, { id: tempId, isMe: true, text: '', type, attachments: urls, time: formatTime(timestamp) }]);
    setSending(true);
    try {
      await sendChatMessage({ to: partnerId, from: myId, message: '', timestamp, type, attachments: urls });
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: `sent-${timestamp}` } : m)));
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert('Send failed', e?.message || 'Could not send');
    } finally {
      setSending(false);
    }
  }, [myId, partnerId, sending]);

  const sendVoice = useCallback(async (voiceUrl, durationSec, existingTempId = null) => {
    if (!myId || !partnerId || sending) return;
    const timestamp = Date.now();
    const tempId = existingTempId || `temp-${timestamp}`;
    if (!existingTempId) {
      setMessages((prev) => [...prev, { id: tempId, isMe: true, text: '🎤 Voice message', type: 'voice', voiceUrl, duration: Math.round(durationSec || 0), time: formatTime(timestamp) }]);
    }
    setSending(true);
    try {
      await sendChatMessage({ to: partnerId, from: myId, message: 'Voice message', timestamp, type: 'voice', voiceUrl, duration: Math.round(durationSec || 0) });
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: `sent-${timestamp}` } : m)));
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert('Send failed', e?.message || 'Could not send voice');
    } finally {
      setSending(false);
    }
  }, [myId, partnerId, sending]);

  const pickImage = useCallback(async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 5 });
      const assets = result?.assets || [];
      if (assets.length === 0) return;
      setUploading(true);
      const formData = new FormData();
      assets.forEach((a, i) => {
        formData.append('files', { uri: a.uri, type: a.type || 'image/jpeg', name: a.fileName || `image-${i}.jpg` });
      });
      const { files } = await uploadChatFiles(user?.token, formData);
      const urls = files.map((f) => f.url).filter(Boolean);
      if (urls.length) await sendWithAttachments(urls, 'image');
    } catch (e) {
      Alert.alert('Upload failed', e?.message || 'Could not upload image');
    } finally {
      setUploading(false);
    }
  }, [user?.token, sendWithAttachments]);

  const pickDocument = useCallback(async () => {
    if (!pickDocumentNative) {
      Alert.alert('Not available', 'Install @react-native-documents/picker for file uploads');
      return;
    }
    try {
      const res = await pickDocumentNative({
        type: [docTypes.pdf, docTypes.plainText, docTypes.images].filter(Boolean),
        allowMultiSelection: true,
      });
      const picked = Array.isArray(res) ? res : (res ? [res] : []);
      if (picked.length === 0) return;
      setUploading(true);
      const formData = new FormData();
      picked.forEach((f, i) => {
        formData.append('files', { uri: f.uri, type: f.type || 'application/octet-stream', name: f.name || `file-${i}` });
      });
      const { files } = await uploadChatFiles(user?.token, formData);
      const urls = files.map((f) => f.url).filter(Boolean);
      if (urls.length) await sendWithAttachments(urls, 'file');
    } catch (e) {
      if (isErrorWithCode(e) && e.code === docErrorCodes.OPERATION_CANCELED) return;
      Alert.alert('Upload failed', e?.message || 'Could not upload file');
    } finally {
      setUploading(false);
    }
  }, [user?.token, sendWithAttachments]);

  const clearRecordingIntervals = useCallback(() => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (waveformIntervalRef.current) {
      clearInterval(waveformIntervalRef.current);
      waveformIntervalRef.current = null;
    }
    setRecordingElapsedSec(0);
    setWaveformBars([]);
    waveformRef.current = [];
    recordingStartedRef.current = false;
  }, []);

  const cancelRecording = useCallback(async () => {
    if (!recording) return;
    try {
      if (Sound && recordingStartedRef.current) {
        await Sound.stopRecorder();
        Sound.removeRecordBackListener();
      }
    } catch (_) {}
    clearRecordingIntervals();
    setRecording(false);
  }, [recording, clearRecordingIntervals]);

  const toggleRecordVoice = useCallback(async () => {
    if (recording) {
      const hadRecordingStarted = recordingStartedRef.current;
      const durationMs = recordingDurationRef.current || 0;
      const durationSec = Math.round(durationMs / 1000);
      clearRecordingIntervals();
      setRecording(false);
      setUploading(false);
      recordingDurationRef.current = 0;
      try {
        if (!Sound || !hadRecordingStarted) return;
        let path = null;
        try {
          path = await Sound.stopRecorder();
          Sound.removeRecordBackListener();
        } catch (stopErr) {
          const msg = String(stopErr?.message || stopErr || '');
          const isRecorderError = /recorder not started|path is unavailable/i.test(msg);
          if (isRecorderError) {
            Alert.alert(
              'Recording couldn\'t be saved',
              'The recording wasn\'t completed. Try again on a real device with microphone permission.',
            );
          } else {
            Alert.alert('Voice send failed', msg || 'Could not stop recording');
          }
          return;
        }
        const pathStr = path && typeof path === 'string' ? path.trim() : null;
        if (pathStr) {
          const timestamp = Date.now();
          const tempId = `temp-voice-${timestamp}`;
          const optimisticVoice = {
            id: tempId,
            isMe: true,
            text: '🎤 Voice message',
            type: 'voice',
            voiceUrl: null,
            duration: durationSec,
            time: formatTime(timestamp),
            sending: true,
          };
          setMessages((prev) => [...prev, optimisticVoice]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
          setUploading(true);
          try {
            const uri = pathStr.startsWith('file://') ? pathStr : `file://${pathStr}`;
            const formData = new FormData();
            formData.append('files', { uri, type: 'audio/m4a', name: 'voice.m4a' });
            const { files } = await uploadChatFiles(user?.token, formData);
            const url = files?.[0]?.url;
            if (url) {
              setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, voiceUrl: url, sending: false } : m)));
              await sendVoice(url, durationSec, tempId);
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
            } else {
              setMessages((prev) => prev.filter((m) => m.id !== tempId));
              Alert.alert('Voice send failed', 'Upload did not return a URL.');
            }
          } catch (uploadErr) {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            Alert.alert('Voice send failed', uploadErr?.message || 'Could not upload recording');
          } finally {
            setUploading(false);
          }
        } else {
          Alert.alert(
            'Recording not saved',
            'No recording file was available. Try again on a real device with microphone permission.',
          );
        }
      } catch (e) {
        Alert.alert('Voice send failed', e?.message || 'Could not send voice');
      } finally {
        setUploading(false);
      }
      return;
    }
    if (!Sound) {
      Alert.alert('Not available', 'Install react-native-nitro-sound for voice messages');
      return;
    }
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone permission',
            message: 'This app needs microphone access to record voice messages.',
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
      waveformRef.current = [];
      setRecordingElapsedSec(0);
      setWaveformBars([]);
      Sound.addRecordBackListener((e) => {
        recordingDurationRef.current = e.currentPosition;
        const raw = e.currentMetering ?? 0.3;
        const level = typeof raw === 'number' ? Math.min(1, Math.max(0.15, 0.15 + raw * 0.85)) : 0.4;
        waveformRef.current = [...waveformRef.current.slice(-34), level];
      });
      await Sound.startRecorder(undefined, undefined, true);
      recordingStartedRef.current = true;
      setRecording(true);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingElapsedSec(Math.floor(recordingDurationRef.current / 1000));
      }, 1000);
      waveformIntervalRef.current = setInterval(() => {
        setWaveformBars([...waveformRef.current]);
      }, 120);
    } catch (e) {
      const msg = e?.message || '';
      const hint = msg.includes('setAudioSource') || msg.includes('MediaRecorder')
        ? ' On emulators, recording often fails; try on a real device. Otherwise enable microphone permission in Settings.'
        : '';
      Alert.alert('Recording failed', (msg || 'Could not start recording') + hint);
    }
  }, [recording, user?.token, sendVoice, clearRecordingIntervals]);

  // Direct actions: paperclip = file, camera = photo, mic = voice (no single plus menu)

  const onInputChange = useCallback((t) => {
    setInputText(t);
    if (partnerId) emitTyping(partnerId);
  }, [partnerId]);

  const insertEmoji = useCallback((emoji) => {
    setInputText((prev) => prev + emoji);
  }, []);

  const playVoice = useCallback(
    async (msg) => {
      if (!Sound || !msg?.voiceUrl) return;
      const rawUrl = typeof msg.voiceUrl === 'string' ? msg.voiceUrl : msg.voiceUrl?.url || '';
      const url = getAttachmentFullUrl(rawUrl);
      if (!url || typeof url !== 'string') return;
      const isCurrentlyPlaying = playingVoiceId === msg.id;
      if (isCurrentlyPlaying) {
        try {
          await Sound.stopPlayer();
          Sound.removePlayBackListener();
          Sound.removePlaybackEndListener();
        } catch (_) {}
        setPlayingVoiceId(null);
        setPlayingPositionSec(0);
        setPlayingDurationSec(0);
        return;
      }
      try {
        if (playingVoiceId) {
          await Sound.stopPlayer();
          Sound.removePlayBackListener();
          Sound.removePlaybackEndListener();
        }
      } catch (_) {}
      const totalSec = durationToSec(msg.duration);
      setPlayingVoiceId(msg.id);
      setPlayingPositionSec(0);
      setPlayingDurationSec(totalSec);
      Sound.addPlayBackListener((e) => {
        const pos = (e.currentPosition ?? 0) / 1000;
        const dur = (e.duration ?? 0) / 1000;
        setPlayingPositionSec(pos);
        if (dur > 0) setPlayingDurationSec(dur);
      });
      Sound.addPlaybackEndListener(() => {
        setPlayingVoiceId(null);
        setPlayingPositionSec(0);
        try {
          Sound.removePlayBackListener();
          Sound.removePlaybackEndListener();
        } catch (_) {}
      });
      try {
        await Sound.startPlayer(url, undefined);
      } catch (err) {
        setPlayingVoiceId(null);
        setPlayingPositionSec(0);
        setPlayingDurationSec(0);
        try {
          Sound.removePlayBackListener();
          Sound.removePlaybackEndListener();
        } catch (_) {}
        Alert.alert(
          'Playback failed',
          err?.message || 'Could not play voice message. Check your connection.',
        );
      }
    },
    [playingVoiceId],
  );

  const renderBubbleContent = (msg) => {
    if (msg.type === 'voice') {
      if (msg.sending || !msg.voiceUrl) {
        return (
          <View style={styles.voiceRow}>
            <ActivityIndicator size="small" color={COLORS.primaryOrange} />
            <Text style={styles.voiceLabel}>Sending... {formatPlaybackSec(durationToSec(msg.duration))}</Text>
          </View>
        );
      }
      const totalSec = durationToSec(msg.duration);
      const isPlaying = playingVoiceId === msg.id;
      const currentSec = isPlaying ? playingPositionSec : 0;
      const displayTotal = isPlaying && playingDurationSec > 0 ? playingDurationSec : totalSec;
      return (
        <TouchableOpacity style={styles.voiceRow} onPress={() => playVoice(msg)} activeOpacity={0.7}>
          <Icon
            name={isPlaying ? 'pause-circle' : 'play-circle'}
            size={28}
            color={COLORS.primaryOrange}
          />
          <Text style={styles.voiceLabel}>
            {formatPlaybackSec(currentSec)} / {formatPlaybackSec(displayTotal || totalSec)}
          </Text>
        </TouchableOpacity>
      );
    }
    if (msg.attachments?.length > 0) {
      return (
        <>
          {msg.attachments.map((url, i) => (
            <Image key={i} source={{ uri: getAttachmentFullUrl(url) }} style={styles.msgImage} />
          ))}
          {msg.text ? <Text style={styles.messageText}>{msg.text}</Text> : null}
        </>
      );
    }
    return <Text style={styles.messageText}>{msg.text}</Text>;
  };

  if (!user?.id) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centered}>
          <Text style={styles.helperText}>Sign in to chat</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {/* Header - keep existing design */}
        <View style={styles.header}>
          <SafeAreaView>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Icon name="chevron-left" size={22} color="white" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            {partnerTyping ? <Text style={styles.typingText}>typing...</Text> : null}
          </SafeAreaView>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#FDB022" />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg) => {
              const isSent = msg.isMe;
              return (
                <View
                  key={msg.id}
                  style={[styles.messageWrapper, isSent ? styles.sentWrapper : styles.receivedWrapper]}
                >
                  {!isSent && (
                    <Image source={{ uri: partnerImage }} style={styles.avatar} />
                  )}
                  {!isSent && <View style={styles.avatarSpacer} />}
                  <View style={[styles.bubbleContainer, isSent ? styles.sentBubbleContainer : styles.receivedBubbleContainer]}>
                    <View style={[styles.tail, isSent ? styles.sentTail : styles.receivedTail]} />
                    <View style={styles.bubble}>{renderBubbleContent(msg)}</View>
                  </View>
                  {isSent && <Image source={{ uri: myImage }} style={styles.avatar} />}
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Input bar: emoji | Message input | paperclip | camera | send ; circular mic button */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.inputIconBtn} onPress={() => setShowEmoji((s) => !s)}>
              <Icon name="emoticon-happy-outline" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Message"
              placeholderTextColor={COLORS.textTertiary}
              value={inputText}
              onChangeText={onInputChange}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity style={styles.inputIconBtn} onPress={pickDocument} disabled={uploading}>
              {uploading ? <ActivityIndicator size="small" color={COLORS.primaryOrange} /> : <Icon name="paperclip" size={22} color={COLORS.textSecondary} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.inputIconBtn} onPress={pickImage} disabled={uploading}>
              <Icon name="camera-outline" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inputIconBtn} onPress={sendText} disabled={sending || !inputText.trim()}>
              <Icon name="send" size={20} color={inputText.trim() ? COLORS.primaryOrange : COLORS.gray400} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.micButton, recording && styles.micButtonRecording]}
            onPress={toggleRecordVoice}
            disabled={uploading}
          >
            <Icon name="microphone" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {recording && (
          <Modal visible transparent animationType="slide">
            <View style={styles.recordingOverlay}>
              <View style={styles.recordingContent}>
                <View style={styles.recordingTopRow}>
                  <Text style={styles.recordingTimer}>
                    {formatPlaybackSec(recordingElapsedSec)}
                  </Text>
                  <View style={styles.waveformRow}>
                    {waveformBars.length === 0 ? (
                      [...Array(20)].map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.waveformBar,
                            { height: 6 + (Math.abs(Math.sin(i * 0.4)) * 0.7 + 0.3) * 18 },
                          ]}
                        />
                      ))
                    ) : (
                      waveformBars.map((level, i) => (
                        <View
                          key={i}
                          style={[
                            styles.waveformBar,
                            { height: 6 + level * 18 },
                          ]}
                        />
                      ))
                    )}
                  </View>
                </View>
                <View style={styles.recordingActions}>
                  <TouchableOpacity
                    style={styles.recordingActionBtn}
                    onPress={cancelRecording}
                  >
                    <Icon name="delete-outline" size={28} color={COLORS.white} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.recordingActionBtn, styles.recordingStopBtn]}
                    onPress={toggleRecordVoice}
                  >
                    <Icon name="stop" size={32} color={COLORS.white} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.recordingActionBtn, styles.recordingSendBtn]}
                    onPress={toggleRecordVoice}
                  >
                    <Icon name="send" size={26} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        <Modal visible={showEmoji} transparent animationType="fade">
          <TouchableOpacity style={styles.emojiOverlay} activeOpacity={1} onPress={() => setShowEmoji(false)}>
            <View style={styles.emojiPanel}>
              <FlatList
                data={EMOJI_LIST}
                numColumns={8}
                keyExtractor={(item, i) => `${item}-${i}`}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.emojiCell} onPress={() => insertEmoji(item)}>
                    <Text style={styles.emojiText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  helperText: { fontSize: 16, color: '#666' },
  header: {
    backgroundColor: '#FDB022',
    paddingHorizontal: 20,
    padding: 50,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1C1E',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  backText: { color: 'white', fontWeight: 'bold', marginLeft: 4 },
  typingText: { fontSize: 12, color: '#1A1C1E', marginTop: 6 },
  chatContent: { padding: 20, paddingTop: 20, paddingBottom: 24 },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    width: '100%',
  },
  sentWrapper: { justifyContent: 'flex-end' },
  receivedWrapper: { justifyContent: 'flex-start' },
  avatar: { width: 55, height: 55, borderRadius: 27.5 },
  avatarSpacer: { width: 55, height: 55 },
  bubbleContainer: { maxWidth: '75%', position: 'relative' },
  receivedBubbleContainer: { marginLeft: -35 },
  sentBubbleContainer: { marginRight: 15 },
  bubble: {
    backgroundColor: '#E0E0E0',
    padding: 18,
    borderRadius: 12,
    minHeight: 50,
    justifyContent: 'center',
  },
  messageText: { color: '#9E9E9E', fontSize: 15, lineHeight: 20 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voiceLabel: { fontSize: 14, color: '#9E9E9E' },
  msgImage: { width: 160, height: 160, borderRadius: 8, marginVertical: 4 },
  tail: {
    position: 'absolute',
    top: 15,
    width: 15,
    height: 15,
    backgroundColor: '#E0E0E0',
    transform: [{ rotate: '45deg' }],
    zIndex: -1,
  },
  receivedTail: { left: -6 },
  sentTail: { right: -6 },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    backgroundColor: COLORS.backgroundWhite,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    minHeight: 48,
    maxHeight: 100,
    marginRight: 10,
  },
  inputIconBtn: { padding: 6 },
  input: { flex: 1, marginHorizontal: 6, fontSize: 15, paddingVertical: 10, color: COLORS.textPrimary },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonRecording: {
    backgroundColor: COLORS.error,
  },
  recordingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  recordingContent: {
    backgroundColor: COLORS.darkCharcoal,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
    alignItems: 'center',
  },
  recordingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
  },
  recordingTimer: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.white,
    marginRight: 16,
    minWidth: 48,
  },
  waveformRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 28,
  },
  waveformBar: {
    width: 3,
    backgroundColor: COLORS.white,
    borderRadius: 2,
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  recordingActionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.gray700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingStopBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.error,
  },
  recordingSendBtn: {
    backgroundColor: COLORS.primaryOrange,
  },

  emojiOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  emojiPanel: { backgroundColor: '#fff', maxHeight: 260, padding: 12 },
  emojiCell: { padding: 8, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 24 },
});
