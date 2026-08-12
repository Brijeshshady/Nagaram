import { useState, useEffect, useCallback } from 'react';
import { userService, departmentService, wardService } from '../../services/dataService';
import { ROLES, ROLE_LABELS, ROLE_COLORS } from '../../utils/constants';
import { HiUserAdd, HiFilter, HiSearch, HiCheck, HiX, HiPencil } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form State for Create
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: ROLES.CITIZEN,
    department: '',
    ward: '',
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    role: ROLES.CITIZEN,
    department: '',
    ward: '',
    isActive: true,
  });

  // Filters State
  const [filters, setFilters] = useState({
    role: '',
    isActive: '',
    search: '',
  });

  const fetchUsers = useCallback(async () => {
    try {
      const params = {
        role: filters.role || undefined,
        isActive: filters.isActive !== '' ? filters.isActive : undefined,
      };
      const res = await userService.getAll(params);
      setUsers(res.data.users || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [filters.role, filters.isActive]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data.departments || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchWards = useCallback(async () => {
    try {
      const res = await wardService.getAll();
      setWards(res.data.wards || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
    fetchWards();
  }, [fetchUsers, fetchDepartments, fetchWards]);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setEditForm({ ...editForm, [e.target.name]: value });
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      phone: user.phone || '',
      role: user.role,
      department: user.department?._id || user.department || '',
      ward: user.ward?._id || user.ward || '',
      isActive: user.isActive,
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.department) delete payload.department;
      if (!payload.ward) delete payload.ward;

      await userService.create(payload);
      toast.success('User created successfully');
      setShowAddModal(false);
      setForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: ROLES.CITIZEN,
        department: '',
        ward: '',
      });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await userService.update(editingUser._id, editForm);
      toast.success('User details updated');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    }
  };

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      await userService.update(id, { isActive: !currentStatus });
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const filteredUsers = users.filter((u) => {
    const query = filters.search.toLowerCase();
    return (
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.phone && u.phone.includes(query))
    );
  });

  return (
    <div className="user-mgmt animate-fade-in">
      <div className="user-mgmt__header">
        <div>
          <h1>User Management & Moderation</h1>
          <p className="user-mgmt__subtitle">Manage city personnel, roles, department assignments, and account access</p>
        </div>
        <button className="user-mgmt__add-btn" onClick={() => setShowAddModal(true)}>
          <HiUserAdd /> Add Personnel
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="user-mgmt__toolbar glass-card">
        <div className="search-bar">
          <HiSearch className="search-bar__icon" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        <div className="filters">
          <div className="filter-select">
            <HiFilter className="filter-select__icon" />
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            >
              <option value="">All Roles</option>
              {Object.entries(ROLE_LABELS).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>

          <div className="filter-select">
            <select
              value={filters.isActive}
              onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="user-mgmt__loading">
          <div className="animate-spin" />
        </div>
      ) : (
        <div className="user-mgmt__table-wrapper glass-card">
          <table className="user-mgmt__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Ward</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-cell__avatar" style={{ background: `${ROLE_COLORS[u.role] || '#6366f1'}15`, color: ROLE_COLORS[u.role] || '#6366f1' }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="user-cell__name">{u.name}</p>
                          <p className="user-cell__email">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="role-badge" style={{ color: ROLE_COLORS[u.role] || '#6366f1', borderColor: `${ROLE_COLORS[u.role] || '#6366f1'}30`, background: `${ROLE_COLORS[u.role] || '#6366f1'}08` }}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td>{u.department?.name || '—'}</td>
                    <td>{u.ward ? `${u.ward.name} (${u.ward.number})` : '—'}</td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <span className={`status-dot ${u.isActive ? 'status-dot--active' : 'status-dot--inactive'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="action-btn action-btn--edit"
                          onClick={() => openEditModal(u)}
                          title="Edit User & Roles"
                        >
                          <HiPencil />
                        </button>
                        <button
                          className={`action-btn ${u.isActive ? 'action-btn--deactivate' : 'action-btn--activate'}`}
                          onClick={() => toggleUserStatus(u._id, u.isActive)}
                          title={u.isActive ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {u.isActive ? <HiX /> : <HiCheck />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="user-mgmt__empty">
                    No personnel found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-card animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Moderate & Edit User ({editingUser.email})</h2>
              <button className="modal-close" onClick={() => setEditingUser(null)}><HiX /></button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Full Name</label>
                  <input type="text" name="name" value={editForm.name} onChange={handleEditInputChange} required />
                </div>

                <div className="form-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Phone Number</label>
                    <input type="tel" name="phone" value={editForm.phone} onChange={handleEditInputChange} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Assign Role</label>
                    <select name="role" value={editForm.role} onChange={handleEditInputChange} required>
                      {Object.entries(ROLE_LABELS).map(([key, val]) => (
                        <option key={key} value={key}>{val}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Department Assignment</label>
                    <select name="department" value={editForm.department} onChange={handleEditInputChange}>
                      <option value="">No Department</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Ward Assignment</label>
                    <select name="ward" value={editForm.ward} onChange={handleEditInputChange}>
                      <option value="">No Ward</option>
                      {wards.map((w) => (
                        <option key={w._id} value={w._id}>{w.name} (Ward {w.number})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={editForm.isActive}
                    onChange={handleEditInputChange}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="isActive" style={{ margin: 0, cursor: 'pointer' }}>Active Account Access</label>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 0 }}>
                <button type="button" className="btn-cancel" onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className="btn-submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Municipal Personnel</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Full Name</label>
                  <input type="text" name="name" value={form.name} onChange={handleInputChange} required placeholder="e.g. Sanjay Verma" />
                </div>

                <div className="form-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Email Address</label>
                    <input type="email" name="email" value={form.email} onChange={handleInputChange} required placeholder="sanjay@nagaram.city" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Phone Number</label>
                    <input type="tel" name="phone" value={form.phone} onChange={handleInputChange} placeholder="10-digit number" />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Password</label>
                    <input type="password" name="password" value={form.password} onChange={handleInputChange} required placeholder="••••••••" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Role</label>
                    <select name="role" value={form.role} onChange={handleInputChange} required>
                      {Object.entries(ROLE_LABELS).map(([key, val]) => (
                        <option key={key} value={key}>{val}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Department Assignment</label>
                    <select name="department" value={form.department} onChange={handleInputChange}>
                      <option value="">No Department</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Ward Assignment (Optional)</label>
                    <select name="ward" value={form.ward} onChange={handleInputChange}>
                      <option value="">No Ward</option>
                      {wards.map((w) => (
                        <option key={w._id} value={w._id}>{w.name} (Ward {w.number})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 0 }}>
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">Add User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
