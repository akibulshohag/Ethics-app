import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
} from '../services/roleService';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from '../services/adminUserService';
import { getRolesList } from '../services/roleService';
import {
  getSponsoredList,
  createSponsored,
  deleteSponsored,
} from '../services/sponsoredService';
import {
  getFeaturedList,
  createFeatured,
  deleteFeatured,
} from '../services/featuredService';
import {
  getVendorFeaturedList,
  createVendorFeatured,
  deleteVendorFeatured,
} from '../services/vendorFeaturedService';
import {
  getVendorSponsoredList,
  createVendorSponsored,
  deleteVendorSponsored,
} from '../services/vendorSponsoredService';
import { getRestaurantOrders } from '../services/orderService';
import { uploadVideo } from '../services/videoService';
import { launchImageLibrary } from 'react-native-image-picker';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

const SIDEBAR_WIDTH = 140;

const AdminScreen = () => {
  const { user } = useSelector(s => s.app) || {};
  const roleNorm = String(user?.role || '').toLowerCase();
  const isAdminUser =
    roleNorm === 'admin' ||
    roleNorm === 'superadmin' ||
    roleNorm === 'super_admin' ||
    roleNorm === 'super-admin';
  const isOwnerUser = roleNorm === 'owner';
  const [menu, setMenu] = useState('roles'); // 'roles' | 'users' | 'sponsored' | 'featured'
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formRoleName, setFormRoleName] = useState('');
  const [formRoleDesc, setFormRoleDesc] = useState('');
  const [formUserEmail, setFormUserEmail] = useState('');
  const [formUserPassword, setFormUserPassword] = useState('');
  const [formUserName, setFormUserName] = useState('');
  const [formUserRoleId, setFormUserRoleId] = useState('');
  const [roleOptions, setRoleOptions] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [sponsoredList, setSponsoredList] = useState([]);
  const [sponsoredForm, setSponsoredForm] = useState({
    ownerId: '',
    title: '',
    areaName: '',
    latitude: '',
    longitude: '',
    radiusKm: '2',
    startDate: '',
    endDate: '',
    amountPaid: '',
    currency: 'USD',
  });
  const [sponsoredVideoFile, setSponsoredVideoFile] = useState(null);
  const [sponsoredThumbnailFile, setSponsoredThumbnailFile] = useState(null);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const [ownerSearchResults, setOwnerSearchResults] = useState([]);
  const [ownerSearchLoading, setOwnerSearchLoading] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const ownerSearchTimeoutRef = useRef(null);
  const [myOwnerProfile, setMyOwnerProfile] = useState(null);
  const [myOwnerProfileLoading, setMyOwnerProfileLoading] = useState(false);

  const [featuredList, setFeaturedList] = useState([]);
  const [featuredForm, setFeaturedForm] = useState({
    ownerId: '',
    title: '',
    areaName: '',
    latitude: '',
    longitude: '',
    radiusKm: '2',
    startDate: '',
    endDate: '',
    amountPaid: '0',
    currency: 'USD',
  });
  const [featuredVideoFile, setFeaturedVideoFile] = useState(null);
  const [featuredThumbnailFile, setFeaturedThumbnailFile] = useState(null);
  const [featuredOwnerSearchQuery, setFeaturedOwnerSearchQuery] = useState('');
  const [featuredOwnerSearchResults, setFeaturedOwnerSearchResults] = useState(
    [],
  );
  const [featuredOwnerSearchLoading, setFeaturedOwnerSearchLoading] =
    useState(false);
  const [selectedFeaturedOwner, setSelectedFeaturedOwner] = useState(null);
  const featuredOwnerSearchTimeoutRef = useRef(null);
  const [myFeaturedProfile, setMyFeaturedProfile] = useState(null);
  const [myFeaturedProfileLoading, setMyFeaturedProfileLoading] =
    useState(false);
  const [ordersList, setOrdersList] = useState([]);
  const [vendorFeaturedList, setVendorFeaturedList] = useState([]);
  const [vendorSponsoredList, setVendorSponsoredList] = useState([]);
  const [vendorFeaturedForm, setVendorFeaturedForm] = useState({
    userId: '',
    title: '',
    areaName: '',
    latitude: '',
    longitude: '',
    radiusKm: '2',
    startDate: '',
    endDate: '',
    amountPaid: '0',
    currency: 'USD',
  });
  const [vendorSponsoredForm, setVendorSponsoredForm] = useState({
    userId: '',
    title: '',
    areaName: '',
    latitude: '',
    longitude: '',
    radiusKm: '2',
    startDate: '',
    endDate: '',
    amountPaid: '0',
    currency: 'USD',
  });
  const [selectedVendorFeaturedUser, setSelectedVendorFeaturedUser] =
    useState(null);
  const [vendorFeaturedSearchQuery, setVendorFeaturedSearchQuery] =
    useState('');
  const [vendorFeaturedSearchResults, setVendorFeaturedSearchResults] =
    useState([]);
  const [vendorFeaturedSearchLoading, setVendorFeaturedSearchLoading] =
    useState(false);
  const [vendorFeaturedVideoFile, setVendorFeaturedVideoFile] = useState(null);
  const [vendorFeaturedThumbnailFile, setVendorFeaturedThumbnailFile] =
    useState(null);
  const [selectedVendorSponsoredUser, setSelectedVendorSponsoredUser] =
    useState(null);
  const [vendorSponsoredSearchQuery, setVendorSponsoredSearchQuery] =
    useState('');
  const [vendorSponsoredSearchResults, setVendorSponsoredSearchResults] =
    useState([]);
  const [vendorSponsoredSearchLoading, setVendorSponsoredSearchLoading] =
    useState(false);
  const [vendorSponsoredVideoFile, setVendorSponsoredVideoFile] =
    useState(null);
  const [vendorSponsoredThumbnailFile, setVendorSponsoredThumbnailFile] =
    useState(null);
  const vendorFeaturedSearchTimeoutRef = useRef(null);
  const vendorSponsoredSearchTimeoutRef = useRef(null);

  const loadRoles = useCallback(async () => {
    try {
      const res = await getRoles(1, 200);
      setRoles(res?.data || []);
    } catch (e) {
      setRoles([]);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await getUsers({ getAll: true });
      setUsers(res?.data || []);
    } catch (e) {
      setUsers([]);
    }
  }, []);

  const loadRoleOptions = useCallback(async () => {
    try {
      const res = await getRolesList();
      setRoleOptions(res?.roles || []);
    } catch (e) {
      setRoleOptions([]);
    }
  }, []);

  const loadSponsored = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await getSponsoredList(user.token);
      setSponsoredList(res?.sponsored || []);
    } catch (e) {
      setSponsoredList([]);
    }
  }, [user?.token]);

  const loadFeatured = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await getFeaturedList(user.token);
      setFeaturedList(res?.featured || []);
    } catch (e) {
      setFeaturedList([]);
    }
  }, [user?.token]);

  const loadOrders = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await getRestaurantOrders(user.token, { limit: 200 });
      setOrdersList(res?.orders || []);
    } catch (e) {
      setOrdersList([]);
    }
  }, [user?.token]);

  const searchVendorUsersForFeatured = useCallback(async query => {
    setVendorFeaturedSearchLoading(true);
    try {
      const res = await getUsers({
        role: 'owner',
        search: query && query.trim() ? query.trim() : undefined,
        getAll: true,
      });
      const list = res?.data || [];
      // Only show users with role owner
      setVendorFeaturedSearchResults(
        list.filter(u => (u?.role || '').toLowerCase() === 'owner'),
      );
    } catch (e) {
      setVendorFeaturedSearchResults([]);
    } finally {
      setVendorFeaturedSearchLoading(false);
    }
  }, []);

  const searchVendorUsersForSponsored = useCallback(async query => {
    setVendorSponsoredSearchLoading(true);
    try {
      const res = await getUsers({
        role: 'owner',
        search: query && query.trim() ? query.trim() : undefined,
        getAll: true,
      });
      const list = res?.data || [];
      // Only show users with role owner
      setVendorSponsoredSearchResults(
        list.filter(u => (u?.role || '').toLowerCase() === 'owner'),
      );
    } catch (e) {
      setVendorSponsoredSearchResults([]);
    } finally {
      setVendorSponsoredSearchLoading(false);
    }
  }, []);

  const loadVendorFeatured = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await getVendorFeaturedList(user.token);
      setVendorFeaturedList(res?.featured || []);
    } catch (e) {
      setVendorFeaturedList([]);
    }
  }, [user?.token]);

  const loadVendorSponsored = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await getVendorSponsoredList(user.token);
      setVendorSponsoredList(res?.sponsored || []);
    } catch (e) {
      setVendorSponsoredList([]);
    }
  }, [user?.token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (menu === 'roles') await loadRoles();
    else if (menu === 'users') await loadUsers();
    else if (menu === 'sponsored') await loadSponsored();
    else if (menu === 'featured') await loadFeatured();
    else if (menu === 'orders') await loadOrders();
    else if (menu === 'vendorFeatured') await loadVendorFeatured();
    else if (menu === 'vendorSponsored') await loadVendorSponsored();
    setRefreshing(false);
  }, [
    menu,
    loadRoles,
    loadUsers,
    loadSponsored,
    loadFeatured,
    loadOrders,
    loadVendorFeatured,
    loadVendorSponsored,
  ]);

  const searchOwners = useCallback(async query => {
    setOwnerSearchLoading(true);
    try {
      const res = await getUsers({
        role: 'owner',
        search: query && query.trim() ? query.trim() : undefined,
        getAll: true,
      });
      setOwnerSearchResults(res?.data || []);
    } catch (e) {
      setOwnerSearchResults([]);
    } finally {
      setOwnerSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (modalOpen !== 'sponsored' || !isAdminUser) return;
    if (ownerSearchTimeoutRef.current)
      clearTimeout(ownerSearchTimeoutRef.current);
    ownerSearchTimeoutRef.current = setTimeout(() => {
      searchOwners(ownerSearchQuery);
    }, 400);
    return () => {
      if (ownerSearchTimeoutRef.current)
        clearTimeout(ownerSearchTimeoutRef.current);
    };
  }, [modalOpen, ownerSearchQuery, isAdminUser, searchOwners]);

  useEffect(() => {
    if (modalOpen !== 'sponsored' || !isOwnerUser || !user?.id) return;
    let cancelled = false;
    setMyOwnerProfileLoading(true);
    getUser(user.id)
      .then(res => {
        const profile = res?.user || res;
        if (cancelled) return;
        setMyOwnerProfile(profile || null);
        setSponsoredForm(p => ({
          ...p,
          areaName: profile?.address
            ? String(profile.address).trim()
            : p.areaName,
          latitude:
            profile?.latitude != null ? String(profile.latitude) : p.latitude,
          longitude:
            profile?.longitude != null
              ? String(profile.longitude)
              : p.longitude,
        }));
      })
      .catch(() => {
        if (!cancelled) setMyOwnerProfile(null);
      })
      .finally(() => {
        if (!cancelled) setMyOwnerProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, isOwnerUser, user?.id]);

  const searchFeaturedOwners = useCallback(async query => {
    setFeaturedOwnerSearchLoading(true);
    try {
      const res = await getUsers({
        role: 'owner',
        search: query && query.trim() ? query.trim() : undefined,
        getAll: true,
      });
      setFeaturedOwnerSearchResults(res?.data || []);
    } catch (e) {
      setFeaturedOwnerSearchResults([]);
    } finally {
      setFeaturedOwnerSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (modalOpen !== 'featured' || !isAdminUser) return;
    if (featuredOwnerSearchTimeoutRef.current)
      clearTimeout(featuredOwnerSearchTimeoutRef.current);
    featuredOwnerSearchTimeoutRef.current = setTimeout(() => {
      searchFeaturedOwners(featuredOwnerSearchQuery);
    }, 400);
    return () => {
      if (featuredOwnerSearchTimeoutRef.current)
        clearTimeout(featuredOwnerSearchTimeoutRef.current);
    };
  }, [modalOpen, featuredOwnerSearchQuery, isAdminUser, searchFeaturedOwners]);

  // Vendor Featured: show vendor search list when modal opens and when query changes – same as owner search in Featured
  useEffect(() => {
    if (modalOpen !== 'vendorFeatured') return;
    const isInitial = vendorFeaturedSearchQuery === '';
    if (isInitial) {
      searchVendorUsersForFeatured('');
    } else {
      const t = setTimeout(
        () => searchVendorUsersForFeatured(vendorFeaturedSearchQuery),
        400,
      );
      return () => clearTimeout(t);
    }
  }, [modalOpen, vendorFeaturedSearchQuery, searchVendorUsersForFeatured]);

  // Vendor Sponsored: show vendor search list when modal opens and when query changes – same as owner search in Sponsored
  useEffect(() => {
    if (modalOpen !== 'vendorSponsored') return;
    const isInitial = vendorSponsoredSearchQuery === '';
    if (isInitial) {
      searchVendorUsersForSponsored('');
    } else {
      const t = setTimeout(
        () => searchVendorUsersForSponsored(vendorSponsoredSearchQuery),
        400,
      );
      return () => clearTimeout(t);
    }
  }, [modalOpen, vendorSponsoredSearchQuery, searchVendorUsersForSponsored]);

  useEffect(() => {
    if (modalOpen !== 'featured' || !isOwnerUser || !user?.id) return;
    let cancelled = false;
    setMyFeaturedProfileLoading(true);
    getUser(user.id)
      .then(res => {
        const profile = res?.user || res;
        if (cancelled) return;
        setMyFeaturedProfile(profile || null);
        setFeaturedForm(p => ({
          ...p,
          areaName: profile?.address
            ? String(profile.address).trim()
            : p.areaName,
          latitude:
            profile?.latitude != null ? String(profile.latitude) : p.latitude,
          longitude:
            profile?.longitude != null
              ? String(profile.longitude)
              : p.longitude,
        }));
      })
      .catch(() => {
        if (!cancelled) setMyFeaturedProfile(null);
      })
      .finally(() => {
        if (!cancelled) setMyFeaturedProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, isOwnerUser, user?.id]);

  const openAddSponsored = () => {
    const isOwner = isOwnerUser;
    setSponsoredForm({
      ownerId: '', // admin fills via owner select; owner flow uses current user on backend
      title: '',
      areaName: isOwner && user?.address ? String(user.address).trim() : '',
      latitude: isOwner && user?.latitude != null ? String(user.latitude) : '',
      longitude:
        isOwner && user?.longitude != null ? String(user.longitude) : '',
      radiusKm: '2',
      startDate: '',
      endDate: '',
      amountPaid: '',
      currency: 'USD',
    });
    setSponsoredVideoFile(null);
    setSponsoredThumbnailFile(null);
    setOwnerSearchQuery('');
    setOwnerSearchResults([]);
    setSelectedOwner(null);
    setMyOwnerProfile(null);
    setModalOpen('sponsored');
  };

  const openAddFeatured = () => {
    const isOwner = isOwnerUser;
    setFeaturedForm({
      ownerId: '',
      title: '',
      areaName: isOwner && user?.address ? String(user.address).trim() : '',
      latitude: isOwner && user?.latitude != null ? String(user.latitude) : '',
      longitude:
        isOwner && user?.longitude != null ? String(user.longitude) : '',
      radiusKm: '2',
      startDate: '',
      endDate: '',
      amountPaid: '0',
      currency: 'USD',
    });
    setFeaturedVideoFile(null);
    setFeaturedThumbnailFile(null);
    setFeaturedOwnerSearchQuery('');
    setFeaturedOwnerSearchResults([]);
    setSelectedFeaturedOwner(null);
    setMyFeaturedProfile(null);
    setModalOpen('featured');
  };

  const openAddVendorFeatured = () => {
    setVendorFeaturedForm({
      userId: '',
      title: '',
      areaName: '',
      latitude: '',
      longitude: '',
      radiusKm: '2',
      startDate: '',
      endDate: '',
      amountPaid: '0',
      currency: 'USD',
    });
    setSelectedVendorFeaturedUser(null);
    setVendorFeaturedSearchQuery('');
    setVendorFeaturedSearchResults([]);
    setVendorFeaturedVideoFile(null);
    setVendorFeaturedThumbnailFile(null);
    setModalOpen('vendorFeatured');
  };

  const openAddVendorSponsored = () => {
    setVendorSponsoredForm({
      userId: '',
      title: '',
      areaName: '',
      latitude: '',
      longitude: '',
      radiusKm: '2',
      startDate: '',
      endDate: '',
      amountPaid: '0',
      currency: 'USD',
    });
    setSelectedVendorSponsoredUser(null);
    setVendorSponsoredSearchQuery('');
    setVendorSponsoredSearchResults([]);
    setVendorSponsoredVideoFile(null);
    setVendorSponsoredThumbnailFile(null);
    setModalOpen('vendorSponsored');
  };

  const pickSponsoredVideo = () => {
    launchImageLibrary({ mediaType: 'video', videoQuality: 'high' }, res => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage || 'Failed to pick video');
        return;
      }
      if (res.assets?.[0]) setSponsoredVideoFile(res.assets[0]);
    });
  };

  const pickSponsoredThumbnail = () => {
    launchImageLibrary({ mediaType: 'photo' }, res => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage || 'Failed to pick image');
        return;
      }
      if (res.assets?.[0]) setSponsoredThumbnailFile(res.assets[0]);
    });
  };

  const handleCreateSponsored = async () => {
    const {
      ownerId,
      title,
      radiusKm,
      startDate,
      endDate,
      amountPaid,
      currency,
    } = sponsoredForm;
    const isAdmin = isAdminUser;

    if (!sponsoredVideoFile || !sponsoredThumbnailFile) {
      Alert.alert('Error', 'Please select a video and a thumbnail');
      return;
    }
    if (isAdmin && !ownerId) {
      Alert.alert('Error', 'Please select the owner this sponsored is for');
      return;
    }
    if (isAdmin) {
      if (!selectedOwner) {
        Alert.alert('Error', 'Please select the owner this sponsored is for');
        return;
      }
      if (selectedOwner.latitude == null || selectedOwner.longitude == null) {
        Alert.alert(
          'Error',
          'Selected owner has no saved location. Update owner profile first.',
        );
        return;
      }
    } else if (isOwnerUser) {
      const lat = myOwnerProfile?.latitude ?? user?.latitude;
      const lng = myOwnerProfile?.longitude ?? user?.longitude;
      if (lat == null || lng == null) {
        Alert.alert(
          'Error',
          'You have no saved location. Update your profile first.',
        );
        return;
      }
    }
    if (!startDate || !endDate || amountPaid === '') {
      Alert.alert('Error', 'Please fill Dates and Amount paid');
      return;
    }
    setSubmitLoading(true);
    try {
      const videoTitle =
        title || areaName
          ? `Sponsored - ${title || areaName}`
          : 'Sponsored video';
      const uploadRes = await uploadVideo({
        userId: user.id,
        title: videoTitle,
        videoUri: sponsoredVideoFile.uri,
        videoType: sponsoredVideoFile.type || 'video/mp4',
        videoName:
          sponsoredVideoFile.fileName ||
          sponsoredVideoFile.uri?.split('/').pop() ||
          'video.mp4',
        thumbnailUri: sponsoredThumbnailFile.uri,
        thumbnailType: sponsoredThumbnailFile.type || 'image/jpeg',
        thumbnailName:
          sponsoredThumbnailFile.fileName ||
          sponsoredThumbnailFile.uri?.split('/').pop() ||
          'thumb.jpg',
      });
      const finalVideoId = uploadRes?.video?.id || uploadRes?.id;
      if (!finalVideoId)
        throw new Error('Upload succeeded but no video ID returned');

      const body = {
        videoId: finalVideoId,
        radiusKm: parseFloat(radiusKm) || 2,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        amountPaid: parseFloat(amountPaid),
        currency: currency || 'USD',
      };
      if (isAdmin) body.ownerId = ownerId;
      await createSponsored(user.token, body);
      setModalOpen(false);
      loadSponsored();
      Alert.alert('Success', 'Sponsored campaign created.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteSponsored = s => {
    Alert.alert('Cancel campaign', `Cancel sponsored for "${s.areaName}"?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await deleteSponsored(user.token, s.id);
            loadSponsored();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to cancel');
          }
        },
      },
    ]);
  };

  const pickFeaturedVideo = () => {
    launchImageLibrary({ mediaType: 'video', videoQuality: 'high' }, res => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage || 'Failed to pick video');
        return;
      }
      if (res.assets?.[0]) setFeaturedVideoFile(res.assets[0]);
    });
  };

  const pickFeaturedThumbnail = () => {
    launchImageLibrary({ mediaType: 'photo' }, res => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage || 'Failed to pick image');
        return;
      }
      if (res.assets?.[0]) setFeaturedThumbnailFile(res.assets[0]);
    });
  };

  const pickVendorFeaturedVideo = () => {
    launchImageLibrary({ mediaType: 'video', videoQuality: 'high' }, res => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage || 'Failed to pick video');
        return;
      }
      if (res.assets?.[0]) setVendorFeaturedVideoFile(res.assets[0]);
    });
  };

  const pickVendorFeaturedThumbnail = () => {
    launchImageLibrary({ mediaType: 'photo' }, res => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage || 'Failed to pick image');
        return;
      }
      if (res.assets?.[0]) setVendorFeaturedThumbnailFile(res.assets[0]);
    });
  };

  const pickVendorSponsoredVideo = () => {
    launchImageLibrary({ mediaType: 'video', videoQuality: 'high' }, res => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage || 'Failed to pick video');
        return;
      }
      if (res.assets?.[0]) setVendorSponsoredVideoFile(res.assets[0]);
    });
  };

  const pickVendorSponsoredThumbnail = () => {
    launchImageLibrary({ mediaType: 'photo' }, res => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage || 'Failed to pick image');
        return;
      }
      if (res.assets?.[0]) setVendorSponsoredThumbnailFile(res.assets[0]);
    });
  };

  const handleCreateFeatured = async () => {
    const {
      ownerId,
      title,
      areaName: featAreaName,
      radiusKm,
      startDate,
      endDate,
      amountPaid,
      currency,
    } = featuredForm;
    const isAdmin = isAdminUser;

    if (!featuredVideoFile || !featuredThumbnailFile) {
      Alert.alert('Error', 'Please select a video and a thumbnail');
      return;
    }
    if (isAdmin && !ownerId) {
      Alert.alert('Error', 'Please select the owner this featured is for');
      return;
    }
    if (isAdmin) {
      if (!selectedFeaturedOwner) {
        Alert.alert('Error', 'Please select the owner this featured is for');
        return;
      }
      if (
        selectedFeaturedOwner.latitude == null ||
        selectedFeaturedOwner.longitude == null
      ) {
        Alert.alert(
          'Error',
          'Selected owner has no saved location. Update owner profile first.',
        );
        return;
      }
    } else if (isOwnerUser) {
      const lat = myFeaturedProfile?.latitude ?? user?.latitude;
      const lng = myFeaturedProfile?.longitude ?? user?.longitude;
      if (lat == null || lng == null) {
        Alert.alert(
          'Error',
          'You have no saved location. Update your profile first.',
        );
        return;
      }
    }
    if (!startDate || !endDate || amountPaid === '') {
      Alert.alert('Error', 'Please fill Dates and Amount paid');
      return;
    }
    setSubmitLoading(true);
    try {
      const videoTitle =
        title || featAreaName
          ? `Featured - ${title || featAreaName}`
          : 'Featured video';
      const uploadRes = await uploadVideo({
        userId: user.id,
        title: videoTitle,
        videoUri: featuredVideoFile.uri,
        videoType: featuredVideoFile.type || 'video/mp4',
        videoName:
          featuredVideoFile.fileName ||
          featuredVideoFile.uri?.split('/').pop() ||
          'video.mp4',
        thumbnailUri: featuredThumbnailFile.uri,
        thumbnailType: featuredThumbnailFile.type || 'image/jpeg',
        thumbnailName:
          featuredThumbnailFile.fileName ||
          featuredThumbnailFile.uri?.split('/').pop() ||
          'thumb.jpg',
      });
      const finalVideoId = uploadRes?.video?.id || uploadRes?.id;
      if (!finalVideoId)
        throw new Error('Upload succeeded but no video ID returned');

      const body = {
        videoId: finalVideoId,
        radiusKm: parseFloat(radiusKm) || 2,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        amountPaid: parseFloat(amountPaid) || 0,
        currency: currency || 'USD',
      };
      if (isAdmin) body.ownerId = ownerId;
      await createFeatured(user.token, body);
      setModalOpen(false);
      loadFeatured();
      Alert.alert('Success', 'Featured campaign created.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteFeatured = f => {
    Alert.alert('Cancel campaign', `Cancel featured for "${f.areaName}"?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await deleteFeatured(user.token, f.id);
            loadFeatured();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to cancel');
          }
        },
      },
    ]);
  };

  const handleCreateVendorFeatured = async () => {
    const {
      userId,
      title,
      areaName,
      latitude,
      longitude,
      radiusKm,
      startDate,
      endDate,
      amountPaid,
      currency,
    } = vendorFeaturedForm;
    if (!selectedVendorFeaturedUser || !vendorFeaturedForm.userId) {
      Alert.alert('Error', 'Please select an owner');
      return;
    }
    if (!vendorFeaturedVideoFile || !vendorFeaturedThumbnailFile) {
      Alert.alert('Error', 'Please select a video and a thumbnail');
      return;
    }
    if (
      selectedVendorFeaturedUser.latitude == null ||
      selectedVendorFeaturedUser.longitude == null
    ) {
      Alert.alert(
        'Error',
        'Selected owner has no saved location. Update owner profile first.',
      );
      return;
    }
    if (!startDate || !endDate || amountPaid === '' || amountPaid == null) {
      Alert.alert('Error', 'Please fill Dates and Amount paid');
      return;
    }
    setSubmitLoading(true);
    try {
      const videoTitle =
        title || areaName
          ? `Vendor Featured - ${title || areaName}`
          : 'Vendor Featured video';
      const uploadRes = await uploadVideo({
        userId: user.id,
        title: videoTitle,
        videoUri: vendorFeaturedVideoFile.uri,
        videoType: vendorFeaturedVideoFile.type || 'video/mp4',
        videoName:
          vendorFeaturedVideoFile.fileName ||
          vendorFeaturedVideoFile.uri?.split('/').pop() ||
          'video.mp4',
        thumbnailUri: vendorFeaturedThumbnailFile.uri,
        thumbnailType: vendorFeaturedThumbnailFile.type || 'image/jpeg',
        thumbnailName:
          vendorFeaturedThumbnailFile.fileName ||
          vendorFeaturedThumbnailFile.uri?.split('/').pop() ||
          'thumb.jpg',
      });
      const finalVideoId = uploadRes?.video?.id || uploadRes?.id;
      if (!finalVideoId)
        throw new Error('Upload succeeded but no video ID returned');

      await createVendorFeatured(user.token, {
        userId: vendorFeaturedForm.userId,
        videoId: finalVideoId,
        areaName:
          (areaName || '').trim() ||
          (selectedVendorFeaturedUser.address || '').trim(),
        latitude:
          latitude !== '' && latitude != null
            ? parseFloat(latitude)
            : parseFloat(selectedVendorFeaturedUser.latitude),
        longitude:
          longitude !== '' && longitude != null
            ? parseFloat(longitude)
            : parseFloat(selectedVendorFeaturedUser.longitude),
        radiusKm: parseFloat(radiusKm) || 2,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        amountPaid: parseFloat(amountPaid) || 0,
        currency: currency || 'USD',
      });
      setModalOpen(false);
      loadVendorFeatured();
      Alert.alert('Success', 'Vendor Featured campaign created.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreateVendorSponsored = async () => {
    const {
      userId,
      title,
      areaName,
      latitude,
      longitude,
      radiusKm,
      startDate,
      endDate,
      amountPaid,
      currency,
    } = vendorSponsoredForm;
    if (!selectedVendorSponsoredUser || !vendorSponsoredForm.userId) {
      Alert.alert('Error', 'Please select an owner');
      return;
    }
    if (!vendorSponsoredVideoFile || !vendorSponsoredThumbnailFile) {
      Alert.alert('Error', 'Please select a video and a thumbnail');
      return;
    }
    if (
      selectedVendorSponsoredUser.latitude == null ||
      selectedVendorSponsoredUser.longitude == null
    ) {
      Alert.alert(
        'Error',
        'Selected owner has no saved location. Update owner profile first.',
      );
      return;
    }
    if (!startDate || !endDate || amountPaid === '' || amountPaid == null) {
      Alert.alert('Error', 'Please fill Dates and Amount paid');
      return;
    }
    setSubmitLoading(true);
    try {
      const videoTitle =
        title || areaName
          ? `Vendor Sponsored - ${title || areaName}`
          : 'Vendor Sponsored video';
      const uploadRes = await uploadVideo({
        userId: user.id,
        title: videoTitle,
        videoUri: vendorSponsoredVideoFile.uri,
        videoType: vendorSponsoredVideoFile.type || 'video/mp4',
        videoName:
          vendorSponsoredVideoFile.fileName ||
          vendorSponsoredVideoFile.uri?.split('/').pop() ||
          'video.mp4',
        thumbnailUri: vendorSponsoredThumbnailFile.uri,
        thumbnailType: vendorSponsoredThumbnailFile.type || 'image/jpeg',
        thumbnailName:
          vendorSponsoredThumbnailFile.fileName ||
          vendorSponsoredThumbnailFile.uri?.split('/').pop() ||
          'thumb.jpg',
      });
      const finalVideoId = uploadRes?.video?.id || uploadRes?.id;
      if (!finalVideoId)
        throw new Error('Upload succeeded but no video ID returned');

      await createVendorSponsored(user.token, {
        userId: vendorSponsoredForm.userId,
        videoId: finalVideoId,
        areaName:
          (areaName || '').trim() ||
          (selectedVendorSponsoredUser.address || '').trim(),
        latitude:
          latitude !== '' && latitude != null
            ? parseFloat(latitude)
            : parseFloat(selectedVendorSponsoredUser.latitude),
        longitude:
          longitude !== '' && longitude != null
            ? parseFloat(longitude)
            : parseFloat(selectedVendorSponsoredUser.longitude),
        radiusKm: parseFloat(radiusKm) || 2,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        amountPaid: parseFloat(amountPaid) || 0,
        currency: currency || 'USD',
      });
      setModalOpen(false);
      loadVendorSponsored();
      Alert.alert('Success', 'Vendor Sponsored campaign created.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteVendorFeatured = f => {
    Alert.alert('Cancel', `Cancel vendor featured "${f.areaName}"?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await deleteVendorFeatured(user.token, f.id);
            loadVendorFeatured();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to cancel');
          }
        },
      },
    ]);
  };

  const handleDeleteVendorSponsored = s => {
    Alert.alert('Cancel', `Cancel vendor sponsored "${s.areaName}"?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await deleteVendorSponsored(user.token, s.id);
            loadVendorSponsored();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to cancel');
          }
        },
      },
    ]);
  };

  useEffect(() => {
    if (menu === 'roles') loadRoles();
    else if (menu === 'users') loadUsers();
    else if (menu === 'sponsored') loadSponsored();
    else if (menu === 'featured') loadFeatured();
    else if (menu === 'orders') loadOrders();
    else if (menu === 'vendorFeatured') loadVendorFeatured();
    else if (menu === 'vendorSponsored') loadVendorSponsored();
  }, [
    menu,
    loadRoles,
    loadUsers,
    loadSponsored,
    loadFeatured,
    loadOrders,
    loadVendorFeatured,
    loadVendorSponsored,
  ]);

  useEffect(() => {
    if (modalOpen) loadRoleOptions();
  }, [modalOpen, loadRoleOptions]);

  const openAddRole = () => {
    setEditingRole(null);
    setEditingUser(null);
    setFormRoleName('');
    setFormRoleDesc('');
    setModalOpen('role');
  };

  const openEditRole = r => {
    setEditingRole(r);
    setEditingUser(null);
    setFormRoleName(r.name || '');
    setFormRoleDesc(r.description || '');
    setModalOpen('role');
  };

  const openAddUser = () => {
    setEditingUser(null);
    setEditingRole(null);
    setFormUserEmail('');
    setFormUserPassword('');
    setFormUserName('');
    setFormUserRoleId(roleOptions[0]?.id || '');
    setModalOpen('user');
  };

  const openEditUser = u => {
    setEditingUser(u);
    setEditingRole(null);
    setFormUserEmail(u.email || '');
    setFormUserPassword('');
    setFormUserName(u.name || '');
    setFormUserRoleId(u.roleId || roleOptions[0]?.id || '');
    setModalOpen('user');
  };

  const handleSaveRole = async () => {
    if (!formRoleName.trim()) {
      Alert.alert('Error', 'Role name is required');
      return;
    }
    setSubmitLoading(true);
    try {
      if (editingRole) {
        await updateRole(editingRole.id, {
          name: formRoleName.trim(),
          description: formRoleDesc.trim() || undefined,
        });
        Alert.alert('Success', 'Role updated');
      } else {
        await createRole({
          name: formRoleName.trim(),
          description: formRoleDesc.trim() || undefined,
        });
        Alert.alert('Success', 'Role created');
      }
      setModalOpen(false);
      loadRoles();
    } catch (e) {
      Alert.alert(
        'Error',
        e?.response?.data?.message || e?.message || 'Failed',
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSaveUser = async () => {
    if (!formUserEmail.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }
    if (!editingUser && !formUserPassword.trim()) {
      Alert.alert('Error', 'Password is required for new user');
      return;
    }
    setSubmitLoading(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          name: formUserName.trim() || undefined,
          roleId: formUserRoleId || undefined,
        });
        Alert.alert('Success', 'User updated');
      } else {
        await createUser({
          email: formUserEmail.trim(),
          password: formUserPassword.trim(),
          name: formUserName.trim() || undefined,
          roleId: formUserRoleId || undefined,
        });
        Alert.alert('Success', 'User created');
      }
      setModalOpen(false);
      loadUsers();
    } catch (e) {
      Alert.alert(
        'Error',
        e?.response?.data?.message || e?.message || 'Failed',
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteRole = r => {
    Alert.alert('Delete Role', `Delete "${r.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRole(r.id);
            loadRoles();
          } catch (e) {
            Alert.alert('Error', e?.response?.data?.message || 'Cannot delete');
          }
        },
      },
    ]);
  };

  const handleDeleteUser = u => {
    Alert.alert('Delete User', `Delete "${u.email}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUser(u.id);
            loadUsers();
          } catch (e) {
            Alert.alert('Error', e?.response?.data?.message || 'Cannot delete');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.layout}>
        <View style={styles.sidebar}>
          <TouchableOpacity
            style={[styles.sideItem, menu === 'roles' && styles.sideItemActive]}
            onPress={() => setMenu('roles')}
          >
            <Icon
              name="account-badge"
              size={24}
              color={
                menu === 'roles' ? COLORS.primaryOrange : COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.sideText,
                menu === 'roles' && styles.sideTextActive,
              ]}
            >
              Roles
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sideItem, menu === 'users' && styles.sideItemActive]}
            onPress={() => setMenu('users')}
          >
            <Icon
              name="account-group"
              size={24}
              color={
                menu === 'users' ? COLORS.primaryOrange : COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.sideText,
                menu === 'users' && styles.sideTextActive,
              ]}
            >
              Users
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sideItem,
              menu === 'sponsored' && styles.sideItemActive,
            ]}
            onPress={() => setMenu('sponsored')}
          >
            <Icon
              name="video-account"
              size={24}
              color={
                menu === 'sponsored'
                  ? COLORS.primaryOrange
                  : COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.sideText,
                menu === 'sponsored' && styles.sideTextActive,
              ]}
            >
              Sponsored
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sideItem,
              menu === 'featured' && styles.sideItemActive,
            ]}
            onPress={() => setMenu('featured')}
          >
            <Icon
              name="star-circle"
              size={24}
              color={
                menu === 'featured'
                  ? COLORS.primaryOrange
                  : COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.sideText,
                menu === 'featured' && styles.sideTextActive,
              ]}
            >
              Featured
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sideItem,
              menu === 'orders' && styles.sideItemActive,
            ]}
            onPress={() => setMenu('orders')}
          >
            <Icon
              name="cart-check"
              size={24}
              color={
                menu === 'orders' ? COLORS.primaryOrange : COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.sideText,
                menu === 'orders' && styles.sideTextActive,
              ]}
            >
              Orders
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sideItem,
              menu === 'vendorFeatured' && styles.sideItemActive,
            ]}
            onPress={() => setMenu('vendorFeatured')}
          >
            <Icon
              name="star-outline"
              size={24}
              color={
                menu === 'vendorFeatured'
                  ? COLORS.primaryOrange
                  : COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.sideText,
                menu === 'vendorFeatured' && styles.sideTextActive,
              ]}
            >
              Vendor Featured
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sideItem,
              menu === 'vendorSponsored' && styles.sideItemActive,
            ]}
            onPress={() => setMenu('vendorSponsored')}
          >
            <Icon
              name="star-circle-outline"
              size={24}
              color={
                menu === 'vendorSponsored'
                  ? COLORS.primaryOrange
                  : COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.sideText,
                menu === 'vendorSponsored' && styles.sideTextActive,
              ]}
            >
              Vendor Sponsored
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.main}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {menu === 'roles'
                ? 'Roles'
                : menu === 'users'
                ? 'Users'
                : menu === 'sponsored'
                ? 'Sponsored'
                : menu === 'orders'
                ? 'Orders'
                : menu === 'vendorFeatured'
                ? 'Vendor Featured'
                : menu === 'vendorSponsored'
                ? 'Vendor Sponsored'
                : 'Featured'}
            </Text>
            {menu !== 'orders' && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={
                  menu === 'roles'
                    ? openAddRole
                    : menu === 'users'
                    ? openAddUser
                    : menu === 'sponsored'
                    ? openAddSponsored
                    : menu === 'vendorFeatured'
                    ? openAddVendorFeatured
                    : menu === 'vendorSponsored'
                    ? openAddVendorSponsored
                    : openAddFeatured
                }
              >
                <Icon name="plus" size={22} color={COLORS.white} />
                <Text style={styles.addBtnText}>Add new</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primaryOrange]}
              />
            }
          >
            {loading ? (
              <ActivityIndicator
                size="large"
                color={COLORS.primaryOrange}
                style={{ marginTop: 40 }}
              />
            ) : menu === 'sponsored' ? (
              sponsoredList.map(s => (
                <View key={s.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowTitle}>{s.areaName}</Text>
                    <Text style={styles.rowSub}>
                      {s.user
                        ? `Owner: ${
                            s.user.nickname || s.user.name || s.user.email
                          }`
                        : ''}
                      {s.user ? ' • ' : ''}
                      {s.video?.title || s.videoId} • {s.amountPaid}{' '}
                      {s.currency} • {s.status} • until{' '}
                      {s.endDate
                        ? new Date(s.endDate).toLocaleDateString()
                        : '—'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteSponsored(s)}
                    style={styles.iconBtn}
                  >
                    <Icon
                      name="delete-outline"
                      size={22}
                      color={COLORS.error}
                    />
                  </TouchableOpacity>
                </View>
              ))
            ) : menu === 'orders' ? (
              ordersList.map(o => (
                <View key={o.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowTitle}>
                      #{o.id.slice(0, 8)} · {o.status}
                    </Text>
                    <Text style={styles.rowSub}>
                      {o.user?.name || o.user?.email || 'Customer'} →{' '}
                      {o.owner?.name || o.owner?.email || 'Restaurant'} ·{' '}
                      {o.currency} {Number(o.totalAmount).toFixed(2)} ·{' '}
                      {o.createdAt
                        ? new Date(o.createdAt).toLocaleString()
                        : '—'}
                    </Text>
                  </View>
                </View>
              ))
            ) : menu === 'vendorFeatured' ? (
              vendorFeaturedList.map(f => (
                <View key={f.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowTitle}>{f.areaName}</Text>
                    <Text style={styles.rowSub}>
                      {f.user
                        ? `Vendor: ${
                            f.user.nickname || f.user.name || f.user.email
                          }`
                        : ''}
                      {f.user ? ' • ' : ''}
                      {f.video?.title || f.videoId} • {f.amountPaid}{' '}
                      {f.currency} • {f.status} • until{' '}
                      {f.endDate
                        ? new Date(f.endDate).toLocaleDateString()
                        : '—'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteVendorFeatured(f)}
                    style={styles.iconBtn}
                  >
                    <Icon
                      name="delete-outline"
                      size={22}
                      color={COLORS.error}
                    />
                  </TouchableOpacity>
                </View>
              ))
            ) : menu === 'vendorSponsored' ? (
              vendorSponsoredList.map(s => (
                <View key={s.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowTitle}>{s.areaName}</Text>
                    <Text style={styles.rowSub}>
                      {s.user
                        ? `Vendor: ${
                            s.user.nickname || s.user.name || s.user.email
                          }`
                        : ''}
                      {s.user ? ' • ' : ''}
                      {s.video?.title || s.videoId} • {s.amountPaid}{' '}
                      {s.currency} • {s.status} • until{' '}
                      {s.endDate
                        ? new Date(s.endDate).toLocaleDateString()
                        : '—'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteVendorSponsored(s)}
                    style={styles.iconBtn}
                  >
                    <Icon
                      name="delete-outline"
                      size={22}
                      color={COLORS.error}
                    />
                  </TouchableOpacity>
                </View>
              ))
            ) : menu === 'featured' ? (
              featuredList.map(f => (
                <View key={f.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowTitle}>{f.areaName}</Text>
                    <Text style={styles.rowSub}>
                      {f.user
                        ? `Owner: ${
                            f.user.nickname || f.user.name || f.user.email
                          }`
                        : ''}
                      {f.user ? ' • ' : ''}
                      {f.video?.title || f.videoId} • {f.amountPaid}{' '}
                      {f.currency} • {f.status} • until{' '}
                      {f.endDate
                        ? new Date(f.endDate).toLocaleDateString()
                        : '—'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteFeatured(f)}
                    style={styles.iconBtn}
                  >
                    <Icon
                      name="delete-outline"
                      size={22}
                      color={COLORS.error}
                    />
                  </TouchableOpacity>
                </View>
              ))
            ) : menu === 'roles' ? (
              roles.map(r => (
                <View key={r.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowTitle}>{r.name}</Text>
                    {r.description ? (
                      <Text style={styles.rowSub}>{r.description}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => openEditRole(r)}
                    style={styles.iconBtn}
                  >
                    <Icon
                      name="pencil"
                      size={22}
                      color={COLORS.primaryOrange}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteRole(r)}
                    style={styles.iconBtn}
                  >
                    <Icon
                      name="delete-outline"
                      size={22}
                      color={COLORS.error}
                    />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              users.map(u => (
                <View key={u.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowTitle}>{u.email}</Text>
                    <Text style={styles.rowSub}>{u.name || u.role || '—'}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => openEditUser(u)}
                    style={styles.iconBtn}
                  >
                    <Icon
                      name="pencil"
                      size={22}
                      color={COLORS.primaryOrange}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteUser(u)}
                    style={styles.iconBtn}
                  >
                    <Icon
                      name="delete-outline"
                      size={22}
                      color={COLORS.error}
                    />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>

      <Modal visible={!!modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {modalOpen === 'role'
                ? editingRole
                  ? 'Edit Role'
                  : 'New Role'
                : modalOpen === 'sponsored'
                ? 'New Sponsored Campaign'
                : modalOpen === 'featured'
                ? 'New Featured Campaign'
                : modalOpen === 'vendorFeatured'
                ? 'New Vendor Featured Campaign'
                : modalOpen === 'vendorSponsored'
                ? 'New Vendor Sponsored Campaign'
                : editingUser
                ? 'Edit User'
                : 'New User'}
            </Text>
            {modalOpen === 'vendorFeatured' ? (
              <ScrollView
                style={{ maxHeight: 520 }}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.label}>
                  1. Select owner (list shows only role: owner)
                </Text>
                {selectedVendorFeaturedUser ? (
                  <View style={styles.selectedOwnerBox}>
                    <Text style={styles.selectedOwnerName} numberOfLines={1}>
                      {selectedVendorFeaturedUser.nickname ||
                        selectedVendorFeaturedUser.name ||
                        selectedVendorFeaturedUser.email}
                    </Text>
                    {selectedVendorFeaturedUser.address ? (
                      <Text
                        style={styles.selectedOwnerAddress}
                        numberOfLines={2}
                      >
                        {selectedVendorFeaturedUser.address}
                      </Text>
                    ) : null}
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedVendorFeaturedUser(null);
                        setVendorFeaturedForm(p => ({
                          ...p,
                          userId: '',
                          areaName: '',
                          latitude: '',
                          longitude: '',
                        }));
                      }}
                      style={styles.changeOwnerBtn}
                    >
                      <Text style={styles.changeOwnerBtnText}>
                        Change owner
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      value={vendorFeaturedSearchQuery}
                      onChangeText={setVendorFeaturedSearchQuery}
                      placeholder="Search by name or email (email is unique)"
                      placeholderTextColor="#999"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                    />
                    <Text style={[styles.hintText, { marginTop: 4 }]}>
                      Only owners listed. Type name or full email → select one,
                      address & location auto-fill.
                    </Text>
                    {vendorFeaturedSearchLoading ? (
                      <ActivityIndicator
                        size="small"
                        style={{ marginVertical: 8 }}
                        color={COLORS?.primary || '#333'}
                      />
                    ) : vendorFeaturedSearchResults.length > 0 ? (
                      <ScrollView
                        style={styles.ownerSearchList}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                      >
                        {vendorFeaturedSearchResults.map(o => (
                          <TouchableOpacity
                            key={o.id}
                            style={styles.ownerSearchItem}
                            onPress={() => {
                              setVendorFeaturedSearchLoading(true);
                              getUser(o.id)
                                .then(res => {
                                  const profile = res?.user || res || o;
                                  setSelectedVendorFeaturedUser(profile);
                                  setVendorFeaturedForm(p => ({
                                    ...p,
                                    userId: profile?.id || o.id,
                                    areaName: profile?.address
                                      ? String(profile.address).trim()
                                      : '',
                                    latitude:
                                      profile?.latitude != null
                                        ? String(profile.latitude)
                                        : '',
                                    longitude:
                                      profile?.longitude != null
                                        ? String(profile.longitude)
                                        : '',
                                  }));
                                  setVendorFeaturedSearchQuery('');
                                  setVendorFeaturedSearchResults([]);
                                })
                                .catch(() => {
                                  setSelectedVendorFeaturedUser(o);
                                  setVendorFeaturedForm(p => ({
                                    ...p,
                                    userId: o.id,
                                    areaName: o.address
                                      ? String(o.address).trim()
                                      : '',
                                    latitude:
                                      o.latitude != null
                                        ? String(o.latitude)
                                        : '',
                                    longitude:
                                      o.longitude != null
                                        ? String(o.longitude)
                                        : '',
                                  }));
                                  setVendorFeaturedSearchQuery('');
                                  setVendorFeaturedSearchResults([]);
                                })
                                .finally(() =>
                                  setVendorFeaturedSearchLoading(false),
                                );
                            }}
                          >
                            <Text
                              style={styles.ownerSearchItemName}
                              numberOfLines={1}
                            >
                              {o.nickname || o.name || o.email}
                            </Text>
                            {o.address ? (
                              <Text
                                style={styles.ownerSearchItemAddress}
                                numberOfLines={1}
                              >
                                {o.address}
                              </Text>
                            ) : null}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : vendorFeaturedSearchQuery.trim() ? (
                      <Text style={styles.hintText}>
                        No owners found. Try another search.
                      </Text>
                    ) : (
                      <Text style={styles.hintText}>
                        Type to search owners (name or email).
                      </Text>
                    )}
                  </>
                )}
                <Text style={styles.label}>Title (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={vendorFeaturedForm.title}
                  onChangeText={t =>
                    setVendorFeaturedForm(p => ({ ...p, title: t }))
                  }
                  placeholder="e.g. Vendor featured promo"
                  placeholderTextColor="#999"
                />
                <Text style={styles.label}>Video (required)</Text>
                <TouchableOpacity
                  style={[styles.addBtn, { marginVertical: 4 }]}
                  onPress={pickVendorFeaturedVideo}
                >
                  <Text style={styles.addBtnText}>
                    {vendorFeaturedVideoFile
                      ? vendorFeaturedVideoFile.fileName || 'Video selected'
                      : 'Pick video'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.label}>Thumbnail (required)</Text>
                <TouchableOpacity
                  style={[styles.addBtn, { marginVertical: 4 }]}
                  onPress={pickVendorFeaturedThumbnail}
                >
                  <Text style={styles.addBtnText}>
                    {vendorFeaturedThumbnailFile
                      ? vendorFeaturedThumbnailFile.fileName || 'Image selected'
                      : 'Pick thumbnail'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.label}>Location</Text>
                <View style={styles.selectedOwnerBox}>
                  {!selectedVendorFeaturedUser ? (
                    <Text style={styles.hintText}>
                      Select an owner first. Location will be taken from that
                      owner's profile.
                    </Text>
                  ) : selectedVendorFeaturedUser?.address ? (
                    <Text style={styles.selectedOwnerAddress}>
                      {selectedVendorFeaturedUser.address}
                    </Text>
                  ) : (
                    <Text style={styles.hintText}>
                      Selected owner has no address/location saved. Update owner
                      profile first.
                    </Text>
                  )}
                </View>
                <Text style={styles.label}>Radius (km)</Text>
                <TextInput
                  style={styles.input}
                  value={vendorFeaturedForm.radiusKm}
                  onChangeText={t =>
                    setVendorFeaturedForm(p => ({ ...p, radiusKm: t }))
                  }
                  placeholder="2"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.label}>Start date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={vendorFeaturedForm.startDate}
                  onChangeText={t =>
                    setVendorFeaturedForm(p => ({ ...p, startDate: t }))
                  }
                  placeholder="2026-02-18"
                  placeholderTextColor="#999"
                />
                <Text style={styles.label}>End date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={vendorFeaturedForm.endDate}
                  onChangeText={t =>
                    setVendorFeaturedForm(p => ({ ...p, endDate: t }))
                  }
                  placeholder="2026-03-18"
                  placeholderTextColor="#999"
                />
                <Text style={styles.label}>Amount paid</Text>
                <TextInput
                  style={styles.input}
                  value={vendorFeaturedForm.amountPaid}
                  onChangeText={t =>
                    setVendorFeaturedForm(p => ({ ...p, amountPaid: t }))
                  }
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.label}>Currency</Text>
                <TextInput
                  style={styles.input}
                  value={vendorFeaturedForm.currency}
                  onChangeText={t =>
                    setVendorFeaturedForm(p => ({ ...p, currency: t }))
                  }
                  placeholder="USD"
                  placeholderTextColor="#999"
                />
              </ScrollView>
            ) : modalOpen === 'vendorSponsored' ? (
              <ScrollView
                style={{ maxHeight: 520 }}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.label}>
                  1. Select owner (list shows only role: owner)
                </Text>
                {selectedVendorSponsoredUser ? (
                  <View style={styles.selectedOwnerBox}>
                    <Text style={styles.selectedOwnerName} numberOfLines={1}>
                      {selectedVendorSponsoredUser.nickname ||
                        selectedVendorSponsoredUser.name ||
                        selectedVendorSponsoredUser.email}
                    </Text>
                    {selectedVendorSponsoredUser.address ? (
                      <Text
                        style={styles.selectedOwnerAddress}
                        numberOfLines={2}
                      >
                        {selectedVendorSponsoredUser.address}
                      </Text>
                    ) : null}
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedVendorSponsoredUser(null);
                        setVendorSponsoredForm(p => ({
                          ...p,
                          userId: '',
                          areaName: '',
                          latitude: '',
                          longitude: '',
                        }));
                      }}
                      style={styles.changeOwnerBtn}
                    >
                      <Text style={styles.changeOwnerBtnText}>
                        Change owner
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      value={vendorSponsoredSearchQuery}
                      onChangeText={setVendorSponsoredSearchQuery}
                      placeholder="Search by name or email (email is unique)"
                      placeholderTextColor="#999"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                    />
                    <Text style={[styles.hintText, { marginTop: 4 }]}>
                      Only owners listed. Type name or full email → select one,
                      address & location auto-fill.
                    </Text>
                    {vendorSponsoredSearchLoading ? (
                      <ActivityIndicator
                        size="small"
                        style={{ marginVertical: 8 }}
                        color={COLORS?.primary || '#333'}
                      />
                    ) : vendorSponsoredSearchResults.length > 0 ? (
                      <ScrollView
                        style={styles.ownerSearchList}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                      >
                        {vendorSponsoredSearchResults.map(o => (
                          <TouchableOpacity
                            key={o.id}
                            style={styles.ownerSearchItem}
                            onPress={() => {
                              setVendorSponsoredSearchLoading(true);
                              getUser(o.id)
                                .then(res => {
                                  const profile = res?.user || res || o;
                                  setSelectedVendorSponsoredUser(profile);
                                  setVendorSponsoredForm(p => ({
                                    ...p,
                                    userId: profile?.id || o.id,
                                    areaName: profile?.address
                                      ? String(profile.address).trim()
                                      : '',
                                    latitude:
                                      profile?.latitude != null
                                        ? String(profile.latitude)
                                        : '',
                                    longitude:
                                      profile?.longitude != null
                                        ? String(profile.longitude)
                                        : '',
                                  }));
                                  setVendorSponsoredSearchQuery('');
                                  setVendorSponsoredSearchResults([]);
                                })
                                .catch(() => {
                                  setSelectedVendorSponsoredUser(o);
                                  setVendorSponsoredForm(p => ({
                                    ...p,
                                    userId: o.id,
                                    areaName: o.address
                                      ? String(o.address).trim()
                                      : '',
                                    latitude:
                                      o.latitude != null
                                        ? String(o.latitude)
                                        : '',
                                    longitude:
                                      o.longitude != null
                                        ? String(o.longitude)
                                        : '',
                                  }));
                                  setVendorSponsoredSearchQuery('');
                                  setVendorSponsoredSearchResults([]);
                                })
                                .finally(() =>
                                  setVendorSponsoredSearchLoading(false),
                                );
                            }}
                          >
                            <Text
                              style={styles.ownerSearchItemName}
                              numberOfLines={1}
                            >
                              {o.nickname || o.name || o.email}
                            </Text>
                            {o.address ? (
                              <Text
                                style={styles.ownerSearchItemAddress}
                                numberOfLines={1}
                              >
                                {o.address}
                              </Text>
                            ) : null}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : vendorSponsoredSearchQuery.trim() ? (
                      <Text style={styles.hintText}>
                        No owners found. Try another search.
                      </Text>
                    ) : (
                      <Text style={styles.hintText}>
                        Type to search owners (name or email).
                      </Text>
                    )}
                  </>
                )}
                <Text style={styles.label}>Title (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={vendorSponsoredForm.title}
                  onChangeText={t =>
                    setVendorSponsoredForm(p => ({ ...p, title: t }))
                  }
                  placeholder="e.g. Vendor sponsored promo"
                  placeholderTextColor="#999"
                />
                <Text style={styles.label}>Video (required)</Text>
                <TouchableOpacity
                  style={[styles.addBtn, { marginVertical: 4 }]}
                  onPress={pickVendorSponsoredVideo}
                >
                  <Text style={styles.addBtnText}>
                    {vendorSponsoredVideoFile
                      ? vendorSponsoredVideoFile.fileName || 'Video selected'
                      : 'Pick video'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.label}>Thumbnail (required)</Text>
                <TouchableOpacity
                  style={[styles.addBtn, { marginVertical: 4 }]}
                  onPress={pickVendorSponsoredThumbnail}
                >
                  <Text style={styles.addBtnText}>
                    {vendorSponsoredThumbnailFile
                      ? vendorSponsoredThumbnailFile.fileName ||
                        'Image selected'
                      : 'Pick thumbnail'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.label}>Location</Text>
                <View style={styles.selectedOwnerBox}>
                  {!selectedVendorSponsoredUser ? (
                    <Text style={styles.hintText}>
                      Select an owner first. Location will be taken from that
                      owner's profile.
                    </Text>
                  ) : selectedVendorSponsoredUser?.address ? (
                    <Text style={styles.selectedOwnerAddress}>
                      {selectedVendorSponsoredUser.address}
                    </Text>
                  ) : (
                    <Text style={styles.hintText}>
                      Selected owner has no address/location saved. Update owner
                      profile first.
                    </Text>
                  )}
                </View>
                <Text style={styles.label}>Radius (km)</Text>
                <TextInput
                  style={styles.input}
                  value={vendorSponsoredForm.radiusKm}
                  onChangeText={t =>
                    setVendorSponsoredForm(p => ({ ...p, radiusKm: t }))
                  }
                  placeholder="2"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.label}>Start date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={vendorSponsoredForm.startDate}
                  onChangeText={t =>
                    setVendorSponsoredForm(p => ({ ...p, startDate: t }))
                  }
                  placeholder="2026-02-18"
                  placeholderTextColor="#999"
                />
                <Text style={styles.label}>End date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={vendorSponsoredForm.endDate}
                  onChangeText={t =>
                    setVendorSponsoredForm(p => ({ ...p, endDate: t }))
                  }
                  placeholder="2026-03-18"
                  placeholderTextColor="#999"
                />
                <Text style={styles.label}>Amount paid</Text>
                <TextInput
                  style={styles.input}
                  value={vendorSponsoredForm.amountPaid}
                  onChangeText={t =>
                    setVendorSponsoredForm(p => ({ ...p, amountPaid: t }))
                  }
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.label}>Currency</Text>
                <TextInput
                  style={styles.input}
                  value={vendorSponsoredForm.currency}
                  onChangeText={t =>
                    setVendorSponsoredForm(p => ({ ...p, currency: t }))
                  }
                  placeholder="USD"
                  placeholderTextColor="#999"
                />
              </ScrollView>
            ) : modalOpen === 'featured' ? (
              <ScrollView
                style={{ maxHeight: 520 }}
                showsVerticalScrollIndicator={false}
              >
                {isAdminUser && (
                  <>
                    <Text style={styles.label}>
                      1. Select owner (list shows only role: owner)
                    </Text>
                    {selectedFeaturedOwner ? (
                      <View style={styles.selectedOwnerBox}>
                        <Text
                          style={styles.selectedOwnerName}
                          numberOfLines={1}
                        >
                          {selectedFeaturedOwner.nickname ||
                            selectedFeaturedOwner.name ||
                            selectedFeaturedOwner.email}
                        </Text>
                        {selectedFeaturedOwner.address ? (
                          <Text
                            style={styles.selectedOwnerAddress}
                            numberOfLines={2}
                          >
                            {selectedFeaturedOwner.address}
                          </Text>
                        ) : null}
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedFeaturedOwner(null);
                            setFeaturedForm(p => ({
                              ...p,
                              ownerId: '',
                              areaName: '',
                              latitude: '',
                              longitude: '',
                            }));
                          }}
                          style={styles.changeOwnerBtn}
                        >
                          <Text style={styles.changeOwnerBtnText}>
                            Change owner
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <TextInput
                          style={styles.input}
                          value={featuredOwnerSearchQuery}
                          onChangeText={setFeaturedOwnerSearchQuery}
                          placeholder="Search by name or email (email is unique)"
                          placeholderTextColor="#999"
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="email-address"
                        />
                        <Text style={[styles.hintText, { marginTop: 4 }]}>
                          {
                            'Only owners listed. Type name or full email → select one, address & location auto-fill.'
                          }
                        </Text>
                        {featuredOwnerSearchLoading ? (
                          <ActivityIndicator
                            size="small"
                            style={{ marginVertical: 8 }}
                            color={COLORS?.primary || '#333'}
                          />
                        ) : featuredOwnerSearchResults.length > 0 ? (
                          <ScrollView
                            style={styles.ownerSearchList}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                          >
                            {featuredOwnerSearchResults.map(o => (
                              <TouchableOpacity
                                key={o.id}
                                style={styles.ownerSearchItem}
                                onPress={() => {
                                  setFeaturedOwnerSearchLoading(true);
                                  getUser(o.id)
                                    .then(res => {
                                      const profile = res?.user || res || o;
                                      setSelectedFeaturedOwner(profile);
                                      setFeaturedForm(p => ({
                                        ...p,
                                        ownerId: profile?.id || o.id,
                                        areaName: profile?.address
                                          ? String(profile.address).trim()
                                          : '',
                                        latitude:
                                          profile?.latitude != null
                                            ? String(profile.latitude)
                                            : '',
                                        longitude:
                                          profile?.longitude != null
                                            ? String(profile.longitude)
                                            : '',
                                      }));
                                      setFeaturedOwnerSearchQuery('');
                                      setFeaturedOwnerSearchResults([]);
                                    })
                                    .catch(() => {
                                      setSelectedFeaturedOwner(o);
                                      setFeaturedForm(p => ({
                                        ...p,
                                        ownerId: o.id,
                                        areaName: o.address
                                          ? String(o.address).trim()
                                          : '',
                                        latitude:
                                          o.latitude != null
                                            ? String(o.latitude)
                                            : '',
                                        longitude:
                                          o.longitude != null
                                            ? String(o.longitude)
                                            : '',
                                      }));
                                      setFeaturedOwnerSearchQuery('');
                                      setFeaturedOwnerSearchResults([]);
                                    })
                                    .finally(() =>
                                      setFeaturedOwnerSearchLoading(false),
                                    );
                                }}
                              >
                                <Text
                                  style={styles.ownerSearchItemName}
                                  numberOfLines={1}
                                >
                                  {o.nickname || o.name || o.email}
                                </Text>
                                {o.address ? (
                                  <Text
                                    style={styles.ownerSearchItemAddress}
                                    numberOfLines={1}
                                  >
                                    {o.address}
                                  </Text>
                                ) : null}
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        ) : featuredOwnerSearchQuery.trim() ? (
                          <Text style={styles.hintText}>
                            No owners found. Try another search.
                          </Text>
                        ) : (
                          <Text style={styles.hintText}>
                            Type to search owners (name or email).
                          </Text>
                        )}
                      </>
                    )}
                  </>
                )}
                <Text style={styles.label}>Title (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={featuredForm.title}
                  onChangeText={t => setFeaturedForm(p => ({ ...p, title: t }))}
                  placeholder="e.g. My featured promo"
                  placeholderTextColor="#999"
                />
                <Text style={styles.label}>Video (required)</Text>
                <TouchableOpacity
                  style={[styles.addBtn, { marginVertical: 4 }]}
                  onPress={pickFeaturedVideo}
                >
                  <Text style={styles.addBtnText}>
                    {featuredVideoFile
                      ? featuredVideoFile.fileName || 'Video selected'
                      : 'Pick video'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.label}>Thumbnail (required)</Text>
                <TouchableOpacity
                  style={[styles.addBtn, { marginVertical: 4 }]}
                  onPress={pickFeaturedThumbnail}
                >
                  <Text style={styles.addBtnText}>
                    {featuredThumbnailFile
                      ? featuredThumbnailFile.fileName || 'Image selected'
                      : 'Pick thumbnail'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.label}>Location</Text>
                <View style={styles.selectedOwnerBox}>
                  {isAdminUser ? (
                    !selectedFeaturedOwner ? (
                      <Text style={styles.hintText}>
                        Select an owner first. Location will be taken from that
                        owner's profile.
                      </Text>
                    ) : selectedFeaturedOwner?.address ? (
                      <Text style={styles.selectedOwnerAddress}>
                        {selectedFeaturedOwner.address}
                      </Text>
                    ) : (
                      <Text style={styles.hintText}>
                        Selected owner has no address/location saved. Please
                        update the owner profile first.
                      </Text>
                    )
                  ) : myFeaturedProfileLoading ? (
                    <Text style={styles.hintText}>
                      Loading your saved location…
                    </Text>
                  ) : myFeaturedProfile?.address || user?.address ? (
                    <Text style={styles.selectedOwnerAddress}>
                      {myFeaturedProfile?.address || user?.address}
                    </Text>
                  ) : (
                    <Text style={styles.hintText}>
                      You have no address/location saved. Please update your
                      profile first.
                    </Text>
                  )}
                </View>
                <Text style={styles.label}>Radius (km)</Text>
                <TextInput
                  style={styles.input}
                  value={featuredForm.radiusKm}
                  onChangeText={t =>
                    setFeaturedForm(p => ({ ...p, radiusKm: t }))
                  }
                  placeholder="2"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.label}>Start date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={featuredForm.startDate}
                  onChangeText={t =>
                    setFeaturedForm(p => ({ ...p, startDate: t }))
                  }
                  placeholder="2026-02-18"
                  placeholderTextColor="#999"
                />
                <Text style={styles.label}>End date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={featuredForm.endDate}
                  onChangeText={t =>
                    setFeaturedForm(p => ({ ...p, endDate: t }))
                  }
                  placeholder="2026-03-18"
                  placeholderTextColor="#999"
                />
                <Text style={styles.label}>Amount paid</Text>
                <TextInput
                  style={styles.input}
                  value={featuredForm.amountPaid}
                  onChangeText={t =>
                    setFeaturedForm(p => ({ ...p, amountPaid: t }))
                  }
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.label}>Currency</Text>
                <TextInput
                  style={styles.input}
                  value={featuredForm.currency}
                  onChangeText={t =>
                    setFeaturedForm(p => ({ ...p, currency: t }))
                  }
                  placeholder="USD"
                  placeholderTextColor="#999"
                />
              </ScrollView>
            ) : modalOpen === 'sponsored' ? (
              <ScrollView
                style={{ maxHeight: 520 }}
                showsVerticalScrollIndicator={false}
              >
                {isAdminUser && (
                  <>
                    <Text style={styles.label}>
                      1. Select owner (list shows only role: owner)
                    </Text>
                    {selectedOwner ? (
                      <View style={styles.selectedOwnerBox}>
                        <Text
                          style={styles.selectedOwnerName}
                          numberOfLines={1}
                        >
                          {selectedOwner.nickname ||
                            selectedOwner.name ||
                            selectedOwner.email}
                        </Text>
                        {selectedOwner.address ? (
                          <Text
                            style={styles.selectedOwnerAddress}
                            numberOfLines={2}
                          >
                            {selectedOwner.address}
                          </Text>
                        ) : null}
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedOwner(null);
                            setSponsoredForm(p => ({
                              ...p,
                              ownerId: '',
                              areaName: '',
                              latitude: '',
                              longitude: '',
                            }));
                          }}
                          style={styles.changeOwnerBtn}
                        >
                          <Text style={styles.changeOwnerBtnText}>
                            Change owner
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <TextInput
                          style={styles.input}
                          value={ownerSearchQuery}
                          onChangeText={setOwnerSearchQuery}
                          placeholder="Search by name or email (email is unique)"
                          placeholderTextColor="#999"
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="email-address"
                        />
                        <Text style={[styles.hintText, { marginTop: 4 }]}>
                          {
                            'Only owners listed. Type name or full email → select one, address & location auto-fill.'
                          }
                        </Text>
                        {ownerSearchLoading ? (
                          <ActivityIndicator
                            size="small"
                            style={{ marginVertical: 8 }}
                            color={COLORS?.primary || '#333'}
                          />
                        ) : ownerSearchResults.length > 0 ? (
                          <ScrollView
                            style={styles.ownerSearchList}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                          >
                            {ownerSearchResults.map(o => (
                              <TouchableOpacity
                                key={o.id}
                                style={styles.ownerSearchItem}
                                onPress={() => {
                                  setOwnerSearchLoading(true);
                                  getUser(o.id)
                                    .then(res => {
                                      const profile = res?.user || res || o;
                                      setSelectedOwner(profile);
                                      setSponsoredForm(p => ({
                                        ...p,
                                        ownerId: profile?.id || o.id,
                                        areaName: profile?.address
                                          ? String(profile.address).trim()
                                          : '',
                                        latitude:
                                          profile?.latitude != null
                                            ? String(profile.latitude)
                                            : '',
                                        longitude:
                                          profile?.longitude != null
                                            ? String(profile.longitude)
                                            : '',
                                      }));
                                      setOwnerSearchQuery('');
                                      setOwnerSearchResults([]);
                                    })
                                    .catch(() => {
                                      setSelectedOwner(o);
                                      setSponsoredForm(p => ({
                                        ...p,
                                        ownerId: o.id,
                                        areaName: o.address
                                          ? String(o.address).trim()
                                          : '',
                                        latitude:
                                          o.latitude != null
                                            ? String(o.latitude)
                                            : '',
                                        longitude:
                                          o.longitude != null
                                            ? String(o.longitude)
                                            : '',
                                      }));
                                      setOwnerSearchQuery('');
                                      setOwnerSearchResults([]);
                                    })
                                    .finally(() =>
                                      setOwnerSearchLoading(false),
                                    );
                                }}
                              >
                                <Text
                                  style={styles.ownerSearchItemName}
                                  numberOfLines={1}
                                >
                                  {o.nickname || o.name || o.email}
                                </Text>
                                {o.address ? (
                                  <Text
                                    style={styles.ownerSearchItemAddress}
                                    numberOfLines={1}
                                  >
                                    {o.address}
                                  </Text>
                                ) : null}
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        ) : ownerSearchQuery.trim() ? (
                          <Text style={styles.hintText}>
                            No owners found. Try another search.
                          </Text>
                        ) : (
                          <Text style={styles.hintText}>
                            Type to search owners (name or email).
                          </Text>
                        )}
                      </>
                    )}
                  </>
                )}
                <Text style={styles.label}>Title (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={sponsoredForm.title}
                  onChangeText={t =>
                    setSponsoredForm(p => ({ ...p, title: t }))
                  }
                  placeholder="e.g. My restaurant promo"
                  placeholderTextColor="#999"
                />
                <Text style={styles.label}>Video (required)</Text>
                <TouchableOpacity
                  style={[styles.addBtn, { marginVertical: 4 }]}
                  onPress={pickSponsoredVideo}
                >
                  <Text style={styles.addBtnText}>
                    {sponsoredVideoFile
                      ? sponsoredVideoFile.fileName || 'Video selected'
                      : 'Pick video'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.label}>Thumbnail (required)</Text>
                <TouchableOpacity
                  style={[styles.addBtn, { marginVertical: 4 }]}
                  onPress={pickSponsoredThumbnail}
                >
                  <Text style={styles.addBtnText}>
                    {sponsoredThumbnailFile
                      ? sponsoredThumbnailFile.fileName || 'Image selected'
                      : 'Pick thumbnail'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.label}>Location</Text>
                <View style={styles.selectedOwnerBox}>
                  {isAdminUser ? (
                    !selectedOwner ? (
                      <Text style={styles.hintText}>
                        Select an owner first. Location will be taken from that
                        owner’s profile.
                      </Text>
                    ) : selectedOwner?.address ? (
                      <Text style={styles.selectedOwnerAddress}>
                        {selectedOwner.address}
                      </Text>
                    ) : (
                      <Text style={styles.hintText}>
                        Selected owner has no address/location saved. Please
                        update the owner profile first.
                      </Text>
                    )
                  ) : myOwnerProfileLoading ? (
                    <Text style={styles.hintText}>
                      Loading your saved location…
                    </Text>
                  ) : myOwnerProfile?.address || user?.address ? (
                    <Text style={styles.selectedOwnerAddress}>
                      {myOwnerProfile?.address || user?.address}
                    </Text>
                  ) : (
                    <Text style={styles.hintText}>
                      You have no address/location saved. Please update your
                      profile first.
                    </Text>
                  )}
                </View>
                <Text style={styles.label}>Radius (km)</Text>
                <TextInput
                  style={styles.input}
                  value={sponsoredForm.radiusKm}
                  onChangeText={t =>
                    setSponsoredForm(p => ({ ...p, radiusKm: t }))
                  }
                  placeholder="2"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.label}>Start date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={sponsoredForm.startDate}
                  onChangeText={t =>
                    setSponsoredForm(p => ({ ...p, startDate: t }))
                  }
                  placeholder="2026-02-18"
                  placeholderTextColor="#999"
                />
                <Text style={styles.label}>End date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={sponsoredForm.endDate}
                  onChangeText={t =>
                    setSponsoredForm(p => ({ ...p, endDate: t }))
                  }
                  placeholder="2026-03-18"
                  placeholderTextColor="#999"
                />
                <Text style={styles.label}>Amount paid</Text>
                <TextInput
                  style={styles.input}
                  value={sponsoredForm.amountPaid}
                  onChangeText={t =>
                    setSponsoredForm(p => ({ ...p, amountPaid: t }))
                  }
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.label}>Currency</Text>
                <TextInput
                  style={styles.input}
                  value={sponsoredForm.currency}
                  onChangeText={t =>
                    setSponsoredForm(p => ({ ...p, currency: t }))
                  }
                  placeholder="USD"
                  placeholderTextColor="#999"
                />
              </ScrollView>
            ) : modalOpen === 'role' ? (
              <>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={formRoleName}
                  onChangeText={setFormRoleName}
                  placeholder="Role name"
                  placeholderTextColor="#999"
                />
                <Text style={styles.label}>Description (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={formRoleDesc}
                  onChangeText={setFormRoleDesc}
                  placeholder="Description"
                  placeholderTextColor="#999"
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formUserEmail}
                  onChangeText={setFormUserEmail}
                  placeholder="email@example.com"
                  placeholderTextColor="#999"
                  editable={!editingUser}
                  autoCapitalize="none"
                />
                {!editingUser && (
                  <>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                      style={styles.input}
                      value={formUserPassword}
                      onChangeText={setFormUserPassword}
                      placeholder="Password"
                      placeholderTextColor="#999"
                      secureTextEntry
                    />
                  </>
                )}
                <Text style={styles.label}>Name (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={formUserName}
                  onChangeText={setFormUserName}
                  placeholder="Display name"
                  placeholderTextColor="#999"
                />
                <Text style={styles.label}>Role</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.roleChips}
                >
                  {roleOptions.map(r => (
                    <TouchableOpacity
                      key={r.id}
                      style={[
                        styles.chip,
                        formUserRoleId === r.id && styles.chipActive,
                      ]}
                      onPress={() => setFormUserRoleId(r.id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          formUserRoleId === r.id && styles.chipTextActive,
                        ]}
                      >
                        {r.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={
                  modalOpen === 'role'
                    ? handleSaveRole
                    : modalOpen === 'sponsored'
                    ? handleCreateSponsored
                    : modalOpen === 'featured'
                    ? handleCreateFeatured
                    : modalOpen === 'vendorFeatured'
                    ? handleCreateVendorFeatured
                    : modalOpen === 'vendorSponsored'
                    ? handleCreateVendorSponsored
                    : handleSaveUser
                }
                disabled={submitLoading}
              >
                {submitLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  layout: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: COLORS.gray100,
    borderRightWidth: 1,
    borderRightColor: COLORS.gray200,
    paddingTop: SPACING.lg,
  },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: 8,
  },
  sideItemActive: { backgroundColor: COLORS.white },
  sideText: { fontSize: FONTS.base, color: COLORS.textSecondary },
  sideTextActive: { color: COLORS.primaryOrange, fontWeight: '600' },
  main: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  title: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryOrange,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: 6,
  },
  addBtnText: { color: COLORS.white, fontWeight: '600', fontSize: FONTS.sm },
  list: { flex: 1, padding: SPACING.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  rowLeft: { flex: 1 },
  rowTitle: {
    fontSize: FONTS.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  rowSub: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 2 },
  iconBtn: { padding: SPACING.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
  },
  modalTitle: {
    fontSize: FONTS.xl,
    fontWeight: '700',
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.base,
  },
  roleChips: { marginVertical: 8, maxHeight: 44 },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  chipActive: {
    backgroundColor: COLORS.primaryOrange,
    borderColor: COLORS.primaryOrange,
  },
  chipText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white, fontWeight: '600' },
  selectedOwnerBox: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginVertical: 6,
    backgroundColor: COLORS.gray100 || '#f5f5f5',
  },
  selectedOwnerName: {
    fontSize: FONTS.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  selectedOwnerAddress: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  changeOwnerBtn: { marginTop: 8, alignSelf: 'flex-start' },
  changeOwnerBtnText: {
    fontSize: FONTS.sm,
    color: COLORS.primaryOrange || '#e65100',
    fontWeight: '600',
  },
  ownerSearchList: { maxHeight: 160, marginVertical: 6 },
  ownerSearchItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  ownerSearchItemActive: {
    backgroundColor: COLORS.gray100 || '#f0f0f0',
  },
  pickerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    maxHeight: 120,
  },
  ownerSearchItemName: {
    fontSize: FONTS.base,
    color: COLORS.text,
    fontWeight: '500',
  },
  ownerSearchItemAddress: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  hintText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginVertical: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  cancelBtn: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: {
    backgroundColor: COLORS.primaryOrange,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 80,
    alignItems: 'center',
  },
  saveBtnText: { color: COLORS.white, fontWeight: '600' },
});

export default AdminScreen;
