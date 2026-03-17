import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  getMenuItems,
  getMenuFiles,
  getMenuCategories,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  uploadMenuItemImage,
  uploadMenuFile,
} from '../services/menuService';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

const MenuManageScreen = () => {
  const navigation = useNavigation();
  const { user } = useSelector(s => s.app) || {};
  const [list, setList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuFiles, setMenuFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [itemImageAsset, setItemImageAsset] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [addSuccessInModal, setAddSuccessInModal] = useState(false);
  // Category form (add/edit)
  const [categoryFormVisible, setCategoryFormVisible] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySaveLoading, setCategorySaveLoading] = useState(false);

  const loadMenu = useCallback(async () => {
    if (!user?.token) return;
    try {
      const [itemsRes, filesRes, categoriesRes] = await Promise.all([
        getMenuItems(user.token),
        getMenuFiles(user.token),
        getMenuCategories(user.token),
      ]);
      setList(itemsRes?.menu || []);
      setMenuFiles(filesRes?.files || []);
      setCategories(categoriesRes?.categories || []);
    } catch (e) {
      setList([]);
      setCategories([]);
      setMenuFiles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      loadMenu();
    }, [loadMenu]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMenu();
  };

  const pickAndUploadMenuFile = () => {
    launchImageLibrary(
      { mediaType: 'photo', selectionLimit: 1 },
      async (res) => {
        if (res.didCancel || res.errorCode || !res.assets?.[0]) return;
        const asset = res.assets[0];
        setFileUploadLoading(true);
        try {
          const formData = new FormData();
          formData.append('file', {
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || asset.uri?.split('/').pop() || 'menu.jpg',
          });
          await uploadMenuFile(user.token, formData);
          Alert.alert('Success', 'Menu file uploaded');
          loadMenu();
        } catch (e) {
          Alert.alert('Error', e.message || 'Upload failed');
        } finally {
          setFileUploadLoading(false);
        }
      },
    );
  };

  const pickAndUploadItemImage = () => {
    launchImageLibrary(
      { mediaType: 'photo', selectionLimit: 1 },
      async (res) => {
        if (res.didCancel || res.errorCode || !res.assets?.[0]) return;
        const asset = res.assets[0];
        setImageUploading(true);
        try {
          const formData = new FormData();
          formData.append('image', {
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || asset.uri?.split('/').pop() || 'item.jpg',
          });
          const data = await uploadMenuItemImage(user.token, formData);
          setImageUrl(data?.imageUrl || '');
          setItemImageAsset(asset);
        } catch (e) {
          Alert.alert('Error', e.message || 'Image upload failed');
        } finally {
          setImageUploading(false);
        }
      },
    );
  };

  const openAdd = () => {
    setEditingId(null);
    setItemName('');
    setPrice('');
    setImageUrl('');
    setItemImageAsset(null);
    setSelectedCategoryId(categories.length > 0 ? categories[0].id : '');
    setAddSuccessInModal(false);
    setFormVisible(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setItemName(item.itemName || '');
    setPrice(String(item.price ?? ''));
    setImageUrl(item.imageUrl || '');
    setItemImageAsset(null);
    setSelectedCategoryId(item.categoryId || item.category?.id || (categories.length > 0 ? categories[0].id : ''));
    setAddSuccessInModal(false);
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingId(null);
    setItemName('');
    setPrice('');
    setImageUrl('');
    setItemImageAsset(null);
    setAddSuccessInModal(false);
  };

  const resetFormForAnother = () => {
    setItemName('');
    setPrice('');
    setImageUrl('');
    setItemImageAsset(null);
    setAddSuccessInModal(false);
  };

  const handleSave = async () => {
    const name = (itemName || '').trim();
    const numPrice = parseFloat(price);
    if (!name) {
      Alert.alert('Error', 'Item name is required');
      return;
    }
    if (Number.isNaN(numPrice) || numPrice < 0) {
      Alert.alert('Error', 'Enter a valid price');
      return;
    }
    setSubmitLoading(true);
    try {
      const payload = {
        itemName: name,
        price: numPrice,
        imageUrl: imageUrl || undefined,
        ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
      };
      if (editingId) {
        await updateMenuItem(user.token, editingId, payload);
        Alert.alert('Success', 'Menu item updated');
        closeForm();
        loadMenu();
      } else {
        await createMenuItem(user.token, payload);
        setAddSuccessInModal(true);
        loadMenu();
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save');
    } finally {
      setSubmitLoading(false);
    }
  };

  const openAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryName('');
    setCategoryFormVisible(true);
  };

  const openEditCategory = (cat) => {
    setEditingCategoryId(cat.id);
    setCategoryName(cat.name || '');
    setCategoryFormVisible(true);
  };

  const closeCategoryForm = () => {
    setCategoryFormVisible(false);
    setEditingCategoryId(null);
    setCategoryName('');
  };

  const handleSaveCategory = async () => {
    const name = (categoryName || '').trim();
    if (!name) {
      Alert.alert('Error', 'Category name is required');
      return;
    }
    setCategorySaveLoading(true);
    try {
      if (editingCategoryId) {
        await updateMenuCategory(user.token, editingCategoryId, { name });
        Alert.alert('Success', 'Category updated');
      } else {
        await createMenuCategory(user.token, { name });
        Alert.alert('Success', 'Category created');
      }
      closeCategoryForm();
      loadMenu();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save category');
    } finally {
      setCategorySaveLoading(false);
    }
  };

  const handleDeleteCategory = (cat) => {
    const count = cat.itemCount ?? list.filter((i) => i.categoryId === cat.id).length;
    Alert.alert(
      'Delete category',
      count > 0
        ? `"${cat.name}" has ${count} item(s). They will become uncategorized. Delete anyway?`
        : `Delete "${cat.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMenuCategory(user.token, cat.id);
              loadMenu();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to delete category');
            }
          },
        },
      ],
    );
  };

  // Group menu items by category for section list (category order, then uncategorized)
  const menuSections = React.useMemo(() => {
    const uncategorized = list.filter((i) => !i.categoryId && !i.category?.id);
    const byCategory = categories.map((cat) => ({
      id: cat.id,
      title: cat.name,
      data: list.filter((i) => (i.categoryId || i.category?.id) === cat.id),
    }));
    const sections = [];
    byCategory.forEach((s) => {
      if (s.data.length > 0) sections.push({ id: s.id, title: s.title, data: s.data });
    });
    if (uncategorized.length > 0) {
      sections.push({ id: 'uncategorized', title: 'Uncategorized', data: uncategorized });
    }
    return sections;
  }, [list, categories]);

  const handleDelete = (item) => {
    Alert.alert('Delete item', `Delete "${item.itemName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMenuItem(user.token, item.id);
            loadMenu();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const roleNorm = String(user?.role || '').toLowerCase();
  const isOwnerOrVendor = roleNorm === 'owner' || roleNorm === 'vendor';

  if (!user?.token) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Text style={styles.helperText}>Please log in to manage menu.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isOwnerOrVendor) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Text style={styles.helperText}>Menu is for restaurant owners and vendors only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage menu</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primaryOrange]}
          />
        }
      >
        {/* 1. Menu categories: create first, then assign to items */}
        <Text style={styles.sectionTitle}>1. Menu categories</Text>
        <Text style={styles.sectionHint}>Create categories (e.g. Main Course, Breads), then assign them when adding menu items.</Text>
        <TouchableOpacity style={styles.addCategoryButton} onPress={openAddCategory}>
          <Icon name="plus" size={20} color={COLORS.white} />
          <Text style={styles.addCategoryButtonText}>Add category</Text>
        </TouchableOpacity>
        {categories.length > 0 ? (
          categories.map((cat) => (
            <View key={cat.id} style={styles.categoryCard}>
              <Text style={styles.categoryCardName}>{cat.name}</Text>
              <Text style={styles.categoryCardCount}>{cat.itemCount ?? list.filter((i) => i.categoryId === cat.id).length} items</Text>
              <View style={styles.categoryCardActions}>
                <TouchableOpacity onPress={() => openEditCategory(cat)} style={styles.iconBtn}>
                  <Icon name="pencil" size={20} color={COLORS.primaryOrange} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={styles.iconBtn}>
                  <Icon name="delete-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyCategoryText}>No categories yet. Add one above, then add menu items and assign a category.</Text>
        )}

        {/* 2. Menu file (PDF/image) upload */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>2. Menu file (PDF or image)</Text>
        <Text style={styles.sectionHint}>Upload your menu as image (optional).</Text>
        <TouchableOpacity
          style={[styles.uploadFileButton, fileUploadLoading && styles.buttonDisabled]}
          onPress={pickAndUploadMenuFile}
          disabled={fileUploadLoading}
        >
          {fileUploadLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Icon name="file-upload-outline" size={22} color={COLORS.white} />
          )}
          <Text style={styles.uploadFileButtonText}>
            {fileUploadLoading ? 'Uploading…' : 'Upload menu file (image)'}
          </Text>
        </TouchableOpacity>
        {menuFiles.length > 0 && (
          <Text style={styles.uploadedCount}>{menuFiles.length} file(s) uploaded</Text>
        )}

        {/* 3. Menu items */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>3. Menu items</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAdd}>
          <Icon name="plus" size={22} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add menu item</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primaryOrange} style={{ marginTop: 24 }} />
        ) : list.length === 0 ? (
          <Text style={styles.emptyText}>No menu items yet. Tap "Add menu item" to add.</Text>
        ) : (
          menuSections.map((section) => (
            <View key={section.id} style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>{section.title}</Text>
              {section.data.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardLeft}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.cardThumb} />
                    ) : null}
                    <View style={styles.cardTextWrap}>
                      <Text style={styles.cardTitle}>{item.itemName}</Text>
                      <Text style={styles.cardPrice}>${Number(item.price).toFixed(2)}</Text>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                      <Icon name="pencil" size={22} color={COLORS.primaryOrange} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
                      <Icon name="delete-outline" size={22} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={formVisible}
        transparent
        animationType="slide"
        onRequestClose={closeForm}
      >
        <Pressable style={styles.formOverlay} onPress={closeForm}>
          <Pressable style={styles.formBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.formTitle}>
              {editingId ? 'Edit item' : addSuccessInModal ? 'Item added!' : 'New menu item'}
            </Text>

            {addSuccessInModal ? (
              <View style={styles.addAnotherRow}>
                <Text style={styles.addAnotherText}>Add another item or close.</Text>
                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.addAnotherBtn} onPress={resetFormForAnother}>
                    <Text style={styles.addAnotherBtnText}>Add another</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.doneBtn} onPress={closeForm}>
                    <Text style={styles.doneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.inputLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                  <TouchableOpacity
                    style={[styles.categoryChip, !selectedCategoryId && styles.categoryChipActive]}
                    onPress={() => setSelectedCategoryId('')}
                  >
                    <Text style={[styles.categoryChipText, !selectedCategoryId && styles.categoryChipTextActive]}>None</Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryChip, selectedCategoryId === cat.id && styles.categoryChipActive]}
                      onPress={() => setSelectedCategoryId(cat.id)}
                    >
                      <Text style={[styles.categoryChipText, selectedCategoryId === cat.id && styles.categoryChipTextActive]} numberOfLines={1}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput
                  style={styles.input}
                  value={itemName}
                  onChangeText={setItemName}
                  placeholder="Item name"
                  placeholderTextColor="#999"
                />
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="Price (e.g. 12.50)"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputLabel}>Item image (upload file, no URL)</Text>
                <TouchableOpacity
                  style={[styles.uploadImageBtn, imageUploading && styles.buttonDisabled]}
                  onPress={pickAndUploadItemImage}
                  disabled={imageUploading}
                >
                  {imageUploading ? (
                    <ActivityIndicator size="small" color={COLORS.primaryOrange} />
                  ) : (
                    <Icon name="image-plus" size={22} color={COLORS.primaryOrange} />
                  )}
                  <Text style={styles.uploadImageBtnText}>
                    {imageUrl || itemImageAsset
                      ? 'Image uploaded ✓'
                      : imageUploading
                        ? 'Uploading…'
                        : 'Upload image'}
                  </Text>
                </TouchableOpacity>
                {(imageUrl || itemImageAsset?.uri) ? (
                  <Image
                    source={{ uri: imageUrl || itemImageAsset?.uri }}
                    style={styles.previewImage}
                  />
                ) : null}

                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeForm}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={submitLoading}
                  >
                    {submitLoading ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.saveBtnText}>{editingId ? 'Update' : 'Save'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Category add/edit modal */}
      <Modal visible={categoryFormVisible} transparent animationType="fade" onRequestClose={closeCategoryForm}>
        <Pressable style={styles.formOverlay} onPress={closeCategoryForm}>
          <Pressable style={styles.formBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.formTitle}>{editingCategoryId ? 'Edit category' : 'New category'}</Text>
            <TextInput
              style={styles.input}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="Category name (e.g. Main Course)"
              placeholderTextColor="#999"
            />
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeCategoryForm}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveCategory}
                disabled={categorySaveLoading}
              >
                {categorySaveLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>{editingCategoryId ? 'Update' : 'Save'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  helperText: { fontSize: 16, color: COLORS.gray600 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  backBtn: { marginRight: SPACING.md },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  sectionHint: { fontSize: 13, color: COLORS.gray600, marginBottom: 12 },
  uploadFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryOrange,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    gap: 8,
  },
  uploadFileButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  uploadedCount: { fontSize: 12, color: COLORS.gray600, marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryOrange,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    gap: 8,
    marginBottom: 12,
  },
  addCategoryButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 8,
  },
  categoryCardName: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  categoryCardCount: { fontSize: 13, color: COLORS.gray600, marginRight: 8 },
  categoryCardActions: { flexDirection: 'row', gap: 8 },
  emptyCategoryText: { fontSize: 13, color: COLORS.gray600, marginBottom: 8 },
  categoryPicker: { marginBottom: 12, maxHeight: 44 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: COLORS.primaryOrange },
  categoryChipText: { fontSize: 14, color: COLORS.gray700 },
  categoryChipTextActive: { color: COLORS.white, fontWeight: '600' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryOrange,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    gap: 8,
    marginBottom: 20,
  },
  addButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray600, textAlign: 'center', marginTop: 24 },
  menuSection: { marginBottom: 20 },
  menuSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
    paddingLeft: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray50,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 12,
  },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardThumb: { width: 48, height: 48, borderRadius: 8 },
  cardTextWrap: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  cardPrice: { fontSize: 14, color: COLORS.gray600, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },
  formOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  formBox: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: 24,
  },
  formTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  inputLabel: { fontSize: 14, color: COLORS.gray600, marginBottom: 6 },
  uploadImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryOrange,
    borderRadius: 8,
    marginBottom: 12,
  },
  uploadImageBtnText: { fontSize: 15, color: COLORS.primaryOrange, fontWeight: '600' },
  previewImage: { width: '100%', height: 120, borderRadius: 8, marginBottom: 12 },
  addAnotherRow: { marginTop: 8 },
  addAnotherText: { fontSize: 15, color: COLORS.gray600, marginBottom: 16 },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  addAnotherBtn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 8,
  },
  addAnotherBtnText: { color: COLORS.white, fontWeight: '600' },
  doneBtn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: COLORS.gray200,
    borderRadius: 8,
  },
  doneBtnText: { color: COLORS.textPrimary, fontWeight: '600' },
  cancelBtn: { flex: 1, padding: 12, alignItems: 'center' },
  cancelBtnText: { color: COLORS.gray600, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.primaryOrange,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: { color: COLORS.white, fontWeight: '600' },
});

export default MenuManageScreen;
