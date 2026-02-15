/**
 * Filter effects config - YouTube/Messenger style
 * Each filter defines a visual overlay applied to the preview in real-time
 * overlayColor + overlayOpacity simulates color grading
 */
export const FILTER_EFFECTS = [
  {
    id: 'none',
    name: 'None',
    thumbnailUrl: null,
    overlayColor: 'transparent',
    overlayOpacity: 0,
    isTrending: false,
  },
  {
    id: '1',
    name: 'Vintage',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    overlayColor: '#8B7355',
    overlayOpacity: 0.25,
    isTrending: true,
  },
  {
    id: '2',
    name: 'Warm',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80',
    overlayColor: '#FF8C42',
    overlayOpacity: 0.2,
    isTrending: true,
  },
  {
    id: '3',
    name: 'Cool',
    thumbnailUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80',
    overlayColor: '#4A90D9',
    overlayOpacity: 0.2,
    isTrending: false,
  },
  {
    id: '4',
    name: 'Cinematic',
    thumbnailUrl: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=200&q=80',
    overlayColor: '#2D1B4E',
    overlayOpacity: 0.3,
    isTrending: true,
  },
  {
    id: '5',
    name: 'Moody',
    thumbnailUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    overlayColor: '#1a1a2e',
    overlayOpacity: 0.35,
    isTrending: false,
  },
  {
    id: '6',
    name: 'Bright',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    overlayColor: '#FFFFFF',
    overlayOpacity: 0.15,
    isTrending: false,
  },
  {
    id: '7',
    name: 'Dramatic',
    thumbnailUrl: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=200&q=80',
    overlayColor: '#2C1810',
    overlayOpacity: 0.4,
    isTrending: true,
  },
  {
    id: '8',
    name: 'Natural',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
    overlayColor: '#5A8F5A',
    overlayOpacity: 0.12,
    isTrending: false,
  },
  {
    id: '9',
    name: 'Fade',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514525253361-bee8a487409e?w=200&q=80',
    overlayColor: '#F5E6D3',
    overlayOpacity: 0.2,
    isTrending: true,
  },
  {
    id: '10',
    name: 'Noir',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&q=80',
    overlayColor: '#1a1a1a',
    overlayOpacity: 0.5,
    isTrending: false,
  },
  {
    id: '11',
    name: 'Black & White',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200&q=80',
    overlayColor: '#808080',
    overlayOpacity: 0.45,
    isTrending: true,
  },
  {
    id: '12',
    name: 'Grayscale',
    thumbnailUrl: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=200&q=80',
    overlayColor: '#6B6B6B',
    overlayOpacity: 0.5,
    isTrending: false,
  },
];

export const getFilterOverlayStyle = filter => {
  if (!filter || filter.id === 'none' || filter.overlayOpacity === 0) {
    return null;
  }
  return {
    backgroundColor: filter.overlayColor || 'transparent',
    opacity: filter.overlayOpacity || 0,
  };
};
