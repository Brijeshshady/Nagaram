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
  const [expandedWards, setExpandedWards] = useState({});

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
    let { name, value } = e.target;
    if (name === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setForm({ ...form, [name]: value });
  };

  const handleEditInputChange = (e) => {
    let { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;
    if (name === 'phone') {
      finalValue = finalValue.replace(/\D/g, '').slice(0, 10);
    }
    setEditForm({ ...editForm, [name]: finalValue });
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

  const getWardStats = (wardId) => {
    if (!wardId) return null;
    const wardUsers = users.filter(u => u.ward && (u.ward._id === wardId || u.ward === wardId));
    const councillor = wardUsers.find(u => u.role === ROLES.WARD_COUNCILLOR);
    const supervisors = wardUsers.filter(u => u.role === ROLES.SUPERVISOR);
    const workersCount = wardUsers.filter(u => u.role === ROLES.FIELD_WORKER).length;
    return {
      councillor,
      supervisors,
      workersCount,
      totalStaff: wardUsers.length
    };
  };

  const getReportingHierarchy = (wardId, role, departmentId) => {
    if (!wardId) return 'No ward selected';
    if (!role) return 'No role selected';
    const wardUsers = users.filter(u => u.ward && (u.ward._id === wardId || u.ward === wardId));
    if (role === ROLES.WARD_COUNCILLOR) {
      const admin = users.find(u => u.role === ROLES.SUPER_ADMIN);
      return `City Commissioner / Municipal Administrator (${admin?.name || 'Admin'})`;
    }
    if (role === ROLES.SUPERVISOR) {
      if (!departmentId) return 'Select a department to see reporting manager';
      const manager = users.find(u => u.role === ROLES.DEPT_MANAGER && u.department && (u.department._id === departmentId || u.department === departmentId));
      return manager ? `Department Manager: ${manager.name} (${manager.email})` : 'No Department Manager assigned yet';
    }
    if (role === ROLES.FIELD_WORKER) {
      if (!departmentId) return 'Select a department to see supervisor';
      const supervisor = wardUsers.find(u => u.role === ROLES.SUPERVISOR && u.department && (u.department._id === departmentId || u.department === departmentId));
      if (supervisor) {
        return `Field Supervisor: ${supervisor.name} in this Ward`;
      } else {
        const manager = users.find(u => u.role === ROLES.DEPT_MANAGER && u.department && (u.department._id === departmentId || u.department === departmentId));
        return manager ? `Department Manager: ${manager.name} (Direct - No Supervisor in Ward)` : 'No active Supervisor or Manager found for this department';
      }
    }
    return 'Works under Municipal Administration';
  };

  const filteredUsers = users.filter((u) => {
    const query = filters.search.toLowerCase().trim();
    if (!query) return true;

    const nameMatch = u.name ? u.name.toLowerCase().includes(query) : false;
    const emailMatch = u.email ? u.email.toLowerCase().includes(query) : false;
    const phoneMatch = u.phone ? u.phone.includes(query) : false;
    
    const wardName = u.ward?.name ? u.ward.name.toLowerCase().includes(query) : false;
    const wardNum = u.ward?.number ? String(u.ward.number).includes(query) : false;
    const deptName = u.department?.name ? u.department.name.toLowerCase().includes(query) : false;
    
    const roleLabel = u.role && ROLE_LABELS[u.role] ? ROLE_LABELS[u.role].toLowerCase().includes(query) : false;
    const roleCode = u.role ? u.role.toLowerCase().includes(query) : false;

    return nameMatch || emailMatch || phoneMatch || wardName || wardNum || deptName || roleLabel || roleCode;
  });

  const toggleWard = (wardName) => {
    setExpandedWards(prev => ({ ...prev, [wardName]: !prev[wardName] }));
  };

  const groupedUsers = filteredUsers.reduce((groups, user) => {
    const wardName = user.ward ? `${user.ward.name} (Ward ${user.ward.number})` : 'Unassigned / No Ward';
    if (!groups[wardName]) {
      groups[wardName] = [];
    }
    groups[wardName].push(user);
    return groups;
  }, {});

  const sortedWardGroups = Object.entries(groupedUsers).sort(([nameA], [nameB]) => {
    if (nameA === 'Unassigned / No Ward') return 1;
    if (nameB === 'Unassigned / No Ward') return -1;
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <div className="user-mgmt animate-fade-in">
      <div className="user-mgmt__header">
        <div>
          <h1>User Management & Moderation</h1>
          <p className="user-mgmt__subtitle">Manage city personnel, roles, department assignments, and account access</p>
        </div>
        <button className="user-mgmt__add-btn" onClick={() => setShowAddModal(true)}>
          <HiUserAdd /> Add Municipal User
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="user-mgmt__toolbar glass-card">
        <div className="search-bar">
          <HiSearch className="search-bar__icon" />
          <input
            type="text"
            placeholder="Search by name, email, phone, ward, role..."
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

      {/* Users Grouped by Ward */}
      {loading ? (
        <div className="user-mgmt__loading">
          <div className="animate-spin" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="user-mgmt__table-wrapper glass-card">
          <div className="user-mgmt__empty">No personnel found matching filters.</div>
        </div>
      ) : (
        <div className="ward-groups-container">
          {sortedWardGroups.map(([wardName, wardUsers]) => {
            const isExpanded = expandedWards[wardName] !== false;
            return (
              <div key={wardName} className="ward-group-section" style={{ marginBottom: '24px' }}>
                <div 
                  className="ward-group-header" 
                  onClick={() => toggleWard(wardName)} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-sm)',
                    marginBottom: '8px',
                    userSelect: 'none',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>📍</span>
                    <span>{wardName}</span>
                    <span style={{ 
                      fontSize: '11px', 
                      background: 'var(--bg-tertiary)', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      color: 'var(--text-muted)',
                      fontWeight: 600
                    }}>
                      {wardUsers.length} {wardUsers.length === 1 ? 'User' : 'Users'}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>

                {isExpanded && (
                  <div className="user-mgmt__table-wrapper glass-card" style={{ marginTop: '4px', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
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
                        {wardUsers.map((u) => (
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
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
                  <label>Ward Assignment</label>
                  <select name="ward" value={editForm.ward} onChange={handleEditInputChange} required>
                    <option value="">Select a Ward...</option>
                    {wards.map((w) => (
                      <option key={w._id} value={w._id}>{w.name} (Ward {w.number})</option>
                    ))}
                  </select>
                </div>

                {editForm.ward && (() => {
                  const stats = getWardStats(editForm.ward);
                  const reportingLine = getReportingHierarchy(editForm.ward, editForm.role, editForm.department);
                  if (!stats) return null;
                  return (
                    <div className="ward-info-panel" style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontSize: '13px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📊 Ward Status & Hierarchy</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>Ward Councillor</span>
                          {stats.councillor ? (
                            <span style={{ color: 'var(--status-error)', fontWeight: 600 }}>🔴 Occupied ({stats.councillor.name})</span>
                          ) : (
                            <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>🟢 Available (Vacant)</span>
                          )}
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>Field Personnel</span>
                          <span style={{ fontWeight: 600 }}>
                            👥 {stats.supervisors.length} Supervisors | {stats.workersCount} Workers
                          </span>
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>Reporting Line (Works Under)</span>
                        <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                          💼 {reportingLine}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Full Name</label>
                  <input type="text" name="name" value={editForm.name} onChange={handleEditInputChange} required />
                </div>

                <div className="form-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Phone Number</label>
                    <input type="tel" name="phone" value={editForm.phone} onChange={handleEditInputChange} pattern="[0-9]{10}" maxLength="10" placeholder="10-digit number" />
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
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px', marginBottom: 0 }}>
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
              <h2>Add Municipal User</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Ward Assignment</label>
                  <select name="ward" value={form.ward} onChange={handleInputChange} required>
                    <option value="">Select a Ward...</option>
                    {wards.map((w) => (
                      <option key={w._id} value={w._id}>{w.name} (Ward {w.number})</option>
                    ))}
                  </select>
                </div>

                {form.ward && (() => {
                  const stats = getWardStats(form.ward);
                  const reportingLine = getReportingHierarchy(form.ward, form.role, form.department);
                  if (!stats) return null;
                  return (
                    <div className="ward-info-panel" style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontSize: '13px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📊 Ward Status & Hierarchy</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>Ward Councillor</span>
                          {stats.councillor ? (
                            <span style={{ color: 'var(--status-error)', fontWeight: 600 }}>🔴 Occupied ({stats.councillor.name})</span>
                          ) : (
                            <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>🟢 Available (Vacant)</span>
                          )}
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>Field Personnel</span>
                          <span style={{ fontWeight: 600 }}>
                            👥 {stats.supervisors.length} Supervisors | {stats.workersCount} Workers
                          </span>
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>Reporting Line (Works Under)</span>
                        <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                          💼 {reportingLine}
                        </span>
                      </div>
                    </div>
                  );
                })()}

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
                    <input type="tel" name="phone" value={form.phone} onChange={handleInputChange} pattern="[0-9]{10}" maxLength="10" placeholder="10-digit number" />
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

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Department Assignment</label>
                  <select name="department" value={form.department} onChange={handleInputChange}>
                    <option value="">No Department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
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
