import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, Polyline } from 'react-leaflet';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { analyticsService, complaintService, dustbinService, routeService } from '../../services/dataService';
import { ROLES, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, CATEGORY_ICONS, timeAgo } from '../../utils/constants';
import { HiClipboardList, HiCheckCircle, HiClock, HiExclamation, HiTrendingUp, HiUsers, HiStar, HiMap, HiOutlineFire } from 'react-icons/hi';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const dustbinIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3299/3299935.png',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

const PIE_COLORS = ['#4f46e5', '#0891b2', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [dailyUpdates, setDailyUpdates] = useState([]);
  const [dustbins, setDustbins] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewHeatmap, setViewHeatmap] = useState(true);
  
  const [newDustbinLocation, setNewDustbinLocation] = useState(null);
  const [showDustbinModal, setShowDustbinModal] = useState(false);
  const [newDustbinData, setNewDustbinData] = useState({ address: '', capacity: 0 });

  // Map center default (Chennai default center)
  const mapCenter = [13.0827, 80.2707];

  // Dummy Heat spots for cleaning density hotspots in Chennai
  const heatSpots = [
    { coords: [13.0827, 80.2707], intensity: 450, desc: 'Central Terminus Zone (Critical Cleanup Required)' },
    { coords: [13.0405, 80.2337], intensity: 350, desc: 'T-Nagar Commercial Hub (High Waste Density)' },
    { coords: [13.0850, 80.2100], intensity: 300, desc: 'Anna Nagar West (Moderate Dump Reports)' },
    { coords: [13.1200, 80.3000], intensity: 500, desc: 'Thiruvotriyur Industrial Zone (Extreme Alert)' },
    { coords: [12.9800, 80.2300], intensity: 280, desc: 'Adyar Residential Sector (Litter Frequency)' },
  ];

  const fetchDashboardData = useCallback(async () => {
    try {
      if ([ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER].includes(user?.role)) {
        const results = await Promise.allSettled([
          analyticsService.getOverview(),
          analyticsService.getByCategory(),
          analyticsService.getTrends(7),
          complaintService.getAll({ limit: 10, sort: '-createdAt' }),
          complaintService.getDailyUpdates(),
          dustbinService.getAll(),
        ]);

        const overviewRes = results[0].status === 'fulfilled' ? results[0].value : null;
        const catRes = results[1].status === 'fulfilled' ? results[1].value : null;
        const trendsRes = results[2].status === 'fulfilled' ? results[2].value : null;
        const complaintsRes = results[3].status === 'fulfilled' ? results[3].value : null;
        const updatesRes = results[4].status === 'fulfilled' ? results[4].value : null;
        const dustbinsRes = results[5].status === 'fulfilled' ? results[5].value : null;

        if (overviewRes?.data) {
          setStats(overviewRes.data);
        }

        const catList = catRes?.data?.data?.slice(0, 6) || [];
        setCategoryData(catList.length > 0 ? catList : [
          { label: 'Waste Management', count: 18 },
          { label: 'Roads Department', count: 12 },
          { label: 'Water Supply', count: 9 },
          { label: 'Electrical', count: 15 },
          { label: 'Sanitation', count: 7 },
          { label: 'Drainage', count: 10 },
        ]);

        const trendsList = trendsRes?.data?.data || [];
        setTrendsData(trendsList.length > 0 ? trendsList : [
          { date: 'Mon', count: 4 },
          { date: 'Tue', count: 7 },
          { date: 'Wed', count: 5 },
          { date: 'Thu', count: 12 },
          { date: 'Fri', count: 9 },
          { date: 'Sat', count: 14 },
          { date: 'Sun', count: 8 },
        ]);

        if (complaintsRes?.data) {
          setRecentComplaints(complaintsRes.data.complaints || []);
        }

        if (updatesRes?.data) {
          setDailyUpdates(updatesRes.data.updates || []);
        }

        if (dustbinsRes?.data) {
          setDustbins(dustbinsRes.data.dustbins || []);
        }
      } else {
        try {
          const complaintsRes = await complaintService.getAll({ limit: 5, sort: '-createdAt' });
          setRecentComplaints(complaintsRes?.data?.complaints || []);
          
          const dustbinsRes = await dustbinService.getAll();
          setDustbins(dustbinsRes?.data?.dustbins || []);

          if (user?.role === ROLES.FIELD_WORKER) {
            const today = new Date().toISOString().split('T')[0];
            const routeRes = await routeService.getRoute({ date: today });
            if (routeRes?.data?.routes?.length > 0) {
              setRoute(routeRes.data.routes[0]);
            }
          }
        } catch {
          setRecentComplaints([]);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleMapClick = (latlng) => {
    if ([ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER, ROLES.SUPERVISOR].includes(user?.role)) {
      setNewDustbinLocation(latlng);
      setShowDustbinModal(true);
    }
  };

  const handleCreateDustbin = async (e) => {
    e.preventDefault();
    try {
      await dustbinService.create({
        lat: newDustbinLocation.lat,
        lng: newDustbinLocation.lng,
        address: newDustbinData.address,
        capacity: newDustbinData.capacity,
        department: user.department || null,
        ward: user.ward || null
      });
      setShowDustbinModal(false);
      setNewDustbinData({ address: '', capacity: 0 });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to create dustbin', err);
    }
  };

  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        handleMapClick(e.latlng);
      }
    });
    return null;
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="animate-spin" />
      </div>
    );
  }

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  return (
    <div className="dashboard animate-fade-in">
      {/* Premium Hero Banner */}
      <div className="dashboard__hero glass-card">
        <div className="hero-content">
          <h1>🏙️ Nagaram Smart City Hub</h1>
          <p>Connecting citizens with municipal services. Monitor, analyze, and optimize city diagnostics in real-time.</p>
          <div className="hero-badge-group">
            <span className="hero-badge">🟢 System Online</span>
            <span className="hero-badge">⚡ AI Diagnostics Enabled</span>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      {isSuperAdmin && (
        <div className="dashboard__quick-actions">
          <Link to="/complaints" className="action-tile glass-card">
            <span className="action-tile__icon">📋</span>
            <div>
              <h4>Manage Complaints</h4>
              <p>Assign tasks & review logs</p>
            </div>
          </Link>
          <Link to="/users" className="action-tile glass-card">
            <span className="action-tile__icon">👥</span>
            <div>
              <h4>City Personnel</h4>
              <p>Configure municipal workforce</p>
            </div>
          </Link>
          <Link to="/wards" className="action-tile glass-card">
            <span className="action-tile__icon">🗺️</span>
            <div>
              <h4>Ward Settings</h4>
              <p>Configure Chennai zones</p>
            </div>
          </Link>
        </div>
      )}

      {/* KPI Panel */}
      {stats && isSuperAdmin && (
        <div className="dashboard__kpis stagger-children">
          <KPICard icon={<HiClipboardList />} label="Total Complaints" value={stats.totalComplaints} color="var(--accent-primary)" />
          <KPICard icon={<HiCheckCircle />} label="Resolved Cases" value={stats.resolvedComplaints + stats.closedComplaints} color="var(--status-success)" />
          <KPICard icon={<HiClock />} label="Pending Resolution" value={stats.pendingComplaints} color="var(--status-warning)" />
          <KPICard icon={<HiExclamation />} label="Escalated Incidents" value={stats.escalatedComplaints} color="var(--status-error)" />
          <KPICard icon={<HiTrendingUp />} label="Today's Intake" value={stats.todayComplaints} color="var(--accent-secondary)" />
          <KPICard icon={<HiUsers />} label="Active Workforce" value={stats.activeWorkers} color="var(--status-info)" />
        </div>
      )}

      {/* Citizen View KPI */}
      {!isSuperAdmin && user?.role === ROLES.CITIZEN && (
        <div className="dashboard__kpis">
          <KPICard icon={<HiClipboardList />} label="My Reported Issues" value={recentComplaints.length} color="var(--accent-primary)" />
          <KPICard icon={<HiStar />} label="My Rewards Points" value={user.rewardPoints || 0} color="var(--status-warning)" />
        </div>
      )}

      {/* Super Admin Diagnostics Dashboard Layout */}
      {isSuperAdmin && stats && (
        <div className="dashboard__admin-grid">
          {/* Trends Area Chart */}
          <div className="dashboard-card glass-card span-2">
            <h3>📈 Intake Trends (Weekly)</h3>
            <div style={{ width: '100%', height: '240px', marginTop: '16px' }}>
              <ResponsiveContainer>
                <AreaChart data={trendsData}>
                  <defs>
                    <linearGradient id="dashboardColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(17, 24, 39, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Area type="monotone" dataKey="count" name="Issues" stroke="var(--accent-primary)" fillOpacity={1} fill="url(#dashboardColor)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Pie Distribution */}
          <div className="dashboard-card glass-card">
            <h3>🗑️ Category Breakdown</h3>
            <div style={{ width: '100%', height: '240px', marginTop: '16px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="label"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(17, 24, 39, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* City Map - Visible to all, but layers depend on role */}
      <div className="dashboard__section">
        <div className="dashboard-map-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3><HiMap /> City Infrastructure Map</h3>
          {isSuperAdmin && (
            <button
              onClick={() => setViewHeatmap(!viewHeatmap)}
              className="btn-heatmap-toggle"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: viewHeatmap ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-primary)',
                color: viewHeatmap ? 'var(--status-error)' : 'var(--text-primary)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <HiOutlineFire /> {viewHeatmap ? 'Disable Heat overlay' : 'Enable Heat overlay'}
            </button>
          )}
        </div>

        <div className="dashboard-map-wrapper glass-card" style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
          <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            
            <MapClickHandler />

            {/* Heatmap overlay circles - Admin only */}
            {isSuperAdmin && viewHeatmap && heatSpots.map((spot, idx) => (
                  <Circle
                    key={`heat-${idx}`}
                    center={spot.coords}
                    radius={spot.intensity * 3}
                    pathOptions={{
                      fillColor: 'red',
                      color: 'red',
                      fillOpacity: 0.18,
                      weight: 1
                    }}
                  >
                    <Popup>
                      <div style={{ fontSize: '11px', fontWeight: 600 }}>
                        🔥 {spot.desc}
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>Cleanup demand factor: {spot.intensity} reports/month</p>
                      </div>
                    </Popup>
                  </Circle>
                ))}

                {/* Incident Markers - Admin sees all, Citizens see their own recent */}
                {recentComplaints
                  .filter((c) => c.gpsCoordinates?.lat && c.gpsCoordinates?.lng)
                  .map((c) => (
                    <Marker key={c._id} position={[c.gpsCoordinates.lat, c.gpsCoordinates.lng]}>
                      <Popup>
                        <div style={{ fontSize: '12px' }}>
                          <b style={{ color: 'var(--accent-primary)' }}>{c.complaintId}</b>
                          <p style={{ fontWeight: 600, margin: '2px 0' }}>{c.title}</p>
                          <span style={{ color: STATUS_COLORS[c.status], fontWeight: 700 }}>{STATUS_LABELS[c.status]}</span>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                {/* Dustbin markers */}
                {dustbins
                  .filter((d) => d.gpsCoordinates?.lat && d.gpsCoordinates?.lng)
                  .map((d) => (
                    <Marker key={d._id} position={[d.gpsCoordinates.lat, d.gpsCoordinates.lng]} icon={dustbinIcon}>
                      <Popup>
                        <div style={{ fontSize: '12px' }}>
                          <b style={{ color: '#10b981' }}>{d.dustbinId}</b>
                          <p style={{ fontWeight: 600, margin: '2px 0' }}>Current Capacity: {d.capacity}%</p>
                          <p style={{ margin: '2px 0', color: 'var(--text-secondary)' }}>Last Cleaned: {d.lastCleanedAt ? timeAgo(d.lastCleanedAt) : 'N/A'}</p>
                          <p style={{ margin: '2px 0', color: 'var(--text-secondary)' }}>Cleaned By: {d.cleanedBy ? d.cleanedBy.name : 'Unknown'}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                {/* Worker Route Polyline */}
                {route && route.waypoints.length > 1 && (
                  <Polyline 
                    positions={route.waypoints.filter(w => w.lat && w.lng).map(w => [w.lat, w.lng])} 
                    pathOptions={{ color: 'var(--accent-primary)', weight: 4, dashArray: '10, 10' }} 
                  />
                )}
              </MapContainer>
        </div>
      </div>

      {/* Feeds Grid */}
      <div className="dashboard__feeds-grid">
        {/* Recent Complaints Feed */}
        <div className="dashboard__section">
          <h2>Latest Incident Logs</h2>
          {recentComplaints.length > 0 ? (
            <div className="dashboard__complaints-list">
              {recentComplaints.map((complaint) => (
                <Link to={`/complaints/${complaint._id}`} key={complaint._id} className="complaint-card glass-card">
                  <div className="complaint-card__header">
                    <span className="complaint-card__id">{complaint.complaintId}</span>
                    <span className="complaint-card__status" style={{ background: `${STATUS_COLORS[complaint.status]}20`, color: STATUS_COLORS[complaint.status] }}>
                      {STATUS_LABELS[complaint.status]}
                    </span>
                  </div>
                  <h3 className="complaint-card__title">{complaint.title}</h3>
                  <p className="complaint-card__desc">{complaint.address}</p>
                  <div className="complaint-card__footer">
                    <span className="complaint-card__category">
                      {CATEGORY_ICONS[complaint.category]} {complaint.category?.replace(/_/g, ' ')}
                    </span>
                    <span className="complaint-card__priority" style={{ color: PRIORITY_COLORS[complaint.priority] }}>
                      ● {complaint.priority}
                    </span>
                    <span className="complaint-card__time">{timeAgo(complaint.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="dashboard__empty glass-card">
              <p>No complaints reported yet.</p>
            </div>
          )}
        </div>

        {/* Daily Work Updates */}
        {[ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER].includes(user?.role) && (
          <div className="dashboard__section">
            <h2>Today's Work Updates</h2>
            {dailyUpdates.length > 0 ? (
              <div className="dashboard__updates-list">
                {dailyUpdates.map((update) => (
                  <Link to={`/complaints/${update.complaintDbId}`} key={update.id} className="update-card glass-card">
                    <div className="update-card__timeline-marker"></div>
                    <div className="update-card__content">
                      <div className="update-card__header">
                        <span className="update-card__time">{new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="update-card__worker">{update.changedBy}</span>
                      </div>
                      <p className="update-card__action">
                        Changed status to <span style={{ color: STATUS_COLORS[update.status], fontWeight: 600 }}>{STATUS_LABELS[update.status]}</span>
                      </p>
                      <h4 className="update-card__title">{update.title} <span className="update-card__id">({update.complaintId})</span></h4>
                      {update.note && <p className="update-card__note">"{update.note}"</p>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="dashboard__empty glass-card">
                <p>No status updates recorded today yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Worker's Assigned Route */}
        {user?.role === ROLES.FIELD_WORKER && (
          <div className="dashboard__section span-full">
            <h2>Today's Assigned Route</h2>
            {route && route.waypoints.length > 0 ? (
              <div className="dashboard__updates-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {route.waypoints.map((wp, i) => (
                  <div key={i} className="update-card glass-card" style={{ padding: '16px', borderLeft: '4px solid var(--accent-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>Stop {i + 1}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{wp.type}</span>
                    </div>
                    <p style={{ fontSize: '14px', margin: '4px 0', fontWeight: 600 }}>{wp.address}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{wp.completed ? '✅ Completed' : '🕒 Pending'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard__empty glass-card">
                <p>No route assigned for today yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Dustbin Modal */}
      {showDustbinModal && (
        <div className="modal-overlay" onClick={() => setShowDustbinModal(false)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px' }}>Add New Dustbin</h3>
            <form onSubmit={handleCreateDustbin}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>Location Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Near Central Park Gate"
                  value={newDustbinData.address}
                  onChange={(e) => setNewDustbinData({ ...newDustbinData, address: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'white' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>Initial Capacity (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newDustbinData.capacity}
                  onChange={(e) => setNewDustbinData({ ...newDustbinData, capacity: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'white' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowDustbinModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Save Dustbin</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const KPICard = ({ icon, label, value, color }) => (
  <div className="kpi-card glass-card">
    <div className="kpi-card__icon" style={{ color, background: `${color}15` }}>
      {icon}
    </div>
    <div className="kpi-card__info">
      <p className="kpi-card__value" style={{ color }}>{value}</p>
      <p className="kpi-card__label">{label}</p>
    </div>
  </div>
);

export default Dashboard;
