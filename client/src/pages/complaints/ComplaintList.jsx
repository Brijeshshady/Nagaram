import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { complaintService, wardService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { ROLES, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, CATEGORY_ICONS, timeAgo } from '../../utils/constants';
import { HiSearch, HiFilter, HiPlus, HiMap, HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import './Complaints.css';

// Status → marker color mapping
const STATUS_MARKER = {
  submitted: '#EF4444',
  under_review: '#F59E0B',
  in_progress: '#3B82F6',
  resolved: '#10B981',
  closed: '#6B7280',
  rejected: '#991B1B',
};

// Auto-fit map to ward bounds
const FitWards = ({ wards }) => {
  const map = useMap();
  useEffect(() => {
    const allCoords = [];
    wards.forEach(w => {
      if (w.boundaries?.coordinates?.[0]) {
        w.boundaries.coordinates[0].forEach(([lng, lat]) => allCoords.push([lat, lng]));
      }
    });
    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [20, 20] });
    }
  }, [map, wards]);
  return null;
};

// Mini-map for each complaint card — real tiles + pin at GPS location
const ComplaintMiniMap = ({ lat, lng, status }) => {
  const color = STATUS_MARKER[status] || '#6B7280';
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      zoomControl={false}
      attributionControl={false}
      dragging={false}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      keyboard={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CircleMarker
        center={[lat, lng]}
        radius={8}
        pathOptions={{
          fillColor: color,
          color: '#fff',
          weight: 2,
          fillOpacity: 1,
        }}
      />
    </MapContainer>
  );
};

