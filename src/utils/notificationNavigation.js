import { shortsService } from '../services/shortsService';
import { getVideoById } from '../services/videoService';

export const getNotificationIcon = type => {
  switch (type) {
    case 'video_like':
    case 'short_like':
    case 'post_like':
      return 'thumb-up-outline';
    case 'video_comment':
    case 'short_comment':
    case 'post_comment':
      return 'comment-outline';
    case 'restaurant_order':
    case 'order':
      return 'cart-outline';
    case 'chat_message':
      return 'message-text-outline';
    case 'promotion_new':
      return 'tag-outline';
    case 'short_new':
      return 'play-box-outline';
    case 'video_new':
      return 'video-outline';
    default:
      return 'bell-outline';
  }
};

export async function navigateFromNotification(navigation, notification, currentUser) {
  if (!navigation || !notification) return false;

  const { type, contentId, orderId } = notification;
  const targetId = contentId || orderId;
  if (!targetId) return false;

  const role = String(currentUser?.role || '').toLowerCase();

  switch (type) {
    case 'chat_message':
      navigation.navigate('ChatScreen', {
        partnerId: targetId,
        partnerName: 'Chat',
      });
      return true;

    case 'restaurant_order':
    case 'order':
      navigation.navigate('OrderDetailsScreen', { orderId: targetId });
      return true;

    case 'short_like':
    case 'short_comment':
    case 'short_new':
      try {
        const short = await shortsService.getShortById(
          targetId,
          currentUser?.id,
          currentUser?.role,
        );
        navigation.navigate('ProductShortsVideo', {
          item: { ...(short || {}), type: 'short', id: targetId },
        });
      } catch {
        navigation.navigate('HomeShortsExploreScreen', {
          initialShortId: targetId,
        });
      }
      return true;

    case 'video_like':
    case 'video_comment':
    case 'video_new':
      try {
        const video = await getVideoById(
          targetId,
          currentUser?.id,
          currentUser?.role,
        );
        navigation.navigate('VideoDetailsScreen', {
          videoId: targetId,
          video,
        });
      } catch {
        navigation.navigate('VideoDetailsScreen', { videoId: targetId });
      }
      return true;

    case 'promotion_new':
      navigation.navigate('UserViewsScreen', {
        userId: targetId,
        highlightPromotionId: orderId || undefined,
      });
      return true;

    case 'post_like':
    case 'post_comment':
      if (role === 'owner' || role === 'vendor') {
        navigation.navigate('BusinessProfileViewScreen');
      } else {
        navigation.navigate('PromotionScreen');
      }
      return true;

    default:
      return false;
  }
}
