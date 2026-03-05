import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Image, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const UserProfileCard = () => {
  return (
    <View style={styles.mainCard}>
      <ImageBackground
        source={{ uri: 'https://images.pexels.com/photos/2079438/pexels-photo-2079438.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' }}
        style={styles.coverArea}
        imageStyle={{ resizeMode: 'cover' }}
      >
        {/* Semi-transparent amber overlay box for profile info */}
        <View style={styles.profileOverlayBox}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: 'https://via.placeholder.com/100' }}
              style={styles.profileAvatar}
            />
            {/* Dark generic person icon overlay if no image, or just keeping the placeholder */}
            <View style={styles.avatarDarkOverlay}>
                <MaterialCommunityIcons name="account" size={36} color="#FFAD33" />
            </View>
            <TouchableOpacity style={styles.avatarEditIcon}>
              <MaterialCommunityIcons name="pencil" size={12} color="#444" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.profileNameGroup}>
            <Text style={styles.userNameText}>@yourname</Text>
            <View style={styles.verifiedRow}>
              <MaterialCommunityIcons name="check-decagram-outline" size={14} color="#fff" />
              <Text style={styles.verifiedText}>verified account</Text>
            </View>
          </View>
        </View>

        {/* Bottom portion - Opaque styling */}
        <View style={styles.bottomOpaqueSection}>
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>625k</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>124k</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>89</Text>
              <Text style={styles.statLabel}>MSG</Text>
            </View>
          </View>

          <View style={styles.statusMsgContainer}>
            <Text style={styles.statusMsg}>
              Hi! You haven't added any medicines yet. Want me to help you set up the first one?
            </Text>
            <TouchableOpacity style={styles.subscribeButton}>
              <Text style={styles.subscribeText}>Subscribe</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  coverArea: {
    width: '100%',
    height: 480, // Taller to fit everything inside
    justifyContent: 'flex-end',
  },
  profileOverlayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(184, 115, 0, 0.65)', // Amber with transparency
    padding: 15,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 15,
  },
  profileAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#222',
  },
  avatarDarkOverlay: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      borderRadius: 35,
      backgroundColor: '#222',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#fff',
  },
  avatarEditIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
  },
  profileNameGroup: {
    flex: 1,
  },
  userNameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 13,
    color: '#fff',
    marginLeft: 4,
  },
  bottomOpaqueSection: {
    backgroundColor: '#fff', // Bottom corner radiuses fit into the main rounded edges
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#e5e5e5', // Light gray background for stats
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
    marginTop: 2,
  },
  statusMsgContainer: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  statusMsg: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 16,
  },
  subscribeButton: {
    backgroundColor: '#F59E0B', // Bright orange as per Figma
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    minWidth: 180,
    alignItems: 'center',
  },
  subscribeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UserProfileCard;
