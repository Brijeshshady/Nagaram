import { useState, useEffect } from 'react';
import { userService, departmentService } from '../../services/dataService';
import { ROLES, ROLE_LABELS, ROLE_COLORS } from '../../utils/constants';
import { HiUserAdd, HiFilter, HiSearch, HiCheck, HiX } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: ROLES.CITIZEN,
    department: '',
    ward: '',
  });

  // Filters State
  const [filters, setFilters] = useState({
    role: '',
    isActive: '',
    search: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, [filters.role, filters.isActive]);

  const fetchUsers = async () => {
    try {
      const params = {
        role: filters.role || undefined,
        isActive: filters.isActive !== '' ? filters.isActive : undefined,
      };
      const res = await userService.getAll(params);
      setUsers(res.data.users || []);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data.departments || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      await userService.update(id, { isActive: !currentStatus });
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (err) {
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
          <h1>User Management</h1>
          <p className="user-mgmt__subtitle">Manage city personnel, officials, and system actors</p>
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
                    <td>{u.phone || '—'}</td>
                    <td>
                      <span className={`status-dot ${u.isActive ? 'status-dot--active' : 'status-dot--inactive'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <button
                        className={`action-btn ${u.isActive ? 'action-btn--deactivate' : 'action-btn--activate'}`}
                        onClick={() => toggleUserStatus(u._id, u.isActive)}
                        title={u.isActive ? 'Deactivate Account' : 'Activate Account'}
                      >
                        {u.isActive ? <HiX /> : <HiCheck />}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="user-mgmt__empty">
                    No personnel found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card animate-scale-in">
            <div className="modal-header">
              <h2>Add Municipal Personnel</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="name" value={form.name} onChange={handleInputChange} required placeholder="e.g. Sanjay Verma" />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" name="email" value={form.email} onChange={handleInputChange} required placeholder="sanjay@nagaram.city" />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleInputChange} placeholder="10-digit number" />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" name="password" value={form.password} onChange={handleInputChange} required placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select name="role" value={form.role} onChange={handleInputChange} required>
                    {Object.entries(ROLE_LABELS).map(([key, val]) => (
                      <option key={key} value={key}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Department Assignment</label>
                  <select name="department" value={form.department} onChange={handleInputChange}>
                    <option value="">No Department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Ward (Optional)</label>
                  <input type="number" name="ward" value={form.ward} onChange={handleInputChange} placeholder="Ward number" />
                </div>
              </div>

              <div className="modal-actions">
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
