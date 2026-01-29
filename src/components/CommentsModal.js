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

const COMMENTS_DATA = [
  {
    id: '1',
    user: {
      name: 'Freida Varnes',
      avatar: 'https://ui-avatars.com/api/?name=Freida+Varnes&background=FF8A65&color=fff',
    },
    time: '2 months ago',
    text: 'The wolf is so beautiful 😍. Love it! I want one at home, but it seems impossible because the animal is protected 😂😂',
    likes: '3.2K',
    dislikes: '368',
    replies: '675',
    hasReplyLink: true,
    repliesList: [
        {
            id: 'r1',
            user: {
                name: 'John Doe',
                avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=E57373&color=fff',
            },
            time: '1 month ago',
            text: 'Absolutely agree! Wolves are majestic creatures.',
            likes: '45',
            dislikes: '2',
        },
         {
            id: 'r2',
            user: {
                name: 'Jane Smith',
                avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=BA68C8&color=fff',
            },
            time: '3 weeks ago',
            text: 'I saw one in the wild once, it was breathtaking.',
            likes: '120',
            dislikes: '5',
        }
    ]
  },
  {
    id: '2',
    user: {
      name: 'Merrill Kervin',
      avatar: 'https://ui-avatars.com/api/?name=Merrill+Kervin&background=7986CB&color=fff',
    },
    time: '1 months ago',
    text: 'Vitae proin sagittis nisl rhoncus. Metus aliquam eleifend mi in nulla posuere sollicitudin aliquam ultrices.',
    likes: '2.9K',
    dislikes: '342',
    replies: '466',
    hasReplyLink: false,
    repliesList: []
  },
  {
    id: '3',
    user: {
      name: 'Marx Hershey',
      avatar: 'https://ui-avatars.com/api/?name=Marx+Hershey&background=FFD54F&color=fff',
    },
    time: '1 year ago',
    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quam pellentesque nec nam aliquam sem',
    likes: '000',
    dislikes: '000',
    replies: '000',
    hasReplyLink: false,
    repliesList: []
  },
  {
    id: '4',
    user: {
      name: 'Marx Hershey',
      avatar: 'https://ui-avatars.com/api/?name=Marx+Hershey&background=FFD54F&color=fff',
    },
    time: '1 year ago',
    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quam pellentesque nec nam aliquam sem',
    likes: '000',
    dislikes: '000',
    replies: '000',
    hasReplyLink: false,
    repliesList: []
  },
  {
    id: '5',
    user: {
      name: 'Marx Hershey',
      avatar: 'https://ui-avatars.com/api/?name=Marx+Hershey&background=FFD54F&color=fff',
    },
    time: '1 year ago',
    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quam pellentesque nec nam aliquam sem',
    likes: '000',
    dislikes: '000',
    replies: '000',
    hasReplyLink: false,
    repliesList: []
  },
];

