import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const BusinessProfileCard = () => {
  return (
    <View style={styles.cardContainer}>
      <ImageBackground
        source={{ uri: "https://images.unsplash.com/photo-1552566626-52f8b828add9" }}
        style={styles.bgImage}
        imageStyle={{ borderRadius: 24 }}
      >
        <View style={styles.contentOverlay}>
          {/* Top Right Badges */}
          <View style={styles.badgeContainer}>
            <TouchableOpacity style={styles.twoPartBadge}>
              <View style={styles.badgeIconPart}>
                  <Icon name="lock" size={16} color="#222" />
              </View>
              <View style={styles.badgeTextPart}>
                <Text style={styles.badgeText}>Orders</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.twoPartBadge, { marginTop: 10 }]}>
              <View style={styles.badgeIconPart}>
                <Icon name="lock" size={16} color="#222" />
              </View>
              <View style={[styles.badgeTextPart, { backgroundColor: '#FFa31A' }]}>
                <Text style={styles.badgeText}>Wallet</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Amber Profile Box Overlay */}
          <View style={styles.amberOverlayBox}>
            <View style={styles.profileHeaderRow}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarCircle}>
                  <Icon name="account" size={40} color="#F39C12" />
                </View>
                <View style={styles.editPencilBadge}>
                  <Icon name="pencil-outline" size={10} color="#555" />
                </View>
              </View>

              <View style={styles.profileTextGroup}>
                <Text style={styles.businessNameHeading}>Dalchini</Text>
                <View style={styles.verifiedIndicatorRow}>
                  <Icon name="check-circle-outline" size={14} color="#fff" />
                  <Text style={styles.verifiedAccountLabel}>verified account</Text>
                  <View style={styles.faintDotSeparator} />
                </View>
              </View>
            </View>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.editProfileRectBtn}>
                <Text style={styles.editProfileLabel}>Edit Profile</Text>
                <Icon name="pencil-box-outline" size={20} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.squareIconBtn}>
                <Icon name="camera-outline" size={22} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.squareIconBtn}>
                <Icon name="comment-text-outline" size={20} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Section - Stats and Status Message */}
          <View style={styles.bottomBlock}>
            {/* Opaque Stats Bar */}
            <View style={styles.statsOpaqueBar}>
              <View style={styles.statColumn}>
                <Text style={styles.statValMain}>625k</Text>
                <Text style={styles.statLabelMain}>Followers</Text>
              </View>
              <View style={styles.statColumn}>
                <Text style={styles.statValMain}>124k</Text>
                <Text style={styles.statLabelMain}>Following</Text>
              </View>
              <View style={styles.statColumn}>
                <Text style={styles.statValMain}>89</Text>
                <Text style={styles.statLabelMain}>MSG</Text>
              </View>
            </View>

            {/* Opaque Status Box */}
            <View style={styles.statusWhiteBox}>
              <Text style={styles.statusBodyText}>
                Hi! You haven't added any medicines yet. Want me to help you set up
                the first one?
              </Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

export default BusinessProfileCard;

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    height: 600, // Fixed height to allow elements to stack properly over background
    marginHorizontal: 16, // Assuming it takes full width minus some padding
    marginBottom: 10,
  },
  bgImage: {
    width: '100%',
    height: 410,
  },
  contentOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  badgeContainer: {
    paddingTop: 20,
    paddingRight: 15,
    alignItems: 'flex-end',
  },
  twoPartBadge: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeIconPart: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTextPart: {
    backgroundColor: '#F39C12',
    paddingLeft: 5,
    paddingRight: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width:65
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  amberOverlayBox: {
    backgroundColor: 'rgba(215, 137, 20, 0.75)',
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 12,
    marginBottom: 40,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  editPencilBadge: {
    position: 'absolute',
    top: 2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 3,
  },
  profileTextGroup: {
    marginLeft: 15,
  },
  businessNameHeading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  verifiedIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  verifiedAccountLabel: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 5,
    opacity: 0.95,
  },
  faintDotSeparator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginLeft: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editProfileRectBtn: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    height: 50,
    borderRadius: 12,
    flex: 1,
  },
  editProfileLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  squareIconBtn: {
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBlock: {
    width: '100%',
  },
  statsOpaqueBar: {
    flexDirection: 'row',
    backgroundColor: '#E6E6E6',
    paddingVertical: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statValMain: {
    fontSize: 22,
    fontWeight: '800',
    color: '#222',
  },
  statLabelMain: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusWhiteBox: {
    backgroundColor: '#fff',
    paddingVertical: 22,
    paddingHorizontal: 25,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    marginTop: -5,
  },
  statusBodyText: {
    textAlign: 'center',
    color: '#777',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});
