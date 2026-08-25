import { useState, useEffect, useCallback, useMemo } from 'react';
import { userService, departmentService, wardService } from '../../services/dataService';
import { ROLES, ROLE_LABELS, ROLE_COLORS } from '../../utils/constants';
import {
  HiUserAdd, HiFilter, HiSearch, HiCheck, HiX, HiPencil,
  HiChevronUp, HiChevronDown, HiSelector, HiTrash, HiRefresh,
  HiChevronLeft, HiChevronRight, HiEye,
} from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import './UserManagement.css';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const EMPTY_FORM = {
  name: '', email: '', phone: '', password: '',
  role: ROLES.CITIZEN, department: '', ward: '',
};

const EMPTY_EDIT = {
  name: '', phone: '', role: ROLES.CITIZEN,
  department: '', ward: '', isActive: true,
};

const SortIcon = ({ col, sortKey, dir }) => {
  if (sortKey !== col) return <HiSelector className="sort-icon sort-icon--neutral" />;
  return dir === 'asc'
    ? <HiChevronUp className="sort-icon sort-icon--active" />
    : <HiChevronDown className="sort-icon sort-icon--active" />;
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // user obj to toggle status

  // Forms
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [formErrors, setFormErrors] = useState({});

  // Filters & Sort & Pagination
  const [filters, setFilters] = useState({
    search: '', role: '', isActive: '', department: '', ward: '',
  });
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Selection
  const [selected, setSelected] = useState(new Set());

  // ── Data Fetching ────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        role: filters.role || undefined,
        isActive: filters.isActive !== '' ? filters.isActive : undefined,
      };
      const res = await userService.getAll(params);
      setUsers(res.data.users || []);
    } catch {
      setError('Failed to load users. Please try again.');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [filters.role, filters.isActive]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data.departments || []);
    } catch (err) { console.error(err); }
  }, []);

  const fetchWards = useCallback(async () => {
    try {
      const res = await wardService.getAll();
      setWards(res.data.wards || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
    fetchWards();
  }, [fetchUsers, fetchDepartments, fetchWards]);

  // Reset page when filters change
  useEffect(() => { setPage(1); setSelected(new Set()); }, [filters, sort]);

  // Global Escape key listener to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (viewingUser) setViewingUser(null);
        else if (editingUser) setEditingUser(null);
        else if (showAddModal) setShowAddModal(false);
        else if (deleteConfirm) setDeleteConfirm(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingUser, editingUser, showAddModal, deleteConfirm]);

  // ── Ward/Hierarchy Helpers ───────────────────────────────
  const getWardStats = (wardId) => {
    if (!wardId) return null;
    const wardUsers = users.filter(u => u.ward && (u.ward._id === wardId || u.ward === wardId));
    return {
      councillor: wardUsers.find(u => u.role === ROLES.WARD_COUNCILLOR),
      supervisors: wardUsers.filter(u => u.role === ROLES.SUPERVISOR),
      workersCount: wardUsers.filter(u => u.role === ROLES.FIELD_WORKER).length,
      totalStaff: wardUsers.length,
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
      if (supervisor) return `Field Supervisor: ${supervisor.name} in this Ward`;
      const manager = users.find(u => u.role === ROLES.DEPT_MANAGER && u.department && (u.department._id === departmentId || u.department === departmentId));
      return manager ? `Department Manager: ${manager.name} (Direct - No Supervisor in Ward)` : 'No active Supervisor or Manager found';
    }
    return 'Works under Municipal Administration';
  };

  // ── Filter + Sort + Paginate ─────────────────────────────
  const filteredUsers = useMemo(() => {
    const query = filters.search.toLowerCase().trim();
    return users.filter(u => {
      // Text search
      if (query) {
        const matches =
          (u.name?.toLowerCase().includes(query)) ||
          (u.email?.toLowerCase().includes(query)) ||
          (u.phone?.includes(query)) ||
          (u.ward?.name?.toLowerCase().includes(query)) ||
          (String(u.ward?.number || '').includes(query)) ||
          (u.department?.name?.toLowerCase().includes(query)) ||
          (ROLE_LABELS[u.role]?.toLowerCase().includes(query));
        if (!matches) return false;
      }
      // Department filter
      if (filters.department) {
        const deptId = u.department?._id || u.department;
        if (deptId !== filters.department) return false;
      }
      // Ward filter
      if (filters.ward) {
        const wardId = u.ward?._id || u.ward;
        if (wardId !== filters.ward) return false;
      }
      return true;
    });
  }, [users, filters]);

  const sortedUsers = useMemo(() => {
    const arr = [...filteredUsers];
    arr.sort((a, b) => {
      let va, vb;
      switch (sort.key) {
        case 'name': va = a.name || ''; vb = b.name || ''; break;
        case 'role': va = ROLE_LABELS[a.role] || ''; vb = ROLE_LABELS[b.role] || ''; break;
        case 'department': va = a.department?.name || ''; vb = b.department?.name || ''; break;
        case 'status': va = a.isActive ? 1 : 0; vb = b.isActive ? 1 : 0; break;
        case 'joined': va = new Date(a.createdAt || 0); vb = new Date(b.createdAt || 0); break;
        default: va = ''; vb = '';
      }
      if (va < vb) return sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredUsers, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const pagedUsers = sortedUsers.slice((page - 1) * pageSize, page * pageSize);

  const hasActiveFilters = filters.search || filters.role || filters.isActive || filters.department || filters.ward;

  const clearFilters = () => {
    setFilters({ search: '', role: '', isActive: '', department: '', ward: '' });
  };

  // ── Sort Handler ─────────────────────────────────────────
  const handleSort = (key) => {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' }
    );
  };

  // ── Selection ────────────────────────────────────────────
  const allPageSelected = pagedUsers.length > 0 && pagedUsers.every(u => selected.has(u._id));
  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allPageSelected) { pagedUsers.forEach(u => next.delete(u._id)); }
      else { pagedUsers.forEach(u => next.add(u._id)); }
      return next;
    });
  };
  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Form Handlers ────────────────────────────────────────
  const validateForm = (f, isEdit = false) => {
    const errs = {};
    if (!f.name?.trim()) errs.name = 'Name is required';
    if (!isEdit) {
      if (!f.email?.trim()) errs.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errs.email = 'Invalid email';
      if (!f.password || f.password.length < 6) errs.password = 'Min 6 characters';
    }
    if (f.phone && !/^\d{10}$/.test(f.phone)) errs.phone = 'Must be 10 digits';
    return errs;
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'phone') value = value.replace(/\D/g, '').slice(0, 10);
    setForm(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleEditInputChange = (e) => {
    let { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;
    if (name === 'phone') finalValue = String(finalValue).replace(/\D/g, '').slice(0, 10);
    setEditForm(prev => ({ ...prev, [name]: finalValue }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
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
    setFormErrors({});
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    try {
      const payload = { ...form };
      if (!payload.department) delete payload.department;
      if (!payload.ward) delete payload.ward;
      await userService.create(payload);
      toast.success('User created successfully');
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      setFormErrors({});
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    const errs = validateForm(editForm, true);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    try {
      await userService.update(editingUser._id, editForm);
      toast.success('User updated successfully');
      setEditingUser(null);
      setFormErrors({});
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await userService.update(user._id, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`);
      setDeleteConfirm(null);
      fetchUsers();
    } catch {
      toast.error('Failed to update user status');
    }
  };

  // ── Ward Info Panel ──────────────────────────────────────
  const WardInfoPanel = ({ wardId, role, departmentId }) => {
    const stats = getWardStats(wardId);
    if (!stats) return null;
    const reportingLine = getReportingHierarchy(wardId, role, departmentId);
    return (
      <div className="ward-info-panel">
        <div className="ward-info-panel__title">📊 Ward Status & Hierarchy</div>
        <div className="ward-info-panel__grid">
          <div>
            <span className="ward-info-panel__label">Ward Councillor</span>
            {stats.councillor
              ? <span className="ward-info-panel__value ward-info-panel__value--occupied">🔴 Occupied ({stats.councillor.name})</span>
              : <span className="ward-info-panel__value ward-info-panel__value--vacant">🟢 Vacant</span>
            }
          </div>
          <div>
            <span className="ward-info-panel__label">Field Personnel</span>
            <span className="ward-info-panel__value">👥 {stats.supervisors.length} Sup · {stats.workersCount} Workers</span>
          </div>
        </div>
        <div className="ward-info-panel__reporting">
          <span className="ward-info-panel__label">Reporting Line</span>
          <span className="ward-info-panel__value ward-info-panel__value--reporting">💼 {reportingLine}</span>
        </div>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="user-mgmt animate-fade-in">

      {/* ── Header ── */}
      <div className="user-mgmt__header">
        <div>
          <h1>User Management</h1>
          <p className="user-mgmt__subtitle">Manage city personnel, roles, department assignments, and account access</p>
        </div>
        <button className="user-mgmt__add-btn" onClick={() => { setShowAddModal(true); setForm(EMPTY_FORM); setFormErrors({}); }}>
          <HiUserAdd /> Add User
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="user-mgmt__toolbar">
        {/* Search */}
        <div className="um-search">
          <HiSearch className="um-search__icon" />
          <input
            type="text"
            className="um-search__input"
            placeholder="Search name, email, phone, ward, role…"
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
          />
          {filters.search && (
            <button className="um-search__clear" onClick={() => setFilters(f => ({ ...f, search: '' }))}>
              <HiX />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="um-filters">
          <select
            className="um-select"
            value={filters.role}
            onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))}
          >
            <option value="">All Roles</option>
            {Object.entries(ROLE_LABELS).map(([key, val]) => (
              <option key={key} value={key}>{val}</option>
            ))}
          </select>

          <select
            className="um-select"
            value={filters.isActive}
            onChange={(e) => setFilters(f => ({ ...f, isActive: e.target.value }))}
          >
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <select
            className="um-select"
            value={filters.department}
            onChange={(e) => setFilters(f => ({ ...f, department: e.target.value }))}
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>

          <select
            className="um-select"
            value={filters.ward}
            onChange={(e) => setFilters(f => ({ ...f, ward: e.target.value }))}
          >
            <option value="">All Wards</option>
            {wards.map(w => (
              <option key={w._id} value={w._id}>{w.name} (Ward {w.number})</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button className="um-clear-btn" onClick={clearFilters} title="Clear all filters">
              <HiRefresh /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Results Meta ── */}
      <div className="user-mgmt__meta">
        <span className="user-mgmt__count">
          {loading ? 'Loading…' : (
            <>
              <strong>{sortedUsers.length}</strong> {sortedUsers.length === 1 ? 'user' : 'users'}
              {users.length !== sortedUsers.length && <span className="user-mgmt__count-total"> of {users.length} total</span>}
            </>
          )}
        </span>
        {selected.size > 0 && (
          <div className="user-mgmt__bulk">
            <span>{selected.size} selected</span>
            <button className="um-bulk-btn um-bulk-btn--deactivate" onClick={() => {
              if (window.confirm(`Deactivate ${selected.size} selected user(s)?`)) {
                Promise.all([...selected].map(id => {
                  const u = users.find(x => x._id === id);
                  if (u?.isActive) return userService.update(id, { isActive: false });
                  return Promise.resolve();
                })).then(() => { toast.success('Bulk update done'); setSelected(new Set()); fetchUsers(); })
                  .catch(() => toast.error('Bulk update partially failed'));
              }
            }}>Deactivate Selected</button>
          </div>
        )}
        <div className="user-mgmt__page-size">
          Show
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="um-page-size-select">
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          per page
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="user-mgmt__loading"><div className="animate-spin" /></div>
      ) : error ? (
        <div className="user-mgmt__error glass-card">
          <span>⚠️ {error}</span>
          <button className="um-retry-btn" onClick={fetchUsers}><HiRefresh /> Retry</button>
        </div>
      ) : sortedUsers.length === 0 ? (
        <div className="user-mgmt__empty glass-card">
          <div className="user-mgmt__empty-icon">👤</div>
          <p className="user-mgmt__empty-title">No users found</p>
          <p className="user-mgmt__empty-sub">
            {hasActiveFilters ? 'Try adjusting your filters.' : 'Add your first user to get started.'}
          </p>
          {hasActiveFilters && (
            <button className="um-clear-btn" onClick={clearFilters}><HiRefresh /> Clear Filters</button>
          )}
        </div>
      ) : (
        <div className="user-mgmt__table-wrapper glass-card">
          <table className="user-mgmt__table">
            <thead>
              <tr>
                <th className="th-check">
                  <input
                    type="checkbox"
                    className="um-checkbox"
                    checked={allPageSelected}
                    onChange={toggleAll}
                    aria-label="Select all on page"
                  />
                </th>
                <th className="th-sortable" onClick={() => handleSort('name')}>
                  Name <SortIcon col="name" sortKey={sort.key} dir={sort.dir} />
                </th>
                <th className="th-sortable" onClick={() => handleSort('role')}>
                  Role <SortIcon col="role" sortKey={sort.key} dir={sort.dir} />
                </th>
                <th className="th-sortable" onClick={() => handleSort('department')}>
                  Department <SortIcon col="department" sortKey={sort.key} dir={sort.dir} />
                </th>
                <th>Ward</th>
                <th>Phone</th>
                <th className="th-sortable" onClick={() => handleSort('status')}>
                  Status <SortIcon col="status" sortKey={sort.key} dir={sort.dir} />
                </th>
                <th className="th-sortable" onClick={() => handleSort('joined')}>
                  Joined <SortIcon col="joined" sortKey={sort.key} dir={sort.dir} />
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((u) => (
                <tr key={u._id} className={selected.has(u._id) ? 'row--selected' : ''}>
                  <td className="td-check">
                    <input
                      type="checkbox"
                      className="um-checkbox"
                      checked={selected.has(u._id)}
                      onChange={() => toggleOne(u._id)}
                      aria-label={`Select ${u.name}`}
                    />
                  </td>
                  <td>
                    <div className="user-cell" onClick={() => setViewingUser(u)} style={{ cursor: 'pointer' }}>
                      <div
                        className="user-cell__avatar"
                        style={{ background: `${ROLE_COLORS[u.role] || '#ef4444'}18`, color: ROLE_COLORS[u.role] || '#ef4444' }}
                      >
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="user-cell__name">{u.name}</p>
                        <p className="user-cell__email">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className="role-badge"
                      style={{
                        color: ROLE_COLORS[u.role] || '#ef4444',
                        borderColor: `${ROLE_COLORS[u.role] || '#ef4444'}30`,
                        background: `${ROLE_COLORS[u.role] || '#ef4444'}0d`,
                      }}
                    >
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="td-secondary">{u.department?.name || '—'}</td>
                  <td className="td-secondary">{u.ward ? `${u.ward.name} (${u.ward.number})` : '—'}</td>
                  <td className="td-secondary">{u.phone || '—'}</td>
                  <td>
                    <span className={`status-pill ${u.isActive ? 'status-pill--active' : 'status-pill--inactive'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="td-secondary">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="row-action-btn"
                        onClick={() => setViewingUser(u)}
                        title="View details"
                        aria-label={`View ${u.name}`}
                      >
                        <HiEye />
                      </button>
                      <button
                        className="row-action-btn"
                        onClick={() => openEditModal(u)}
                        title="Edit user"
                        aria-label={`Edit ${u.name}`}
                      >
                        <HiPencil />
                      </button>
                      <button
                        className={`row-action-btn ${u.isActive ? 'row-action-btn--danger' : 'row-action-btn--success'}`}
                        onClick={() => setDeleteConfirm(u)}
                        title={u.isActive ? 'Deactivate account' : 'Activate account'}
                        aria-label={`${u.isActive ? 'Deactivate' : 'Activate'} ${u.name}`}
                      >
                        {u.isActive ? <HiTrash /> : <HiCheck />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && !error && sortedUsers.length > 0 && (
        <div className="user-mgmt__pagination">
          <span className="pagination__info">
            Page {page} of {totalPages} · {sortedUsers.length} results
          </span>
          <div className="pagination__controls">
            <button
              className="pagination__btn"
              onClick={() => setPage(1)}
              disabled={page === 1}
              aria-label="First page"
            >«</button>
            <button
              className="pagination__btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <HiChevronLeft />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p;
              if (totalPages <= 5) p = i + 1;
              else if (page <= 3) p = i + 1;
              else if (page >= totalPages - 2) p = totalPages - 4 + i;
              else p = page - 2 + i;
              return (
                <button
                  key={p}
                  className={`pagination__btn ${p === page ? 'pagination__btn--active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}
            <button
              className="pagination__btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              <HiChevronRight />
            </button>
            <button
              className="pagination__btn"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              aria-label="Last page"
            >»</button>
          </div>
        </div>
      )}

      {/* ── Delete/Status Confirm Modal ── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-card modal-card--sm animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{deleteConfirm.isActive ? 'Deactivate Account' : 'Activate Account'}</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}><HiX /></button>
            </div>
            <div className="modal-body">
              <p className="confirm-text">
                Are you sure you want to <strong>{deleteConfirm.isActive ? 'deactivate' : 'activate'}</strong> the account for{' '}
                <strong>{deleteConfirm.name}</strong>?
                {deleteConfirm.isActive && ' They will lose access to the platform immediately.'}
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className={`btn-submit ${deleteConfirm.isActive ? 'btn-submit--danger' : ''}`}
                onClick={() => handleToggleStatus(deleteConfirm)}
              >
                {deleteConfirm.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── User Details Modal ── */}
      {viewingUser && (
        <div className="modal-overlay" onClick={() => setViewingUser(null)}>
          <div
            className="modal-card modal-card--detail animate-scale-in"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-details-title"
          >
            <div className="modal-header">
              <h2 id="user-details-title">User Details</h2>
              <button
                className="modal-close"
                onClick={() => setViewingUser(null)}
                aria-label="Close user details dialog"
                title="Close"
              >
                <HiX />
              </button>
            </div>
            <div className="modal-body user-detail">
              <div className="user-detail__hero">
                <div
                  className="user-detail__avatar"
                  style={{
                    background: `${ROLE_COLORS[viewingUser.role] || '#ef4444'}18`,
                    color: ROLE_COLORS[viewingUser.role] || '#ef4444',
                    border: `2px solid ${ROLE_COLORS[viewingUser.role] || '#ef4444'}40`
                  }}
                >
                  {viewingUser.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="user-detail__hero-info">
                  <div className="user-detail__name-row">
                    <p className="user-detail__name">{viewingUser.name}</p>
                    <span
                      className="role-badge"
                      style={{
                        color: ROLE_COLORS[viewingUser.role] || '#ef4444',
                        borderColor: `${ROLE_COLORS[viewingUser.role] || '#ef4444'}30`,
                        background: `${ROLE_COLORS[viewingUser.role] || '#ef4444'}0d`,
                      }}
                    >
                      {ROLE_LABELS[viewingUser.role] || viewingUser.role}
                    </span>
                  </div>
                  <p className="user-detail__email">{viewingUser.email}</p>
                </div>
              </div>

              <div className="user-detail__grid">
                <div className="user-detail__tile">
                  <span className="user-detail__label">Phone Number</span>
                  <span className="user-detail__value">{viewingUser.phone || '—'}</span>
                </div>
                <div className="user-detail__tile">
                  <span className="user-detail__label">Account Status</span>
                  <span className={`status-pill ${viewingUser.isActive ? 'status-pill--active' : 'status-pill--inactive'}`}>
                    {viewingUser.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="user-detail__tile">
                  <span className="user-detail__label">Department</span>
                  <span className="user-detail__value">{viewingUser.department?.name || '—'}</span>
                </div>
                <div className="user-detail__tile">
                  <span className="user-detail__label">Assigned Ward</span>
                  <span className="user-detail__value">
                    {viewingUser.ward ? `${viewingUser.ward.name} (Ward ${viewingUser.ward.number})` : '—'}
                  </span>
                </div>
                <div className="user-detail__tile">
                  <span className="user-detail__label">Member Joined</span>
                  <span className="user-detail__value">
                    {new Date(viewingUser.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="user-detail__tile">
                  <span className="user-detail__label">User System ID</span>
                  <div className="user-detail__id-box">
                    <span className="user-detail__value user-detail__value--mono">{viewingUser._id}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setViewingUser(null)}>
                Close
              </button>
              <button
                className="btn-submit btn-submit--with-icon"
                onClick={() => {
                  const targetUser = viewingUser;
                  setViewingUser(null);
                  openEditModal(targetUser);
                }}
              >
                <HiPencil /> Edit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-card animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit User</h2>
              <button className="modal-close" onClick={() => setEditingUser(null)}><HiX /></button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="modal-body modal-body--form">
                <div className="form-group">
                  <label>Ward Assignment</label>
                  <select name="ward" value={editForm.ward} onChange={handleEditInputChange}>
                    <option value="">Select a Ward…</option>
                    {wards.map(w => <option key={w._id} value={w._id}>{w.name} (Ward {w.number})</option>)}
                  </select>
                </div>

                {editForm.ward && (
                  <WardInfoPanel wardId={editForm.ward} role={editForm.role} departmentId={editForm.department} />
                )}

                <div className="form-group">
                  <label>Full Name <span className="required">*</span></label>
                  <input type="text" name="name" value={editForm.name} onChange={handleEditInputChange} required />
                  {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="tel" name="phone" value={editForm.phone} onChange={handleEditInputChange} maxLength="10" placeholder="10-digit number" />
                    {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
                  </div>
                  <div className="form-group">
                    <label>Role <span className="required">*</span></label>
                    <select name="role" value={editForm.role} onChange={handleEditInputChange} required>
                      {Object.entries(ROLE_LABELS).map(([key, val]) => (
                        <option key={key} value={key}>{val}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Department</label>
                    <select name="department" value={editForm.department} onChange={handleEditInputChange}>
                      <option value="">No Department</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group form-group--checkbox">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={editForm.isActive}
                        onChange={handleEditInputChange}
                        className="um-checkbox"
                      />
                      Active Account Access
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className="btn-submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add User Modal ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Municipal User</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body modal-body--form">
                <div className="form-group">
                  <label>Ward Assignment <span className="required">*</span></label>
                  <select name="ward" value={form.ward} onChange={handleInputChange} required>
                    <option value="">Select a Ward…</option>
                    {wards.map(w => <option key={w._id} value={w._id}>{w.name} (Ward {w.number})</option>)}
                  </select>
                </div>

                {form.ward && (
                  <WardInfoPanel wardId={form.ward} role={form.role} departmentId={form.department} />
                )}

                <div className="form-group">
                  <label>Full Name <span className="required">*</span></label>
                  <input type="text" name="name" value={form.name} onChange={handleInputChange} required placeholder="e.g. Sanjay Verma" />
                  {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Email Address <span className="required">*</span></label>
                    <input type="email" name="email" value={form.email} onChange={handleInputChange} required placeholder="user@nagaram.city" />
                    {formErrors.email && <span className="field-error">{formErrors.email}</span>}
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="tel" name="phone" value={form.phone} onChange={handleInputChange} maxLength="10" placeholder="10-digit number" />
                    {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Password <span className="required">*</span></label>
                    <input type="password" name="password" value={form.password} onChange={handleInputChange} required placeholder="Min 6 characters" />
                    {formErrors.password && <span className="field-error">{formErrors.password}</span>}
                  </div>
                  <div className="form-group">
                    <label>Role <span className="required">*</span></label>
                    <select name="role" value={form.role} onChange={handleInputChange} required>
                      {Object.entries(ROLE_LABELS).map(([key, val]) => (
                        <option key={key} value={key}>{val}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Department Assignment</label>
                  <select name="department" value={form.department} onChange={handleInputChange}>
                    <option value="">No Department</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
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
