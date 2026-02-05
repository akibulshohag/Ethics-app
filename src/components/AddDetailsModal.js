import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SetVisibilityModal from './SetVisibilityModal';
import SelectAudienceModal from './SelectAudienceModal';

const AddDetailsModal = ({visible, onClose}) => {
  const [visibilityModalVisible, setVisibilityModalVisible] = React.useState(false);
  const [visibility, setVisibility] = React.useState('Public');
  const [audienceModalVisible, setAudienceModalVisible] = React.useState(false);
  const [audience, setAudience] = React.useState({ madeForKids: null, ageRestricted: null });
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Details</Text>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-horizontal-circle-outline" size={24} color="black" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Top Section: Cover & Caption */}
          <View style={styles.topSection}>
            <View style={styles.coverContainer}>
              <Image 
                source={{uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60'}} 
                style={styles.coverImage} 
              />
              <View style={styles.selectCoverOverlay}>
                <Text style={styles.selectCoverText}>Select Cover</Text>
              </View>
            </View>
            <View style={styles.captionContainer}>
              <TextInput 
                placeholder="Caption your shorts..."
                placeholderTextColor="#999"
                multiline
                style={styles.captionInput}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.optionsList}>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => setVisibilityModalVisible(true)}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="eye-outline" size={24} color="#333" style={styles.optionIcon} />
                <Text style={styles.optionLabel}>Visibility</Text>
              </View>
              <View style={styles.optionRight}>
                <Text style={styles.optionValue}>{visibility}</Text>
                <Ionicons name="chevron-forward" size={20} color="#333" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => setAudienceModalVisible(true)}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="people-outline" size={24} color="#333" style={styles.optionIcon} />
                <Text style={styles.optionLabel}>Select Audience</Text>
              </View>
              <View style={styles.optionRight}>
                <Ionicons name="chevron-forward" size={20} color="#333" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem}>
              <View style={styles.optionLeft}>
                <Ionicons name="calendar-outline" size={24} color="#333" style={styles.optionIcon} />
                <Text style={styles.optionLabel}>Schedule</Text>
              </View>
              <View style={styles.optionRight}>
                <Text style={styles.optionValue}>Now</Text>
                <Ionicons name="chevron-forward" size={20} color="#333" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem}>
              <View style={styles.optionLeft}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="#333" style={styles.optionIcon} />
                <Text style={styles.optionLabel}>Comments</Text>
              </View>
              <View style={styles.optionRight}>
                <Text style={styles.optionValue}>Allow all comments</Text>
                <Ionicons name="chevron-forward" size={20} color="#333" />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.uploadButton}>
            <Text style={styles.uploadButtonText}>Upload Shorts</Text>
          </TouchableOpacity>
        </View>

        <SetVisibilityModal
          visible={visibilityModalVisible}
          onClose={() => setVisibilityModalVisible(false)}
          initialValue={visibility}
          onApply={(val) => setVisibility(val)}
        />
        <SelectAudienceModal
          visible={audienceModalVisible}
          onClose={() => setAudienceModalVisible(false)}
          initialValue={audience}
          onApply={(val) => setAudience(val)}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'black',
  },
  headerButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  topSection: {
    flexDirection: 'row',
    padding: 16,
  },
  coverContainer: {
    width: 100,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  selectCoverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  selectCoverText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  captionContainer: {
    flex: 1,
    marginLeft: 16,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 12,
  },
  captionInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  optionsList: {
    paddingHorizontal: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionValue: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  uploadButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddDetailsModal;
