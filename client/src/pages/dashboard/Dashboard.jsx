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
  HiLightningBolt, HiShieldCheck, HiBell, HiSparkles,
  HiOfficeBuilding, HiArrowNarrowRight, HiCheck
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

// Inline SVG dustbin icon
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

const PIE_COLORS = ['#ef4444', '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4'];

// Animated counter hook with safe number casting
const useCountUp = (target, duration = 1000) => {
  const numTarget = typeof target === 'number' && !isNaN(target) ? target : 0;
  const [count, setCount] = useState(numTarget);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!numTarget) { setCount(0); return; }
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * numTarget));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [numTarget, duration]);

  return count;
};

// Format date helper for chart X-axis
const formatChartDate = (dateStr) => {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && dateStr.length <= 3) return dateStr;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return String(dateStr);
  }
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

  const userRole = user?.role;
  const userId = user?._id;

  const fetchDashboardData = useCallback(async () => {
    try {
      if ([ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER].includes(userRole)) {
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
          if (userRole === ROLES.FIELD_WORKER) {
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
  }, [userRole, userId]);

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
        department: user?.department || null,
        ward: user?.ward || null
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
        <div className="animate-spin" />
      </div>
    );
  }

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const totalCategoryComplaints = Array.isArray(categoryData) ? categoryData.reduce((acc, curr) => acc + (curr?.count || 0), 0) : 0;
  const totalWeeklyIntake = Array.isArray(trendsData) ? trendsData.reduce((acc, curr) => acc + (curr?.count || 0), 0) : 0;

  return (
    <div className="dashboard animate-fade-in">

      {/* ── 1. Refined Operations Hero Header ──────────────── */}
      <div className="dashboard__hero">
        <div className="hero-content">
          <div className="hero-heading-row">
            <div>
              <h1 className="hero-title">Nagaram Smart City Hub</h1>
              <p className="hero-desc">
                {greeting}, <strong className="hero-user-name">{user?.name?.split(' ')[0] || 'Admin'}</strong> — Real-time monitoring of municipal operations across all 15 Chennai zones.
              </p>
            </div>
          </div>
          
          <div className="hero-badge-group">
            <span className="ops-pill ops-pill--live">
              <span className="live-dot" />
              All Systems Operational
            </span>
            <span className="ops-pill">
              <HiSparkles className="ops-pill__icon" />
              AI Diagnostics Active
            </span>
            <span className="ops-pill">
              <HiLightningBolt className="ops-pill__icon" />
              {dustbins.length} Smart Bins Tracked
            </span>
            <span className="ops-pill">
              <HiClock className="ops-pill__icon" />
              {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Actionable Quick Action Strip ────────────────── */}
      {isSuperAdmin && (
        <div className="dashboard__quick-actions">
          <Link to="/complaints" className="action-tile">
            <div className="action-tile__icon-wrap">
              <HiClipboardList />
            </div>
            <div className="action-tile__body">
              <p className="action-tile__title">Manage Complaints</p>
              <p className="action-tile__desc">Assign tasks & review logs</p>
            </div>
            <HiArrowNarrowRight className="action-tile__arrow" />
          </Link>
          <Link to="/users" className="action-tile">
            <div className="action-tile__icon-wrap">
              <HiUsers />
            </div>
            <div className="action-tile__body">
              <p className="action-tile__title">City Personnel</p>
              <p className="action-tile__desc">Configure municipal workforce</p>
            </div>
            <HiArrowNarrowRight className="action-tile__arrow" />
          </Link>
          <Link to="/wards" className="action-tile">
            <div className="action-tile__icon-wrap">
              <HiMap />
            </div>
            <div className="action-tile__body">
              <p className="action-tile__title">Ward Settings</p>
              <p className="action-tile__desc">Configure Chennai zones</p>
            </div>
            <HiArrowNarrowRight className="action-tile__arrow" />
          </Link>
          <Link to="/work-progress" className="action-tile">
            <div className="action-tile__icon-wrap">
              <HiTrendingUp />
            </div>
            <div className="action-tile__body">
              <p className="action-tile__title">Work Progress</p>
              <p className="action-tile__desc">Live field operations tracker</p>
            </div>
            <HiArrowNarrowRight className="action-tile__arrow" />
          </Link>
        </div>
      )}

      {/* ── 3. High-Clarity KPI Metric Grid ─────────────────── */}
      {isSuperAdmin && (
        <div className="dashboard__kpis">
          <KPICard
            icon={<HiClipboardList />}
            label="Total Complaints"
            value={stats?.totalComplaints || 0}
            accentColor="#ef4444"
            trend="+12% this week"
            trendType="neutral"
          />
          <KPICard
            icon={<HiCheckCircle />}
            label="Resolved Cases"
            value={(stats?.resolvedComplaints || 0) + (stats?.closedComplaints || 0)}
            accentColor="#10b981"
            trend="↑ 8% resolved"
            trendType="up"
          />
          <KPICard
            icon={<HiClock />}
            label="Pending Resolution"
            value={stats?.pendingComplaints || 0}
            accentColor="#f59e0b"
            trend="Avg. 3.2h SLA"
            trendType="neutral"
          />
          <KPICard
            icon={<HiExclamation />}
            label="Escalated Incidents"
            value={stats?.escalatedComplaints || 0}
            accentColor={(stats?.escalatedComplaints || 0) > 0 ? "#ef4444" : "#10b981"}
            trend={(stats?.escalatedComplaints || 0) > 0 ? "Needs attention" : "Optimal (0 alert)"}
            trendType={(stats?.escalatedComplaints || 0) > 0 ? "down" : "optimal"}
          />
          <KPICard
            icon={<HiLightningBolt />}
            label="Today's Intake"
            value={stats?.todayComplaints || 0}
            accentColor="#8b5cf6"
            trend="Live intake"
            trendType="neutral"
          />
          <KPICard
            icon={<HiUsers />}
            label="Active Workforce"
            value={stats?.activeWorkers || 0}
            accentColor="#0ea5e9"
            trend="Field deployed"
            trendType="up"
          />
        </div>
      )}

      {/* ── KPI Cards (Citizen Role) ───────────────────────── */}
      {!isSuperAdmin && user?.role === ROLES.CITIZEN && (
        <div className="dashboard__kpis dashboard__kpis--citizen">
          <KPICard
            icon={<HiClipboardList />}
            label="My Reported Issues"
            value={recentComplaints.length}
            accentColor="#ef4444"
            trend="Active tickets"
            trendType="neutral"
          />
          <KPICard
            icon={<HiStar />}
            label="My Reward Points"
            value={user?.rewardPoints || 0}
            accentColor="#f59e0b"
            trend="Civic Score"
            trendType="up"
          />
        </div>
      )}

      {/* ── 4. Charts & Analytics Grid ─────────────────────── */}
      {isSuperAdmin && (
        <div className="dashboard__admin-grid">
          {/* Trends Area Chart */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h2 className="dashboard-card__title">
                  <HiTrendingUp className="dashboard-card__title-icon" /> Weekly Complaint Intake Trend
                </h2>
                <p className="dashboard-card__subtitle">Daily issues filed across Chennai sectors (past 7 days)</p>
              </div>
              <span className="chart-total-pill">{totalWeeklyIntake} Total Issues</span>
            </div>
            
            <div className="chart-container" style={{ width: '100%', height: '210px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendsData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-color)' }}
                    tickFormatter={formatChartDate}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tickCount={5}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      boxShadow: 'var(--shadow-lg)',
                    }}
                    itemStyle={{ color: '#ef4444', fontWeight: 600 }}
                    cursor={{ stroke: 'var(--accent-primary)', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Issues Filed"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#trendGrad)"
                    dot={{ fill: '#ef4444', r: 3.5, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#f87171', strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Donut Chart + Centered Metric */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h2 className="dashboard-card__title">
                  <HiOfficeBuilding className="dashboard-card__title-icon" /> Complaint Categories
                </h2>
                <p className="dashboard-card__subtitle">Department distribution volume</p>
              </div>
            </div>

            <div className="donut-chart-layout">
              <div className="donut-wrapper" style={{ position: 'relative', width: '150px', height: '150px', flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="label"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        boxShadow: 'var(--shadow-md)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Centered Metric in Donut Hole */}
                <div className="donut-center-metric">
                  <span className="donut-center-val">{totalCategoryComplaints}</span>
                  <span className="donut-center-lbl">Total</span>
                </div>
              </div>

              {/* Clean Structured Legend */}
              <div className="category-legend">
                {categoryData.map((item, idx) => {
                  const pct = totalCategoryComplaints > 0 ? Math.round(((item?.count || 0) / totalCategoryComplaints) * 100) : 0;
                  return (
                    <div key={idx} className="category-legend-item">
                      <div className="category-legend-dot" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <span className="category-legend-label" title={item?.label}>{item?.label}</span>
                      <span className="category-legend-count">{item?.count || 0}</span>
                      <span className="category-legend-pct">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. City Infrastructure Map ──────────────────────── */}
      <div className="dashboard__section">
        <div className="dashboard-map-header">
          <div>
            <h2 className="dashboard-section-title">
              <HiMap className="dashboard-section-icon" /> City Infrastructure & Active Assets
            </h2>
            <p className="dashboard-section-subtitle">Real-time GPS coordinates of smart dustbins and reported municipal incidents</p>
          </div>
          {isSuperAdmin && (
            <button
              onClick={() => setViewHeatmap(!viewHeatmap)}
              className={`btn-map-toggle ${viewHeatmap ? 'btn-map-toggle--active' : ''}`}
            >
              <HiOutlineFire /> {viewHeatmap ? 'Hide Hotspots' : 'Show Hotspots'}
            </button>
          )}
        </div>

        <div className="dashboard-map-wrapper" style={{ height: '320px', width: '100%' }}>
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
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontWeight: 400 }}>Demand: {spot.intensity} reports/month</p>
                  </div>
                </Popup>
              </Circle>
            ))}

            {recentComplaints
              .filter(c => c?.gpsCoordinates && !isNaN(parseFloat(c.gpsCoordinates.lat)) && !isNaN(parseFloat(c.gpsCoordinates.lng)))
              .map(c => (
                <Marker key={c._id} position={[parseFloat(c.gpsCoordinates.lat), parseFloat(c.gpsCoordinates.lng)]}>
                  <Popup>
                    <div style={{ fontSize: '12px', maxWidth: 200 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{c.title}</strong>
                      <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>{c.address}</p>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: `${STATUS_COLORS[c.status] || '#ef4444'}20`, color: STATUS_COLORS[c.status] || '#ef4444', fontWeight: 700 }}>
                        {STATUS_LABELS[c.status] || c.status}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {dustbins
              .filter(b => b && !isNaN(parseFloat(b.lat)) && !isNaN(parseFloat(b.lng)))
              .map(b => (
                <Marker key={b._id} position={[parseFloat(b.lat), parseFloat(b.lng)]} icon={dustbinIcon}>
                  <Popup>
                    <div style={{ fontSize: '12px', minWidth: 160 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>🗑️ Smart Dustbin #{b.binId || b._id?.slice(-4)}</strong>
                      <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>{b.address || 'Chennai Ward Asset'}</p>
                      <div style={{ background: 'var(--bg-tertiary)', borderRadius: 4, height: 8, margin: '8px 0 4px', overflow: 'hidden' }}>
                        <div style={{ width: `${b.capacity || 0}%`, height: '100%', background: (b.capacity || 0) > 80 ? '#ef4444' : (b.capacity || 0) > 50 ? '#f59e0b' : '#10b981' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fill Level: {b.capacity || 0}%</span>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {route && Array.isArray(route.waypoints) && route.waypoints.length > 1 && (
              <Polyline
                positions={route.waypoints.filter(w => !isNaN(parseFloat(w.lat)) && !isNaN(parseFloat(w.lng))).map(w => [parseFloat(w.lat), parseFloat(w.lng)])}
                pathOptions={{ color: '#ef4444', weight: 4, dashArray: '10, 10' }}
              />
            )}
          </MapContainer>
        </div>
      </div>

      {/* ── 6. Balanced Operational Feeds Grid ───────────────── */}
      <div className="dashboard__feeds-grid">
        {/* Recent Complaints Feed */}
        <div className="dashboard__section">
          <h2 className="dashboard-section-title">
            <HiBell className="dashboard-section-icon" /> Latest Incident Logs
          </h2>
          {recentComplaints.length > 0 ? (
            <div className="dashboard__complaints-list">
              {recentComplaints.slice(0, 6).map(complaint => (
                <Link to={`/complaints/${complaint._id}`} key={complaint._id} className="complaint-card">
                  <div className="complaint-card__header">
                    <span className="complaint-card__id">{complaint.complaintId}</span>
                    <span
                      className="complaint-card__status"
                      style={{ background: `${STATUS_COLORS[complaint.status]}18`, color: STATUS_COLORS[complaint.status] }}
                    >
                      {STATUS_LABELS[complaint.status]}
                    </span>
                  </div>
                  <h3 className="complaint-card__title">{complaint.title}</h3>
                  <p className="complaint-card__desc">{complaint.address}</p>
                  <div className="complaint-card__footer">
                    <span className="complaint-card__tag">
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
            <div className="dashboard__empty">
              <p>No active incidents reported yet.</p>
            </div>
          )}
        </div>

        {/* Daily Work Updates */}
        {[ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER].includes(user?.role) && (
          <div className="dashboard__section">
            <h2 className="dashboard-section-title">
              <HiShieldCheck className="dashboard-section-icon" style={{ color: '#10b981' }} /> Today's Work Updates
            </h2>
            {dailyUpdates.length > 0 ? (
              <div className="dashboard__updates-list">
                {dailyUpdates.slice(0, 6).map(update => (
                  <Link to={`/complaints/${update.complaintDbId}`} key={update.id} className="update-card">
                    <div className="update-card__timeline-marker" />
                    <div className="update-card__content">
                      <div className="update-card__header">
                        <span
                          className="update-card__status-pill"
                          style={{ color: STATUS_COLORS[update.status], background: `${STATUS_COLORS[update.status]}18` }}
                        >
                          {STATUS_LABELS[update.status]}
                        </span>
                        <span className="update-card__time">
                          {update.timestamp ? new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                      </div>
                      <h3 className="update-card__title">
                        {update.title} <span className="update-card__id">({update.complaintId})</span>
                      </h3>
                      <p className="update-card__actor">
                        Updated by <strong>{update.changedBy}</strong>
                      </p>
                      {update.note && <p className="update-card__note">"{update.note}"</p>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="dashboard__empty">
                <p>No status updates recorded today yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Field Worker Route */}
        {user?.role === ROLES.FIELD_WORKER && (
          <div className="dashboard__section span-full">
            <h2 className="dashboard-section-title">Today's Assigned Route</h2>
            {route && route.waypoints?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {route.waypoints.map((wp, i) => (
                  <div key={i} className="update-card" style={{ borderLeft: '3px solid var(--accent-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', width: '100%' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(239,68,68,0.1)', padding: '2px 7px', borderRadius: '4px' }}>Stop {i + 1}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{wp.type}</span>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 4px 0' }}>{wp.address}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{wp.completed ? 'Completed' : 'Pending'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard__empty">
                <p>No route scheduled for today.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Dustbin Placement Modal ──────────────────────────── */}
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

// ── Refined Modern KPI Card Component ──────────────────────────
const KPICard = ({ icon, label, value = 0, accentColor, trend, trendType = 'neutral' }) => {
  const count = useCountUp(value || 0);

  const getTrendClass = () => {
    if (trendType === 'optimal') return 'kpi-trend--optimal';
    if (trendType === 'up') return 'kpi-trend--up';
    if (trendType === 'down') return 'kpi-trend--down';
    return 'kpi-trend--neutral';
  };

  return (
    <div className="kpi-card">
      <div className="kpi-card__top">
        <div className="kpi-card__icon" style={{ color: accentColor, background: `${accentColor}14` }}>
          {icon}
        </div>
        {trend && (
          <span className={`kpi-trend ${getTrendClass()}`}>
            {trendType === 'optimal' && <HiCheck style={{ fontSize: '11px', marginRight: 2 }} />}
            {trend}
          </span>
        )}
      </div>

      <div className="kpi-card__body">
        <span className="kpi-card__value">{count.toLocaleString()}</span>
        <span className="kpi-card__label">{label}</span>
      </div>
    </div>
  );
};

export default Dashboard;
