import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import CreateVideoModal from '../components/CreateVideoModal';

/**
 * CreateVideoModalScreen - Shows CreateVideoModal when Create tab is pressed.
 * Options: Create Short, Upload Video, Go Live
 * When opened from BusinessProfileViewScreen (+), params can include returnTo: { tab, screen }.
 */
const CreateVideoModalScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [modalVisible, setModalVisible] = useState(true);
  const returnTo = route.params?.returnTo;

  useFocusEffect(
    useCallback(() => {
      setModalVisible(true);
      return () => setModalVisible(false);
    }, []),
  );

  const handleClose = () => {
    setModalVisible(false);
    // Always navigate on the tab navigator itself.
    // From BusinessProfileViewScreen (+) we pass returnTo = { tab: 'Home1', screen: 'BusinessProfileViewScreen' }.
    if (returnTo?.tab && returnTo?.screen) {
      navigation.navigate(returnTo.tab, {
        screen: returnTo.screen,
      });
    } else {
      // If opened from bottom Create tab, return to Home1 tab -> HomeOneScreen
      navigation.navigate('Home1', { screen: 'HomeOneScreen' });
    }
  };

  const handleCreateShort = () => {
    setModalVisible(false);
    navigation.navigate('Library', {
      screen: 'CreateShortsScreen',
      params: { isLive: false },
    });
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

  return (
    <View style={styles.container}>
      <CreateVideoModal
        visible={modalVisible}
        onClose={handleClose}
        onCreateShort={handleCreateShort}
        onUploadVideo={handleUploadVideo}
        onGoLive={handleGoLive}
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
