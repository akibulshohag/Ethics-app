import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import CreateVideoModal from '../components/CreateVideoModal';

/**
 * CreateVideoModalScreen - Shows CreateVideoModal when Create tab is pressed.
 * Options: Create Short, Upload Video, Go Live
 */
const CreateVideoModalScreen = () => {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setModalVisible(true);
      return () => setModalVisible(false);
    }, []),
  );

  const handleClose = () => {
    setModalVisible(false);
    navigation.navigate('Home');
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
