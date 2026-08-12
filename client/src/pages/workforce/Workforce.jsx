import { useState, useEffect } from 'react';
import { userService, complaintService, routeService, dustbinService } from '../../services/dataService';
import { ROLES, ROLE_LABELS, ROLE_COLORS } from '../../utils/constants';
import { HiClipboardCheck, HiMap, HiX, HiSearch, HiMail, HiOfficeBuilding } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import './Workforce.css';

const Workforce = () => {
  const [staff, setStaff] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dustbins, setDustbins] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  
  // Route Assignment State
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [routeMode, setRouteMode] = useState('auto'); // 'auto' or 'manual'
  const [selectedWaypoints, setSelectedWaypoints] = useState([]);

  useEffect(() => {
    fetchWorkforceData();
  }, []);

  const fetchWorkforceData = async () => {
    try {
      const [workersRes, supervisorsRes, tasksRes, dustbinsRes] = await Promise.all([
        userService.getAll({ role: ROLES.FIELD_WORKER }),
        userService.getAll({ role: ROLES.SUPERVISOR }),
        complaintService.getAll({ limit: 100 }), // grab active issues
        dustbinService.getAll(),
      ]);

      const allStaff = [
        ...(workersRes.data.users || []),
        ...(supervisorsRes.data.users || []),
      ];

      setStaff(allStaff);
      setTasks(tasksRes.data.complaints || []);
      setDustbins(dustbinsRes.data.dustbins || []);
    } catch {
      toast.error('Failed to load workforce details');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats for each staff member
  const getStaffTasksCount = (staffId) => {
    return tasks.filter(
      (t) => t.assignedWorker?._id === staffId || t.assignedSupervisor?._id === staffId
    ).length;
  };

  const openRouteModal = (worker) => {
    setSelectedWorker(worker);
    setShowRouteModal(true);
    setRouteMode('auto');
    setSelectedWaypoints([]);
  };

  const handleAssignRoute = async () => {
    try {
      if (routeMode === 'auto') {
        await routeService.autoCalculate({ workerId: selectedWorker._id, date: new Date().toISOString() });
        toast.success(`Optimized route generated for ${selectedWorker.name}`);
      } else {
        if (selectedWaypoints.length === 0) return toast.error('Please select at least one task/dustbin');
        await routeService.assignRoute({
          workerId: selectedWorker._id,
          date: new Date().toISOString(),
          waypoints: selectedWaypoints,
        });
        toast.success(`Manual route assigned to ${selectedWorker.name}`);
      }
      setShowRouteModal(false);
    } catch (err) {
      toast.error('Failed to assign route');
    }
  };

  const toggleWaypoint = (type, id, address, lat, lng) => {
    const existingIndex = selectedWaypoints.findIndex(w => w.refId === id);
    if (existingIndex >= 0) {
      setSelectedWaypoints(selectedWaypoints.filter((_, idx) => idx !== existingIndex));
    } else {
      setSelectedWaypoints([...selectedWaypoints, { type, refId: id, address, lat, lng }]);
    }
  };

  // Extract unique departments for filter dropdown dynamically
  const departments = [...new Set(staff.map(member => member.department?.name).filter(Boolean))];

  // Filtering logic
  const filteredStaff = staff.filter((member) => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesRole = 
      roleFilter === 'ALL' || 
      member.role === roleFilter;
      
    const matchesDept = 
      deptFilter === 'ALL' || 
      member.department?.name === deptFilter;
      
    return matchesSearch && matchesRole && matchesDept;
  });

  return (
    <div className="workforce-page animate-fade-in">
      <div className="workforce-page__header">
        <div>
          <h1>Workforce Directory</h1>
          <p className="workforce-page__subtitle">Monitor active cleanup crews, supervisors, and task allocations</p>
        </div>
      </div>

      {/* Toolbar Search & Filters */}
      <div className="workforce-toolbar">
        <div className="workforce-search">
          <HiSearch className="workforce-search__icon" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="workforce-filters">
          <select 
            className="workforce-filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">All Roles</option>
            <option value={ROLES.FIELD_WORKER}>Field Workers</option>
            <option value={ROLES.SUPERVISOR}>Supervisors</option>
          </select>
          
          <select 
            className="workforce-filter-select"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            {departments.map((deptName) => (
              <option key={deptName} value={deptName}>{deptName}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="workforce-page__loading">
          <div className="animate-spin" />
        </div>
      ) : (
        <div className="workforce-grid">
          {filteredStaff.length > 0 ? (
            filteredStaff.map((member) => {
              const activeCount = getStaffTasksCount(member._id);
              return (
                <div key={member._id} className="staff-card glass-card">
                  <div className="staff-card__profile">
                    <div
                      className="staff-avatar"
                      style={{
                        background: `${ROLE_COLORS[member.role] || '#6366f1'}15`,
                        color: ROLE_COLORS[member.role] || '#6366f1',
                      }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3>{member.name}</h3>
                      <span
                        className="staff-role-badge"
                        style={{
                          color: ROLE_COLORS[member.role],
                          borderColor: `${ROLE_COLORS[member.role]}30`,
                        }}
                      >
                        {ROLE_LABELS[member.role]}
                      </span>
                    </div>
                  </div>

                  <div className="staff-card__body">
                    <div className="staff-meta">
                      <HiMail className="staff-meta__icon" />
                      <div>
                        <span className="meta-label">Email</span>
                        <p className="meta-val">{member.email}</p>
                      </div>
                    </div>
                    <div className="staff-meta">
                      <HiOfficeBuilding className="staff-meta__icon" />
                      <div>
                        <span className="meta-label">Assigned Department</span>
                        <p className="meta-val">{member.department?.name || 'General Operations'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="staff-card__footer">
                    <div className="task-count-box">
                      <HiClipboardCheck className="task-count-box__icon" />
                      <div>
                        <span className="task-count-label">Active Tasks</span>
                        <p className="task-count-val">{activeCount} Pending</p>
                      </div>
                    </div>
                    {member.role === ROLES.FIELD_WORKER && (
                      <button 
                        className="assign-route-btn" 
                        onClick={() => openRouteModal(member)}
                      >
                        <HiMap /> Assign Route
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="workforce-page__empty glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              <p>No active supervisors or workers found matching the search criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* Assign Route Modal */}
      {showRouteModal && (
        <div className="modal-overlay" onClick={() => setShowRouteModal(false)}>
          <div className="modal-card animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '100%' }}>
            <div className="modal-header">
              <h2>Assign Route - {selectedWorker?.name}</h2>
              <button className="modal-close" onClick={() => setShowRouteModal(false)}><HiX /></button>
            </div>
            
            <div className="modal-body">
              <div className="route-selector">
                <button 
                  onClick={() => setRouteMode('auto')} 
                  className={`route-selector-btn ${routeMode === 'auto' ? 'route-selector-btn--active' : ''}`}
                >
                  <span>✨ Auto Calculate (Optimized)</span>
                </button>
                <button 
                  onClick={() => setRouteMode('manual')}
                  className={`route-selector-btn ${routeMode === 'manual' ? 'route-selector-btn--active' : ''}`}
                >
                  <span>✏️ Manual Select</span>
                </button>
              </div>

              {routeMode === 'manual' && (
                <div className="waypoint-list-container">
                  <h4 className="waypoint-section-title">Available Tasks</h4>
                  {tasks.filter(t => t.gpsCoordinates?.lat).length > 0 ? (
                    tasks.filter(t => t.gpsCoordinates?.lat).map(task => (
                      <label key={task._id} className="waypoint-item">
                        <input 
                          type="checkbox" 
                          checked={selectedWaypoints.some(w => w.refId === task._id)}
                          onChange={() => toggleWaypoint('Complaint', task._id, task.address, task.gpsCoordinates.lat, task.gpsCoordinates.lng)}
                        />
                        <span className="waypoint-item__text">{task.complaintId} - {task.title}</span>
                      </label>
                    ))
                  ) : (
                    <p className="waypoint-item__empty">No active tasks with coordinates available.</p>
                  )}
                  
                  <h4 className="waypoint-section-title">Dustbins</h4>
                  {dustbins.length > 0 ? (
                    dustbins.map(bin => (
                      <label key={bin._id} className="waypoint-item">
                        <input 
                          type="checkbox" 
                          checked={selectedWaypoints.some(w => w.refId === bin._id)}
                          onChange={() => toggleWaypoint('Dustbin', bin._id, bin.address, bin.gpsCoordinates.lat, bin.gpsCoordinates.lng)}
                        />
                        <span className="waypoint-item__text">{bin.dustbinId} (Cap: {bin.capacity}%) - {bin.address}</span>
                      </label>
                    ))
                  ) : (
                    <p className="waypoint-item__empty">No dustbins available.</p>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowRouteModal(false)}>Cancel</button>
              <button type="button" className="btn-submit" onClick={handleAssignRoute}>
                {routeMode === 'auto' ? 'Generate & Assign' : `Assign ${selectedWaypoints.length} Stops`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workforce;
