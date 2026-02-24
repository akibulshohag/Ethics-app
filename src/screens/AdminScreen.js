import React, { useState, useEffect, useCallback } from 'react';
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
import { getRoles, createRole, updateRole, deleteRole } from '../services/roleService';
import { getUsers, createUser, updateUser, deleteUser } from '../services/adminUserService';
import { getRolesList } from '../services/roleService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

const SIDEBAR_WIDTH = 140;

const AdminScreen = () => {
  const { user } = useSelector(s => s.app) || {};
  const [menu, setMenu] = useState('roles'); // 'roles' | 'users'
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (menu === 'roles') await loadRoles();
    else await loadUsers();
    setRefreshing(false);
  }, [menu, loadRoles, loadUsers]);

  useEffect(() => {
    if (menu === 'roles') loadRoles();
    else loadUsers();
  }, [menu, loadRoles, loadUsers]);

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

  const openEditRole = (r) => {
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

  const openEditUser = (u) => {
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
        await updateRole(editingRole.id, { name: formRoleName.trim(), description: formRoleDesc.trim() || undefined });
        Alert.alert('Success', 'Role updated');
      } else {
        await createRole({ name: formRoleName.trim(), description: formRoleDesc.trim() || undefined });
        Alert.alert('Success', 'Role created');
      }
      setModalOpen(false);
      loadRoles();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed');
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
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteRole = (r) => {
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

  const handleDeleteUser = (u) => {
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
            <Icon name="account-badge" size={24} color={menu === 'roles' ? COLORS.primaryOrange : COLORS.textSecondary} />
            <Text style={[styles.sideText, menu === 'roles' && styles.sideTextActive]}>Roles</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sideItem, menu === 'users' && styles.sideItemActive]}
            onPress={() => setMenu('users')}
          >
            <Icon name="account-group" size={24} color={menu === 'users' ? COLORS.primaryOrange : COLORS.textSecondary} />
            <Text style={[styles.sideText, menu === 'users' && styles.sideTextActive]}>Users</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.main}>
          <View style={styles.header}>
            <Text style={styles.title}>{menu === 'roles' ? 'Roles' : 'Users'}</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={menu === 'roles' ? openAddRole : openAddUser}
            >
              <Icon name="plus" size={22} color={COLORS.white} />
              <Text style={styles.addBtnText}>Add new</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryOrange]} />
            }
          >
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.primaryOrange} style={{ marginTop: 40 }} />
            ) : menu === 'roles' ? (
              roles.map((r) => (
                <View key={r.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowTitle}>{r.name}</Text>
                    {r.description ? <Text style={styles.rowSub}>{r.description}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => openEditRole(r)} style={styles.iconBtn}>
                    <Icon name="pencil" size={22} color={COLORS.primaryOrange} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteRole(r)} style={styles.iconBtn}>
                    <Icon name="delete-outline" size={22} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              users.map((u) => (
                <View key={u.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowTitle}>{u.email}</Text>
                    <Text style={styles.rowSub}>{u.name || u.role || '—'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openEditUser(u)} style={styles.iconBtn}>
                    <Icon name="pencil" size={22} color={COLORS.primaryOrange} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteUser(u)} style={styles.iconBtn}>
                    <Icon name="delete-outline" size={22} color={COLORS.error} />
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
              {modalOpen === 'role' ? (editingRole ? 'Edit Role' : 'New Role') : editingUser ? 'Edit User' : 'New User'}
            </Text>
            {modalOpen === 'role' ? (
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleChips}>
                  {roleOptions.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.chip, formUserRoleId === r.id && styles.chipActive]}
                      onPress={() => setFormUserRoleId(r.id)}
                    >
                      <Text style={[styles.chipText, formUserRoleId === r.id && styles.chipTextActive]}>{r.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={modalOpen === 'role' ? handleSaveRole : handleSaveUser}
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
  title: { fontSize: FONTS.xxl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
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
  rowTitle: { fontSize: FONTS.base, fontWeight: '600', color: COLORS.textPrimary },
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
  modalTitle: { fontSize: FONTS.xl, fontWeight: '700', marginBottom: SPACING.lg },
  label: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginBottom: 4, marginTop: 8 },
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
  chipActive: { backgroundColor: COLORS.primaryOrange, borderColor: COLORS.primaryOrange },
  chipText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white, fontWeight: '600' },
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
