import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  FlatList,
  Image,
  TextInput,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { height } = Dimensions.get('window');

const LIVE_CHAT_DATA = [
  {
    id: '1',
    user: {
      name: 'Annabel Rohan',
      avatar: 'https://ui-avatars.com/api/?name=Annabel+Rohan&background=9575CD&color=fff',
    },
    message: 'This is so fantastic 🔥🔥🔥',
  },
  {
    id: '2',
    user: {
      name: 'Georgette Strobel',
      avatar: 'https://ui-avatars.com/api/?name=Georgette+Strobel&background=E57373&color=fff',
    },
    message: 'hey i was wondering did you guys do any type of changes?',
  },
  {
    id: '3',
    user: {
      name: 'Rodolfo Goode',
      avatar: 'https://ui-avatars.com/api/?name=Rodolfo+Goode&background=81C784&color=fff',
    },
    message: 'I hate this, why you always ignoring me! 😠',
  },
  {
    id: '4',
    user: {
      name: 'Johnsie Jock',
      avatar: 'https://ui-avatars.com/api/?name=Johnsie+Jock&background=FFB74D&color=fff',
    },
    message: 'I love videos like this one. ❤️❤️',
  },
  {
    id: '5',
    user: {
      name: 'Titus Kitamura',
      avatar: 'https://ui-avatars.com/api/?name=Titus+Kitamura&background=4DD0E1&color=fff',
    },
    message: "That's great, i wish I could have one. 😐",
  },
  {
    id: '6',
    user: {
      name: 'Alfonzo Schuessler',
      avatar: 'https://ui-avatars.com/api/?name=Alfonzo+Schuessler&background=7986CB&color=fff',
    },
    message: 'Thank you! That was very helpful! 😇😇',
  },
];

const ChatItem = ({ item }) => (
  <View style={styles.chatItem}>
    <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
    <View style={styles.messageContent}>
      <Text style={styles.userName}>{item.user.name}</Text>
      <Text style={styles.messageText}>{item.message}</Text>
    </View>
  </View>
);

const LiveChatModal = ({ visible, onClose }) => {
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
              <View style={styles.dragHandle} />
              
              {/* Header */}
              <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Live Chat</Text>
                    <Text style={styles.watcherCount}>
                        <MaterialCommunityIcons name="account-group" size={14} color="#616161" /> 1.2K watching
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.iconButton}>
                        <MaterialCommunityIcons name="tune" size={24} color="#212121" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                        <MaterialCommunityIcons name="close" size={24} color="#212121" />
                    </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Chat List */}
              <FlatList
                data={LIVE_CHAT_DATA}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ChatItem item={item} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />

              {/* Input Area */}
              <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                      <TouchableOpacity>
                        <MaterialCommunityIcons name="emoticon-happy-outline" size={24} color="#F97507" />
                      </TouchableOpacity>
                      <TextInput 
                        placeholder="Chat Publicly as Andrew Ainsley"
                        placeholderTextColor="#9E9E9E"
                        style={styles.input}
                      />
                      <TouchableOpacity>
                        <MaterialCommunityIcons name="send" size={24} color="#F97507" />
                      </TouchableOpacity>
                  </View>
              </View>

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
    height: height * 0.67, 
    paddingTop: 12,
    paddingBottom: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  watcherCount: {
      fontSize: 14,
      color: '#616161',
      fontWeight: '400',
  },
  headerActions: {
      flexDirection: 'row',
  },
  iconButton: {
      marginLeft: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#f2f2f2',
  },
  listContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
  },
  chatItem: {
      flexDirection: 'row',
      marginBottom: 20,
      alignItems: 'flex-start',
  },
  avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 12,
  },
  messageContent: {
      flex: 1,
      justifyContent: 'center',
  },
  userName: {
      fontSize: 14,
      color: '#757575',
      marginBottom: 2,
  },
  messageText: {
      fontSize: 15,
      color: '#212121',
      lineHeight: 20,
  },
  inputContainer: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 20, // For keyboard/safe area
  },
  inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FAFAFA',
      borderRadius: 30,
      paddingHorizontal: 16,
      height: 56,
  },
  input: {
      flex: 1,
      marginHorizontal: 12,
      fontSize: 14,
      color: '#212121',
  },
});

export default LiveChatModal;
