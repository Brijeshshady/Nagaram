import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, Polyline } from 'react-leaflet';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell
} from 'recharts';
import { analyticsService, complaintService, dustbinService, routeService } from '../../services/dataService';
import { ROLES, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, CATEGORY_ICONS, timeAgo } from '../../utils/constants';
import {
  HiClipboardList, HiCheckCircle, HiClock, HiExclamation,
  HiTrendingUp, HiUsers, HiStar, HiMap, HiOutlineFire,
  HiLightningBolt, HiShieldCheck, HiBell
} from 'react-icons/hi';
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

// Inline SVG dustbin icon to avoid CORS/hotlink issues
const dustbinSVG = `
  <svg viewBox="0 0 64 64" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
    <rect x="16" y="16" width="32" height="36" fill="#10b981" rx="4" stroke="#065f46" stroke-width="2"/>
    <line x1="22" y1="24" x2="42" y2="24" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="22" y1="32" x2="42" y2="32" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="22" y1="40" x2="42" y2="40" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="12" y="10" width="40" height="6" fill="#065f46" rx="2"/>
    <rect x="24" y="6" width="16" height="4" fill="#065f46" rx="1"/>
  </svg>
`;

const dustbinIcon = L.divIcon({
  html: `<div style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">${dustbinSVG}</div>`,
  className: 'custom-dustbin-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

const PIE_COLORS = ['#6366f1', '#0891b2', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];

// Animated counter hook
const useCountUp = (target, duration = 1200) => {
  const [count, setCount] = useState(0);
  const frameRef = useRef(null);
  useEffect(() => {
    if (!target) { setCount(0); return; }
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return count;
};

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

  const mapCenter = [13.0827, 80.2707];

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

        if (overviewRes?.data) setStats(overviewRes.data);

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

        if (complaintsRes?.data) setRecentComplaints(complaintsRes.data.complaints || []);
        if (updatesRes?.data) setDailyUpdates(updatesRes.data.updates || []);
        if (dustbinsRes?.data) setDustbins(dustbinsRes.data.dustbins || []);
      } else {
        try {
          const complaintsRes = await complaintService.getAll({ limit: 5, sort: '-createdAt' });
          setRecentComplaints(complaintsRes?.data?.complaints || []);
          const dustbinsRes = await dustbinService.getAll();
          setDustbins(dustbinsRes?.data?.dustbins || []);
          if (user?.role === ROLES.FIELD_WORKER) {
            const today = new Date().toISOString().split('T')[0];
            const routeRes = await routeService.getRoute({ date: today });
            if (routeRes?.data?.routes?.length > 0) setRoute(routeRes.data.routes[0]);
          }
        } catch { setRecentComplaints([]); }
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

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
    useMapEvents({ click(e) { handleMapClick(e.latlng); } });
    return null;
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="animate-spin" style={{ width: 48, height: 48, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="dashboard animate-fade-in">

      {/* ── Hero Banner ─────────────────────────────── */}
      <div className="dashboard__hero">
        <div className="hero-content">
          <h1>
            🏙️ Nagaram Smart City Hub
          </h1>
          <p>
            {greeting}, <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{user?.name?.split(' ')[0] || 'Admin'}</strong> — Real-time monitoring of municipal services across all Chennai wards.
          </p>
          <div className="hero-badge-group">
            <span className="hero-badge">🟢 System Online</span>
            <span className="hero-badge">⚡ AI Diagnostics Active</span>
            <span className="hero-badge">📡 {dustbins.length} Smart Bins Tracked</span>
            <span className="hero-badge">🕐 {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* ── Quick Action Tiles ────────────────────────── */}
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
          <Link to="/work-progress" className="action-tile glass-card">
            <span className="action-tile__icon">📊</span>
            <div>
              <h4>Work Progress</h4>
              <p>Live field operations tracker</p>
            </div>
          </Link>
        </div>
      )}

      {/* ── KPI Cards (Admin) ─────────────────────────── */}
      {stats && isSuperAdmin && (
        <div className="dashboard__kpis stagger-children">
          <KPICard
            icon={<HiClipboardList />}
            label="Total Complaints"
            value={stats.totalComplaints}
            color="#6366f1"
            trend="+12% this week"
            trendUp
          />
          <KPICard
            icon={<HiCheckCircle />}
            label="Resolved Cases"
            value={stats.resolvedComplaints + stats.closedComplaints}
            color="#10b981"
            trend="↑ 8% resolved"
            trendUp
          />
          <KPICard
            icon={<HiClock />}
            label="Pending Resolution"
            value={stats.pendingComplaints}
            color="#f59e0b"
            trend="Avg. 3.2h SLA"
          />
          <KPICard
            icon={<HiExclamation />}
            label="Escalated Incidents"
            value={stats.escalatedComplaints}
            color="#ef4444"
            trend="Needs attention"
            trendUp={false}
          />
          <KPICard
            icon={<HiLightningBolt />}
            label="Today's Intake"
            value={stats.todayComplaints}
            color="#8b5cf6"
            trend="Live count"
          />
          <KPICard
            icon={<HiUsers />}
            label="Active Workforce"
            value={stats.activeWorkers}
            color="#0891b2"
            trend="Field deployed"
            trendUp
          />
        </div>
      )}

      {/* ── KPI Cards (Citizen) ───────────────────────── */}
      {!isSuperAdmin && user?.role === ROLES.CITIZEN && (
        <div className="dashboard__kpis">
          <KPICard icon={<HiClipboardList />} label="My Reported Issues" value={recentComplaints.length} color="#6366f1" />
          <KPICard icon={<HiStar />} label="My Reward Points" value={user.rewardPoints || 0} color="#f59e0b" />
        </div>
      )}

      {/* ── Charts Grid (Admin) ───────────────────────── */}
      {isSuperAdmin && stats && (
        <div className="dashboard__admin-grid">
          {/* Trends Area Chart */}
          <div className="dashboard-card glass-card">
            <h3><HiTrendingUp style={{ color: 'var(--accent-primary)' }} /> Weekly Complaint Intake Trend</h3>
            <p className="dashboard-card__subtitle">Number of issues filed per day over the past 7 days</p>
            <div style={{ width: '100%', height: '220px' }}>
              <ResponsiveContainer>
                <AreaChart data={trendsData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(99,102,241,0.3)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                      backdropFilter: 'blur(10px)',
                    }}
                    itemStyle={{ color: '#a5b4fc' }}
                    cursor={{ stroke: 'rgba(99,102,241,0.3)', strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Issues Filed"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#trendGrad)"
                    dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#818cf8', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart + Legend */}
          <div className="dashboard-card glass-card">
            <h3>🗑️ Complaint Categories</h3>
            <p className="dashboard-card__subtitle">Distribution by department</p>
            <div style={{ width: '100%', height: '160px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="label"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(99,102,241,0.3)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                    }}
                    itemStyle={{ color: '#a5b4fc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="category-legend">
              {categoryData.map((item, idx) => (
                <div key={idx} className="category-legend-item">
                  <div className="category-legend-dot" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="category-legend-label">{item.label}</span>
                  <span className="category-legend-count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── City Infrastructure Map ─────────────────── */}
      <div className="dashboard__section">
        <div className="dashboard-map-header">
          <h3><HiMap /> City Infrastructure Map</h3>
          {isSuperAdmin && (
            <button
              onClick={() => setViewHeatmap(!viewHeatmap)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: viewHeatmap ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-secondary)',
                color: viewHeatmap ? '#ef4444' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <HiOutlineFire /> {viewHeatmap ? 'Hide Hotspots' : 'Show Hotspots'}
            </button>
          )}
        </div>

        <div className="dashboard-map-wrapper" style={{ height: '420px', width: '100%' }}>
          <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <MapClickHandler />

            {isSuperAdmin && viewHeatmap && heatSpots.map((spot, idx) => (
              <Circle
                key={`heat-${idx}`}
                center={spot.coords}
                radius={spot.intensity * 3}
                pathOptions={{ fillColor: '#ef4444', color: '#ef4444', fillOpacity: 0.15, weight: 1 }}
              >
                <Popup>
                  <div style={{ fontSize: '12px', fontWeight: 600, maxWidth: 180 }}>
                    🔥 {spot.desc}
                    <p style={{ margin: '4px 0 0 0', color: '#666', fontWeight: 400 }}>Cleanup demand: {spot.intensity} reports/month</p>
                  </div>
                </Popup>
              </Circle>
            ))}

            {recentComplaints
              .filter(c => c.gpsCoordinates?.lat && c.gpsCoordinates?.lng)
              .map(c => (
                <Marker key={c._id} position={[c.gpsCoordinates.lat, c.gpsCoordinates.lng]}>
                  <Popup>
                    <div style={{ fontSize: '12px' }}>
                      <b style={{ color: '#6366f1' }}>{c.complaintId}</b>
                      <p style={{ fontWeight: 600, margin: '2px 0' }}>{c.title}</p>
                      <span style={{ color: STATUS_COLORS[c.status], fontWeight: 700 }}>{STATUS_LABELS[c.status]}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {dustbins
              .filter(d => d.gpsCoordinates?.lat && d.gpsCoordinates?.lng)
              .map(d => (
                <Marker key={d._id} position={[d.gpsCoordinates.lat, d.gpsCoordinates.lng]} icon={dustbinIcon}>
                  <Popup>
                    <div style={{ fontSize: '12px' }}>
                      <b style={{ color: '#10b981' }}>{d.dustbinId}</b>
                      <p style={{ fontWeight: 600, margin: '2px 0' }}>Capacity: {d.capacity}%</p>
                      <p style={{ margin: '2px 0', color: '#888' }}>Last Cleaned: {d.lastCleanedAt ? timeAgo(d.lastCleanedAt) : 'N/A'}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {route && route.waypoints.length > 1 && (
              <Polyline
                positions={route.waypoints.filter(w => w.lat && w.lng).map(w => [w.lat, w.lng])}
                pathOptions={{ color: '#6366f1', weight: 4, dashArray: '10, 10' }}
              />
            )}
          </MapContainer>
        </div>
      </div>

      {/* ── Feeds Grid ───────────────────────────────── */}
      <div className="dashboard__feeds-grid">
        {/* Recent Complaints Feed */}
        <div className="dashboard__section">
          <h2>
            <HiBell style={{ color: 'var(--accent-primary)' }} />
            Latest Incident Logs
          </h2>
          {recentComplaints.length > 0 ? (
            <div className="dashboard__complaints-list">
              {recentComplaints.slice(0, 8).map(complaint => (
                <Link to={`/complaints/${complaint._id}`} key={complaint._id} className="complaint-card">
                  <div className="complaint-card__header">
                    <span className="complaint-card__id">{complaint.complaintId}</span>
                    <span
                      className="complaint-card__status"
                      style={{ background: `${STATUS_COLORS[complaint.status]}20`, color: STATUS_COLORS[complaint.status] }}
                    >
                      {STATUS_LABELS[complaint.status]}
                    </span>
                  </div>
                  <h3 className="complaint-card__title">{complaint.title}</h3>
                  <p className="complaint-card__desc">{complaint.address}</p>
                  <div className="complaint-card__footer">
                    <span>{CATEGORY_ICONS[complaint.category]} {complaint.category?.replace(/_/g, ' ')}</span>
                    <span className="complaint-card__priority" style={{ color: PRIORITY_COLORS[complaint.priority] }}>
                      ● {complaint.priority}
                    </span>
                    <span>{timeAgo(complaint.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="dashboard__empty">
              <p>✅ No complaints reported yet.</p>
            </div>
          )}
        </div>

        {/* Daily Work Updates */}
        {[ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER].includes(user?.role) && (
          <div className="dashboard__section">
            <h2>
              <HiShieldCheck style={{ color: '#10b981' }} />
              Today's Work Updates
            </h2>
            {dailyUpdates.length > 0 ? (
              <div className="dashboard__updates-list">
                {dailyUpdates.map(update => (
                  <Link to={`/complaints/${update.complaintDbId}`} key={update.id} className="update-card">
                    <div className="update-card__timeline-marker" />
                    <div className="update-card__content">
                      <div className="update-card__header">
                        <span className="update-card__time">
                          {new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="update-card__worker">{update.changedBy}</span>
                      </div>
                      <p className="update-card__action">
                        Changed to <span style={{ color: STATUS_COLORS[update.status], fontWeight: 700 }}>{STATUS_LABELS[update.status]}</span>
                      </p>
                      <h4 className="update-card__title">
                        {update.title} <span className="update-card__id">({update.complaintId})</span>
                      </h4>
                      {update.note && <p className="update-card__note">"{update.note}"</p>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="dashboard__empty">
                <p>⏰ No status updates recorded today yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Field Worker Route */}
        {user?.role === ROLES.FIELD_WORKER && (
          <div className="dashboard__section span-full">
            <h2>Today's Assigned Route</h2>
            {route && route.waypoints.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {route.waypoints.map((wp, i) => (
                  <div key={i} className="update-card" style={{ borderLeft: '3px solid var(--accent-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', width: '100%' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(99,102,241,0.1)', padding: '2px 7px', borderRadius: '4px' }}>Stop {i + 1}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{wp.type}</span>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 4px 0' }}>{wp.address}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{wp.completed ? '✅ Completed' : '🕒 Pending'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard__empty"><p>No route assigned for today yet.</p></div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Dustbin Modal ─────────────────────────── */}
      {showDustbinModal && (
        <div className="modal-overlay" onClick={() => setShowDustbinModal(false)}>
          <div className="modal-card animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>📍 Add New Smart Dustbin</h2>
              <button className="modal-close" onClick={() => setShowDustbinModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateDustbin}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  Placing dustbin at coordinates: <strong>{newDustbinLocation?.lat?.toFixed(4)}, {newDustbinLocation?.lng?.toFixed(4)}</strong>
                </p>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600 }}>Location Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Near Central Park Gate"
                    value={newDustbinData.address}
                    onChange={e => setNewDustbinData({ ...newDustbinData, address: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600 }}>Initial Capacity (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newDustbinData.capacity}
                    onChange={e => setNewDustbinData({ ...newDustbinData, capacity: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowDustbinModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">Save Dustbin</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ── KPI Card Component ─────────────────────────────────────────
const KPICard = ({ icon, label, value, color, trend, trendUp }) => {
  const count = useCountUp(value || 0);
  return (
    <div className="kpi-card glass-card" style={{ '--kpi-color': color }}>
      <div className="kpi-card__icon" style={{ color, background: `${color}18` }}>
        {icon}
      </div>
      <div className="kpi-card__info">
        <p className="kpi-card__value" style={{ color }}>{count.toLocaleString()}</p>
        <p className="kpi-card__label">{label}</p>
        {trend && (
          <p className={`kpi-trend ${trendUp === false ? 'kpi-trend--down' : trendUp ? 'kpi-trend--up' : ''}`}>
            {trend}
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
