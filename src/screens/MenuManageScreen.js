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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MenuItemThumbnail from '../components/MenuItemThumbnail';
import { launchImageLibrary } from 'react-native-image-picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  pick as pickDocumentNative,
  types as docTypes,
  isErrorWithCode,
  errorCodes as docErrorCodes,
} from '@react-native-documents/picker';
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
  uploadMenuCsv,
} from '../services/menuService';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { ALLERGENS, normalizeAllergens } from '../constants/allergens';

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
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [itemImageAsset, setItemImageAsset] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  /** veg | egg | non_veg | '' */
  const [dietaryType, setDietaryType] = useState('');
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [customAllergenIcons, setCustomAllergenIcons] = useState([]);
  const [allergenIconUploading, setAllergenIconUploading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  const [csvUploadLoading, setCsvUploadLoading] = useState(false);
  const [csvExportLoading, setCsvExportLoading] = useState(false);
  const [csvFileNameModalVisible, setCsvFileNameModalVisible] = useState(false);
  const [csvExportFileName, setCsvExportFileName] = useState('');
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
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, async res => {
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
    });
  };

  const pickAndUploadMenuCsv = async () => {
    try {
      const picked = await pickDocumentNative({
        type: ['text/csv', 'text/comma-separated-values', docTypes.plainText],
        allowMultiSelection: false,
      });
      const file = Array.isArray(picked) ? picked[0] : picked;
      if (!file?.uri) return;
      setCsvUploadLoading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'text/csv',
        name: file.name || 'menu.csv',
      });
      const data = await uploadMenuCsv(user.token, formData);
      Alert.alert(
        'CSV import done',
        `Imported: ${data?.importedCount || 0}\nFailed: ${
          data?.failedCount || 0
        }\nPrevious menu replaced.`,
      );
      loadMenu();
    } catch (e) {
      if (isErrorWithCode(e) && e.code === docErrorCodes.OPERATION_CANCELED) {
        return;
      }
      Alert.alert('Error', e?.message || 'CSV import failed');
    } finally {
      setCsvUploadLoading(false);
    }
  };

  const escapeCsv = value => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const sanitizeCsvFileName = value => {
    const raw = String(value || '')
      .trim()
      .replace(/\.csv$/i, '');
    const cleaned = raw.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
    return cleaned || `menu_export_${Date.now()}`;
  };

  const openExportCsvModal = () => {
    setCsvExportFileName(`menu_export_${Date.now()}`);
    setCsvFileNameModalVisible(true);
  };

  const closeExportCsvModal = () => {
    setCsvFileNameModalVisible(false);
  };

  const showCsvDownloadedAlert = (fileName, openUri) => {
    Alert.alert('CSV downloaded', `${fileName}`, [
      { text: 'OK', style: 'cancel' },
      {
        text: 'Open',
        onPress: async () => {
          try {
            await ReactNativeBlobUtil.android.actionViewIntent(
              openUri,
              'text/comma-separated-values',
            );
          } catch (err) {
            Alert.alert('Info', 'Please open it from your Downloads folder.');
          }
        },
      },
    ]);
  };

  const exportMenuCsv = async customName => {
    try {
      setCsvExportLoading(true);
      const categoryMap = new Map(
        (categories || []).map(c => [c.id, c.name || '']),
      );
      const header = [
        'item_name',
        'description',
        'category',
        'price',
        'discount_price',
        'image_url',
        'availability',
        'veg_nonveg',
        'allergens',
      ];
      const rows = (list || []).map(item => {
        const dietary =
          item?.dietaryType === 'non_veg'
            ? 'non-veg'
            : item?.dietaryType === 'egg'
            ? 'egg'
            : item?.dietaryType === 'veg'
            ? 'veg'
            : '';
        const categoryName =
          categoryMap.get(item?.categoryId) || item?.category?.name || '';
        const allergens = Array.isArray(item?.allergens)
          ? item.allergens.join(',')
          : '';
        return [
          item?.itemName || '',
          item?.description || '',
          categoryName,
          item?.price ?? '',
          '',
          item?.imageUrl || '',
          'available',
          dietary,
          allergens,
        ];
      });
      const csvBody = [header, ...rows]
        .map(cols => cols.map(escapeCsv).join(','))
        .join('\n');
      // Include UTF-8 BOM so spreadsheet apps reliably detect CSV encoding.
      const csv = `\uFEFF${csvBody}`;

      const baseName = sanitizeCsvFileName(customName);
      const fileName = `${baseName}.csv`;

      if (Platform.OS === 'android') {
        // Save as a normal named file inside Downloads first.
        const savedPath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`;
        try {
          await ReactNativeBlobUtil.fs.writeFile(savedPath, csv, 'utf8');
          await ReactNativeBlobUtil.fs.scanFile([
            { path: savedPath, mime: 'text/comma-separated-values' },
          ]);
          await ReactNativeBlobUtil.android.addCompleteDownload({
            title: fileName,
            description: 'Menu CSV export',
            mime: 'text/comma-separated-values',
            path: savedPath,
            showNotification: true,
          });
          const exists = await ReactNativeBlobUtil.fs.exists(savedPath);
          if (!exists) throw new Error('File save verification failed');
          showCsvDownloadedAlert(fileName, `file://${savedPath}`);
        } catch (downloadErr) {
          // Fallback for devices where direct Downloads write is restricted.
          const tempPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${fileName}`;
          await ReactNativeBlobUtil.fs.writeFile(tempPath, csv, 'utf8');
          const mediaStoreUri =
            await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
              {
                name: fileName,
                parentFolder: 'Download',
                mimeType: 'text/comma-separated-values',
              },
              'Download',
              tempPath,
            );
          await ReactNativeBlobUtil.android.addCompleteDownload({
            title: fileName,
            description: 'Menu CSV export',
            mime: 'text/comma-separated-values',
            path: `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`,
            showNotification: true,
          });
          showCsvDownloadedAlert(
            fileName,
            mediaStoreUri || `file://${savedPath}`,
          );
        }
      } else {
        const filePath = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${fileName}`;
        await ReactNativeBlobUtil.fs.writeFile(filePath, csv, 'utf8');
        Alert.alert('CSV exported', `Saved in Files as ${fileName}`);
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'CSV export failed');
    } finally {
      setCsvExportLoading(false);
    }
  };

  const onConfirmCsvExport = async () => {
    closeExportCsvModal();
    await exportMenuCsv(csvExportFileName);
  };

  const pickAndUploadItemImage = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, async res => {
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
    });
  };

  const openAdd = () => {
    setEditingId(null);
    setItemName('');
    setPrice('');
    setDescription('');
    setImageUrl('');
    setItemImageAsset(null);
    setSelectedCategoryId(categories.length > 0 ? categories[0].id : '');
    setDietaryType('');
    setSelectedAllergens([]);
    setCustomAllergenIcons([]);
    setAddSuccessInModal(false);
    setFormVisible(true);
  };

  const openEdit = item => {
    setEditingId(item.id);
    setItemName(item.itemName || '');
    setPrice(String(item.price ?? ''));
    setDescription(String(item.description || '').trim());
    setImageUrl(item.imageUrl || '');
    setItemImageAsset(null);
    setDietaryType(
      item.dietaryType && ['veg', 'egg', 'non_veg'].includes(item.dietaryType)
        ? item.dietaryType
        : '',
    );
    setSelectedCategoryId(
      item.categoryId ||
        item.category?.id ||
        (categories.length > 0 ? categories[0].id : ''),
    );
    setSelectedAllergens(normalizeAllergens(item.allergens));
    setCustomAllergenIcons(normalizeAllergens(item.allergenIconUrls));
    setAddSuccessInModal(false);
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingId(null);
    setItemName('');
    setPrice('');
    setDescription('');
    setImageUrl('');
    setItemImageAsset(null);
    setAddSuccessInModal(false);
    setCustomAllergenIcons([]);
  };

  const resetFormForAnother = () => {
    setItemName('');
    setPrice('');
    setDescription('');
    setImageUrl('');
    setItemImageAsset(null);
    setAddSuccessInModal(false);
    setCustomAllergenIcons([]);
  };

  const pickAndUploadAllergenIcon = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, async res => {
      if (res.didCancel || res.errorCode || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setAllergenIconUploading(true);
      try {
        const formData = new FormData();
        formData.append('image', {
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name:
            asset.fileName ||
            asset.uri?.split('/').pop() ||
            'allergen-icon.jpg',
        });
        const data = await uploadMenuItemImage(user.token, formData);
        const url = String(data?.imageUrl || '').trim();
        if (url) {
          setCustomAllergenIcons(prev =>
            prev.includes(url) ? prev : [...prev, url],
          );
        }
      } catch (e) {
        Alert.alert('Error', e.message || 'Allergen icon upload failed');
      } finally {
        setAllergenIconUploading(false);
      }
    });
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
        description: description.trim() || undefined,
        imageUrl: imageUrl || undefined,
        ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
        ...(selectedAllergens.length
          ? { allergens: selectedAllergens }
          : { allergens: [] }),
        ...(customAllergenIcons.length
          ? { allergenIconUrls: customAllergenIcons }
          : { allergenIconUrls: [] }),
        ...(dietaryType
          ? { dietaryType }
          : editingId
          ? { clearDietary: true }
          : {}),
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

  const openEditCategory = cat => {
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

  const handleDeleteCategory = cat => {
    const count =
      cat.itemCount ?? list.filter(i => i.categoryId === cat.id).length;
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
    const uncategorized = list.filter(i => !i.categoryId && !i.category?.id);
    const byCategory = categories.map(cat => ({
      id: cat.id,
      title: cat.name,
      data: list.filter(i => (i.categoryId || i.category?.id) === cat.id),
    }));
    const sections = [];
    byCategory.forEach(s => {
      if (s.data.length > 0)
        sections.push({ id: s.id, title: s.title, data: s.data });
    });
    if (uncategorized.length > 0) {
      sections.push({
        id: 'uncategorized',
        title: 'Uncategorized',
        data: uncategorized,
      });
    }
    return sections;
  }, [list, categories]);

  const handleDelete = item => {
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
          <Text style={styles.helperText}>
            Menu is for restaurant owners and vendors only.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
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
        <Text style={styles.sectionHint}>
          Create categories (e.g. Main Course, Breads), then assign them when
          adding menu items.
        </Text>
        <TouchableOpacity
          style={styles.addCategoryButton}
          onPress={openAddCategory}
        >
          <Icon name="plus" size={20} color={COLORS.white} />
          <Text style={styles.addCategoryButtonText}>Add category</Text>
        </TouchableOpacity>
        {categories.length > 0 ? (
          categories.map(cat => (
            <View key={cat.id} style={styles.categoryCard}>
              <Text style={styles.categoryCardName}>{cat.name}</Text>
              <Text style={styles.categoryCardCount}>
                {cat.itemCount ??
                  list.filter(i => i.categoryId === cat.id).length}{' '}
                items
              </Text>
              <View style={styles.categoryCardActions}>
                <TouchableOpacity
                  onPress={() => openEditCategory(cat)}
                  style={styles.iconBtn}
                >
                  <Icon name="pencil" size={20} color={COLORS.primaryOrange} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteCategory(cat)}
                  style={styles.iconBtn}
                >
                  <Icon name="delete-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyCategoryText}>
            No categories yet. Add one above, then add menu items and assign a
            category.
          </Text>
        )}

        {/* 2. Menu file (PDF/image) upload */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          2. Menu file (PDF or image)
        </Text>
        <Text style={styles.sectionHint}>
          Upload your menu as image (optional).
        </Text>
        <TouchableOpacity
          style={[
            styles.uploadFileButton,
            fileUploadLoading && styles.buttonDisabled,
          ]}
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
        <TouchableOpacity
          style={[
            styles.uploadCsvButton,
            csvUploadLoading && styles.buttonDisabled,
          ]}
          onPress={pickAndUploadMenuCsv}
          disabled={csvUploadLoading}
        >
          {csvUploadLoading ? (
            <ActivityIndicator size="small" color={COLORS.primaryOrange} />
          ) : (
            <Icon
              name="file-delimited-outline"
              size={22}
              color={COLORS.primaryOrange}
            />
          )}
          <Text style={styles.uploadCsvButtonText}>
            {csvUploadLoading
              ? 'Importing CSV…'
              : 'Import menu from CSV (bulk)'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.csvHint}>
          CSV columns: item_name, description, category, price, image_url,
          veg_nonveg, allergens
        </Text>
        <Text style={styles.csvHint}>
          Import mode: replaces all existing menu items/categories with this
          CSV.
        </Text>
        <TouchableOpacity
          style={[
            styles.exportCsvButton,
            csvExportLoading && styles.buttonDisabled,
          ]}
          onPress={openExportCsvModal}
          disabled={csvExportLoading}
        >
          {csvExportLoading ? (
            <ActivityIndicator size="small" color={COLORS.gray800} />
          ) : (
            <Icon name="file-export-outline" size={22} color={COLORS.gray800} />
          )}
          <Text style={styles.exportCsvButtonText}>
            {csvExportLoading ? 'Exporting CSV…' : 'Export current menu CSV'}
          </Text>
        </TouchableOpacity>
        {menuFiles.length > 0 && (
          <Text style={styles.uploadedCount}>
            {menuFiles.length} file(s) uploaded
          </Text>
        )}

        {/* 3. Menu items */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          3. Menu items
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={openAdd}>
          <Icon name="plus" size={22} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add menu item</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primaryOrange}
            style={{ marginTop: 24 }}
          />
        ) : list.length === 0 ? (
          <Text style={styles.emptyText}>
            No menu items yet. Tap "Add menu item" to add.
          </Text>
        ) : (
          menuSections.map(section => (
            <View key={section.id} style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>{section.title}</Text>
              {section.data.map(item => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardLeft}>
                    <MenuItemThumbnail
                      uri={item.imageUrl}
                      style={styles.cardThumb}
                      imageStyle={styles.cardThumb}
                    />
                    <View style={styles.cardTextWrap}>
                      <Text style={styles.cardTitle}>{item.itemName}</Text>
                      <Text style={styles.cardPrice}>
                        £{Number(item.price).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => openEdit(item)}
                      style={styles.iconBtn}
                    >
                      <Icon
                        name="pencil"
                        size={22}
                        color={COLORS.primaryOrange}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      style={styles.iconBtn}
                    >
                      <Icon
                        name="delete-outline"
                        size={22}
                        color={COLORS.error}
                      />
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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            <Pressable style={styles.formBox} onPress={e => e.stopPropagation()}>
            <Text style={styles.formTitle}>
              {editingId
                ? 'Edit item'
                : addSuccessInModal
                ? 'Item added!'
                : 'New menu item'}
            </Text>

            {addSuccessInModal ? (
              <View style={styles.addAnotherRow}>
                <Text style={styles.addAnotherText}>
                  Add another item or close.
                </Text>
                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={styles.addAnotherBtn}
                    onPress={resetFormForAnother}
                  >
                    <Text style={styles.addAnotherBtnText}>Add another</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.doneBtn} onPress={closeForm}>
                    <Text style={styles.doneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <ScrollView
                  style={styles.formScroll}
                  contentContainerStyle={styles.formScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.inputLabel}>Category</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryPicker}
                    keyboardShouldPersistTaps="handled"
                  >
                    <TouchableOpacity
                      style={[
                        styles.categoryChip,
                        !selectedCategoryId && styles.categoryChipActive,
                      ]}
                      onPress={() => setSelectedCategoryId('')}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          !selectedCategoryId && styles.categoryChipTextActive,
                        ]}
                      >
                        None
                      </Text>
                    </TouchableOpacity>
                    {categories.map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryChip,
                          selectedCategoryId === cat.id &&
                            styles.categoryChipActive,
                        ]}
                        onPress={() => setSelectedCategoryId(cat.id)}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            selectedCategoryId === cat.id &&
                              styles.categoryChipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {cat.name}
                        </Text>
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
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Description (optional)"
                    placeholderTextColor="#999"
                    multiline
                  />
                  <Text style={styles.inputLabel}>
                    Veg / Non-veg (for customer filters)
                  </Text>
                  <View style={styles.dietaryRow}>
                    {[
                      { id: '', label: 'Any' },
                      { id: 'veg', label: 'Veg', icon: 'circle' },
                      { id: 'egg', label: 'Egg', icon: 'egg' },
                      { id: 'non_veg', label: 'Non-veg', icon: 'triangle' },
                    ].map(d => (
                      <TouchableOpacity
                        key={d.id || 'any'}
                        style={[
                          styles.dietaryChip,
                          dietaryType === d.id && styles.dietaryChipActive,
                        ]}
                        onPress={() => setDietaryType(d.id)}
                      >
                        {d.icon ? (
                          <Icon
                            name={d.icon}
                            size={16}
                            color={dietaryType === d.id ? COLORS.white : '#666'}
                          />
                        ) : null}
                        <Text
                          style={[
                            styles.dietaryChipText,
                            dietaryType === d.id && styles.dietaryChipTextActive,
                          ]}
                        >
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.inputLabel}>Allergens (tap to select)</Text>
                  <View style={styles.allergenWrap}>
                    {ALLERGENS.map(a => {
                      const active = selectedAllergens.includes(a.key);
                      return (
                        <TouchableOpacity
                          key={a.key}
                          style={[
                            styles.allergenChip,
                            active && styles.allergenChipActive,
                          ]}
                          onPress={() =>
                            setSelectedAllergens(prev =>
                              prev.includes(a.key)
                                ? prev.filter(x => x !== a.key)
                                : [...prev, a.key],
                            )
                          }
                        >
                          <Icon
                            name={a.icon}
                            size={16}
                            color={active ? COLORS.white : '#666'}
                          />
                          <Text
                            style={[
                              styles.allergenChipText,
                              active && styles.allergenChipTextActive,
                            ]}
                          >
                            {a.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.inputLabel}>
                    Custom allergen icons (upload)
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.uploadImageBtn,
                      allergenIconUploading && styles.buttonDisabled,
                    ]}
                    onPress={pickAndUploadAllergenIcon}
                    disabled={allergenIconUploading}
                  >
                    {allergenIconUploading ? (
                      <ActivityIndicator
                        size="small"
                        color={COLORS.primaryOrange}
                      />
                    ) : (
                      <Icon
                        name="image-plus"
                        size={22}
                        color={COLORS.primaryOrange}
                      />
                    )}
                    <Text style={styles.uploadImageBtnText}>
                      {allergenIconUploading
                        ? 'Uploading…'
                        : 'Upload allergen icon'}
                    </Text>
                  </TouchableOpacity>
                  {customAllergenIcons.length > 0 ? (
                    <View style={styles.customIconWrap}>
                      {customAllergenIcons.map((uri, idx) => (
                        <View
                          key={`${uri}-${idx}`}
                          style={styles.customIconItem}
                        >
                          <Image
                            source={{ uri }}
                            style={styles.customIconImage}
                          />
                          <TouchableOpacity
                            style={styles.customIconRemove}
                            onPress={() =>
                              setCustomAllergenIcons(prev =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            <Icon name="close" size={14} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <Text style={styles.inputLabel}>
                    Item image (upload file, no URL)
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.uploadImageBtn,
                      imageUploading && styles.buttonDisabled,
                    ]}
                    onPress={pickAndUploadItemImage}
                    disabled={imageUploading}
                  >
                    {imageUploading ? (
                      <ActivityIndicator
                        size="small"
                        color={COLORS.primaryOrange}
                      />
                    ) : (
                      <Icon
                        name="image-plus"
                        size={22}
                        color={COLORS.primaryOrange}
                      />
                    )}
                    <Text style={styles.uploadImageBtnText}>
                      {imageUrl || itemImageAsset
                        ? 'Image uploaded ✓'
                        : imageUploading
                        ? 'Uploading…'
                        : 'Upload image'}
                    </Text>
                  </TouchableOpacity>
                  {imageUrl || itemImageAsset?.uri ? (
                    <Image
                      source={{ uri: imageUrl || itemImageAsset?.uri }}
                      style={styles.previewImage}
                    />
                  ) : null}
                </ScrollView>

                <View style={styles.formActionsSticky}>
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
                      <Text style={styles.saveBtnText}>
                        {editingId ? 'Update' : 'Save'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Category add/edit modal */}
      <Modal
        visible={categoryFormVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCategoryForm}
      >
        <Pressable style={styles.formOverlay} onPress={closeCategoryForm}>
          <Pressable style={styles.formBox} onPress={e => e.stopPropagation()}>
            <Text style={styles.formTitle}>
              {editingCategoryId ? 'Edit category' : 'New category'}
            </Text>
            <TextInput
              style={styles.input}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="Category name (e.g. Main Course)"
              placeholderTextColor="#999"
            />
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeCategoryForm}
              >
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
                  <Text style={styles.saveBtnText}>
                    {editingCategoryId ? 'Update' : 'Save'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={csvFileNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeExportCsvModal}
      >
        <Pressable style={styles.formOverlay} onPress={closeExportCsvModal}>
          <Pressable style={styles.formBox} onPress={e => e.stopPropagation()}>
            <Text style={styles.formTitle}>Export CSV filename</Text>
            <Text style={styles.sectionHint}>
              Enter the CSV name to save in phone storage.
            </Text>
            <TextInput
              style={styles.input}
              value={csvExportFileName}
              onChangeText={setCsvExportFileName}
              placeholder="menu_export_2026"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={onConfirmCsvExport}
            />
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeExportCsvModal}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={onConfirmCsvExport}
                disabled={csvExportLoading}
              >
                {csvExportLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Save CSV</Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
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
  uploadFileButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15,
  },
  uploadCsvButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryOrange,
    backgroundColor: '#FFF7ED',
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    gap: 8,
    marginTop: 10,
  },
  uploadCsvButtonText: {
    color: COLORS.primaryOrange,
    fontWeight: '600',
    fontSize: 15,
  },
  csvHint: { fontSize: 12, color: COLORS.gray600, marginTop: 8 },
  exportCsvButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.gray100,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    gap: 8,
    marginTop: 10,
  },
  exportCsvButtonText: {
    color: COLORS.gray800,
    fontWeight: '600',
    fontSize: 15,
  },
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
  addCategoryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 8,
  },
  categoryCardName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
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
  emptyText: {
    fontSize: 14,
    color: COLORS.gray600,
    textAlign: 'center',
    marginTop: 24,
  },
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
    maxHeight: '86%',
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
  textarea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  allergenWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  allergenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#fff',
  },
  allergenChipActive: {
    backgroundColor: COLORS.primaryOrange,
    borderColor: COLORS.primaryOrange,
  },
  allergenChipText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  allergenChipTextActive: {
    color: COLORS.white,
  },
  customIconWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  customIconItem: {
    width: 42,
    height: 42,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  customIconImage: {
    width: '100%',
    height: '100%',
  },
  customIconRemove: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderBottomLeftRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
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
  uploadImageBtnText: {
    fontSize: 15,
    color: COLORS.primaryOrange,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
  },
  addAnotherRow: { marginTop: 8 },
  addAnotherText: { fontSize: 15, color: COLORS.gray600, marginBottom: 16 },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  formActionsSticky: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.gray200,
  },
  formScroll: { flexGrow: 0 },
  formScrollContent: { paddingBottom: 6 },
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
  dietaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  dietaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  dietaryChipActive: {
    backgroundColor: COLORS.primaryOrange,
    borderColor: COLORS.primaryOrange,
  },
  dietaryChipText: { fontSize: 14, color: COLORS.textPrimary },
  dietaryChipTextActive: { color: COLORS.white, fontWeight: '600' },
});

export default MenuManageScreen;
