import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { complaintService, wardService, dustbinService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { ROLES, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from '../../utils/constants';
import {
  HiTrendingUp, HiCheckCircle, HiRefresh, HiClock,
  HiMap, HiCamera, HiUpload,
  HiSparkles, HiX, HiSearch, HiChevronDown, HiChevronLeft, HiChevronRight, HiOfficeBuilding,
  HiPlay, HiPause, HiFilter, HiPhone, HiEye,
} from 'react-icons/hi';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import './WorkProgress.css';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Garbage Truck SVG Icon
const getVehicleSVG = (type, status) => {
  const isMoving = status === 'Moving';
  const color = type === 'waste_management' ? '#10b981' : type === 'roads' ? '#f59e0b' : '#3b82f6';
  return `
    <svg viewBox="0 0 64 64" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(2, 2)">
        <path d="M4 12 H36 V38 H4 V12 Z" fill="${color}" rx="2" />
        <path d="M4 12 L12 4 H28 L36 12 Z" fill="#047857" />
        <line x1="12" y1="16" x2="12" y2="34" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        <line x1="20" y1="16" x2="20" y2="34" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        <line x1="28" y1="16" x2="28" y2="34" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        <path d="M36 20 H48 L56 28 V38 H36 V20 Z" fill="#f97316" rx="2" />
        <path d="M38 22 H46 L51 28 H38 Z" fill="#e2e8f0" />
        <rect x="6" y="38" width="46" height="4" fill="#475569" />
        <circle cx="16" cy="44" r="7" fill="#1e293b" />
        <circle cx="16" cy="44" r="3" fill="#94a3b8" />
        <circle cx="44" cy="44" r="7" fill="#1e293b" />
        <circle cx="44" cy="44" r="3" fill="#94a3b8" />
      </g>
    </svg>
  `;
};

const createVehicleIcon = (type, status) => {
  return L.divIcon({
    html: `<div class="custom-vehicle-marker ${status === 'Moving' ? 'custom-vehicle-marker--moving' : ''}" style="filter: drop-shadow(0px 2px 5px rgba(0,0,0,0.35));">${getVehicleSVG(type, status)}</div>`,
    className: 'vehicle-marker-wrapper',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

// Predefined mock routes for active vehicles around Chennai
const VEHICLE_ROUTES = [
  {
    id: 'V1',
    name: 'Garbage Truck (Zone V)',
    driver: 'M. Palanivel',
    phone: '+91 98451 20345',
    type: 'waste_management',
    typeName: 'Waste Management',
    status: 'Moving',
    speed: '28 km/h',
    fuel: '76%',
    ward: 'Ward 5 (Royapuram)',
    path: [
      [13.113, 80.295],
      [13.111, 80.291],
      [13.107, 80.288],
      [13.104, 80.290],
      [13.106, 80.296],
      [13.113, 80.295],
    ],
  },
  {
    id: 'V2',
    name: 'Road Repair Roller',
    driver: 'S. Kumar',
    phone: '+91 97682 34512',
    type: 'roads',
    typeName: 'Roads & Infrastructure',
    status: 'Working',
    speed: '8 km/h',
    fuel: '62%',
    ward: 'Ward 8 (Anna Nagar)',
    path: [
      [13.087, 80.211],
      [13.085, 80.215],
      [13.081, 80.213],
      [13.084, 80.207],
      [13.087, 80.211],
    ],
  },
  {
    id: 'V3',
    name: 'Water Distribution Tanker',
    driver: 'G. Sundaram',
    phone: '+91 94432 10987',
    type: 'water_supply',
    typeName: 'Water Supply',
    status: 'Refilling',
    speed: '0 km/h',
    fuel: '90%',
    ward: 'Ward 13 (Adyar)',
    path: [
      [13.004, 80.255],
      [13.008, 80.252],
      [13.011, 80.258],
      [13.007, 80.261],
      [13.004, 80.255],
    ],
  },
];

const WorkProgress = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('live_status'); // 'live_status', 'vehicle_tracking', 'daily_tasks'
  const [complaints, setComplaints] = useState([]);
  const [wards, setWards] = useState([]);
  const [dustbins, setDustbins] = useState([]);
  const [roadPath, setRoadPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedSeconds, setLastUpdatedSeconds] = useState(0);

  // Tab 1 Filters & Pagination
  const [filterDept, setFilterDept] = useState('');
  const [searchWard, setSearchWard] = useState('');
  const [expandedWards, setExpandedWards] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Tab 2 Vehicle Tracking State
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isRouteSimulating, setIsRouteSimulating] = useState(true);
  const [mapLayers, setMapLayers] = useState({
    vehicles: true,
    smartBins: true,
    routePath: true,
  });

  // Simulation state for moving vehicles
  const [vehicles, setVehicles] = useState(
    VEHICLE_ROUTES.map((r) => ({ ...r, currentPos: r.path[0], pathIdx: 0 }))
  );

  // Photo Verification Modal state
  const [selectedTask, setSelectedTask] = useState(null);
  const [uploadImage, setUploadImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Ticking state for live countdown timers and refresh ticker
  const [, setTick] = useState(0);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const [complaintsRes, wardsRes, dustbinsRes] = await Promise.all([
        complaintService.getAll(),
        wardService.getAll(),
        dustbinService.getAll(),
      ]);

      setComplaints(complaintsRes.data.complaints || []);
      setWards(wardsRes.data.wards || []);
      setDustbins(dustbinsRes.data.dustbins || []);
      setLastUpdatedSeconds(0);

      if (isManualRefresh) {
        toast.success('Live operational status refreshed');
      }
    } catch (err) {
      toast.error('Failed to load work progress data');
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Second ticker for timers & last updated ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
      setLastUpdatedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset page to 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDept, searchWard]);

  // Escape key handler for active modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedVehicle) setSelectedVehicle(null);
        if (selectedTask) {
          setSelectedTask(null);
          setUploadImage(null);
          setImagePreview(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVehicle, selectedTask]);

  // Live vehicles coordinate simulation
  useEffect(() => {
    if (!isRouteSimulating) return;

    const timer = setInterval(() => {
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.status !== 'Moving') return v;

          const jitterLat = (Math.random() - 0.5) * 0.002;
          const jitterLng = (Math.random() - 0.5) * 0.002;
          const nextIdx = (v.pathIdx + 1) % v.path.length;
          const targetBase = v.path[nextIdx];

          return {
            ...v,
            currentPos: [targetBase[0] + jitterLat, targetBase[1] + jitterLng],
            pathIdx: nextIdx,
          };
        })
      );
    }, 3000);
    return () => clearInterval(timer);
  }, [isRouteSimulating]);

  // Map smart dustbins
  const mappedDustbins = useMemo(() => {
    const mapped = dustbins.map((d) => ({
      _id: d._id,
      dustbinId: d.binId || d.dustbinId || `BIN-${d._id?.slice(-4)}`,
      gpsCoordinates: {
        lat: d.gpsCoordinates?.lat ?? d.lat ?? 13.0827,
        lng: d.gpsCoordinates?.lng ?? d.lng ?? 80.2707,
      },
      capacity: d.capacity || 0,
      address: d.address || 'Smart Waste Bin',
      ward: d.ward,
    }));

    wards.forEach((w) => {
      const exists = mapped.some((d) => d.ward?._id === w._id || d.ward === w._id);
      if (!exists && w.boundaries?.coordinates?.[0]) {
        const coords = w.boundaries.coordinates[0];
        if (coords && coords.length > 0) {
          let sumLat = 0;
          let sumLng = 0;
          coords.forEach((c) => {
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
              ward: w,
            });
          }
        }
      }
    });
    return mapped;
  }, [dustbins, wards]);

  // Optimized Route Calculation
  const optimizedRoute = useMemo(() => {
    const truck = vehicles[0];
    if (!truck) return { path: [], stops: [] };

    const activeBins = mappedDustbins.filter((d) => d.capacity >= 50).slice(0, 5);

    const path = [truck.currentPos];
    const stops = [];
    let current = truck.currentPos;
    const remaining = [...activeBins];

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const bin = remaining[i];
        const dist =
          Math.pow(bin.gpsCoordinates.lat - current[0], 2) +
          Math.pow(bin.gpsCoordinates.lng - current[1], 2);
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

  const optimizedStopIds = useMemo(
    () => optimizedRoute.stops.map((s) => s._id).join(','),
    [optimizedRoute.stops]
  );

  // Fetch actual road routing coordinates from OSRM
  useEffect(() => {
    if (activeTab !== 'vehicle_tracking' || optimizedRoute.path.length < 2) return;

    const fetchRoadRoute = async () => {
      try {
        const queryCoords = optimizedRoute.path.map((p) => `${p[1]},${p[0]}`).join(';');
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${queryCoords}?overview=full&geometries=geojson`
        );
        const data = await res.json();

        if (data.routes && data.routes[0]) {
          const roadCoords = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
          setRoadPath(roadCoords);
        } else {
          setRoadPath(optimizedRoute.path);
        }
      } catch {
        setRoadPath(optimizedRoute.path);
      }
    };

    fetchRoadRoute();
  }, [activeTab, optimizedStopIds]);

  const toggleWard = (wardId) => {
    setExpandedWards((prev) => ({ ...prev, [wardId]: !prev[wardId] }));
  };

  const getFilteredComplaints = () => {
    if (!filterDept) return complaints;
    return complaints.filter(
      (c) => c.assignedDepartment?._id === filterDept || c.assignedDepartment === filterDept
    );
  };

  const filtered = getFilteredComplaints();

  // Statistics calculation
  const totalTasks = filtered.length;
  const inProgressTasks = filtered.filter((c) => c.status === 'in_progress').length;
  const resolvedTasks = filtered.filter((c) =>
    ['resolved', 'closed', 'verified', 'verification'].includes(c.status)
  ).length;
  const completionRate = totalTasks ? Math.round((resolvedTasks / totalTasks) * 100) : 0;

  // Grouped by Ward
  const allWardGroups = useMemo(() => {
    const grouped = {};
    wards.forEach((w) => {
      grouped[w._id] = {
        ward: w,
        tasks: [],
      };
    });

    filtered.forEach((c) => {
      const wId = c.ward?._id || c.ward;
      if (wId && grouped[wId]) {
        grouped[wId].tasks.push(c);
      }
    });

    let list = Object.values(grouped).sort((a, b) => a.ward.number - b.ward.number);

    if (searchWard.trim()) {
      const q = searchWard.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.ward.name.toLowerCase().includes(q) ||
          String(g.ward.number).includes(q)
      );
    }

    return list;
  }, [wards, filtered, searchWard]);

  // Paginated Wards
  const totalWardsCount = allWardGroups.length;
  const totalPages = Math.max(1, Math.ceil(totalWardsCount / pageSize));
  const paginatedWardGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allWardGroups.slice(start, start + pageSize);
  }, [allWardGroups, currentPage, pageSize]);

  const departments = useMemo(() => {
    const map = new Map();
    complaints.forEach((c) => {
      if (c.assignedDepartment) {
        const id = c.assignedDepartment._id || c.assignedDepartment;
        const name = c.assignedDepartment.name || 'Assigned Department';
        if (!map.has(id)) {
          map.set(id, { id, name });
        }
      }
    });
    return Array.from(map.values());
  }, [complaints]);

  // Filtered Vehicles for Tab 2
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        !vehicleSearch.trim() ||
        v.name.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        v.driver.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        v.ward.toLowerCase().includes(vehicleSearch.toLowerCase());

      const matchesType = vehicleTypeFilter === 'all' || v.type === vehicleTypeFilter;
      const matchesStatus = vehicleStatusFilter === 'all' || v.status === vehicleStatusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [vehicles, vehicleSearch, vehicleTypeFilter, vehicleStatusFilter]);

  // Supervisor's ward
  const supervisorWardId = user?.ward?._id || user?.ward;
  const supervisorWardGroup = allWardGroups.find((g) => g.ward._id === supervisorWardId);

  // Daily SLA tasks
  const dailyTasks = useMemo(() => {
    let baseTasks = [];
    if (user?.role === ROLES.SUPERVISOR) {
      baseTasks = supervisorWardGroup ? supervisorWardGroup.tasks : [];
    } else {
      baseTasks = filtered;
    }
    return baseTasks.filter((c) => ['submitted', 'assigned', 'in_progress'].includes(c.status));
  }, [user, supervisorWardGroup, filtered]);

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
        color: isOverdue
          ? 'var(--status-error)'
          : hours < 1
          ? 'var(--priority-high)'
          : 'var(--status-resolved)',
      };
    };

    return formatDiff(diff);
  };

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
      toast.success('Task verification photo uploaded successfully!');
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
      {/* ── 1. Header ──────────────────────────────── */}
      <div className="work-progress__header">
        <div>
          <h1 className="work-progress__title">City Work Progress & Live Status</h1>
          <p className="work-progress__subtitle">
            {user?.role === ROLES.SUPER_ADMIN
              ? 'Real-time overview of municipal tasks, resolutions, and operational performance across all wards'
              : `Live tracking of task resolutions and field operations in Ward ${user?.ward?.number || ''} (${user?.ward?.name || 'Assigned Ward'})`}
          </p>
        </div>
      </div>

      {/* ── 2. Top Navigation Tabs + Action Bar ────── */}
      <div className="work-progress__tabs-row">
        <div className="work-progress__tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'live_status'}
            onClick={() => setActiveTab('live_status')}
            className={`tab-btn ${activeTab === 'live_status' ? 'tab-btn--active' : ''}`}
          >
            <span className="tab-icon">📊</span>
            <span>Live Ward Status</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'vehicle_tracking'}
            onClick={() => setActiveTab('vehicle_tracking')}
            className={`tab-btn ${activeTab === 'vehicle_tracking' ? 'tab-btn--active' : ''}`}
          >
            <span className="tab-icon">🚚</span>
            <span>Fleet Operations & Tracking</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'daily_tasks'}
            onClick={() => setActiveTab('daily_tasks')}
            className={`tab-btn ${activeTab === 'daily_tasks' ? 'tab-btn--active' : ''}`}
          >
            <span className="tab-icon">⏰</span>
            <span>Daily SLA Tasks ({dailyTasks.length})</span>
          </button>
        </div>

        <div className="work-progress__actions-group">
          <span className="live-ticker">
            <span className="live-ticker__dot" />
            Updated {lastUpdatedSeconds < 5 ? 'just now' : `${lastUpdatedSeconds}s ago`}
          </span>

          <button
            className={`btn btn-secondary work-progress__refresh-btn ${isRefreshing ? 'work-progress__refresh-btn--loading' : ''}`}
            onClick={() => fetchData(true)}
            disabled={isRefreshing || loading}
            aria-label="Refresh operational status"
          >
            <HiRefresh className={`refresh-icon ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing…' : 'Refresh Status'}</span>
          </button>
        </div>
      </div>

      {/* ── 3. KPI Metrics Dashboard (Tab 1) ────────── */}
      {activeTab === 'live_status' && (
        <div className="work-progress__metrics">
          <div className="metric-card glass-card">
            <div className="metric-card__header">
              <span className="metric-card__label">Total Filed Tasks</span>
              <div className="metric-card__icon metric-card__icon--blue">
                <HiTrendingUp />
              </div>
            </div>
            <p className="metric-card__value">{totalTasks}</p>
            <div className="metric-card__footer">
              <span className="metric-card__tag">City-wide</span>
              <span className="metric-card__sub">All registered items</span>
            </div>
          </div>

          <div className="metric-card glass-card">
            <div className="metric-card__header">
              <span className="metric-card__label">Active / In Progress</span>
              <div className="metric-card__icon metric-card__icon--amber">
                <HiClock />
              </div>
            </div>
            <p className="metric-card__value metric-card__value--amber">{inProgressTasks}</p>
            <div className="metric-card__footer">
              <span className="metric-card__tag metric-card__tag--amber">Active</span>
              <span className="metric-card__sub">Under field resolution</span>
            </div>
          </div>

          <div className="metric-card glass-card">
            <div className="metric-card__header">
              <span className="metric-card__label">Resolved & Done</span>
              <div className="metric-card__icon metric-card__icon--emerald">
                <HiCheckCircle />
              </div>
            </div>
            <p className="metric-card__value metric-card__value--emerald">{resolvedTasks}</p>
            <div className="metric-card__footer">
              <span className="metric-card__tag metric-card__tag--emerald">Completed</span>
              <span className="metric-card__sub">Verified resolutions</span>
            </div>
          </div>

          <div className="metric-card glass-card">
            <div className="metric-card__header">
              <span className="metric-card__label">Resolution Rate</span>
              <div className="metric-card__icon metric-card__icon--indigo">
                <HiSparkles />
              </div>
            </div>
            <div className="metric-card__rate-row">
              <p className="metric-card__value">{completionRate}%</p>
              <div className="wp-progress-bar">
                <div
                  className="wp-progress-bar__fill"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
            <div className="metric-card__footer">
              <span className="metric-card__tag">Target: 85%</span>
              <span className="metric-card__sub">Completion efficiency</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Main Tab Views ───────────────────────── */}
      {loading ? (
        <div className="work-progress__loading">
          <div className="animate-spin" />
          <p className="work-progress__loading-text">Loading live municipal operations…</p>
        </div>
      ) : activeTab === 'live_status' ? (
        /* ==================== TAB 1: LIVE WARD STATUS ==================== */
        <div>
          {/* Toolbar */}
          <div className="work-progress__toolbar glass-card">
            <div className="wp-search">
              <HiSearch className="wp-search__icon" />
              <input
                type="text"
                placeholder="Search ward by name or number…"
                value={searchWard}
                onChange={(e) => setSearchWard(e.target.value)}
                className="wp-search__input"
              />
              {searchWard && (
                <button
                  className="wp-search__clear"
                  onClick={() => setSearchWard('')}
                  aria-label="Clear ward search"
                >
                  <HiX />
                </button>
              )}
            </div>

            <div className="wp-filters">
              <div className="wp-select-wrapper">
                <HiOfficeBuilding className="wp-select__icon" />
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="wp-select"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {(filterDept || searchWard) && (
                <button
                  className="btn btn-secondary wp-clear-btn"
                  onClick={() => {
                    setFilterDept('');
                    setSearchWard('');
                  }}
                  title="Clear all filters"
                >
                  <HiRefresh /> Clear
                </button>
              )}
            </div>

            <div className="wp-meta-count">
              Showing <strong>{allWardGroups.length}</strong> {allWardGroups.length === 1 ? 'Ward' : 'Wards'}
            </div>
          </div>

          {user?.role === ROLES.SUPER_ADMIN ? (
            allWardGroups.length === 0 ? (
              <div className="work-progress__empty glass-card">
                <p className="empty-title">No wards match your search or filter</p>
                <p className="empty-desc">Try clearing the department or ward filters above.</p>
                <button
                  className="btn btn-secondary wp-clear-btn"
                  onClick={() => {
                    setFilterDept('');
                    setSearchWard('');
                  }}
                >
                  <HiRefresh /> Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="ward-progress-grid">
                  {paginatedWardGroups.map(({ ward, tasks }) => {
                    const wardTotal = tasks.length;
                    const wardResolved = tasks.filter((t) =>
                      ['resolved', 'closed', 'verified', 'verification'].includes(t.status)
                    ).length;
                    const wardActive = tasks.filter((t) =>
                      ['in_progress', 'assigned'].includes(t.status)
                    ).length;
                    const wardCompletion = wardTotal ? Math.round((wardResolved / wardTotal) * 100) : 0;
                    const isExpanded = expandedWards[ward._id] === true;

                    return (
                      <div key={ward._id} className="ward-card glass-card">
                        <div
                          className="ward-card__header"
                          onClick={() => toggleWard(ward._id)}
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleWard(ward._id);
                            }
                          }}
                        >
                          <div className="ward-card__left">
                            <span className="ward-num-badge">#{ward.number}</span>
                            <div className="ward-card__title-col">
                              <h2 className="ward-card__name">{ward.name}</h2>
                              <p className="ward-card__pop">
                                Pop: {ward.population ? ward.population.toLocaleString('en-IN') : '—'}
                              </p>
                            </div>
                          </div>

                          <div className="ward-card__right">
                            <div className="ward-metrics">
                              <span className="ward-stat" title="Total filed tasks">
                                📋 <strong>{wardTotal}</strong>
                              </span>
                              <span className="ward-stat ward-stat--active" title="Active in-progress tasks">
                                ⚡ <strong>{wardActive}</strong>
                              </span>
                              <span className="ward-stat ward-stat--done" title="Resolved tasks">
                                ✅ <strong>{wardResolved}</strong>
                              </span>
                            </div>

                            <div className="ward-rate-box" title={`Resolution Rate: ${wardCompletion}%`}>
                              <span className="ward-rate-text">{wardCompletion}%</span>
                              <div className="wp-mini-progress">
                                <div
                                  className="wp-mini-progress__fill"
                                  style={{ width: `${wardCompletion}%` }}
                                />
                              </div>
                            </div>

                            <HiChevronDown
                              className={`ward-chevron ${isExpanded ? 'ward-chevron--open' : ''}`}
                            />
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="ward-card__body">
                            {tasks.length === 0 ? (
                              <p className="ward-empty-tasks">
                                No complaints currently registered in {ward.name}.
                              </p>
                            ) : (
                              <div className="wp-table-wrapper">
                                <table className="wp-table">
                                  <thead>
                                    <tr>
                                      <th>ID</th>
                                      <th>Complaint Title</th>
                                      <th>Department</th>
                                      <th>Priority</th>
                                      <th>Status</th>
                                      <th>Worker</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tasks.map((t) => (
                                      <tr key={t._id}>
                                        <td className="td-id">{t.complaintId}</td>
                                        <td>
                                          <div className="td-title">{t.title}</div>
                                          <div className="td-addr">{t.address}</div>
                                        </td>
                                        <td className="td-dept">{t.assignedDepartment?.name || '—'}</td>
                                        <td>
                                          <span
                                            className="priority-pill"
                                            style={{ color: PRIORITY_COLORS[t.priority] || 'var(--text-primary)' }}
                                          >
                                            ● {t.priority?.toUpperCase()}
                                          </span>
                                        </td>
                                        <td>
                                          <span
                                            className="status-pill"
                                            style={{
                                              background: `${STATUS_COLORS[t.status]}15`,
                                              color: STATUS_COLORS[t.status],
                                              borderColor: `${STATUS_COLORS[t.status]}30`,
                                            }}
                                          >
                                            {STATUS_LABELS[t.status] || t.status}
                                          </span>
                                        </td>
                                        <td className="td-staff">{t.assignedWorker?.name || '—'}</td>
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

                {totalPages > 1 && (
                  <div className="wp-pagination glass-card">
                    <div className="wp-pagination__info">
                      Showing {(currentPage - 1) * pageSize + 1}–
                      {Math.min(currentPage * pageSize, totalWardsCount)} of {totalWardsCount} Wards
                    </div>

                    <div className="wp-pagination__controls">
                      <button
                        className="btn btn-secondary wp-page-btn"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                      >
                        <HiChevronLeft /> Prev
                      </button>

                      <div className="wp-pagination__pages">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                          let pageNum = idx + 1;
                          if (totalPages > 5) {
                            if (currentPage > 3) {
                              pageNum = currentPage - 2 + idx;
                            }
                            if (pageNum > totalPages) {
                              pageNum = totalPages - 4 + idx;
                            }
                          }
                          return (
                            <button
                              key={pageNum}
                              className={`wp-page-num ${currentPage === pageNum ? 'wp-page-num--active' : ''}`}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        className="btn btn-secondary wp-page-btn"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                      >
                        Next <HiChevronRight />
                      </button>
                    </div>

                    <div className="wp-pagination__size">
                      <span>Per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="wp-page-select"
                      >
                        <option value={12}>12</option>
                        <option value={24}>24</option>
                        <option value={48}>48</option>
                      </select>
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            <div className="supervisor-progress-container glass-card">
              <div className="supervisor-header">
                <div>
                  <h2>
                    <HiMap className="supervisor-icon" /> Live Tasks in Ward {user?.ward?.number || ''}: {user?.ward?.name || ''}
                  </h2>
                  <p className="supervisor-subtitle">
                    Assigned field operations and verification workflow
                  </p>
                </div>
                <div className="supervisor-rate-tag">
                  📈 Ward Resolution Rate:{' '}
                  <strong>
                    {supervisorWardGroup?.tasks.length
                      ? Math.round(
                          (supervisorWardGroup.tasks.filter((t) =>
                            ['resolved', 'closed', 'verified', 'verification'].includes(t.status)
                          ).length /
                            supervisorWardGroup.tasks.length) *
                            100
                        )
                      : 0}
                    %
                  </strong>
                </div>
              </div>

              {!supervisorWardGroup || supervisorWardGroup.tasks.length === 0 ? (
                <p className="ward-empty-tasks">
                  No tasks registered in your assigned ward.
                </p>
              ) : (
                <div className="wp-table-wrapper">
                  <table className="wp-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Task Description</th>
                        <th>Department</th>
                        <th>Priority</th>
                        <th>Live Status</th>
                        <th>Assigned Worker</th>
                        <th>Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supervisorWardGroup.tasks.map((t) => (
                        <tr key={t._id}>
                          <td className="td-id">{t.complaintId}</td>
                          <td>
                            <div className="td-title">{t.title}</div>
                            <div className="td-addr">{t.address}</div>
                          </td>
                          <td className="td-dept">{t.assignedDepartment?.name || '—'}</td>
                          <td>
                            <span
                              className="priority-pill"
                              style={{ color: PRIORITY_COLORS[t.priority] || 'var(--text-primary)' }}
                            >
                              ● {t.priority?.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span
                              className="status-pill"
                              style={{
                                background: `${STATUS_COLORS[t.status]}15`,
                                color: STATUS_COLORS[t.status],
                                borderColor: `${STATUS_COLORS[t.status]}30`,
                              }}
                            >
                              {STATUS_LABELS[t.status] || t.status}
                            </span>
                          </td>
                          <td className="td-staff">{t.assignedWorker?.name || '—'}</td>
                          <td className="td-staff">{new Date(t.updatedAt).toLocaleDateString('en-IN')}</td>
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
        <div className="vehicle-tracking-view">
          {/* ── 1. Fleet Summary Mini KPI Strip ───────── */}
          <div className="fleet-summary-strip">
            <div className="fleet-stat-pill">
              <span className="stat-pill-label">Total Fleet:</span>
              <strong className="stat-pill-val">{vehicles.length} Units</strong>
            </div>
            <div className="fleet-stat-pill fleet-stat-pill--moving">
              <span className="stat-pill-dot dot-moving" />
              <span className="stat-pill-label">In Motion:</span>
              <strong className="stat-pill-val">
                {vehicles.filter((v) => v.status === 'Moving').length} Active
              </strong>
            </div>
            <div className="fleet-stat-pill fleet-stat-pill--working">
              <span className="stat-pill-dot dot-working" />
              <span className="stat-pill-label">In-Field Task:</span>
              <strong className="stat-pill-val">
                {vehicles.filter((v) => v.status === 'Working' || v.status === 'Refilling').length} Units
              </strong>
            </div>
            <div className="fleet-stat-pill">
              <span className="stat-pill-label">Monitored Bins:</span>
              <strong className="stat-pill-val">{mappedDustbins.length} Hubs</strong>
            </div>
          </div>

          {/* ── 2. Fleet Filter Toolbar & Layer Toggles ── */}
          <div className="fleet-toolbar glass-card">
            <div className="fleet-search">
              <HiSearch className="fleet-search__icon" />
              <input
                type="text"
                placeholder="Search vehicle by name, driver, or ward…"
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                className="fleet-search__input"
              />
              {vehicleSearch && (
                <button
                  className="wp-search__clear"
                  onClick={() => setVehicleSearch('')}
                  aria-label="Clear vehicle search"
                >
                  <HiX />
                </button>
              )}
            </div>

            <div className="fleet-filter-controls">
              <div className="fleet-select-wrapper">
                <select
                  value={vehicleTypeFilter}
                  onChange={(e) => setVehicleTypeFilter(e.target.value)}
                  className="fleet-select"
                >
                  <option value="all">All Vehicle Types</option>
                  <option value="waste_management">Waste Management</option>
                  <option value="roads">Roads Repair</option>
                  <option value="water_supply">Water Supply</option>
                </select>
              </div>

              <div className="fleet-select-wrapper">
                <select
                  value={vehicleStatusFilter}
                  onChange={(e) => setVehicleStatusFilter(e.target.value)}
                  className="fleet-select"
                >
                  <option value="all">All Statuses</option>
                  <option value="Moving">Moving</option>
                  <option value="Working">Working</option>
                  <option value="Refilling">Refilling</option>
                </select>
              </div>

              {/* Map Layer Toggles */}
              <div className="fleet-layer-toggles">
                <button
                  type="button"
                  className={`layer-chip ${mapLayers.vehicles ? 'layer-chip--active' : ''}`}
                  onClick={() => setMapLayers((l) => ({ ...l, vehicles: !l.vehicles }))}
                >
                  🚚 Vehicles
                </button>
                <button
                  type="button"
                  className={`layer-chip ${mapLayers.smartBins ? 'layer-chip--active' : ''}`}
                  onClick={() => setMapLayers((l) => ({ ...l, smartBins: !l.smartBins }))}
                >
                  🗑️ Smart Bins
                </button>
                <button
                  type="button"
                  className={`layer-chip ${mapLayers.routePath ? 'layer-chip--active' : ''}`}
                  onClick={() => setMapLayers((l) => ({ ...l, routePath: !l.routePath }))}
                >
                  🛣️ Route Path
                </button>
              </div>
            </div>
          </div>

          {/* ── 3. Balanced Map + Route Optimization Grid ── */}
          <div className="vehicle-tracking-grid">
            {/* Map Column */}
            <div className="vt-map-container glass-card">
              <div className="vt-map-topbar">
                <div className="vt-map-title-row">
                  <h3 className="vt-map-title">📍 Live GPS Fleet Positioning</h3>
                  <span className="vt-map-sub">Interactive spatial map of municipal units</span>
                </div>

                {/* Map Legend */}
                <div className="vt-map-legend">
                  <span className="legend-item"><span className="legend-dot dot-moving" /> Moving</span>
                  <span className="legend-item"><span className="legend-dot dot-working" /> Working</span>
                  <span className="legend-item"><span className="legend-dot dot-refill" /> Refilling</span>
                  <span className="legend-item"><span className="legend-dot dot-bin-red" /> &gt;80% Bin</span>
                </div>
              </div>

              <div className="vt-map-box">
                <MapContainer center={[13.0827, 80.2707]} zoom={11} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  
                  {/* Vehicles Markers */}
                  {mapLayers.vehicles &&
                    filteredVehicles.map((v) => (
                      <Marker
                        key={v.id}
                        position={v.currentPos}
                        icon={createVehicleIcon(v.type, v.status)}
                        eventHandlers={{
                          click: () => setSelectedVehicle(v),
                        }}
                      >
                        <Popup>
                          <div className="vt-popup">
                            <h4 className="vt-popup__title">{v.name}</h4>
                            <p><strong>Driver:</strong> {v.driver}</p>
                            <p><strong>Phone:</strong> {v.phone}</p>
                            <p><strong>Speed:</strong> {v.speed}</p>
                            <p><strong>Assigned:</strong> {v.ward}</p>
                            <p><strong>Status:</strong> <span className={`status-${v.status.toLowerCase()}`}>{v.status}</span></p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                  {/* Route Paths */}
                  {mapLayers.routePath && (
                    <>
                      {vehicles.map((v) => (
                        <Polyline
                          key={`route-${v.id}`}
                          positions={v.path}
                          color={v.type === 'waste_management' ? 'var(--accent-primary)' : '#3b82f6'}
                          opacity={0.35}
                          weight={3}
                          dashArray="5, 8"
                        />
                      ))}
                      {roadPath.length > 1 ? (
                        <Polyline positions={roadPath} color="#9333ea" weight={4} opacity={0.85} dashArray="6, 8" />
                      ) : optimizedRoute.path.length > 1 ? (
                        <Polyline positions={optimizedRoute.path} color="#9333ea" weight={4} opacity={0.85} dashArray="8, 8" />
                      ) : null}
                    </>
                  )}

                  {/* Smart Bins Markers */}
                  {mapLayers.smartBins &&
                    mappedDustbins.map((d) => {
                      const color = d.capacity < 50 ? '#10b981' : d.capacity < 80 ? '#f59e0b' : '#ef4444';
                      const binIcon = L.divIcon({
                        html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.35);border:2px solid #fff;">🗑️</div>`,
                        className: 'custom-bin-marker',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                        popupAnchor: [0, -12],
                      });
                      return (
                        <Marker key={d._id} position={[d.gpsCoordinates.lat, d.gpsCoordinates.lng]} icon={binIcon}>
                          <Popup>
                            <div className="vt-popup">
                              <h4 style={{ color: d.capacity >= 80 ? 'var(--status-error)' : 'var(--text-primary)' }}>
                                🗑️ Smart Bin {d.dustbinId}
                              </h4>
                              <p><strong>Location:</strong> {d.address}</p>
                              <p><strong>Ward:</strong> {d.ward?.number || '—'} ({d.ward?.name || '—'})</p>
                              <p>
                                <strong>Fill Level:</strong>{' '}
                                <span style={{ fontWeight: 700, color }}>
                                  {d.capacity}% Full
                                </span>
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                </MapContainer>
              </div>
            </div>

            {/* Smart TSP Route Details Column */}
            <div className="optimized-route-card glass-card">
              <div className="route-head">
                <div className="route-head__title-col">
                  <h3>🔄 Smart Route Optimization (TSP)</h3>
                  <p>Dynamic waste dispatch algorithm calculated for full/overflowing dustbins</p>
                </div>
                
                {/* Route Simulation Controls */}
                <div className="route-controls">
                  <button
                    className="btn btn-secondary route-ctrl-btn"
                    onClick={() => setIsRouteSimulating((s) => !s)}
                    title={isRouteSimulating ? 'Pause Route Simulation' : 'Resume Route Simulation'}
                  >
                    {isRouteSimulating ? <HiPause /> : <HiPlay />}
                    <span>{isRouteSimulating ? 'Pause' : 'Resume'}</span>
                  </button>
                  <button
                    className="btn btn-secondary route-ctrl-btn"
                    onClick={() => {
                      fetchData(true);
                      toast.success('Route re-calculated successfully');
                    }}
                    title="Recalculate Route"
                  >
                    <HiRefresh /> Recalculate
                  </button>
                </div>
              </div>

              {/* Stops Progress Sequence */}
              <div className="route-stops-list">
                {/* Start Marker */}
                <div className="route-stop route-stop--start">
                  <div className="stop-marker-dot dot-start" />
                  <div className="stop-info">
                    <div className="stop-header">
                      <span className="stop-badge-start">Start Point</span>
                      <span className="stop-time">08:00 AM</span>
                    </div>
                    <div className="stop-id">Garbage Truck V1 Current Position</div>
                    <div className="stop-meta">Zone V Central Garage Depot</div>
                  </div>
                </div>

                {/* Dynamic Calculated Stops */}
                {optimizedRoute.stops.map((stop, idx) => {
                  const isHighAlert = stop.capacity >= 80;
                  return (
                    <div key={stop._id} className="route-stop">
                      <div className={`stop-marker-dot ${isHighAlert ? 'dot-alert' : 'dot-regular'}`} />
                      <div className="stop-info">
                        <div className="stop-header">
                          <span
                            className="stop-badge"
                            style={{
                              background: isHighAlert ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              color: isHighAlert ? 'var(--status-error)' : 'var(--status-in-progress)',
                            }}
                          >
                            Stop {idx + 1}
                          </span>
                          <span className="stop-eta">+{ (idx + 1) * 12 } min</span>
                        </div>
                        <div className="stop-id">{stop.dustbinId}</div>
                        <div className="stop-meta">
                          <strong>{stop.capacity}% Filled</strong> · {stop.address}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Return Point */}
                <div className="route-stop route-stop--end">
                  <div className="stop-marker-dot dot-end" />
                  <div className="stop-info">
                    <div className="stop-header">
                      <span className="stop-badge-end">End Destination</span>
                      <span className="stop-time">~11:30 AM</span>
                    </div>
                    <div className="stop-id">Kodungaiyur Waste Processing Plant</div>
                    <div className="stop-meta">Unloading & Sorting Facility</div>
                  </div>
                </div>
              </div>

              {/* Route Summary Footer */}
              <div className="route-footer">
                <div className="route-stat-item">
                  <span className="route-stat-label">Total Bins:</span>
                  <strong>{optimizedRoute.stops.length} Stops</strong>
                </div>
                <div className="route-stat-item">
                  <span className="route-stat-label">Est. Duration:</span>
                  <strong>{optimizedRoute.stops.length * 15} mins</strong>
                </div>
                <div className="route-stat-item">
                  <span className="route-stat-label">Distance:</span>
                  <strong>~14.8 km</strong>
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. Compact Live Fleet Cards Grid ────────── */}
          <div className="fleet-cards-section">
            <div className="fleet-cards-head">
              <h3>Active Municipal Fleet Directory ({filteredVehicles.length})</h3>
              <p>Click any vehicle card to view diagnostics, route logs, and driver communication</p>
            </div>

            <div className="fleet-cards-grid">
              {filteredVehicles.map((v) => {
                const isSelected = selectedVehicle?.id === v.id;
                const statusClass =
                  v.status === 'Moving'
                    ? 'status-pill--moving'
                    : v.status === 'Working'
                    ? 'status-pill--working'
                    : 'status-pill--refill';

                return (
                  <div
                    key={v.id}
                    className={`fleet-card glass-card ${isSelected ? 'fleet-card--selected' : ''}`}
                    onClick={() => setSelectedVehicle(v)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedVehicle(v);
                      }
                    }}
                  >
                    <div className="fleet-card__head">
                      <div className="fleet-icon-badge">🚚</div>
                      <div className="fleet-title-col">
                        <h4 className="fleet-title">{v.name}</h4>
                        <span className="fleet-type">{v.typeName}</span>
                      </div>
                      <span className={`status-pill ${statusClass}`}>{v.status}</span>
                    </div>

                    <div className="fleet-card__meta-grid">
                      <div className="meta-item">
                        <span className="meta-label">Driver:</span>
                        <span className="meta-val">{v.driver}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Speed:</span>
                        <span className="meta-val">{v.speed}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Assigned:</span>
                        <span className="meta-val">{v.ward}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Fuel/Power:</span>
                        <span className="meta-val">{v.fuel}</span>
                      </div>
                    </div>

                    <div className="fleet-card__action-row">
                      <a
                        href={`tel:${v.phone.replace(/\s+/g, '')}`}
                        className="btn btn-secondary fleet-call-btn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <HiPhone /> Call Driver
                      </a>
                      <button
                        className="btn btn-secondary fleet-details-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVehicle(v);
                        }}
                      >
                        Diagnostics →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ==================== TAB 3: DAILY SLA TASKS ==================== */
        <div className="daily-tasks-container glass-card">
          <div className="daily-tasks-head">
            <h2>⏱️ Daily SLA Resolution Board</h2>
            <p>
              {user?.role === ROLES.FIELD_WORKER || user?.role === ROLES.SUPERVISOR
                ? 'Tasks with mandatory resolution deadlines based on priority. Upload photo verification upon completing work.'
                : 'City-wide monitoring of time-sensitive municipal tasks and resolution deadlines based on priority level.'}
            </p>
          </div>

          {dailyTasks.length === 0 ? (
            <div className="daily-tasks-empty">
              <span className="empty-emoji">🎉</span>
              <p className="empty-title">All daily SLA tasks resolved</p>
              <p className="empty-desc">No active or pending tasks requiring immediate verification.</p>
            </div>
          ) : (
            <div className="daily-tasks-grid">
              {dailyTasks.map((t) => {
                const timer = getSLATimer(t);
                const isFieldRole = user?.role === ROLES.FIELD_WORKER || user?.role === ROLES.SUPERVISOR;
                return (
                  <div key={t._id} className="sla-card">
                    <div className="sla-card__head">
                      <span className="sla-id">{t.complaintId}</span>
                      <span
                        className="status-pill"
                        style={{
                          background: `${STATUS_COLORS[t.status]}15`,
                          color: STATUS_COLORS[t.status],
                          borderColor: `${STATUS_COLORS[t.status]}30`,
                        }}
                      >
                        {STATUS_LABELS[t.status] || t.status}
                      </span>
                    </div>

                    <div className="sla-card__body">
                      <h4 className="sla-title">{t.title}</h4>
                      <p className="sla-addr">{t.address}</p>
                    </div>

                    <div className="sla-card-meta">
                      <span className="sla-meta-item">🏢 {t.assignedDepartment?.name || 'Assigned Dept'}</span>
                      <span className="sla-meta-item">👷 {t.assignedWorker?.name || 'Assigned Worker'}</span>
                    </div>

                    <div className="sla-countdown-box">
                      <span className="sla-timer-label">⏱️ SLA Target:</span>
                      <span className="sla-timer-val" style={{ color: timer.color }}>
                        {timer.isOverdue ? '⚠️ OVERDUE ' : ''} {timer.timeString}
                      </span>
                    </div>

                    {isFieldRole ? (
                      <button
                        type="button"
                        onClick={() => setSelectedTask(t)}
                        className="btn btn-primary sla-action-btn sla-action-btn--primary"
                      >
                        <span className="sla-action-btn__content">
                          <HiCamera className="sla-action-icon" />
                          <span>Capture Photo</span>
                        </span>
                        <HiChevronRight className="sla-action-arrow" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedTask(t)}
                        className="btn btn-secondary sla-action-btn"
                      >
                        <span className="sla-action-btn__content">
                          <HiEye className="sla-action-icon" />
                          <span>View Task Details</span>
                        </span>
                        <HiChevronRight className="sla-action-arrow" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 5. Vehicle Details Modal ─────────── */}
      <Modal
        isOpen={Boolean(selectedVehicle)}
        onClose={() => setSelectedVehicle(null)}
        title={selectedVehicle ? `🚚 ${selectedVehicle.name}` : ''}
        size="sm"
        ariaLabelledBy="vehicle-dialog-title"
        actions={
          selectedVehicle ? (
            <>
              <a
                href={`tel:${selectedVehicle.phone.replace(/\s+/g, '')}`}
                className="btn btn-secondary"
              >
                <HiPhone /> Call Driver
              </a>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedVehicle(null)}
              >
                Done
              </button>
            </>
          ) : null
        }
      >
        {selectedVehicle && (
          <div className="vehicle-modal-body">
            <div className="vehicle-modal-badge-row">
              <span className={`status-pill status-pill--${selectedVehicle.status.toLowerCase()}`}>
                ● {selectedVehicle.status}
              </span>
              <span className="vehicle-id-tag">ID: {selectedVehicle.id}</span>
            </div>

            <div className="vehicle-info-grid">
              <div className="info-tile">
                <span className="info-tile__label">Driver In-Charge</span>
                <span className="info-tile__val">{selectedVehicle.driver}</span>
              </div>
              <div className="info-tile">
                <span className="info-tile__label">Contact Number</span>
                <a href={`tel:${selectedVehicle.phone.replace(/\s+/g, '')}`} className="info-tile__val info-tile__link">
                  {selectedVehicle.phone}
                </a>
              </div>
              <div className="info-tile">
                <span className="info-tile__label">Live Speed</span>
                <span className="info-tile__val">{selectedVehicle.speed}</span>
              </div>
              <div className="info-tile">
                <span className="info-tile__label">Fuel / Charge Level</span>
                <span className="info-tile__val">{selectedVehicle.fuel}</span>
              </div>
              <div className="info-tile">
                <span className="info-tile__label">Assigned Ward</span>
                <span className="info-tile__val">{selectedVehicle.ward}</span>
              </div>
              <div className="info-tile">
                <span className="info-tile__label">Department Type</span>
                <span className="info-tile__val">{selectedVehicle.typeName}</span>
              </div>
            </div>

            <div className="vehicle-gps-box">
              <span className="gps-label">📍 Current GPS Coordinates:</span>
              <span className="gps-val">
                {selectedVehicle.currentPos?.[0]?.toFixed(4)}, {selectedVehicle.currentPos?.[1]?.toFixed(4)}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* ── 6. Task Details / Photo Modal ───────────── */}
      <Modal
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        title={
          selectedTask
            ? user?.role === ROLES.FIELD_WORKER || user?.role === ROLES.SUPERVISOR
              ? `Verify Completion: ${selectedTask.complaintId}`
              : `Task SLA Details: ${selectedTask.complaintId}`
            : ''
        }
        size="sm"
        ariaLabelledBy="task-dialog-title"
        actions={
          selectedTask &&
          !(user?.role === ROLES.FIELD_WORKER || user?.role === ROLES.SUPERVISOR) ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSelectedTask(null)}
            >
              Done
            </button>
          ) : null
        }
      >
        {selectedTask && (
          user?.role === ROLES.FIELD_WORKER || user?.role === ROLES.SUPERVISOR ? (
            <form onSubmit={handlePhotoVerificationSubmit}>
              <div className="photo-modal-body">
                <p className="photo-modal-desc">
                  Upload a verification photo of the completed work at{' '}
                  <strong>{selectedTask.address}</strong> to resolve the SLA task.
                </p>

                {imagePreview ? (
                  <div className="photo-preview-box">
                    <img src={imagePreview} alt="Work Completion Preview" />
                    <button
                      type="button"
                      onClick={() => {
                        setUploadImage(null);
                        setImagePreview(null);
                      }}
                      className="photo-remove-btn"
                      aria-label="Remove photo"
                    >
                      <HiX />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="photo-upload-dropzone"
                  >
                    <HiUpload className="upload-icon" />
                    <span className="upload-prompt">Click to upload completion photo</span>
                    <span className="upload-hint">Supports PNG, JPG, JPEG</span>
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

              <div className="modal-actions" style={{ padding: '14px 0 0 0', margin: '14px 0 0 0', background: 'transparent' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-cancel"
                  onClick={() => setSelectedTask(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-submit"
                  disabled={submittingPhoto || !uploadImage}
                >
                  {submittingPhoto ? 'Uploading…' : 'Submit Verification Photo'}
                </button>
              </div>
            </form>
          ) : (
            <div className="vehicle-modal-body">
              <div className="vehicle-modal-badge-row">
                <span
                  className="priority-pill"
                  style={{ color: PRIORITY_COLORS[selectedTask.priority] || 'var(--text-primary)' }}
                >
                  ● {selectedTask.priority?.toUpperCase()} PRIORITY
                </span>
                <span
                  className="status-pill"
                  style={{
                    background: `${STATUS_COLORS[selectedTask.status]}15`,
                    color: STATUS_COLORS[selectedTask.status],
                    borderColor: `${STATUS_COLORS[selectedTask.status]}30`,
                  }}
                >
                  {STATUS_LABELS[selectedTask.status] || selectedTask.status}
                </span>
              </div>

              <div className="info-tile" style={{ marginTop: '2px' }}>
                <span className="info-tile__label">Issue Description</span>
                <span className="info-tile__val" style={{ fontWeight: 600, fontSize: '13px', lineHeight: 1.4 }}>
                  {selectedTask.title}
                </span>
                {selectedTask.description && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {selectedTask.description}
                  </p>
                )}
              </div>

              <div className="vehicle-info-grid">
                <div className="info-tile">
                  <span className="info-tile__label">Location Address</span>
                  <span className="info-tile__val">{selectedTask.address}</span>
                </div>
                <div className="info-tile">
                  <span className="info-tile__label">Ward Jurisdiction</span>
                  <span className="info-tile__val">
                    {selectedTask.ward?.number ? `Ward ${selectedTask.ward.number} (${selectedTask.ward.name})` : '—'}
                  </span>
                </div>
                <div className="info-tile">
                  <span className="info-tile__label">Assigned Department</span>
                  <span className="info-tile__val">{selectedTask.assignedDepartment?.name || '—'}</span>
                </div>
                <div className="info-tile">
                  <span className="info-tile__label">Assigned Field Worker</span>
                  <span className="info-tile__val">{selectedTask.assignedWorker?.name || 'Unassigned'}</span>
                </div>
                <div className="info-tile">
                  <span className="info-tile__label">Reported On</span>
                  <span className="info-tile__val">{new Date(selectedTask.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="info-tile">
                  <span className="info-tile__label">SLA Countdown</span>
                  <span className="info-tile__val" style={{ color: getSLATimer(selectedTask).color }}>
                    {getSLATimer(selectedTask).isOverdue ? '⚠️ Overdue' : getSLATimer(selectedTask).timeString}
                  </span>
                </div>
              </div>
            </div>
          )
        )}
      </Modal>
    </div>
  );
};

export default WorkProgress;
