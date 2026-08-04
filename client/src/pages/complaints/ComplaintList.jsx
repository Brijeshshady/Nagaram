import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { complaintService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { ROLES, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, CATEGORY_ICONS, formatDate, timeAgo } from '../../utils/constants';
import { HiSearch, HiFilter, HiPlus } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import './Complaints.css';

const ComplaintList = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: '',
  });

  useEffect(() => {
    fetchComplaints();
  }, [filters.status, filters.priority, filters.category]);

  const fetchComplaints = async () => {
    try {
      const params = {
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        category: filters.category || undefined,
      };
      const res = await complaintService.getAll(params);
      setComplaints(res.data.complaints || []);
    } catch (err) {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    const query = filters.search.toLowerCase();
    return (
      c.complaintId?.toLowerCase().includes(query) ||
      c.title?.toLowerCase().includes(query) ||
      c.description?.toLowerCase().includes(query) ||
      c.address?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="complaint-list-page animate-fade-in">
      <div className="complaint-list-page__header">
        <div>
          <h1>Complaints</h1>
          <p className="complaint-list-page__subtitle">Track municipal maintenance and civic complaints</p>
        </div>
        {user?.role === ROLES.CITIZEN && (
          <Link to="/complaints/new" className="complaint-list-page__add-btn">
            <HiPlus /> Report Issue
          </Link>
        )}
      </div>

      {/* Toolbar / Filters */}
      <div className="complaint-list-page__toolbar glass-card">
        <div className="search-bar">
          <HiSearch className="search-bar__icon" />
          <input
            type="text"
            placeholder="Search by ID, title, keyword..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        <div className="filters">
          <div className="filter-select">
            <HiFilter className="filter-select__icon" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>

          <div className="filter-select">
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            >
              <option value="">All Priorities</option>
              {Object.entries(PRIORITY_LABELS).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List content */}
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
                      background: `${STATUS_COLORS[c.status]}15`,
                      color: STATUS_COLORS[c.status],
                    }}
                  >
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>
                <h3 className="complaint-item__title">{c.title}</h3>
                <p className="complaint-item__address">{c.address}</p>
                <div className="complaint-item__footer">
                  <span className="complaint-item__category">
                    {CATEGORY_ICONS[c.category] || '📋'} {c.category?.replace(/_/g, ' ')}
                  </span>
                  <span className="complaint-item__priority" style={{ color: PRIORITY_COLORS[c.priority] }}>
                    ● {c.priority}
                  </span>
                  <span className="complaint-item__date">{timeAgo(c.createdAt)}</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="complaint-list-page__empty glass-card">
              <p>No complaints found matching selection.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComplaintList;