const ComplaintList = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMap, setShowMap] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filters State
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: '',
  });

  useEffect(() => {
    fetchData();
  }, [filters.status, filters.priority, filters.category]);

  const fetchData = async () => {
    try {
      const params = {
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        category: filters.category || undefined,
      };
      const [complRes, wardsRes] = await Promise.all([
        complaintService.getAll(params),
        wardService.getAll(),
      ]);
      setComplaints(complRes.data.complaints || []);
      setWards(wardsRes.data.wards || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    const query = filters.search.toLowerCase();
    return (
      c.complaintId?.toLowerCase().includes(query) ||
      c.title?.toLowerCase().includes(query) ||
      c.description?.toLowerCase().includes(query) ||
      c.address?.toLowerCase().includes(query)
    );
  });

  // Only complaints that have GPS coordinates
  const mappedComplaints = filteredComplaints.filter(
    c => c.gpsCoordinates?.lat && c.gpsCoordinates?.lng
  );

  return (
    <div className="complaint-list-page animate-fade-in">
      <div className="complaint-list-page__header">
        <div>
          <h1>Complaints</h1>
          <p className="complaint-list-page__subtitle">Track municipal maintenance and civic complaints</p>
        </div>
        {user?.role === ROLES.CITIZEN && (
          <Link to="/complaints/new" className="complaint-list-page__add-btn">
            <HiPlus /> Report Issue
          </Link>
        )}
      </div>

      {/* Toolbar / Filters */}
      <div className="complaint-list-page__toolbar glass-card">
        <div className="search-bar">
          <HiSearch className="search-bar__icon" />
          <input
            type="text"
            placeholder="Search by ID, title, keyword..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        <div className="filters">
          <div className="filter-select">
            <HiFilter className="filter-select__icon" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>

          <div className="filter-select">
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            >
              <option value="">All Priorities</option>
              {Object.entries(PRIORITY_LABELS).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>

          {/* Toggle map button */}
          <button
            className="complaints-map-toggle"
            onClick={() => setShowMap(v => !v)}
            title={showMap ? 'Hide Map' : 'Show Map'}
          >
            <HiMap />
            {showMap ? <HiChevronUp /> : <HiChevronDown />}
            Map View
          </button>
        </div>
      </div>

      {/* Interactive Map Panel */}
      {showMap && (
        <div className="complaints-map-panel glass-card">
          <div className="complaints-map-panel__header">
            <span className="complaints-map-panel__title">📍 Complaints Map</span>
            <div className="complaints-map-legend">
              {Object.entries(STATUS_MARKER).map(([status, color]) => (
                <span key={status} className="legend-item">
                  <span className="legend-dot" style={{ background: color }} />
                  {STATUS_LABELS[status] || status}
                </span>
              ))}
            </div>
          </div>
          <div className="complaints-map-panel__map">
            <MapContainer
              center={[13.0827, 80.2707]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {/* Ward boundary polygons */}
              {wards.map(w =>
                w.boundaries?.coordinates?.length > 0 ? (
                  <Polygon
                    key={w._id}
                    positions={w.boundaries.coordinates[0].map(([lng, lat]) => [lat, lng])}
                    pathOptions={{
                      color: 'var(--accent-primary)',
                      fillColor: 'var(--accent-primary)',
                      fillOpacity: 0.06,
                      weight: 1.5,
                      dashArray: '4 4',
                    }}
                  >
                    <Popup>
                      <strong>{w.name}</strong><br />
                      Ward #{w.number}
                    </Popup>
                  </Polygon>
                ) : null
              )}

              {/* Complaint pins */}
              {mappedComplaints.map(c => (
                <CircleMarker
                  key={c._id}
                  center={[c.gpsCoordinates.lat, c.gpsCoordinates.lng]}
                  radius={7}
                  pathOptions={{
                    fillColor: STATUS_MARKER[c.status] || '#6B7280',
                    color: '#fff',
                    weight: 1.5,
                    fillOpacity: 0.9,
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: '160px' }}>
                      <strong style={{ fontSize: '13px' }}>{c.title}</strong><br />
                      <span style={{ fontSize: '11px', color: '#888' }}>{c.complaintId}</span><br />
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '4px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          background: `${STATUS_MARKER[c.status]}22`,
                          color: STATUS_MARKER[c.status],
                          fontWeight: 600,
                        }}
                      >
                        {STATUS_LABELS[c.status]}
                      </span><br />
                      <span style={{ fontSize: '11px', color: '#666', marginTop: '4px', display: 'block' }}>
                        📍 {c.address || 'No address'}
                      </span>
                      <Link
                        to={`/complaints/${c._id}`}
                        style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600 }}
                      >
                        View Details →
                      </Link>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

              {/* Auto-fit to ward bounds */}
              {wards.length > 0 && <FitWards wards={wards} />}
            </MapContainer>
          </div>

          {/* Map stats bar */}
          <div className="complaints-map-stats">
            <span>🗺️ {wards.length} Wards</span>
            <span>📍 {mappedComplaints.length} Plotted</span>
            <span>📋 {filteredComplaints.length} Total Complaints</span>
          </div>
        </div>
      )}

      {/* List content */}
      {loading ? (
        <div className="complaint-list-page__loading">
          <div className="animate-spin" />
        </div>
      ) : (
        <div className="complaints-grid">
          {filteredComplaints.length > 0 ? (
            filteredComplaints.map((c) => (
              <Link to={`/complaints/${c._id}`} key={c._id} className="complaint-item glass-card">
                <div className="complaint-item__header">
                  <span className="complaint-item__id">{c.complaintId}</span>
                  <span
                    className="complaint-item__status"
                    style={{
                      background: `${STATUS_COLORS[c.status]}15`,
                      color: STATUS_COLORS[c.status],
                    }}
                  >
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>
                <h3 className="complaint-item__title">{c.title}</h3>
                {c.gpsCoordinates?.lat && c.gpsCoordinates?.lng && !isMobile && (
                  <div
                    className="complaint-item__minimap"
                    onClick={e => e.preventDefault()}
                  >
                    <ComplaintMiniMap
                      lat={c.gpsCoordinates.lat}
                      lng={c.gpsCoordinates.lng}
                      status={c.status}
                    />
                  </div>
                )}
                <p className="complaint-item__address">📍 {c.address}</p>
                <div className="complaint-item__footer">
                  <span className="complaint-item__category">
                    {CATEGORY_ICONS[c.category] || '📋'} {c.category?.replace(/_/g, ' ')}
                  </span>
                  <span className="complaint-item__priority" style={{ color: PRIORITY_COLORS[c.priority] }}>
                    ● {c.priority}
                  </span>
                  <span className="complaint-item__date">{timeAgo(c.createdAt)}</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="complaint-list-page__empty glass-card">
              <p>No complaints found matching selection.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComplaintList;


