import { useState, useEffect, useCallback } from 'react';
import { departmentService, userService } from '../../services/dataService';
import { ROLES } from '../../utils/constants';
import { HiPlus, HiPencil, HiTrash, HiX } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import './Departments.css';

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedDeptStaff, setSelectedDeptStaff] = useState(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    managerId: '',
  });

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data.departments || []);
    } catch {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchManagers = useCallback(async () => {
    try {
      const res = await userService.getAll({ role: ROLES.DEPT_MANAGER });
      setManagers(res.data.users || []);
    } catch {
      console.error('Failed to load managers');
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchManagers();
  }, [fetchDepartments, fetchManagers]);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleOpenEdit = (dept) => {
    setEditingId(dept._id);
    setForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      managerId: dept.managerId?._id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await departmentService.update(editingId, form);
        toast.success('Department updated successfully');
      } else {
        await departmentService.create(form);
        toast.success('Department created successfully');
      }
      setShowModal(false);
      setEditingId(null);
      setForm({ name: '', code: '', description: '', managerId: '' });
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this department?')) {
      try {
        await departmentService.delete(id);
        toast.success('Department deactivated');
        fetchDepartments();
      } catch {
        toast.error('Deactivation failed');
      }
    }
  };

  return (
    <div className="departments-page animate-fade-in">
      <div className="departments-page__header">
        <div>
          <h1>Department Configurations</h1>
          <p className="departments-page__subtitle">Configure routing domains, SLA weights, and connected municipal workforce</p>
        </div>
        <button className="departments-page__add-btn" onClick={() => { setEditingId(null); setShowModal(true); }}>
          <HiPlus /> Add Department
        </button>
      </div>

      {loading ? (
        <div className="departments-page__loading">
          <div className="animate-spin" />
        </div>
      ) : (
        <div className="departments-grid">
          {departments.map((d) => (
            <div key={d._id} className="dept-card glass-card">
              <div className="dept-card__header">
                <div>
                  <h3>{d.name}</h3>
                  <span className="dept-card__code">{d.code}</span>
                </div>
                <div className="dept-card__actions">
                  <button onClick={() => handleOpenEdit(d)} title="Edit"><HiPencil /></button>
                  {d.isActive !== false && (
                    <button onClick={() => handleDelete(d._id)} title="Deactivate" className="btn-delete"><HiTrash /></button>
                  )}
                </div>
              </div>

              <p className="dept-card__desc">{d.description || 'No description provided.'}</p>

              {/* Connected Personnel Pill Metrics */}
              <div className="dept-card__staff-summary">
                <span className="staff-pill staff-pill--total">
                  👥 {d.totalStaff || 0} Total Personnel
                </span>
                <span className="staff-pill staff-pill--sup">
                  👔 {d.supervisorsCount || 0} Supervisors
                </span>
                <span className="staff-pill staff-pill--work">
                  🚜 {d.workersCount || 0} Field Workers
                </span>
              </div>

              <div className="dept-card__footer">
                <div>
                  <span className="manager-label">Assigned Manager</span>
                  <p className="manager-name">{d.managerId?.name || 'Unassigned'}</p>
                </div>

                {d.connectedPersonnel && d.connectedPersonnel.length > 0 && (
                  <button
                    type="button"
                    className="btn-view-roster"
                    onClick={() => setSelectedDeptStaff(d)}
                  >
                    View Roster →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Staff Roster Modal */}
      {selectedDeptStaff && (
        <div className="modal-overlay">
          <div className="modal-card animate-scale-in">
            <div className="modal-header">
              <h2>👥 Connected Roster — {selectedDeptStaff.name}</h2>
              <button className="modal-close" onClick={() => setSelectedDeptStaff(null)}><HiX /></button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                All supervisors and field workers connected to <b>{selectedDeptStaff.name}</b>:
              </p>
              <div className="roster-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {selectedDeptStaff.connectedPersonnel.map((p) => (
                  <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{p.name}</span>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{p.email} • {p.phone || 'No phone'}</p>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', textTransform: 'capitalize' }}>
                      {p.role.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn-cancel" onClick={() => setSelectedDeptStaff(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card animate-scale-in">
            <div className="modal-header">
              <h2>{editingId ? 'Edit Department' : 'Create Department'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Department Name</label>
                <input type="text" name="name" value={form.name} onChange={handleInputChange} required placeholder="e.g. Roads Maintenance" />
              </div>
              <div className="form-group">
                <label>Unique Code</label>
                <input type="text" name="code" value={form.code} onChange={handleInputChange} required placeholder="e.g. roads" disabled={!!editingId} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={form.description} onChange={handleInputChange} rows="3" placeholder="Define scopes and routing rules..." />
              </div>
              <div className="form-group">
                <label>Department Manager</label>
                <select name="managerId" value={form.managerId} onChange={handleInputChange}>
                  <option value="">Select Manager...</option>
                  {managers.map((m) => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">{editingId ? 'Save Changes' : 'Create Department'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
