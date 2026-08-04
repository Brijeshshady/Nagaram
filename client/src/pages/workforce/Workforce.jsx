import { useState, useEffect } from 'react';
import { userService, complaintService } from '../../services/dataService';
import { ROLES, ROLE_LABELS, ROLE_COLORS } from '../../utils/constants';
import { HiUsers, HiClipboardCheck, HiTrendingUp } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import './Workforce.css';

const Workforce = () => {
  const [staff, setStaff] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkforceData();
  }, []);

  const fetchWorkforceData = async () => {
    try {
      const [workersRes, supervisorsRes, tasksRes] = await Promise.all([
        userService.getAll({ role: ROLES.FIELD_WORKER }),
        userService.getAll({ role: ROLES.SUPERVISOR }),
        complaintService.getAll({ limit: 100 }), // grab active issues
      ]);

      const allStaff = [
        ...(workersRes.data.users || []),
        ...(supervisorsRes.data.users || []),
      ];

      setStaff(allStaff);
      setTasks(tasksRes.data.complaints || []);
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

  return (
    <div className="workforce-page animate-fade-in">
      <div className="workforce-page__header">
        <div>
          <h1>Workforce Directory</h1>
          <p className="workforce-page__subtitle">Monitor active cleanup crews, supervisors, and task allocations</p>
        </div>
      </div>

      {loading ? (
        <div className="workforce-page__loading">
          <div className="animate-spin" />
        </div>
      ) : (
        <div className="workforce-grid">
          {staff.length > 0 ? (
            staff.map((member) => {
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
                      <span className="meta-label">Email</span>
                      <p className="meta-val">{member.email}</p>
                    </div>
                    <div className="staff-meta">
                      <span className="meta-label">Assigned Department</span>
                      <p className="meta-val">{member.department?.name || 'General Operations'}</p>
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
                  </div>
                </div>
              );
            })
          ) : (
            <div className="workforce-page__empty glass-card">
              <p>No active supervisors or workers found in the directory.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Workforce;
