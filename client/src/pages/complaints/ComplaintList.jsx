import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { complaintService, wardService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import {
  ROLES, STATUS_LABELS, STATUS_COLORS,
  PRIORITY_LABELS, PRIORITY_COLORS,
  CATEGORY_LABELS, CATEGORY_ICONS,
  timeAgo
} from '../../utils/constants';
import {
  HiSearch, HiFilter, HiPlus, HiMap,
  HiChevronDown, HiChevronUp, HiRefresh,
  HiClipboardList
} from 'react-icons/hi';
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
  escalated: '#EF4444',
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

  const fetchData = async () => {
    try {
      setLoading(true);
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
      toast.error('Failed to load complaints data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.status, filters.priority, filters.category]);

  const handleResetFilters = () => {
    setFilters({ status: '', priority: '', category: '', search: '' });
  };

  const filteredComplaints = complaints.filter((c) => {
    const query = filters.search.toLowerCase().trim();
    if (!query) return true;
    return (
      c.complaintId?.toLowerCase().includes(query) ||
      c.title?.toLowerCase().includes(query) ||
      c.description?.toLowerCase().includes(query) ||
      c.address?.toLowerCase().includes(query)
    );
  });

  // Only complaints that have valid numeric GPS coordinates
  const mappedComplaints = filteredComplaints.filter(
    c => c?.gpsCoordinates && !isNaN(parseFloat(c.gpsCoordinates.lat)) && !isNaN(parseFloat(c.gpsCoordinates.lng))
  );

  return (
    <div className="complaint-list-page animate-fade-in">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="complaint-list-page__header">
        <div>
          <h1 className="complaint-list-page__title">Complaints & Incident Logs</h1>
          <p className="complaint-list-page__subtitle">
            Track municipal maintenance, AI routing, and civic issues across Chennai zones
          </p>
        </div>
        {user?.role === ROLES.CITIZEN && (
          <Link to="/complaints/new" className="complaint-list-page__add-btn">
            <HiPlus /> Report Issue
          </Link>
        )}
      </div>

      {/* ── Filter Toolbar ────────────────────────────────── */}
      <div className="complaint-list-page__toolbar glass-card">
        <div className="search-bar">
          <HiSearch className="search-bar__icon" />
          <input
            type="search"
            placeholder="Search by ID, title, address, or keyword..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="search-bar__input"
          />
          {filters.search && (
            <button
              className="search-bar__clear"
              onClick={() => setFilters({ ...filters, search: '' })}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filters">
          {/* Status Filter */}
          <div className="filter-select-wrapper">
            <HiFilter className="filter-select__icon" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="filter-select"
              aria-label="Filter by Status"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
            <HiChevronDown className="filter-select__chevron" />
          </div>

          {/* Priority Filter */}
          <div className="filter-select-wrapper">
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="filter-select"
              aria-label="Filter by Priority"
            >
              <option value="">All Priorities</option>
              {Object.entries(PRIORITY_LABELS).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
            <HiChevronDown className="filter-select__chevron" />
          </div>

          {/* Category Filter */}
          <div className="filter-select-wrapper">
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="filter-select"
              aria-label="Filter by Category"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
            <HiChevronDown className="filter-select__chevron" />
          </div>

          {/* Reset Filters (shown if active) */}
          {(filters.status || filters.priority || filters.category || filters.search) && (
            <button
              className="filter-reset-btn"
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              <HiRefresh /> Reset
            </button>
          )}

          {/* Toggle Map View Button */}
          <button
            className={`complaints-map-toggle ${showMap ? 'complaints-map-toggle--active' : ''}`}
            onClick={() => setShowMap(v => !v)}
            title={showMap ? 'Hide Map' : 'Show Map'}
          >
            <HiMap />
            <span>Map View</span>
            {showMap ? <HiChevronUp /> : <HiChevronDown />}
          </button>
        </div>
      </div>

      {/* ── Interactive Map Panel ─────────────────────────── */}
      {showMap && (
        <div className="complaints-map-panel glass-card animate-fade-in">
          <div className="complaints-map-panel__header">
            <span className="complaints-map-panel__title">📍 Geographic Incident Distribution</span>
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
                  center={[parseFloat(c.gpsCoordinates.lat), parseFloat(c.gpsCoordinates.lng)]}
                  radius={7}
                  pathOptions={{
                    fillColor: STATUS_MARKER[c.status] || '#6B7280',
                    color: '#fff',
                    weight: 1.5,
                    fillOpacity: 0.9,
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: '160px', fontFamily: 'Inter, sans-serif' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{c.title}</strong><br />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.complaintId}</span><br />
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '4px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          background: `${STATUS_MARKER[c.status] || '#6B7280'}22`,
                          color: STATUS_MARKER[c.status] || '#6B7280',
                          fontWeight: 600,
                        }}
                      >
                        {STATUS_LABELS[c.status] || c.status}
                      </span><br />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
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
            <span>🗺️ {wards.length} Wards Tracked</span>
            <span>📍 {mappedComplaints.length} Geo-plotted Incidents</span>
            <span>📋 {filteredComplaints.length} Total Filtered Results</span>
          </div>
        </div>
      )}

      {/* ── Results Info Bar ──────────────────────────────── */}
      <div className="complaints-results-meta">
        <span className="complaints-results-count">
          Showing <strong>{filteredComplaints.length}</strong> of <strong>{complaints.length}</strong> incidents
        </span>
      </div>

      {/* ── Complaints Grid Content ───────────────────────── */}
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
                      background: `${STATUS_COLORS[c.status] || '#6b7280'}18`,
                      color: STATUS_COLORS[c.status] || '#6b7280',
                    }}
                  >
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                </div>
                
                <h3 className="complaint-item__title">{c.title}</h3>

                {c.gpsCoordinates?.lat && c.gpsCoordinates?.lng && !isMobile && !isNaN(parseFloat(c.gpsCoordinates.lat)) && (
                  <div
                    className="complaint-item__minimap"
                    onClick={e => e.preventDefault()}
                  >
                    <ComplaintMiniMap
                      lat={parseFloat(c.gpsCoordinates.lat)}
                      lng={parseFloat(c.gpsCoordinates.lng)}
                      status={c.status}
                    />
                  </div>
                )}

                <p className="complaint-item__address">📍 {c.address || 'Chennai Zone'}</p>

                <div className="complaint-item__footer">
                  <span className="complaint-item__category">
                    {CATEGORY_ICONS[c.category] || '📋'} {CATEGORY_LABELS[c.category] || c.category?.replace(/_/g, ' ')}
                  </span>
                  <span className="complaint-item__priority" style={{ color: PRIORITY_COLORS[c.priority] || '#6b7280' }}>
                    ● {PRIORITY_LABELS[c.priority] || c.priority}
                  </span>
                  <span className="complaint-item__date">{timeAgo(c.createdAt)}</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="complaint-list-page__empty glass-card">
              <HiClipboardList className="empty-icon" />
              <h3>No complaints found</h3>
              <p>Try adjusting your search criteria or filter selections to view matching incidents.</p>
              {(filters.status || filters.priority || filters.category || filters.search) && (
                <button className="btn-reset-empty" onClick={handleResetFilters}>
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComplaintList;
