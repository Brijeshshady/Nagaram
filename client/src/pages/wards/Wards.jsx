import { useState, useEffect } from 'react';
import { wardService } from '../../services/dataService';
import { HiPlus, HiPencil, HiTrash, HiX } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import './Wards.css';

const Wards = () => {
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    number: '',
    population: '',
  });

  useEffect(() => {
    fetchWards();
  }, []);

  const fetchWards = async () => {
    try {
      const res = await wardService.getAll();
      setWards(res.data.wards || []);
    } catch {
      toast.error('Failed to load wards');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleOpenEdit = (ward) => {
    setEditingId(ward._id);
    setForm({
      name: ward.name,
      number: ward.number,
      population: ward.population || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await wardService.update(editingId, form);
        toast.success('Ward updated successfully');
      } else {
        await wardService.create(form);
        toast.success('Ward created successfully');
      }
      setShowModal(false);
      setEditingId(null);
      setForm({ name: '', number: '', population: '' });
      fetchWards();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this ward?')) {
      try {
        await wardService.delete(id);
        toast.success('Ward deactivated');
        fetchWards();
      } catch {
        toast.error('Deactivation failed');
      }
    }
  };

  return (
    <div className="wards-page animate-fade-in">
      <div className="wards-page__header">
        <div>
          <h1>Ward Configurations</h1>
          <p className="wards-page__subtitle">Configure administrative wards, municipal limits, and local population stats</p>
        </div>
        <button className="wards-page__add-btn" onClick={() => { setEditingId(null); setShowModal(true); }}>
          <HiPlus /> Add Ward
        </button>
      </div>

      {loading ? (
        <div className="wards-page__loading">
          <div className="animate-spin" />
        </div>
      ) : (
        <div className="wards-grid">
          {wards.map((w) => (
            <div key={w._id} className="ward-card glass-card">
              <div className="ward-card__header">
                <div>
                  <h3>{w.name}</h3>
                  <span className="ward-card__number">Ward Number {w.number}</span>
                </div>
                <div className="ward-card__actions">
                  <button onClick={() => handleOpenEdit(w)} title="Edit"><HiPencil /></button>
                  {w.isActive !== false && (
                    <button onClick={() => handleDelete(w._id)} title="Deactivate" className="btn-delete"><HiTrash /></button>
                  )}
                </div>
              </div>
              <div className="ward-card__footer">
                <span className="pop-label">Population Index</span>
                <p className="pop-value">{w.population ? w.population.toLocaleString('en-IN') : '—'}</p>
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
              <h2>{editingId ? 'Edit Ward' : 'Create Ward'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Ward Name</label>
                <input type="text" name="name" value={form.name} onChange={handleInputChange} required placeholder="e.g. Indiranagar East" />
              </div>
              <div className="form-group">
                <label>Ward Number</label>
                <input type="number" name="number" value={form.number} onChange={handleInputChange} required placeholder="e.g. 4" disabled={!!editingId} />
              </div>
              <div className="form-group">
                <label>Population Size (Optional)</label>
                <input type="number" name="population" value={form.population} onChange={handleInputChange} placeholder="e.g. 45000" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">{editingId ? 'Save Changes' : 'Create Ward'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wards;
