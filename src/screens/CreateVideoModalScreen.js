import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import CreateVideoModal from '../components/CreateVideoModal';
import { navigateToHomeOne } from '../utils/navigateToHomeOne';
import { navigateToRootRoute } from '../utils/navigateToRootRoute';

const canUploadFeaturedVideo = role => {
  const r = String(role || '').toLowerCase();
  return (
    r === 'owner' ||
    r === 'admin' ||
    r === 'superadmin' ||
    r === 'super_admin' ||
    r === 'super-admin'
  );
};

/**
 * CreateVideoModalScreen - Shows CreateVideoModal when Create tab is pressed.
 * Options: Create Short, Upload Video, Go Live
 * When opened from BusinessProfileViewScreen (+), params can include returnTo: { tab, screen }.
 *
 * Do NOT use useFocusEffect to force modal open on every focus — that reopens the picker when
 * switching to Library/other tabs. Only open when _openPicker changes (tab bar / explicit navigate).
 */
const CreateVideoModalScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector(state => state.app?.user);
  const showFeaturedVideoOption = canUploadFeaturedVideo(user?.role);
  const [modalVisible, setModalVisible] = useState(true);
  const returnTo = route.params?.returnTo;
  const lastOpenPickerKeyRef = useRef(route.params?._openPicker ?? null);

  useEffect(() => {
    const k = route.params?._openPicker;
    if (k != null && k !== lastOpenPickerKeyRef.current) {
      lastOpenPickerKeyRef.current = k;
      setModalVisible(true);
    }
  }, [route.params?._openPicker]);

  const handleClose = () => {
    setModalVisible(false);
    if (returnTo?.tab && returnTo?.screen) {
      let nav = navigation;
      for (let i = 0; i < 8 && nav; i += 1) {
        const names = nav.getState?.()?.routeNames;
        if (Array.isArray(names) && names.includes(returnTo.tab)) {
          nav.navigate(returnTo.tab, { screen: returnTo.screen });
          return;
        }
        nav = nav.getParent?.();
      }
      navigation.navigate(returnTo.tab, { screen: returnTo.screen });
    } else {
      navigateToHomeOne(navigation);
    }
  };

  const handleCreateShort = () => {
    setModalVisible(false);
    navigation.navigate('Library', {
      screen: 'CreateShortsScreen',
      params: { isLive: false },
    });
  };

  const handleCreatePost = () => {
    setModalVisible(false);
    navigateToRootRoute(navigation, 'PostCreateNew');
  };

  const handleUploadVideo = () => {
    setModalVisible(false);
    navigation.navigate('Library', { screen: 'UploadVideoScreen' });
  };

  const handleGoLive = () => {
    setModalVisible(false);
    navigation.navigate('Library', {
      screen: 'CreateShortsScreen',
      params: { isLive: true },
    });
  };

  const handleUploadFeaturedVideo = () => {
    setModalVisible(false);
    navigateToRootRoute(navigation, 'FeaturedVideoUpload');
  };

  return (
    <View style={styles.container}>
      <CreateVideoModal
        visible={modalVisible}
        onClose={handleClose}
        onCreatePost={handleCreatePost}
        onCreateShort={handleCreateShort}
        onUploadVideo={handleUploadVideo}
        onGoLive={handleGoLive}
        showFeaturedVideoOption={showFeaturedVideoOption}
        onUploadFeaturedVideo={handleUploadFeaturedVideo}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default CreateVideoModalScreen;
