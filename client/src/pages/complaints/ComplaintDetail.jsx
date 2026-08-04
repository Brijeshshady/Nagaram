import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { complaintService, userService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { ROLES, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS, CATEGORY_ICONS, formatDateTime } from '../../utils/constants';
import { HiArrowLeft, HiCalendar, HiMapPin, HiUser, HiOfficeBuilding, HiSparkles } from 'react-icons/hi2';
import { toast } from 'react-hot-toast';
import './Complaints.css';

const ComplaintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supervisors, setSupervisors] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState('');

  // Before/After Verification Form
  const [verificationImage, setVerificationImage] = useState(null);
  const [verificationType, setVerificationType] = useState('after'); // 'before' or 'after'
  const [uploading, setUploading] = useState(false);

  // Feedback Form
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  useEffect(() => {
    fetchComplaintDetails();
  }, [id]);

  const fetchComplaintDetails = async () => {
    try {
      const res = await complaintService.getById(id);
      setComplaint(res.data.complaint);
      setSelectedSupervisor(res.data.complaint.assignedSupervisor?._id || '');

      // Load supervisors if current user is admin/dept manager
      if ([ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER].includes(user?.role)) {
        const supRes = await userService.getAll({ role: ROLES.SUPERVISOR });
        setSupervisors(supRes.data.users || []);
      }
    } catch (err) {
      toast.error('Failed to load complaint details');
      navigate('/complaints');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    try {
      await complaintService.assign(id, { assignedSupervisor: selectedSupervisor });
      toast.success('Complaint assigned successfully');
      fetchComplaintDetails();
    } catch (err) {
      toast.error('Failed to assign supervisor');
    }
  };

  const handleUploadVerification = async (e) => {
    e.preventDefault();
    if (!verificationImage) {
      toast.error('Please choose a photo first');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', verificationImage);
      formData.append('type', verificationType);

      await complaintService.verify(id, formData);
      toast.success('Verification image uploaded');
      setVerificationImage(null);
      fetchComplaintDetails();
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      await complaintService.submitFeedback(id, { rating, comment: feedbackComment });
      toast.success('Feedback submitted, complaint resolved');
      fetchComplaintDetails();
    } catch (err) {
      toast.error('Failed to submit feedback');
    }
  };

  if (loading) {
    return (
      <div className="complaint-detail__loading">
        <div className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="complaint-detail animate-fade-in">
      <Link to="/complaints" className="back-link">
        <HiArrowLeft /> Back to Complaints
      </Link>

      <div className="complaint-detail__header">
        <div>
          <span className="complaint-detail__id">{complaint.complaintId}</span>
          <h1>{complaint.title}</h1>
        </div>
        <span
          className="complaint-detail__status"
          style={{
            background: `${STATUS_COLORS[complaint.status]}15`,
            color: STATUS_COLORS[complaint.status],
          }}
        >
          {STATUS_LABELS[complaint.status]}
        </span>
      </div>

      <div className="complaint-detail__grid">
        {/* Left Column — Details & Timeline */}
        <div className="complaint-detail__left">
          {/* Info Card */}
          <div className="details-card glass-card">
            <h2>Complaint Specifications</h2>
            <p className="details-card__desc">{complaint.description}</p>

            <div className="details-meta-grid">
              <div className="meta-item">
                <HiCalendar className="meta-item__icon" />
                <div>
                  <p className="meta-item__label">Reported Date</p>
                  <p className="meta-item__val">{formatDateTime(complaint.createdAt)}</p>
                </div>
              </div>
              <div className="meta-item">
                <HiMapPin className="meta-item__icon" />
                <div>
                  <p className="meta-item__label">Address Location</p>
                  <p className="meta-item__val">{complaint.address}</p>
                </div>
              </div>
              <div className="meta-item">
                <HiOfficeBuilding className="meta-item__icon" />
                <div>
                  <p className="meta-item__label">Routing Department</p>
                  <p className="meta-item__val">{complaint.assignedDepartment?.name || 'Pending routing'}</p>
                </div>
              </div>
              <div className="meta-item">
                <HiUser className="meta-item__icon" />
                <div>
                  <p className="meta-item__label">Assigned Supervisor</p>
                  <p className="meta-item__val">{complaint.assignedSupervisor?.name || 'Unassigned'}</p>
                </div>
              </div>
            </div>

            {/* AI Insights Panel */}
            {complaint.aiAnalysis && (
              <div className="ai-insights-panel">
                <div className="ai-insights-title">
                  <HiSparkles /> AI Auto-Analysis Metrics
                </div>
                <div className="ai-insights-grid">
                  <div>
                    <span className="ai-label">Detected Category</span>
                    <span className="ai-val">
                      {CATEGORY_ICONS[complaint.aiAnalysis.detectedCategory] || '📋'}{' '}
                      {complaint.aiAnalysis.detectedCategory} ({complaint.aiAnalysis.confidence}%)
                    </span>
                  </div>
                  <div>
                    <span className="ai-label">Predicted Priority</span>
                    <span className="ai-val" style={{ color: PRIORITY_COLORS[complaint.aiAnalysis.suggestedPriority] }}>
                      ● {complaint.aiAnalysis.suggestedPriority}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Center */}
          <div className="action-card glass-card">
            <h2>Action Center</h2>

            {/* Admin Assignment */}
            {[ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER].includes(user?.role) && (
              <div className="action-section">
                <p className="action-section__title">Assign Maintenance Personnel</p>
                <div className="assign-form">
                  <select
                    value={selectedSupervisor}
                    onChange={(e) => setSelectedSupervisor(e.target.value)}
                  >
                    <option value="">Choose Supervisor...</option>
                    {supervisors.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                  <button className="btn-assign" onClick={handleAssign}>Assign</button>
                </div>
              </div>
            )}

            {/* Worker/Supervisor Verification upload */}
            {user?.role === ROLES.SUPERVISOR && (
              <form onSubmit={handleUploadVerification} className="action-section">
                <p className="action-section__title">Upload Completion Verification</p>
                <div className="upload-verif-grid">
                  <select value={verificationType} onChange={(e) => setVerificationType(e.target.value)}>
                    <option value="before">Before Cleanup Photo</option>
                    <option value="after">After Cleanup Photo</option>
                  </select>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setVerificationImage(e.target.files[0])}
                    required
                  />
                  <button type="submit" className="btn-assign" disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Save verification'}
                  </button>
                </div>
              </form>
            )}

            {/* Citizen Feedback Form */}
            {user?.role === ROLES.CITIZEN && complaint.status === 'verification' && (
              <form onSubmit={handleFeedbackSubmit} className="action-section">
                <p className="action-section__title">Submit Work Feedback</p>
                <div className="feedback-form">
                  <div className="rating-select">
                    <label>Rating (1-5)</label>
                    <select value={rating} onChange={(e) => setRating(parseInt(e.target.value))}>
                      <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                      <option value="4">⭐⭐⭐⭐ Good</option>
                      <option value="3">⭐⭐⭐ Average</option>
                      <option value="2">⭐⭐ Poor</option>
                      <option value="1">⭐ Unsatisfactory</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Provide comments about cleanup speed, cleanliness, etc."
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    rows="3"
                  />
                  <button type="submit" className="btn-assign">Close Complaint</button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column — Maps & Image Previews */}
        <div className="complaint-detail__right">
          {/* Photos */}
          <div className="photos-card glass-card">
            <h2>Complaint Photos</h2>
            <div className="photos-grid">
              {complaint.images && complaint.images.map((img, i) => (
                <div key={i} className="photo-container">
                  <img src={`http://localhost:5000${img}`} alt="complaint upload" />
                </div>
              ))}
            </div>

            {/* Before/After display */}
            {(complaint.beforeImage || complaint.afterImage) && (
              <div className="verif-images-section">
                <h3>Verification Photos</h3>
                <div className="verif-images-grid">
                  {complaint.beforeImage && (
                    <div>
                      <p className="verif-label">Before</p>
                      <img src={`http://localhost:5000${complaint.beforeImage}`} alt="before verification" />
                    </div>
                  )}
                  {complaint.afterImage && (
                    <div>
                      <p className="verif-label">After</p>
                      <img src={`http://localhost:5000${complaint.afterImage}`} alt="after verification" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Map */}
          {complaint.gpsCoordinates?.lat && (
            <div className="map-card glass-card">
              <h2>Location Reference Map</h2>
              <div className="ref-map-wrapper">
                <MapContainer
                  center={[complaint.gpsCoordinates.lat, complaint.gpsCoordinates.lng]}
                  zoom={16}
                  style={{ height: '220px', width: '100%', borderRadius: '12px' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={[complaint.gpsCoordinates.lat, complaint.gpsCoordinates.lng]} />
                </MapContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetail;
