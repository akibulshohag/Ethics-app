import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const formatDate = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `Joined ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const formatCount = n => {
  if (!n || n < 0) return '0';
  if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

const ChannelAbout = ({
  channelAbout = '',
  channelName = '',
  createdAt,
  totalViews = 0,
  canEdit = false,
  onSave,
}) => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [nickname, setNickname] = useState(channelName);
  const [about, setAbout] = useState(channelAbout);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave({ nickname: nickname.trim() || undefined, channelAbout: about.trim() || undefined });
      setEditModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = () => {
    setNickname(channelName);
    setAbout(channelAbout);
    setEditModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Description Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Description</Text>
          {canEdit && (
            <TouchableOpacity onPress={openEdit} style={styles.editButton}>
              <MaterialCommunityIcons name="pencil" size={18} color="#F97507" />
              <Text style={styles.editText}>Edit channel</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.descriptionText}>
          {channelAbout || (canEdit ? 'Add a description to tell viewers about your channel.' : 'No description.')}
        </Text>
      </View>

      {/* More Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        {createdAt && (
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="calendar" size={24} color="#212121" />
            <Text style={styles.infoText}>{formatDate(createdAt)}</Text>
          </View>
        )}
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="chart-line-variant" size={24} color="#212121" />
          <Text style={styles.infoText}>{formatCount(totalViews)} views</Text>
        </View>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit channel</Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[styles.modalSave, saving && styles.modalSaveDisabled]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#F97507" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Channel name</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder="Your channel name"
                placeholderTextColor="#999"
              />
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>About</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={about}
                onChangeText={setAbout}
                placeholder="Tell viewers about your channel"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editText: {
    fontSize: 14,
    color: '#F97507',
    fontWeight: '600',
    marginLeft: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#616161',
    lineHeight: 22,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: '#212121',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  modalCancel: {
    fontSize: 16,
    color: '#616161',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  modalSave: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  modalSaveDisabled: {
    opacity: 0.6,
  },
  modalSaveText: {
    fontSize: 16,
    color: '#F97507',
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#212121',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

export default ChannelAbout;
