import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { analyticsService, complaintService } from '../../services/dataService';
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

const PIE_COLORS = ['#4f46e5', '#0891b2', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewHeatmap, setViewHeatmap] = useState(true);

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

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      if ([ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER].includes(user?.role)) {
        const [overviewRes, catRes, trendsRes, complaintsRes] = await Promise.all([
          analyticsService.getOverview(),
          analyticsService.getByCategory(),
          analyticsService.getTrends(7), // Last 7 days
          complaintService.getAll({ limit: 10, sort: '-createdAt' }),
        ]);
        setStats(overviewRes.data);
        setCategoryData(catRes.data.data?.slice(0, 6) || []);
        setTrendsData(trendsRes.data.data || []);
        setRecentComplaints(complaintsRes.data.complaints || []);
      } else {
        const complaintsRes = await complaintService.getAll({ limit: 5, sort: '-createdAt' });
        setRecentComplaints(complaintsRes.data.complaints || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
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
                  <Tooltip />
                  <Area type="monotone" dataKey="count" name="Issues" stroke="var(--accent-primary)" fillOpacity={1} fill="url(#dashboardColor)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Pie Distribution */}
          <div className="dashboard-card glass-card">
            <h3>🗑️ Categories</h3>
            <div style={{ width: '100%', height: '240px', marginTop: '16px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="label"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Incident Locator Map */}
          <div className="dashboard-card glass-card span-3">
            <div className="dashboard-map-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3><HiMap /> Live Incident Locator & Heat Map</h3>
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
            </div>

            <div className="dashboard-map-wrapper" style={{ marginTop: '16px', height: '320px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
              <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* Heatmap overlay circles */}
                {viewHeatmap && heatSpots.map((spot, idx) => (
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
              </MapContainer>
            </div>
          </div>
        </div>
      )}

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
