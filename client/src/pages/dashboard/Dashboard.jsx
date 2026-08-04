import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { analyticsService, complaintService } from '../../services/dataService';
import { ROLES, ROLE_LABELS, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, CATEGORY_ICONS, formatDateTime, timeAgo } from '../../utils/constants';
import { HiClipboardList, HiCheckCircle, HiClock, HiExclamation, HiTrendingUp, HiUsers, HiStar } from 'react-icons/hi';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch analytics for admin roles
        if ([ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER, ROLES.COMMISSIONER].includes(user?.role)) {
          const res = await analyticsService.getOverview();
          setStats(res.data);
        }

        // Fetch recent complaints
        const complaintsRes = await complaintService.getAll({ limit: 5, sort: '-createdAt' });
        setRecentComplaints(complaintsRes.data.complaints || []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1>Dashboard</h1>
        <p className="dashboard__date">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPI Cards — Admin Views */}
      {stats && (
        <div className="dashboard__kpis stagger-children">
          <KPICard icon={<HiClipboardList />} label="Total Complaints" value={stats.totalComplaints} color="var(--accent-primary)" />
          <KPICard icon={<HiCheckCircle />} label="Resolved" value={stats.resolvedComplaints + stats.closedComplaints} color="var(--status-success)" />
          <KPICard icon={<HiClock />} label="Pending" value={stats.pendingComplaints} color="var(--status-warning)" />
          <KPICard icon={<HiExclamation />} label="Escalated" value={stats.escalatedComplaints} color="var(--status-error)" />
          <KPICard icon={<HiTrendingUp />} label="Today" value={stats.todayComplaints} color="var(--accent-secondary)" />
          <KPICard icon={<HiClock />} label="Avg Resolution" value={`${stats.avgResolutionTime}h`} color="var(--accent-tertiary)" />
          <KPICard icon={<HiUsers />} label="Active Workers" value={stats.activeWorkers} color="var(--status-info)" />
          <KPICard icon={<HiCheckCircle />} label="Resolved Today" value={stats.todayResolved} color="var(--status-success)" />
        </div>
      )}

      {/* Citizen KPIs */}
      {user?.role === ROLES.CITIZEN && (
        <div className="dashboard__kpis stagger-children">
          <KPICard icon={<HiClipboardList />} label="My Complaints" value={recentComplaints.length} color="var(--accent-primary)" />
          <KPICard icon={<HiStar />} label="Reward Points" value={user.rewardPoints || 0} color="var(--status-warning)" />
        </div>
      )}

      {/* Recent Complaints */}
      <div className="dashboard__section animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <h2 className="dashboard__section-title">
          {user?.role === ROLES.CITIZEN ? 'My Recent Complaints' : 'Recent Complaints'}
        </h2>
        {recentComplaints.length > 0 ? (
          <div className="dashboard__complaints-list">
            {recentComplaints.map((complaint) => (
              <div key={complaint._id} className="complaint-card glass-card">
                <div className="complaint-card__header">
                  <span className="complaint-card__id">{complaint.complaintId}</span>
                  <span className="complaint-card__status" style={{ background: `${STATUS_COLORS[complaint.status]}20`, color: STATUS_COLORS[complaint.status] }}>
                    {STATUS_LABELS[complaint.status]}
                  </span>
                </div>
                <h3 className="complaint-card__title">{complaint.title}</h3>
                <p className="complaint-card__desc">{complaint.description?.substring(0, 100)}...</p>
                <div className="complaint-card__footer">
                  <span className="complaint-card__category">
                    {CATEGORY_ICONS[complaint.category]} {complaint.category?.replace(/_/g, ' ')}
                  </span>
                  <span className="complaint-card__priority" style={{ color: PRIORITY_COLORS[complaint.priority] }}>
                    ● {complaint.priority}
                  </span>
                  <span className="complaint-card__time">{timeAgo(complaint.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard__empty glass-card">
            <p>No complaints yet. {user?.role === ROLES.CITIZEN ? 'Report your first civic issue!' : 'Waiting for citizen reports.'}</p>
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