const FilterButton = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.filterButton, active ? styles.filterButtonActive : styles.filterButtonInactive]}
    onPress={onPress}
  >
    <Text style={[styles.filterText, active ? styles.filterTextActive : styles.filterTextInactive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const ReplyItem = ({ item }) => (
    <View style={styles.replyItem}>
        <Image source={{ uri: item.user.avatar }} style={styles.replyAvatar} />
        <View style={styles.replyContent}>
            <View style={styles.commentHeader}>
                <Text style={styles.commentUser}>{item.user.name}  <Text style={styles.commentTime}>•  {item.time}</Text></Text>
                 <TouchableOpacity>
                    <MaterialCommunityIcons name="dots-vertical" size={16} color="#212121" />
                </TouchableOpacity>
            </View>
            <Text style={styles.commentText}>{item.text}</Text>
             <View style={styles.commentActions}>
                <View style={styles.actionItem}>
                    <MaterialCommunityIcons name="thumb-up-outline" size={16} color="#212121" />
                    <Text style={styles.actionText}>{item.likes}</Text>
                </View>
                <View style={styles.actionItem}>
                    <MaterialCommunityIcons name="thumb-down-outline" size={16} color="#212121" />
                    <Text style={styles.actionText}>{item.dislikes}</Text>
                </View>
                 <View style={styles.actionItem}>
                    <Text style={[styles.actionText, {marginLeft: 0, fontWeight: '600'}]}>Reply</Text>
                </View>
            </View>
        </View>
    </View>
);

const CommentItem = ({ item }) => {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');

  return (
      <View style={styles.commentItem}>
        <Image source={{ uri: item.user.avatar }} style={styles.commentAvatar} />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUser}>{item.user.name}  <Text style={styles.commentTime}>•  {item.time}</Text></Text>
            <TouchableOpacity>
                <MaterialCommunityIcons name="dots-vertical" size={20} color="#212121" />
            </TouchableOpacity>
          </View>
          <Text style={styles.commentText}>{item.text}</Text>
          
          <View style={styles.commentActions}>
            <TouchableOpacity style={styles.actionItem}>
                <MaterialCommunityIcons name="thumb-up-outline" size={18} color="#212121" />
                <Text style={styles.actionText}>{item.likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
                <MaterialCommunityIcons name="thumb-down-outline" size={18} color="#212121" />
                <Text style={styles.actionText}>{item.dislikes}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => item.repliesList?.length > 0 && setShowReplies(!showReplies)}>
                <MaterialCommunityIcons name="comment-text-outline" size={18} color="#212121" />
                <Text style={styles.actionText}>{item.replies}</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity onPress={() => setShowReplyInput(!showReplyInput)}>
             <Text style={styles.replyLink}>{item.replies} Reply</Text>
          </TouchableOpacity>

            {showReplyInput && (
                <View style={styles.replyInputContainer}>
                     <Image source={{ uri: 'https://ui-avatars.com/api/?name=My+User' }} style={styles.userAvatarSmallReply} />
                     <View style={{flex: 1}}>
                        <View style={styles.replyInputWrapper}>
                            <TextInput 
                                placeholder="Add a reply..."
                                placeholderTextColor="#9E9E9E"
                                style={styles.input}
                                value={replyText}
                                onChangeText={setReplyText}
                                autoFocus
                            />
                        </View>
                        <View style={styles.replyButtonContainer}>
                            <TouchableOpacity onPress={() => setShowReplyInput(false)} style={styles.cancelReplyButton}>
                                <Text style={styles.cancelReplyText}>Cancel</Text>
                            </TouchableOpacity>
                             <TouchableOpacity style={[styles.submitReplyButton, { backgroundColor: replyText ? '#F97507' : '#E0E0E0' }]} disabled={!replyText}>
                                <Text style={[styles.submitReplyText, { color: replyText ? '#fff' : '#9E9E9E' }]}>Reply</Text>
                            </TouchableOpacity>
                        </View>
                     </View>
                </View>
            )}

          {showReplies && item.repliesList && item.repliesList.map(reply => (
              <ReplyItem key={reply.id} item={reply} />
          ))}
        </View>
      </View>
  );
};

const CommentsModal = ({ visible, onClose }) => {
  const [activeFilter, setActiveFilter] = useState('Top');

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
                <Text style={styles.headerTitle}>Comments</Text>
                <TouchableOpacity onPress={onClose}>
                  <MaterialCommunityIcons name="close" size={24} color="#212121" />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Filters */}
              <View style={styles.filtersContainer}>
                <FilterButton label="Top" active={activeFilter === 'Top'} onPress={() => setActiveFilter('Top')} />
                <FilterButton label="Newest" active={activeFilter === 'Newest'} onPress={() => setActiveFilter('Newest')} />
                <FilterButton label="Most Liked" active={activeFilter === 'Most Liked'} onPress={() => setActiveFilter('Most Liked')} />
              </View>

              {/* Add Comment Input */}
              <View style={styles.addCommentContainer}>
                <Image source={{ uri: 'https://ui-avatars.com/api/?name=My+User' }} style={styles.userAvatar} />
                <View style={styles.inputWrapper}>
                     <TextInput 
                        placeholder="Add a comment..."
                        placeholderTextColor="#9E9E9E"
                        style={styles.input} 
                     />
                </View>
              </View>
              
              <View style={styles.divider} />

              {/* Comments List */}
              <FlatList
                data={COMMENTS_DATA}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <CommentItem item={item} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
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
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
  },
  divider: {
    height: 1,
    backgroundColor: '#f2f2f2',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 1,
  },
  filterButtonActive: {
    backgroundColor: '#F97507',
    borderColor: '#F97507',
  },
  filterButtonInactive: {
    backgroundColor: '#fff',
    borderColor: '#F97507',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  filterTextInactive: {
    color: '#F97507',
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  inputWrapper: {
      flex: 1,
      backgroundColor: '#FAFAFA',
      borderRadius: 25,
      paddingHorizontal: 16,
      height: 45,
      justifyContent: 'center',
  },
  input: {
      fontSize: 14,
      color: '#212121',
  },
  listContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
  },
  commentItem: {
      flexDirection: 'row',
      marginTop: 20,
  },
  commentAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
  },
  commentContent: {
      flex: 1,
  },
  commentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
  },
  commentUser: {
      fontSize: 14,
      fontWeight: '700',
      color: '#212121',
  },
  commentTime: {
      fontSize: 12,
      fontWeight: '400',
      color: '#616161',
  },
  commentText: {
      fontSize: 14,
      color: '#212121',
      lineHeight: 20,
      marginBottom: 8,
  },
  commentActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
  },
  actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 20,
  },
  actionText: {
      fontSize: 12,
      color: '#424242',
      marginLeft: 6,
      fontWeight: '500',
  },
  replyLink: {
      color: '#5382E7', // Blue color roughly matching image
      fontSize: 14,
      fontWeight: '600',
  },
  replyItem: {
      flexDirection: 'row',
      marginTop: 16,
      width: '100%',
  },
  replyAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      marginRight: 12,
  },
  replyContent: {
      flex: 1,
  },
  replyInputContainer: {
      flexDirection: 'row',
      marginTop: 12,
      marginBottom: 8,
  },
  userAvatarSmallReply: {
      width: 24,
      height: 24,
      borderRadius: 12,
      marginRight: 12,
      marginTop: 4,
  },
  replyInputWrapper: {
      backgroundColor: '#FAFAFA',
      borderRadius: 25,
      paddingHorizontal: 16,
      height: 40,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#E0E0E0', // Slight border for visibility
  },
  replyButtonContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 8,
      alignItems: 'center',
  },
  cancelReplyButton: {
      marginRight: 16,
      paddingVertical: 6,
      paddingHorizontal: 12,
  },
  cancelReplyText: {
      color: '#212121',
      fontWeight: '600',
      fontSize: 14,
  },
  submitReplyButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
  },
  submitReplyText: {
      fontWeight: '600',
      fontSize: 14,
  },
});

export default CommentsModal;
