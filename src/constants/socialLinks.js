// Social link types and icon names (MaterialCommunityIcons)
// To add a new type: add an entry to SOCIAL_LINK_TYPES and SOCIAL_LINK_ICONS (icon = MaterialCommunityIcons name)
export const SOCIAL_LINK_TYPES = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'snapchat', label: 'Snapchat' },
  { value: 'website', label: 'Website' },
  { value: 'others', label: 'Others' },
];

// MaterialCommunityIcons name for each type (fallback: 'link-variant')
export const SOCIAL_LINK_ICONS = {
  facebook: 'facebook',
  instagram: 'instagram',
  x: 'twitter',
  google_email: 'email-outline',
  linkedin: 'linkedin',
  youtube: 'youtube',
  tiktok: 'music', // MCI may not have tiktok; music is a common fallback
  telegram: 'send',
  whatsapp: 'whatsapp',
  snapchat: 'camera',
  website: 'web',
  others: 'link-variant',
};

export const getSocialIcon = type =>
  type && SOCIAL_LINK_ICONS[type] ? SOCIAL_LINK_ICONS[type] : 'link-variant';
