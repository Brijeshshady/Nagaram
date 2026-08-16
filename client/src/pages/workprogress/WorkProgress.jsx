import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { complaintService, wardService, dustbinService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { ROLES, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from '../../utils/constants';
import { HiTrendingUp, HiCheckCircle, HiRefresh, HiClock, HiExclamation, HiMap, HiCamera, HiUpload, HiTruck, HiSparkles, HiX } from 'react-icons/hi';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'react-hot-toast';
import './WorkProgress.css';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Garbage Truck SVG Icon using L.divIcon to prevent hotlinking/CORS failures
const garbageTruckSVG = `
  <svg viewBox="0 0 64 64" width="38" height="38" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(2, 2)">
      <!-- Truck Body / Garbage Container (Green) -->
      <path d="M4 12 H36 V38 H4 V12 Z" fill="#10b981" rx="2" />
      <path d="M4 12 L12 4 H28 L36 12 Z" fill="#047857" />
      <!-- Cargo lines -->
      <line x1="12" y1="16" x2="12" y2="34" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
      <line x1="20" y1="16" x2="20" y2="34" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
      <line x1="28" y1="16" x2="28" y2="34" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
      
      <!-- Cabin (Orange/Red) -->
      <path d="M36 20 H48 L56 28 V38 H36 V20 Z" fill="#f97316" rx="2" />
      <!-- Cabin Window -->
      <path d="M38 22 H46 L51 28 H38 Z" fill="#e2e8f0" />
      
      <!-- Under Carriage -->
      <rect x="6" y="38" width="46" height="4" fill="#475569" />
      
      <!-- Wheels (Black / Silver center) -->
      <circle cx="16" cy="44" r="7" fill="#1e293b" />
      <circle cx="16" cy="44" r="3" fill="#94a3b8" />
      <circle cx="44" cy="44" r="7" fill="#1e293b" />
      <circle cx="44" cy="44" r="3" fill="#94a3b8" />
    </g>
  </svg>
`;

const vehicleIcon = L.divIcon({
  html: `<div style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">${garbageTruckSVG}</div>`,
  className: 'custom-garbage-truck-marker',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19]
});

// Predefined mock routes for active vehicles around Chennai
const VEHICLE_ROUTES = [
  {
    id: 'V1',
    name: 'Garbage Truck (Zone V)',
    driver: 'M. Palanivel',
    phone: '9845120345',
    type: 'waste_management',
    status: 'Moving',
    path: [
      [13.113, 80.295],
      [13.111, 80.291],
      [13.107, 80.288],
      [13.104, 80.290],
      [13.106, 80.296],
      [13.113, 80.295]
    ]
  },
  {
    id: 'V2',
    name: 'Road Repair Roller',
    driver: 'S. Kumar',
    phone: '9768234512',
    type: 'roads',
    status: 'Working',
    path: [
      [13.087, 80.211],
      [13.085, 80.215],
      [13.081, 80.213],
      [13.084, 80.207],
      [13.087, 80.211]
    ]
  },
  {
    id: 'V3',
    name: 'Water Distribution Tanker',
    driver: 'G. Sundaram',
    phone: '9443210987',
    type: 'water_supply',
    status: 'Refilling',
    path: [
      [13.004, 80.255],
      [13.008, 80.252],
      [13.011, 80.258],
      [13.007, 80.261],
      [13.004, 80.255]
    ]
  }
];

const WorkProgress = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('live_status'); // 'live_status', 'vehicle_tracking', 'daily_tasks'
  const [complaints, setComplaints] = useState([]);
  const [wards, setWards] = useState([]);
  const [dustbins, setDustbins] = useState([]);
  const [roadPath, setRoadPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('');
  const [expandedWards, setExpandedWards] = useState({});

  // Simulation state for moving vehicles
  const [vehicles, setVehicles] = useState(
    VEHICLE_ROUTES.map(r => ({ ...r, currentPos: r.path[0], pathIdx: 0 }))
  );

  // Photo Verification Modal state
  const [selectedTask, setSelectedTask] = useState(null);
  const [uploadImage, setUploadImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Ticking state for live countdown timers
  const [, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const complaintsRes = await complaintService.getAll();
      setComplaints(complaintsRes.data.complaints || []);

      const wardsRes = await wardService.getAll();
      setWards(wardsRes.data.wards || []);

      const dustbinsRes = await dustbinService.getAll();
      setDustbins(dustbinsRes.data.dustbins || []);
    } catch (err) {
      toast.error('Failed to load work progress data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live vehicles coordinate updates interval
  useEffect(() => {
    const timer = setInterval(() => {
      setVehicles(prev =>
        prev.map(v => {
          // Jitter coordinate by a small random step to simulate real-time GPS drifting/driving
          const jitterLat = (Math.random() - 0.5) * 0.003;
          const jitterLng = (Math.random() - 0.5) * 0.003;
          const nextIdx = (v.pathIdx + 1) % v.path.length;
          const targetBase = v.path[nextIdx];
          
          return {
            ...v,
            currentPos: [targetBase[0] + jitterLat, targetBase[1] + jitterLng],
            pathIdx: nextIdx
          };
        })
      );
    }, 3000);
    return () => clearInterval(timer);
  }, []);
  // Map smart dustbins in each ward based on boundary coordinates
  // Must be defined BEFORE optimizedRoute which depends on it
  const mappedDustbins = useMemo(() => {
    const mapped = [...dustbins];
    wards.forEach(w => {
      const exists = dustbins.some(d => d.ward?._id === w._id || d.ward === w._id);
      if (!exists && w.boundaries?.coordinates?.[0]) {
        const coords = w.boundaries.coordinates[0];
        if (coords && coords.length > 0) {
          let sumLat = 0;
          let sumLng = 0;
          coords.forEach(c => {
            if (c && c.length >= 2) {
              sumLng += c[0] || 0;
              sumLat += c[1] || 0;
            }
          });
          const centerLat = sumLat / coords.length;
          const centerLng = sumLng / coords.length;
          if (!isNaN(centerLat) && !isNaN(centerLng)) {
            const capacity = (w.number * 13) % 101;
            mapped.push({
              _id: `mock-${w._id}`,
              dustbinId: `BIN-M${w.number.toString().padStart(4, '0')}`,
              gpsCoordinates: { lat: centerLat, lng: centerLng },
              capacity,
              address: `Smart Waste Bin, Ward ${w.number} Central Hub`,
              ward: w
            });
          }
        }
      }
    });
    return mapped;
  }, [dustbins, wards]);

  const optimizedRoute = useMemo(() => {
    const truck = vehicles[0];
    if (!truck) return { path: [], stops: [] };

    const activeBins = mappedDustbins
      .filter(d => d.capacity >= 50)
      .slice(0, 5);

    const path = [truck.currentPos];
    const stops = [];
    let current = truck.currentPos;
    const remaining = [...activeBins];

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const bin = remaining[i];
        const dist = Math.pow(bin.gpsCoordinates.lat - current[0], 2) + Math.pow(bin.gpsCoordinates.lng - current[1], 2);
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }
      const nextBin = remaining.splice(nearestIdx, 1)[0];
      current = [nextBin.gpsCoordinates.lat, nextBin.gpsCoordinates.lng];
      path.push(current);
      stops.push(nextBin);
    }

    return { path, stops };
  }, [vehicles, mappedDustbins]);

  // Stable string key for OSRM dependency tracking
  const optimizedStopIds = useMemo(
    () => optimizedRoute.stops.map(s => s._id).join(','),
    [optimizedRoute.stops]
  );

  // Fetch actual road routing coordinates from public OSRM API
  useEffect(() => {
    if (activeTab !== 'vehicle_tracking' || optimizedRoute.path.length < 2) return;

    const fetchRoadRoute = async () => {
      try {
        const queryCoords = optimizedRoute.path.map(p => `${p[1]},${p[0]}`).join(';');
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${queryCoords}?overview=full&geometries=geojson`);
        const data = await res.json();
        
        if (data.routes && data.routes[0]) {
          const roadCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRoadPath(roadCoords);
        } else {
          setRoadPath(optimizedRoute.path);
        }
      } catch (err) {
        setRoadPath(optimizedRoute.path);
      }
    };

    fetchRoadRoute();
  }, [activeTab, optimizedStopIds]);

  // Tick countdown timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleWard = (wardId) => {
    setExpandedWards(prev => ({ ...prev, [wardId]: !prev[wardId] }));
  };

  const getFilteredComplaints = () => {
    if (!filterDept) return complaints;
    return complaints.filter(c => c.assignedDepartment?._id === filterDept || c.assignedDepartment === filterDept);
  };

  const filtered = getFilteredComplaints();

  // Statistics calculation
  const totalTasks = filtered.length;
  const inProgressTasks = filtered.filter(c => c.status === 'in_progress').length;
  const resolvedTasks = filtered.filter(c => ['resolved', 'closed', 'verified', 'verification'].includes(c.status)).length;
  const pendingTasks = filtered.filter(c => ['submitted', 'assigned', 'ai_analyzing'].includes(c.status)).length;
  const completionRate = totalTasks ? Math.round((resolvedTasks / totalTasks) * 100) : 0;

  const getGroupedByWard = () => {
    const grouped = {};
    wards.forEach(w => {
      grouped[w._id] = {
        ward: w,
        tasks: []
      };
    });

    filtered.forEach(c => {
      if (c.ward?._id && grouped[c.ward._id]) {
        grouped[c.ward._id].tasks.push(c);
      } else if (c.ward && grouped[c.ward]) {
        grouped[c.ward].tasks.push(c);
      }
    });

    return Object.values(grouped).sort((a, b) => a.ward.number - b.ward.number);
  };

  const wardGroups = getGroupedByWard();

  const getDustbinIcon = (capacity) => {
    // Green (<50%), Yellow (50-80%), Red (80%+)
    const color = capacity < 50 ? '#10b981' : capacity < 80 ? '#f59e0b' : '#ef4444';
    const svg = `
      <svg viewBox="0 0 64 64" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
        <rect x="16" y="16" width="32" height="36" fill="${color}" rx="4" stroke="#1e293b" stroke-width="3" />
        <line x1="22" y1="24" x2="42" y2="24" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
        <line x1="22" y1="32" x2="42" y2="32" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
        <line x1="22" y1="40" x2="42" y2="40" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
        <rect x="12" y="10" width="40" height="6" fill="#1e293b" rx="2" stroke="#1e293b" stroke-width="1" />
        <rect x="24" y="6" width="16" height="4" fill="#1e293b" rx="1" stroke="#1e293b" stroke-width="1" />
      </svg>
    `;
    return L.divIcon({
      html: `<div style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.35));">${svg}</div>`,
      className: 'custom-dustbin-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14]
    });
  };
  // optimizedRoute is computed above as a useMemo (before the OSRM useEffect)

  const departments = Array.from(new Set(complaints
    .map(c => c.assignedDepartment)
    .filter(Boolean)
    .map(d => JSON.stringify({ id: d._id || d, name: d.name || 'Assigned Department' }))
  )).map(str => JSON.parse(str));

  // Determine supervisor's ward
  const supervisorWardId = user?.ward?._id || user?.ward;
  const supervisorWardGroup = wardGroups.find(g => g.ward._id === supervisorWardId);

  // Daily SLA Tasks Filter
  // Daily tasks represent unresolved items filed recently, with target completion times
  const getDailyTasks = () => {
    let baseTasks = [];
    if (user?.role === ROLES.SUPERVISOR) {
      baseTasks = supervisorWardGroup ? supervisorWardGroup.tasks : [];
    } else {
      baseTasks = filtered;
    }
    // Filter active unresolved/unverified tasks
    return baseTasks.filter(c => ['submitted', 'assigned', 'in_progress'].includes(c.status));
  };

  const dailyTasks = getDailyTasks();

  // SLA target calculations: High = 4h, Medium = 8h, Low = 12h
  const getSLADuration = (priority) => {
    if (priority === 'critical' || priority === 'high') return 4 * 60 * 60 * 1000;
    if (priority === 'medium') return 8 * 60 * 60 * 1000;
    return 12 * 60 * 60 * 1000;
  };

  const getSLATimer = (task) => {
    const createdTime = new Date(task.createdAt).getTime();
    const duration = getSLADuration(task.priority);
    const targetTime = createdTime + duration;
    const now = Date.now();
    const diff = targetTime - now;

    const formatDiff = (ms) => {
      const isOverdue = ms < 0;
      const absMs = Math.abs(ms);
      const hours = Math.floor(absMs / (60 * 60 * 1000));
      const minutes = Math.floor((absMs % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((absMs % (60 * 1000)) / 1000);

      const timeString = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
      return {
        timeString,
        isOverdue,
        color: isOverdue ? 'var(--status-error)' : hours < 1 ? 'var(--priority-high)' : 'var(--status-resolved)'
      };
    };

    return formatDiff(diff);
  };

  // Image Upload Handlers
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoVerificationSubmit = async (e) => {
    e.preventDefault();
    if (!uploadImage) {
      toast.error('Please capture or choose a completion photo');
      return;
    }

    setSubmittingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('image', uploadImage);
      formData.append('type', 'after');

      await complaintService.verify(selectedTask._id, formData);
      toast.success('Task verification photo uploaded successfully! Status changed to Verification.');
      setSelectedTask(null);
      setUploadImage(null);
      setImagePreview(null);
      fetchData();
    } catch (err) {
      toast.error('Photo verification upload failed');
      console.error(err);
    } finally {
      setSubmittingPhoto(false);
    }
  };

  return (
    <div className="work-progress animate-fade-in">
      <div className="work-progress__header">
        <div>
          <h1>City Work Progress & Live Status</h1>
          <p className="work-progress__subtitle">
            {user?.role === ROLES.SUPER_ADMIN 
              ? 'Real-time overview of municipal tasks, resolutions, and operational performance across all wards'
              : `Live tracking of task resolutions and field operations in Ward ${user?.ward?.number || ''} (${user?.ward?.name || 'Assigned Ward'})`
            }
          </p>
        </div>
        <button className="work-progress__refresh-btn" onClick={fetchData} disabled={loading}>
          <HiRefresh className={loading ? 'animate-spin' : ''} /> Refresh Status
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="tabs-container glass-card" style={{ display: 'flex', gap: '8px', padding: '6px', marginBottom: '24px', borderRadius: '12px' }}>
        <button 
          onClick={() => setActiveTab('live_status')} 
          className={`tab-btn ${activeTab === 'live_status' ? 'tab-btn--active' : ''}`}
          style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'live_status' ? 'var(--gradient-primary)' : 'none', color: activeTab === 'live_status' ? 'white' : 'var(--text-secondary)' }}
        >
          📊 Live Ward Status
        </button>
        <button 
          onClick={() => setActiveTab('vehicle_tracking')} 
          className={`tab-btn ${activeTab === 'vehicle_tracking' ? 'tab-btn--active' : ''}`}
          style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'vehicle_tracking' ? 'var(--gradient-primary)' : 'none', color: activeTab === 'vehicle_tracking' ? 'white' : 'var(--text-secondary)' }}
        >
          🚚 Live Vehicle Tracking
        </button>
        <button 
          onClick={() => setActiveTab('daily_tasks')} 
          className={`tab-btn ${activeTab === 'daily_tasks' ? 'tab-btn--active' : ''}`}
          style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'daily_tasks' ? 'var(--gradient-primary)' : 'none', color: activeTab === 'daily_tasks' ? 'white' : 'var(--text-secondary)' }}
        >
          ⏰ Daily SLA Tasks ({dailyTasks.length})
        </button>
      </div>

      {/* Metrics Dashboard */}
      {activeTab === 'live_status' && (
        <div className="work-progress__metrics">
          <div className="metric-card glass-card">
            <div className="metric-card__icon" style={{ color: 'var(--accent-primary)', background: 'rgba(239, 68, 68, 0.1)' }}>
              <HiTrendingUp />
            </div>
            <div>
              <h3>Total Filed Tasks</h3>
              <p className="metric-value">{totalTasks}</p>
            </div>
          </div>

          <div className="metric-card glass-card">
            <div className="metric-card__icon" style={{ color: 'var(--status-in-progress)', background: 'rgba(245, 158, 11, 0.1)' }}>
              <HiClock />
            </div>
            <div>
              <h3>Active / In Progress</h3>
              <p className="metric-value">{inProgressTasks}</p>
            </div>
          </div>

          <div className="metric-card glass-card">
            <div className="metric-card__icon" style={{ color: 'var(--status-resolved)', background: 'rgba(16, 185, 129, 0.1)' }}>
              <HiCheckCircle />
            </div>
            <div>
              <h3>Resolved & Done</h3>
              <p className="metric-value">{resolvedTasks}</p>
            </div>
          </div>

          <div className="metric-card glass-card">
            <div className="metric-card__icon" style={{ color: 'var(--status-submitted)', background: 'rgba(99, 102, 241, 0.1)' }}>
              <HiExclamation />
            </div>
            <div>
              <h3>Resolution Rate</h3>
              <p className="metric-value">{completionRate}%</p>
              <div className="progress-bar-container" style={{ width: '100px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', marginTop: '6px' }}>
                <div className="progress-bar-fill" style={{ width: `${completionRate}%`, height: '100%', background: 'var(--status-resolved)', borderRadius: '3px' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Tab View Rendering */}
      {loading ? (
        <div className="work-progress__loading">
          <div className="animate-spin" />
        </div>
      ) : activeTab === 'live_status' ? (
        /* ==================== TAB 1: LIVE STATUS / WARD-WISE VIEW ==================== */
        <div>
          <div className="work-progress__filters glass-card">
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter by Department:</span>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '13px', background: 'white' }}>
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {user?.role === ROLES.SUPER_ADMIN ? (
            <div className="ward-progress-container">
              {wardGroups.map(({ ward, tasks }) => {
                const wardTotal = tasks.length;
                const wardResolved = tasks.filter(t => ['resolved', 'closed', 'verified', 'verification'].includes(t.status)).length;
                const wardActive = tasks.filter(t => ['in_progress', 'assigned'].includes(t.status)).length;
                const wardCompletion = wardTotal ? Math.round((wardResolved / wardTotal) * 100) : 0;
                const isExpanded = expandedWards[ward._id] === true;

                return (
                  <div key={ward._id} className="ward-progress-card glass-card" style={{ marginBottom: '20px', padding: 0, overflow: 'hidden' }}>
                    <div className="ward-progress-card__header" onClick={() => toggleWard(ward._id)} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'var(--bg-secondary)', borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="ward-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                          {ward.number}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{ward.name}</h3>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                            Population: {ward.population.toLocaleString('en-IN')} citizens
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                          <span>📋 <strong>{wardTotal}</strong> Tasks</span>
                          <span style={{ color: 'var(--status-in-progress)' }}>⚡ <strong>{wardActive}</strong> Active</span>
                          <span style={{ color: 'var(--status-resolved)' }}>✅ <strong>{wardResolved}</strong> Done</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{wardCompletion}%</span>
                          <div className="progress-bar-container" style={{ width: '80px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px' }}>
                            <div className="progress-bar-fill" style={{ width: `${wardCompletion}%`, height: '100%', background: 'var(--status-resolved)', borderRadius: '3px' }}></div>
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="ward-progress-card__body" style={{ padding: '20px' }}>
                        {tasks.length === 0 ? (
                          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, textAlign: 'center', padding: '12px' }}>
                            No complaints registered or assigned in this ward.
                          </p>
                        ) : (
                          <div className="tasks-progress-table-wrapper">
                            <table className="tasks-progress-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                              <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                  <th style={{ padding: '8px 12px' }}>ID</th>
                                  <th style={{ padding: '8px 12px' }}>Complaint Title</th>
                                  <th style={{ padding: '8px 12px' }}>Department</th>
                                  <th style={{ padding: '8px 12px' }}>Priority</th>
                                  <th style={{ padding: '8px 12px' }}>Status</th>
                                  <th style={{ padding: '8px 12px' }}>Assigned Supervisor</th>
                                  <th style={{ padding: '8px 12px' }}>Assigned Worker</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tasks.map(t => (
                                  <tr key={t._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '12px', fontWeight: 600 }}>{t.complaintId}</td>
                                    <td style={{ padding: '12px' }}>
                                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</div>
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.address}</div>
                                    </td>
                                    <td style={{ padding: '12px' }}>{t.assignedDepartment?.name || '—'}</td>
                                    <td style={{ padding: '12px' }}>
                                      <span className="priority-dot" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: PRIORITY_COLORS[t.priority] || 'var(--text-primary)' }}>
                                        ● {t.priority.toUpperCase()}
                                      </span>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                      <span className="status-badge" style={{ 
                                        padding: '3px 8px', 
                                        borderRadius: '12px', 
                                        fontSize: '11px', 
                                        fontWeight: 600, 
                                        background: `${STATUS_COLORS[t.status]}15`, 
                                        color: STATUS_COLORS[t.status],
                                        border: `1px solid ${STATUS_COLORS[t.status]}30`
                                      }}>
                                        {STATUS_LABELS[t.status] || t.status}
                                      </span>
                                    </td>
                                    <td style={{ padding: '12px' }}>{t.assignedSupervisor?.name || '—'}</td>
                                    <td style={{ padding: '12px' }}>{t.assignedWorker?.name || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="supervisor-progress-container glass-card" style={{ padding: '24px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HiMap style={{ color: 'var(--accent-primary)' }} /> Live Tasks in Ward {user?.ward?.number || ''}: {user?.ward?.name || ''}
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Assigned field operations and verification workflow
                  </p>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                  📈 Ward Resolution Rate: {supervisorWardGroup?.tasks.length ? Math.round((supervisorWardGroup.tasks.filter(t => ['resolved', 'closed', 'verified', 'verification'].includes(t.status)).length / supervisorWardGroup.tasks.length) * 100) : 0}%
                </div>
              </div>

              {!supervisorWardGroup || supervisorWardGroup.tasks.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>
                  No tasks registered in your assigned ward.
                </p>
              ) : (
                <div className="tasks-progress-table-wrapper">
                  <table className="tasks-progress-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 12px' }}>ID</th>
                        <th style={{ padding: '8px 12px' }}>Task Description</th>
                        <th style={{ padding: '8px 12px' }}>Department</th>
                        <th style={{ padding: '8px 12px' }}>Priority</th>
                        <th style={{ padding: '8px 12px' }}>Live Status</th>
                        <th style={{ padding: '8px 12px' }}>Assigned Worker</th>
                        <th style={{ padding: '8px 12px' }}>Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supervisorWardGroup.tasks.map(t => (
                        <tr key={t._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px', fontWeight: 600 }}>{t.complaintId}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.address}</div>
                          </td>
                          <td style={{ padding: '12px' }}>{t.assignedDepartment?.name || '—'}</td>
                          <td style={{ padding: '12px' }}>
                            <span className="priority-dot" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: PRIORITY_COLORS[t.priority] || 'var(--text-primary)' }}>
                              ● {t.priority.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className="status-badge" style={{ 
                              padding: '3px 8px', 
                              borderRadius: '12px', 
                              fontSize: '11px', 
                              fontWeight: 600, 
                              background: `${STATUS_COLORS[t.status]}15`, 
                              color: STATUS_COLORS[t.status],
                              border: `1px solid ${STATUS_COLORS[t.status]}30`
                            }}>
                              {STATUS_LABELS[t.status] || t.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>{t.assignedWorker?.name || '—'}</td>
                          <td style={{ padding: '12px' }}>{new Date(t.updatedAt).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ) : activeTab === 'vehicle_tracking' ? (
        /* ==================== TAB 2: LIVE VEHICLE TRACKING ==================== */
        <div className="vehicle-tracking-container glass-card" style={{ padding: '20px', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>📍 Live Municipal GPS Fleet Tracking</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Real-time location simulation of active garbage trucks and water tankers</p>
            </div>
            <span style={{ fontSize: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-resolved)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
              ● Fleet Online (3 / 3 Active)
            </span>
          </div>

          <div className="vehicle-tracking-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Map Column */}
            <div style={{ height: '400px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', zIndex: 1 }}>
              <MapContainer center={[13.0827, 80.2707]} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {vehicles.map(v => (
                  <Marker key={v.id} position={v.currentPos} icon={vehicleIcon}>
                    <Popup>
                      <div style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
                        <h4 style={{ margin: '0 0 4px 0', color: 'var(--accent-primary)' }}>{v.name}</h4>
                        <p style={{ margin: '2px 0' }}><strong>Driver:</strong> {v.driver}</p>
                        <p style={{ margin: '2px 0' }}><strong>Phone:</strong> {v.phone}</p>
                        <p style={{ margin: '2px 0' }}><strong>Live Status:</strong> <span style={{ color: 'var(--status-resolved)', fontWeight: 600 }}>{v.status}</span></p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {vehicles.map(v => (
                  <Polyline key={`route-${v.id}`} positions={v.path} color="var(--accent-primary)" opacity={0.3} weight={4} dashArray="5, 10" />
                ))}
                {/* Render Optimized Road-network Garbage Collection Route Polyline */}
                {roadPath.length > 1 ? (
                  <Polyline positions={roadPath} color="#9333ea" weight={5} opacity={0.8} dashArray="5, 8" />
                ) : optimizedRoute.path.length > 1 ? (
                  <Polyline positions={optimizedRoute.path} color="#9333ea" weight={5} opacity={0.8} dashArray="10, 10" />
                ) : null}
                {mappedDustbins.map(d => (
                  <Marker 
                    key={d._id} 
                    position={[d.gpsCoordinates.lat, d.gpsCoordinates.lng]} 
                    icon={getDustbinIcon(d.capacity)}
                  >
                    <Popup>
                      <div style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
                        <h4 style={{ margin: '0 0 4px 0', color: d.capacity >= 80 ? 'var(--status-error)' : 'var(--text-primary)' }}>
                          🗑️ Smart Bin {d.dustbinId}
                        </h4>
                        <p style={{ margin: '2px 0' }}><strong>Location:</strong> {d.address}</p>
                        <p style={{ margin: '2px 0' }}><strong>Ward:</strong> {d.ward?.number || '—'} ({d.ward?.name || '—'})</p>
                        <p style={{ margin: '2px 0' }}>
                          <strong>Fill Capacity:</strong> 
                          <span style={{ 
                            fontWeight: 700, 
                            color: d.capacity < 50 ? 'var(--status-resolved)' : d.capacity < 80 ? 'var(--status-in-progress)' : 'var(--status-error)'
                          }}>
                            {" "}{d.capacity}% Filled
                          </span>
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* Route Details Column */}
            <div className="optimized-route-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔄 Smart Route Optimization (TSP)
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                Live dispatch path calculated dynamically for full/overflowing dustbins
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, maxHeight: '280px', paddingRight: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }}></div>
                  <strong>Start:</strong> Garbage Truck V1 Current Location
                </div>
                {optimizedRoute.stops.map((stop, idx) => (
                  <div key={stop._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', borderLeft: '2px solid var(--border-color)', paddingLeft: '12px', marginLeft: '3px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, background: stop.capacity >= 80 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: stop.capacity >= 80 ? 'var(--status-error)' : 'var(--status-in-progress)', padding: '2px 6px', borderRadius: '4px' }}>
                      Stop {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{stop.dustbinId}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{stop.capacity}% Filled ({stop.address.slice(0, 18)}...)</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, borderTop: '1px solid var(--border-color)', paddingTop: '8px', color: 'var(--status-resolved)' }}>
                <span>📦 Total Bins: {optimizedRoute.stops.length}</span>
                <span>⚡ Est. Duration: {optimizedRoute.stops.length * 15} mins</span>
              </div>
            </div>
          </div>

          {/* Live Fleet Cards list */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px', marginTop: '16px' }}>
            {vehicles.map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '24px' }}>🚚</div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>{v.name}</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Driver: {v.driver} ({v.phone})</p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-resolved)', padding: '2px 6px', borderRadius: '4px' }}>{v.status}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ==================== TAB 3: DAILY SLA TASKS ==================== */
        <div className="daily-tasks-container glass-card" style={{ padding: '24px' }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>⏱️ Daily SLA Resolution Board</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Tasks with mandatory deadlines based on priority. Supervisors must verify completion with photo capture.
            </p>
          </div>

          {dailyTasks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>
              🎉 Hurrah! No pending daily SLA tasks. Everything is resolved!
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {dailyTasks.map(t => {
                const timer = getSLATimer(t);
                return (
                  <div key={t._id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>{t.complaintId}</span>
                      <span className="status-badge" style={{ 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        fontSize: '10px', 
                        fontWeight: 600, 
                        background: `${STATUS_COLORS[t.status]}15`, 
                        color: STATUS_COLORS[t.status]
                      }}>
                        {STATUS_LABELS[t.status] || t.status}
                      </span>
                    </div>

                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700 }}>{t.title}</h4>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{t.address}</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>⏱️ SLA Countdown:</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: timer.color }}>
                        {timer.isOverdue ? '⚠️ OVERDUE ' : ''} {timer.timeString}
                      </span>
                    </div>

                    <button 
                      onClick={() => setSelectedTask(t)}
                      className="work-progress__action-btn"
                      style={{ 
                        width: '100%', 
                        padding: '10px', 
                        border: 'none', 
                        borderRadius: '6px', 
                        background: 'var(--gradient-primary)', 
                        color: 'white', 
                        fontWeight: 600, 
                        fontSize: '12px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <HiCamera /> Capture Completion Photo
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Completion Photo Modal */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-card animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Verify Completion: {selectedTask.complaintId}</h2>
              <button className="modal-close" onClick={() => setSelectedTask(null)}><HiX /></button>
            </div>
            <form onSubmit={handlePhotoVerificationSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Upload a photo of the completed work at <strong>{selectedTask.address}</strong> to resolve the SLA task.
                </p>

                {imagePreview ? (
                  <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img src={imagePreview} alt="Work Completion" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      type="button" 
                      onClick={() => { setUploadImage(null); setImagePreview(null); }}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: 'white', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <HiX />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    style={{ width: '100%', height: '180px', border: '2px dashed var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', background: 'var(--bg-tertiary)' }}
                  >
                    <HiUpload style={{ fontSize: '32px', color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Click to upload completion photo</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Supports PNG, JPG, JPEG</span>
                  </div>
                )}

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageSelect} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-cancel" onClick={() => setSelectedTask(null)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={submittingPhoto || !uploadImage}>
                  {submittingPhoto ? 'Uploading...' : 'Submit Verification Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkProgress;
