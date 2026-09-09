import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Shield,
  ShieldAlert,
  UserPlus,
  Search,
  Filter,
  Key,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  AlertTriangle,
  Building,
  Mail,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import { api } from '../../api';
import { RoleType, User } from '../../../../shared/types';

interface UserManagementViewProps {
  currentUser: User | null;
  onRefresh?: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUser,
  onRefresh
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SUPER_ADMIN' | 'FACULTY'>('ALL');
  
  // Feedback notification
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState<boolean>(false);

  // Active user for editing/password reset
  const [targetUser, setTargetUser] = useState<User | null>(null);

  // Form states
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<RoleType>('FACULTY');
  const [newUserDepartmentId, setNewUserDepartmentId] = useState<string>('');

  const [editName, setEditName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editRole, setEditRole] = useState<RoleType>('FACULTY');
  const [editDepartmentId, setEditDepartmentId] = useState<string>('');

  const [resetNewPassword, setResetNewPassword] = useState<string>('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [uList, hier] = await Promise.all([
        api.getUsers(),
        api.getHierarchy().catch(() => null)
      ]);
      setUsers(uList || []);
      const depts = hier?.departments || [];
      setDepartments(depts);
      if (depts.length > 0 && !newUserDepartmentId) {
        setNewUserDepartmentId(depts[0].id);
      }
    } catch (e: any) {
      console.error('Failed to load user management data:', e);
      setErrorMessage('Failed to load user accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage('');
    setTimeout(() => setErrorMessage(''), 5000);
  };

  // Quick Role Toggle / Update
  const handleRoleChange = async (userId: string, newRole: RoleType) => {
    try {
      const res = await api.updateUserRole(userId, newRole);
      if (res.success) {
        showSuccess(`User role successfully changed to ${newRole === 'SUPER_ADMIN' ? 'Super Administrator' : 'Faculty Member'}.`);
        loadData();
        if (onRefresh) onRefresh();
      } else {
        showError(res.error || 'Failed to update user role.');
      }
    } catch (e: any) {
      showError(e.message || 'Error updating user role.');
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword) {
      showError('Please fill in all required fields.');
      return;
    }
    if (newUserPassword.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }

    try {
      const res = await api.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
        departmentId: newUserDepartmentId || undefined
      });

      if (res.success) {
        showSuccess(`Account for ${newUserName} created successfully.`);
        setIsCreateModalOpen(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('FACULTY');
        loadData();
        if (onRefresh) onRefresh();
      } else {
        showError(res.error || 'Failed to create user account.');
      }
    } catch (e: any) {
      showError(e.message || 'Error creating user account.');
    }
  };

  // Edit User
  const handleOpenEdit = (user: User) => {
    setTargetUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditDepartmentId(user.departmentId || (departments[0]?.id ?? ''));
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    if (!editName.trim() || !editEmail.trim()) {
      showError('Name and email are required.');
      return;
    }

    try {
      const res = await api.updateUser(targetUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        departmentId: editDepartmentId || undefined
      });

      if (res.success) {
        showSuccess(`User ${editName} updated successfully.`);
        setIsEditModalOpen(false);
        setTargetUser(null);
        loadData();
        if (onRefresh) onRefresh();
      } else {
        showError(res.error || 'Failed to update user.');
      }
    } catch (e: any) {
      showError(e.message || 'Error updating user.');
    }
  };

  // Reset Password
  const handleOpenResetPassword = (user: User) => {
    setTargetUser(user);
    setResetNewPassword('');
    setResetConfirmPassword('');
    setIsResetPasswordModalOpen(true);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    if (!resetNewPassword || resetNewPassword.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      showError('Passwords do not match.');
      return;
    }

    try {
      const res = await api.resetUserPassword(targetUser.id, resetNewPassword);
      if (res.success) {
        showSuccess(`Password for ${targetUser.name} reset successfully.`);
        setIsResetPasswordModalOpen(false);
        setTargetUser(null);
      } else {
        showError(res.error || 'Failed to reset password.');
      }
    } catch (e: any) {
      showError(e.message || 'Error resetting password.');
    }
  };

  // Delete User
  const handleDeleteUser = async (user: User) => {
    if (currentUser?.id === user.id) {
      showError('Security Guard: You cannot delete your own logged-in administrator account.');
      return;
    }

    if (!confirm(`Are you sure you want to delete the account for ${user.name} (${user.email})? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await api.deleteUser(user.id);
      if (res.success) {
        showSuccess(`Account for ${user.name} was removed.`);
        loadData();
        if (onRefresh) onRefresh();
      } else {
        showError(res.error || 'Failed to delete user.');
      }
    } catch (e: any) {
      showError(e.message || 'Error deleting user.');
    }
  };

  // Filtered list
  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'ALL') {
      if (roleFilter === 'SUPER_ADMIN' && u.role !== 'SUPER_ADMIN' && u.role !== 'UNIVERSITY_ADMIN') return false;
      if (roleFilter === 'FACULTY' && u.role !== 'FACULTY' && u.role !== 'TIMETABLE_COORDINATOR' && u.role !== 'DEPARTMENT_ADMIN') return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.departmentName && u.departmentName.toLowerCase().includes(q)) ||
      (u.departmentCode && u.departmentCode.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const totalAdmins = users.filter(u => u.role === 'SUPER_ADMIN' || u.role === 'UNIVERSITY_ADMIN').length;
  const totalFaculty = users.filter(u => u.role === 'FACULTY' || u.role === 'TIMETABLE_COORDINATOR' || u.role === 'DEPARTMENT_ADMIN').length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="lux-card p-6 bg-white border-[#D8E6ED] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-[#EBF4F7] text-[#002E4E] border border-[#D8E6ED] flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-[#2582A1]" />
                Institutional Security & Role Governance
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#002E4E] tracking-tight">
              User & Access Control Console
            </h1>
            <p className="text-xs text-[#4A6375] max-w-2xl leading-relaxed">
              Super Administrators have unrestricted governance over all accounts. You can edit user roles, grant administrator privileges, reset credentials, and onboard institutional faculty members.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadData}
              title="Refresh User Directory"
              className="p-2.5 rounded-xl border border-[#D8E6ED] bg-[#F4F8FA] text-[#002E4E] hover:bg-[#EBF4F7] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="lux-btn lux-btn-gold px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New User</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-[#D8E6ED]">
          <div className="p-4 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#4A6375]">Total Registered Users</div>
              <div className="text-2xl font-black text-[#002E4E] mt-0.5">{users.length}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white border border-[#D8E6ED] flex items-center justify-center text-[#2582A1]">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#EBF4F7] border border-[#CCDDE7] flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#002E4E]">Super Administrators</div>
              <div className="text-2xl font-black text-[#002E4E] mt-0.5">{totalAdmins}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#002E4E] text-white flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#166534]">Faculty Members</div>
              <div className="text-2xl font-black text-[#166534] mt-0.5">{totalFaculty}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white border border-[#BBF7D0] flex items-center justify-center text-[#166534]">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-red-700 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar & Search Suite */}
      <div className="lux-card p-3.5 bg-white border-[#D8E6ED] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#F4F8FA] p-1 rounded-xl border border-[#D8E6ED] w-full sm:w-auto">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              roleFilter === 'ALL'
                ? 'bg-white text-[#002E4E] shadow-2xs'
                : 'text-[#4A6375] hover:text-[#002E4E]'
            }`}
          >
            All Accounts ({users.length})
          </button>
          <button
            onClick={() => setRoleFilter('SUPER_ADMIN')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              roleFilter === 'SUPER_ADMIN'
                ? 'bg-[#002E4E] text-white shadow-2xs'
                : 'text-[#4A6375] hover:text-[#002E4E]'
            }`}
          >
            Admins ({totalAdmins})
          </button>
          <button
            onClick={() => setRoleFilter('FACULTY')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              roleFilter === 'FACULTY'
                ? 'bg-[#2582A1] text-white shadow-2xs'
                : 'text-[#4A6375] hover:text-[#002E4E]'
            }`}
          >
            Faculty ({totalFaculty})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#4A6375] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, department..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="lux-input w-full pl-9 pr-3 py-1.5 text-xs bg-[#F4F8FA] border-[#D8E6ED] text-[#002E4E]"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="lux-card bg-white border-[#D8E6ED] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F0F6F9] border-b border-[#D8E6ED] text-[11px] font-bold uppercase tracking-wider text-[#2582A1]">
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Role & Access Level</th>
                <th className="py-3 px-4">Department / Unit</th>
                <th className="py-3 px-4">Role Switcher</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E7E3] text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#4A6375]">
                    <UserCheck className="w-8 h-8 text-[#829BA8] mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">No user accounts found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const isCurrent = currentUser?.id === user.id;
                  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'UNIVERSITY_ADMIN';
                  const deptLabel = user.departmentName || (user.departmentCode ? `Dept. ${user.departmentCode}` : 'General Faculty');

                  return (
                    <tr key={user.id} className="hover:bg-[#F9FBFC] transition-colors">
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isAdmin ? 'bg-[#002E4E] text-white' : 'bg-[#EBF4F7] text-[#002E4E] border border-[#CCDDE7]'
                          }`}>
                            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#002E4E] truncate">{user.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#4A6375] truncate flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-[#829BA8]" />
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Role Badge */}
                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EBF4F7] text-[#002E4E] border border-[#CCDDE7]">
                            <ShieldAlert className="w-3 h-3 text-[#2582A1]" />
                            Super Administrator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                            <UserCheck className="w-3 h-3 text-[#166534]" />
                            Faculty Member
                          </span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-[#4A6375]">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Building className="w-3.5 h-3.5 text-[#2582A1] shrink-0" />
                          <span className="truncate max-w-[180px]">{deptLabel}</span>
                        </div>
                      </td>

                      {/* Role Switcher */}
                      <td className="py-3.5 px-4">
                        <select
                          value={user.role}
                          onChange={e => handleRoleChange(user.id, e.target.value as RoleType)}
                          disabled={isCurrent}
                          className={`lux-select text-xs py-1 px-2.5 rounded-lg border font-semibold cursor-pointer ${
                            isCurrent
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                              : 'bg-white border-[#D8E6ED] text-[#002E4E] hover:border-[#2582A1]'
                          }`}
                        >
                          <option value="SUPER_ADMIN">👑 Super Admin</option>
                          <option value="FACULTY">👨‍🏫 Faculty</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            title="Edit User Details"
                            className="p-1.5 rounded-lg text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F0F6F9] transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenResetPassword(user)}
                            title="Reset User Password"
                            className="p-1.5 rounded-lg text-[#2582A1] hover:bg-[#EBF4F7] transition-colors"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              title="Delete Account"
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#D8E6ED] shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#2582A1]" />
                <h3 className="text-sm font-bold text-[#002E4E]">Create New User Account</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F4F8FA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Smith"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="lux-input w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-[#002E4E]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">Institutional Email</label>
                <input
                  type="email"
                  required
                  placeholder="name@apollouniversity.edu.in"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="lux-input w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-[#002E4E]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">Initial Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  className="lux-input w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-[#002E4E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">Assigned Role</label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as RoleType)}
                    className="lux-select w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-[#002E4E] font-semibold"
                  >
                    <option value="FACULTY">Faculty Member</option>
                    <option value="SUPER_ADMIN">Super Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">Academic Department</label>
                  <select
                    value={newUserDepartmentId}
                    onChange={e => setNewUserDepartmentId(e.target.value)}
                    className="lux-select w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-[#002E4E]"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8E6ED]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F4F8FA] text-[#4A6375] hover:bg-[#D8E6ED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="lux-btn lux-btn-gold px-4 py-2 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditModalOpen && targetUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#D8E6ED] shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#2582A1]" />
                <h3 className="text-sm font-bold text-[#002E4E]">Edit User Profile</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F4F8FA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="lux-input w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-[#002E4E]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="lux-input w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-[#002E4E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">Role</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as RoleType)}
                    className="lux-select w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-[#002E4E] font-semibold"
                  >
                    <option value="SUPER_ADMIN">Super Administrator</option>
                    <option value="FACULTY">Faculty Member</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">Department</label>
                  <select
                    value={editDepartmentId}
                    onChange={e => setEditDepartmentId(e.target.value)}
                    className="lux-select w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-[#002E4E]"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8E6ED]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F4F8FA] text-[#4A6375] hover:bg-[#D8E6ED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="lux-btn lux-btn-gold px-4 py-2 rounded-lg text-xs font-bold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetPasswordModalOpen && targetUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#D8E6ED] shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#2582A1]" />
                <div>
                  <h3 className="text-sm font-bold text-[#002E4E]">Reset User Password</h3>
                  <p className="text-[11px] text-[#4A6375]">for {targetUser.name} ({targetUser.email})</p>
                </div>
              </div>
              <button
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="p-1.5 rounded-lg text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F4F8FA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={resetNewPassword}
                  onChange={e => setResetNewPassword(e.target.value)}
                  className="lux-input w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-[#002E4E]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Re-type new password"
                  value={resetConfirmPassword}
                  onChange={e => setResetConfirmPassword(e.target.value)}
                  className="lux-input w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-[#002E4E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8E6ED]">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F4F8FA] text-[#4A6375] hover:bg-[#D8E6ED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="lux-btn lux-btn-gold px-4 py-2 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;
