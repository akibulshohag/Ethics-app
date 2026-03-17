import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getComments,
  addComment,
  toggleCommentLike,
  toggleCommentDislike,
  deleteComment,
} from '../services/videoService';
import { shortsService } from '../services/shortsService';
import {
  getPostComments,
  addPostComment,
  togglePostCommentLike,
  togglePostCommentDislike,
  deletePostComment,
} from '../services/postService';
import { safeImageUri } from '../utils/helper';

const { height } = Dimensions.get('window');

const formatTimeAgo = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  if (diffYears > 0) return `${diffYears}y ago`;
  if (diffMonths > 0) return `${diffMonths}mo ago`;
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'Just now';
};

const formatCount = n => {
  if (!n || n < 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

const mapApiCommentToDisplay = (c, currentUser) => {
  const u = c.user || {};
  // Use logged-in user's name/nickname for own comments (API may return different display name)
  const isCurrentUser = currentUser?.id && String(c.userId) === String(currentUser.id);
  const displayName = isCurrentUser
    ? (currentUser.nickname || currentUser.name || u.nickname || u.name || 'Unknown')
    : (u.nickname || u.name || 'Unknown');
  const rawAvatar =
    (isCurrentUser && (currentUser.photos?.[0] || (Array.isArray(currentUser.photos) && currentUser.photos[0])))
    || u.photos?.[0]
    || (Array.isArray(u.photos) && u.photos[0]);
  const avatar = safeImageUri(
    rawAvatar?.src ?? rawAvatar,
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111&color=fff`,
  );
  const repliesList = (c.replies || []).map(r => mapApiCommentToDisplay(r, currentUser));
  return {
    id: c.id,
    userId: c.userId,
    user: { name: displayName, avatar },
    time: formatTimeAgo(c.createdAt),
    text: c.content || '',
    likeCount: c.likeCount ?? 0,
    dislikeCount: c.dislikeCount ?? 0,
    likes: formatCount(c.likeCount || 0),
    dislikes: formatCount(c.dislikeCount || 0),
    isLiked: c.isLiked ?? false,
    isDisliked: c.isDisliked ?? false,
    replies: formatCount(repliesList.length),
    repliesList,
  };
};

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

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=User&background=111&color=fff';

const ReplyItem = ({
  item,
  onLike,
  onDislike,
  onDelete,
  isOwnComment,
  canInteract = true,
  canDelete = true,
}) => {
  const avatarUri = safeImageUri(item.user?.avatar, DEFAULT_AVATAR);
  return (
  <View style={styles.replyItem}>
    <Image source={{ uri: avatarUri }} style={styles.replyAvatar} />
    <View style={styles.replyContent}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentUser}>
          {item.user.name}{' '}
          <Text style={styles.commentTime}>• {item.time}</Text>
        </Text>
        {isOwnComment && canDelete ? (
          <TouchableOpacity
            onPress={() => onDelete?.(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="dots-vertical"
              size={16}
              color="#212121"
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24, height: 24 }} />
        )}
      </View>
      <Text style={styles.commentText}>{item.text}</Text>
      <View style={styles.commentActions}>
        <TouchableOpacity
          style={styles.actionItem}
          onPress={canInteract ? () => onLike?.(item) : undefined}
          disabled={!canInteract}
        >
          <MaterialCommunityIcons
            name={item.isLiked ? 'thumb-up' : 'thumb-up-outline'}
            size={16}
            color={item.isLiked ? '#F97507' : '#212121'}
          />
          <Text style={styles.actionText}>{item.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionItem}
          onPress={canInteract ? () => onDislike?.(item) : undefined}
          disabled={!canInteract}
        >
          <MaterialCommunityIcons
            name={item.isDisliked ? 'thumb-down' : 'thumb-down-outline'}
            size={16}
            color={item.isDisliked ? '#F97507' : '#212121'}
          />
          <Text style={styles.actionText}>{item.dislikes}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
  );
};

const CommentItem = ({
  item,
  userAvatar,
  onSubmitReply,
  onLike,
  onDislike,
  onDelete,
  canReply,
  canInteract,
  canDelete = true,
  isOwnComment,
  currentUserId,
}) => {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !onSubmitReply) return;
    setSubmitting(true);
    try {
      await onSubmitReply(item.id, replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
      setShowReplies(true);
    } finally {
      setSubmitting(false);
    }
  };

  const replyCount = item.repliesList?.length || 0;

  const avatarUri = safeImageUri(item.user?.avatar, DEFAULT_AVATAR);
  return (
    <View style={styles.commentItem}>
      <Image source={{ uri: avatarUri }} style={styles.commentAvatar} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUser}>
            {item.user.name}{' '}
            <Text style={styles.commentTime}>• {item.time}</Text>
          </Text>
          {isOwnComment && canDelete ? (
            <TouchableOpacity
              onPress={() => onDelete?.(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={20}
                color="#212121"
              />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24, height: 24 }} />
          )}
        </View>
        <Text style={styles.commentText}>{item.text}</Text>

        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={canInteract ? () => onLike?.(item) : undefined}
            disabled={!canInteract}
          >
            <MaterialCommunityIcons
              name={item.isLiked ? 'thumb-up' : 'thumb-up-outline'}
              size={18}
              color={item.isLiked ? '#F97507' : '#212121'}
            />
            <Text style={styles.actionText}>{item.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={canInteract ? () => onDislike?.(item) : undefined}
            disabled={!canInteract}
          >
            <MaterialCommunityIcons
              name={item.isDisliked ? 'thumb-down' : 'thumb-down-outline'}
              size={18}
              color={item.isDisliked ? '#F97507' : '#212121'}
            />
            <Text style={styles.actionText}>{item.dislikes}</Text>
          </TouchableOpacity>
          {replyCount > 0 && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => setShowReplies(!showReplies)}
            >
              <MaterialCommunityIcons
                name="comment-text-outline"
                size={18}
                color="#212121"
              />
              <Text style={styles.actionText}>{item.replies}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.replyLinksRow}>
          {replyCount > 0 && (
            <TouchableOpacity
              onPress={() => setShowReplies(!showReplies)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.replyLink}>
                {showReplies
                  ? `Hide ${item.replies} ${replyCount === 1 ? 'reply' : 'replies'}`
                  : `View ${item.replies} ${replyCount === 1 ? 'reply' : 'replies'}`}
              </Text>
            </TouchableOpacity>
          )}
          {canReply && (
            <TouchableOpacity
              onPress={() => setShowReplyInput(!showReplyInput)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.replyLink, replyCount > 0 && styles.replyLinkSpacing]}>
                Reply
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {showReplyInput && canReply && (
          <View style={styles.replyInputContainer}>
            <Image
              source={{ uri: userAvatar }}
              style={styles.userAvatarSmallReply}
            />
            <View style={{ flex: 1 }}>
              <View style={styles.replyInputWrapper}>
                <TextInput
                  placeholder="Add a reply..."
                  placeholderTextColor="#9E9E9E"
                  style={styles.input}
                  value={replyText}
                  onChangeText={setReplyText}
                  autoFocus
                  editable={!submitting}
                />
              </View>
              <View style={styles.replyButtonContainer}>
                <TouchableOpacity
                  onPress={() => setShowReplyInput(false)}
                  style={styles.cancelReplyButton}
                >
                  <Text style={styles.cancelReplyText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitReplyButton,
                    {
                      backgroundColor: replyText.trim()
                        ? '#F97507'
                        : '#E0E0E0',
                    },
                  ]}
                  disabled={!replyText.trim() || submitting}
                  onPress={handleSubmitReply}
                >
                  <Text
                    style={[
                      styles.submitReplyText,
                      { color: replyText.trim() ? '#fff' : '#9E9E9E' },
                    ]}
                  >
                    {submitting ? '...' : 'Reply'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

          {showReplies &&
            item.repliesList &&
            item.repliesList.map(reply => (
              <ReplyItem
                key={reply.id}
                item={reply}
                onLike={onLike}
                onDislike={onDislike}
                onDelete={onDelete}
                isOwnComment={currentUserId ? String(reply.userId) === String(currentUserId) : false}
                canInteract={canInteract}
                canDelete={canDelete}
              />
            ))}
      </View>
    </View>
  );
};

const CommentsModal = ({
  visible,
  onClose,
  videoId,
  video,
  user,
  onCommentAdded,
  onCommentDeleted,
  contentType = 'video',
  contentId,
}) => {
  const isShort = contentType === 'short';
  const isPost = contentType === 'post';
  const contentIdResolved = isPost ? contentId : (isShort ? contentId : videoId);
  const supportsCommentLikeDislike = true;
  const [activeFilter, setActiveFilter] = useState('Top');
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const rawUserPhoto = user?.photos?.[0] ?? (Array.isArray(user?.photos) && user?.photos[0]);
  const userAvatarRaw = safeImageUri(
    rawUserPhoto?.src ?? rawUserPhoto,
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user?.nickname || user?.name || 'User',
    )}&background=111&color=fff`,
  );
  const userAvatar = typeof userAvatarRaw === 'string' && userAvatarRaw.length > 0 ? userAvatarRaw : DEFAULT_AVATAR;

  const loadComments = useCallback(
    async (reset = false) => {
      if (!contentIdResolved) return;
      const p = reset ? 1 : page;
      if (p === 1) setLoading(true);
      try {
        let res;
        if (isPost) {
          res = await getPostComments(contentIdResolved, p, 20, user?.id);
        } else if (isShort) {
          res = await shortsService.getComments(contentIdResolved, p, 20, user?.id);
        } else {
          res = await getComments(contentIdResolved, p, 20, user?.id);
        }
        const list = (res?.comments || []).map(c => mapApiCommentToDisplay(c, user));
        setComments(prev => (reset ? list : [...prev, ...list]));
        setHasMore(
          (res?.pagination?.totalPages || 1) > (res?.pagination?.page || 1),
        );
        if (reset) setPage(1);
        else setPage(p);
      } catch {
        if (reset) setComments([]);
      } finally {
        setLoading(false);
      }
    },
    [contentIdResolved, isShort, isPost, page, user?.id],
  );

  useEffect(() => {
    if (visible && contentIdResolved) {
      loadComments(true);
    }
  }, [visible, contentIdResolved]);

  const handleAddComment = async () => {
    if (!commentText.trim() || !user?.id || !contentIdResolved) return;
    setSubmitting(true);
    try {
      if (isPost) {
        await addPostComment(contentIdResolved, user.id, commentText.trim());
      } else if (isShort) {
        await shortsService.addComment(contentIdResolved, user.id, commentText.trim());
      } else {
        await addComment(contentIdResolved, user.id, commentText.trim());
      }
      setCommentText('');
      onCommentAdded?.(false);
      loadComments(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = useCallback(
    async (parentId, content) => {
      if (!user?.id || !contentIdResolved) return;
      if (isShort) {
        await shortsService.addComment(contentIdResolved, user.id, content, parentId);
      } else {
        await addComment(contentIdResolved, user.id, content, parentId);
      }
      onCommentAdded?.(true);
      loadComments(true);
    },
    [contentIdResolved, isShort, user?.id, onCommentAdded],
  );

  const updateCommentInList = useCallback((commentId, updater) => {
    setComments(prev =>
      prev.map(c => {
        if (c.id === commentId) return updater(c);
        return {
          ...c,
          repliesList: (c.repliesList || []).map(r =>
            r.id === commentId ? updater(r) : r,
          ),
        };
      }),
    );
  }, []);

  const handleCommentLike = useCallback(
    async comment => {
      if (!user?.id || !supportsCommentLikeDislike) return;
      const wasLiked = comment.isLiked;
      const wasDisliked = comment.isDisliked;
      updateCommentInList(comment.id, c => ({
        ...c,
        isLiked: !wasLiked,
        isDisliked: wasLiked ? c.isDisliked : false,
        likeCount: c.likeCount + (wasLiked ? -1 : 1),
        dislikeCount: wasDisliked && !wasLiked ? c.dislikeCount - 1 : c.dislikeCount,
        likes: formatCount(
          (c.likeCount ?? 0) + (wasLiked ? -1 : 1),
        ),
        dislikes: formatCount(
          wasDisliked && !wasLiked ? (c.dislikeCount ?? 0) - 1 : (c.dislikeCount ?? 0),
        ),
      }));
      try {
        if (isPost) {
          await togglePostCommentLike(comment.id, user.id);
        } else if (isShort) {
          await shortsService.toggleCommentLike(comment.id, user.id);
        } else {
          await toggleCommentLike(comment.id, user.id);
        }
      } catch {
        updateCommentInList(comment.id, c => ({
          ...c,
          isLiked: wasLiked,
          isDisliked: wasDisliked,
          likeCount: c.likeCount,
          dislikeCount: c.dislikeCount,
          likes: formatCount(c.likeCount ?? 0),
          dislikes: formatCount(c.dislikeCount ?? 0),
        }));
      }
    },
    [user?.id, supportsCommentLikeDislike, isShort, isPost, updateCommentInList],
  );

  const handleCommentDislike = useCallback(
    async comment => {
      if (!user?.id || !supportsCommentLikeDislike) return;
      const wasDisliked = comment.isDisliked;
      const wasLiked = comment.isLiked;
      updateCommentInList(comment.id, c => ({
        ...c,
        isDisliked: !wasDisliked,
        isLiked: wasDisliked ? c.isLiked : false,
        dislikeCount: c.dislikeCount + (wasDisliked ? -1 : 1),
        likeCount: wasLiked && !wasDisliked ? c.likeCount - 1 : c.likeCount,
        dislikes: formatCount(
          (c.dislikeCount ?? 0) + (wasDisliked ? -1 : 1),
        ),
        likes: formatCount(
          wasLiked && !wasDisliked ? (c.likeCount ?? 0) - 1 : (c.likeCount ?? 0),
        ),
      }));
      try {
        if (isPost) {
          await togglePostCommentDislike(comment.id, user.id);
        } else if (isShort) {
          await shortsService.toggleCommentDislike(comment.id, user.id);
        } else {
          await toggleCommentDislike(comment.id, user.id);
        }
      } catch {
        updateCommentInList(comment.id, c => ({
          ...c,
          isLiked: wasLiked,
          isDisliked: wasDisliked,
          likeCount: c.likeCount,
          dislikeCount: c.dislikeCount,
          likes: formatCount(c.likeCount ?? 0),
          dislikes: formatCount(c.dislikeCount ?? 0),
        }));
      }
    },
    [user?.id, supportsCommentLikeDislike, isShort, isPost, updateCommentInList],
  );

  const handleDeleteComment = useCallback(
    comment => {
      if (!user?.id) return;
      if (isShort) return; // Shorts may not support delete in API
      Alert.alert(
        'Delete comment',
        'Are you sure you want to delete this comment?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                if (isPost) {
                  await deletePostComment(comment.id, user.id);
                  const replyCount = comment.repliesList?.length ?? 0;
                  onCommentDeleted?.(true, 1 + replyCount);
                } else {
                  const res = await deleteComment(comment.id, user.id);
                  const replyCount = comment.repliesList?.length ?? 0;
                  onCommentDeleted?.(res?.wasTopLevel ?? !comment.parentId, 1 + replyCount);
                }
                loadComments(true);
              } catch {
                Alert.alert('Error', 'Could not delete comment');
              }
            },
          },
        ],
      );
    },
    [user?.id, isPost, loadComments, onCommentDeleted],
  );

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

              <View style={styles.header}>
                <Text style={styles.headerTitle}>
                  Comments {video ? `(${video.topLevelCommentCount ?? video.commentCount ?? 0})` : ''}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color="#212121"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <View style={styles.filtersContainer}>
                <FilterButton
                  label="Top"
                  active={activeFilter === 'Top'}
                  onPress={() => setActiveFilter('Top')}
                />
                <FilterButton
                  label="Newest"
                  active={activeFilter === 'Newest'}
                  onPress={() => setActiveFilter('Newest')}
                />
                <FilterButton
                  label="Most Liked"
                  active={activeFilter === 'Most Liked'}
                  onPress={() => setActiveFilter('Most Liked')}
                />
              </View>

              <View style={styles.addCommentContainer}>
                <Image source={{ uri: userAvatar || DEFAULT_AVATAR }} style={styles.userAvatar} />
                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder={
                      user?.id
                        ? 'Add a comment...'
                        : 'Sign in to comment'
                    }
                    placeholderTextColor="#9E9E9E"
                    style={styles.input}
                    value={commentText}
                    onChangeText={setCommentText}
                    editable={!!user?.id && !submitting}
                    onSubmitEditing={handleAddComment}
                    returnKeyType="send"
                  />
                </View>
                {user?.id && commentText.trim() && (
                  <TouchableOpacity
                    style={styles.postButton}
                    onPress={handleAddComment}
                    disabled={submitting}
                  >
                    <Text
                      style={[
                        styles.postButtonText,
                        { opacity: submitting ? 0.6 : 1 },
                      ]}
                    >
                      Post
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.divider} />

              {loading && comments.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#F97507" />
                  <Text style={styles.loadingText}>Loading comments...</Text>
                </View>
              ) : (
                <FlatList
                  data={comments}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <CommentItem
                      item={item}
                      userAvatar={userAvatar}
                      onSubmitReply={handleSubmitReply}
                      onLike={handleCommentLike}
                      onDislike={handleCommentDislike}
                      onDelete={handleDeleteComment}
                      canReply={!!user?.id}
                      canInteract={!!user?.id && supportsCommentLikeDislike}
                      canDelete={!isShort}
                      isOwnComment={user?.id ? String(item.userId) === String(user.id) : false}
                      currentUserId={user?.id}
                    />
                  )}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No comments yet</Text>
                  }
                />
              )}
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
  postButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  postButtonText: {
    color: '#F97507',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#616161',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9E9E9E',
    marginTop: 24,
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
  replyLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  replyLink: {
    color: '#5382E7',
    fontSize: 14,
    fontWeight: '600',
  },
  replyLinkSpacing: {
    marginLeft: 16,
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
