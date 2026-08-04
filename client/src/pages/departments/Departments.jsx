import { useState, useEffect } from 'react';
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

  // Form State
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    managerId: '',
  });

  useEffect(() => {
    fetchDepartments();
    fetchManagers();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data.departments || []);
    } catch {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await userService.getAll({ role: ROLES.DEPT_MANAGER });
      setManagers(res.data.users || []);
    } catch {
      console.error('Failed to load managers');
    }
  };

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
          <p className="departments-page__subtitle">Configure routing domains, SLA weights, and manager delegations</p>
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
              <div className="dept-card__footer">
                <span className="manager-label">Assigned Manager</span>
                <p className="manager-name">{d.managerId?.name || 'Unassigned'}</p>
              </div>
            </div>
          ))}
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
