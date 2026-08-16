import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import { wardService, departmentService } from '../../services/dataService';
import { HiPlus, HiPencil, HiTrash, HiX } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import './Wards.css';

const mapPolygonCoords = (geojsonCoords) => {
  if (!geojsonCoords || geojsonCoords.length === 0) return [];
  return geojsonCoords[0].map(coord => [coord[1], coord[0]]);
};

const getPolygonCenter = (leafletCoords) => {
  if (!leafletCoords || leafletCoords.length === 0) return [13.0827, 80.2707];
  let latSum = 0;
  let lngSum = 0;
  leafletCoords.forEach(coord => {
    latSum += coord[0];
    lngSum += coord[1];
  });
  return [latSum / leafletCoords.length, lngSum / leafletCoords.length];
};
// Fits the map to a polygon's bounds on mount
const FitBounds = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords), { padding: [6, 6] });
    }
  }, [map, coords]);
  return null;
};

// Real-tile mini-map showing only the ward boundary
const WardMiniMap = ({ geojsonCoords }) => {
  if (!geojsonCoords || geojsonCoords.length === 0) return null;
  const leafletCoords = geojsonCoords[0].map(([lng, lat]) => [lat, lng]);
  if (leafletCoords.length === 0) return null;
  const center = [
    leafletCoords.reduce((s, c) => s + c[0], 0) / leafletCoords.length,
    leafletCoords.reduce((s, c) => s + c[1], 0) / leafletCoords.length,
  ];
  return (
    <MapContainer
      center={center}
      zoom={13}
      zoomControl={false}
      attributionControl={false}
      dragging={false}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      keyboard={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polygon
        positions={leafletCoords}
        pathOptions={{
          color: '#EF4444',
          fillColor: '#EF4444',
          fillOpacity: 0.12,
          weight: 2.5,
        }}
      />
      <FitBounds coords={leafletCoords} />
    </MapContainer>
  );
};

const Wards = () => {
  const [wards, setWards] = useState([]);
  const [showCouncillorModal, setShowCouncillorModal] = useState(false);
  const [selectedCouncillor, setSelectedCouncillor] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);
  const [showWardMapModal, setShowWardMapModal] = useState(false);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    number: '',
    population: '',
    departments: [],
  });

  useEffect(() => {
    fetchWardsData();
  }, []);

  const fetchWardsData = async () => {
    try {
      const [wardsRes, deptsRes] = await Promise.all([
        wardService.getAll(),
        departmentService.getAll(),
      ]);
      setWards(wardsRes.data.wards || []);
      setDepartmentsList(deptsRes.data.departments || []);
    } catch {
      toast.error('Failed to load wards or departments');
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
      departments: ward.departments ? ward.departments.map(d => d._id || d) : [],
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
      setForm({ name: '', number: '', population: '', departments: [] });
      fetchWardsData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this ward?')) {
      try {
        await wardService.delete(id);
        toast.success('Ward deactivated');
        fetchWardsData();
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

              {w.boundaries?.coordinates?.length > 0 && (
                <div className="ward-card__map-wrapper">
                  <WardMiniMap geojsonCoords={w.boundaries.coordinates} />
                </div>
              )}

              <div className="ward-card__departments">
                <span className="dept-section-label">Active Departments</span>
                <div className="ward-dept-tags">
                  {w.departments && w.departments.length > 0 ? (
                    w.departments.map(d => (
                      <span key={d._id} className="ward-dept-tag">
                        {d.name}
                      </span>
                    ))
                  ) : (
                    <span className="ward-dept-tag ward-dept-tag--none">None Assigned</span>
                  )}
                </div>
              </div>
              <div className="ward-card__footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="pop-label">Population Index</span>
                  <p className="pop-value">{w.population ? w.population.toLocaleString('en-IN') : '—'}</p>
                </div>
                {w.councillor && (
                  <div
                    style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px', cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedCouncillor(w.councillor);
                      setShowCouncillorModal(true);
                    }}
                  >
                    <span className="pop-label" style={{ color: '#F59E0B', fontWeight: 600 }}>Ward Councillor</span>
                    <p className="pop-value" style={{ fontSize: '13px', margin: 0 }}>{w.councillor.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{w.councillor.phone || '—'}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>Role: {w.councillor.role}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>Department: {w.councillor.department ? w.councillor.department.name : 'No Department'}</p>


                    <button className="btn-map" style={{ marginTop: '6px' }} onClick={(e) => { e.stopPropagation(); setSelectedWard(w); setShowWardMapModal(true); }}>View Ward Map</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Councillor Profile Modal */}
      {showCouncillorModal && selectedCouncillor && (
        <div className="modal-overlay" onClick={() => setShowCouncillorModal(false)}>
          <div className="modal-card animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ward Councillor Profile</h2>
              <button className="modal-close" onClick={() => setShowCouncillorModal(false)}><HiX /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={selectedCouncillor.name} disabled />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={selectedCouncillor.email} disabled />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" value={selectedCouncillor.phone || ''} disabled />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input type="text" value={selectedCouncillor.department ? selectedCouncillor.department.name : 'No Department'} disabled />
              </div>
              {selectedCouncillor.role && (
                <div className="form-group">
                  <label>Role</label>
                  <input type="text" value={selectedCouncillor.role} disabled />
                </div>
              )}
              {selectedCouncillor.avatar && (
                <div className="form-group">
                  <label>Avatar</label>
                  <img src={selectedCouncillor.avatar} alt="Avatar" style={{ width: '80px', borderRadius: '50%' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Ward Map Modal */}
      {showWardMapModal && selectedWard && (
        <div className="modal-overlay" onClick={() => setShowWardMapModal(false)}>
          <div className="modal-card animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ward Map - {selectedWard.name}</h2>
              <button className="modal-close" onClick={() => setShowWardMapModal(false)}><HiX /></button>
            </div>
            <div className="modal-body" style={{ height: '500px' }}>
              {selectedWard.boundaries && selectedWard.boundaries.coordinates && (
                <MapContainer
                  center={getPolygonCenter(mapPolygonCoords(selectedWard.boundaries.coordinates))}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Polygon
                    positions={mapPolygonCoords(selectedWard.boundaries.coordinates)}
                    pathOptions={{ color: 'var(--accent-primary)', fillColor: 'var(--accent-primary)', fillOpacity: 0.15, weight: 2 }}
                  />
                  <FitBounds coords={mapPolygonCoords(selectedWard.boundaries.coordinates)} />
                </MapContainer>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Ward' : 'Create Ward'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Ward Name</label>
                  <input type="text" name="name" value={form.name} onChange={handleInputChange} required placeholder="e.g. Indiranagar East" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Ward Number</label>
                  <input type="number" name="number" value={form.number} onChange={handleInputChange} required placeholder="e.g. 4" disabled={!!editingId} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Population Size (Optional)</label>
                  <input type="number" name="population" value={form.population} onChange={handleInputChange} placeholder="e.g. 45000" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ marginBottom: '8px', display: 'block' }}>Active Departments in Ward</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', maxHeight: '160px', overflowY: 'auto' }}>
                    {departmentsList.map(dept => {
                      const isChecked = form.departments.includes(dept._id);
                      return (
                        <label key={dept._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', padding: '6px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', userSelect: 'none', transition: 'all 0.15s ease' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...form.departments, dept._id]
                                : form.departments.filter(id => id !== dept._id);
                              setForm({ ...form, departments: updated });
                            }}
                            style={{ accentColor: 'var(--accent-primary)', width: '15px', height: '15px', cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: isChecked ? '600' : '400', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {dept.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: 0 }}>
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
