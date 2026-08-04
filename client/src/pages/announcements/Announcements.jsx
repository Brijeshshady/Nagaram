import { useState, useEffect } from 'react';
import { announcementService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';
import { HiSpeakerphone, HiPlus, HiX, HiTrash, HiCalendar } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import './Announcements.css';

const Announcements = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: '',
    content: '',
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await announcementService.getAll();
      setAnnouncements(res.data.announcements || []);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await announcementService.create(form);
      toast.success('Announcement broadcasted successfully');
      setShowModal(false);
      setForm({ title: '', content: '' });
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit announcement');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this announcement?')) {
      try {
        await announcementService.delete(id);
        toast.success('Announcement removed');
        fetchAnnouncements();
      } catch {
        toast.error('Delete failed');
      }
    }
  };

  return (
    <div className="announcements-page animate-fade-in">
      <div className="announcements-page__header">
        <div>
          <h1>City Announcements & Bulletins</h1>
          <p className="announcements-page__subtitle">Stay informed about municipal cleanups, water halts, and ward notices</p>
        </div>
        {user?.role === ROLES.SUPER_ADMIN && (
          <button className="announcements-page__add-btn" onClick={() => setShowModal(true)}>
            <HiPlus /> New Announcement
          </button>
        )}
      </div>

      {loading ? (
        <div className="announcements-page__loading">
          <div className="animate-spin" />
        </div>
      ) : (
        <div className="announcements-list stagger-children">
          {announcements.length > 0 ? (
            announcements.map((a) => (
              <div key={a._id} className="announcement-item glass-card">
                <div className="announcement-item__header">
                  <div className="announcement-title-group">
                    <div className="announcement-icon"><HiSpeakerphone /></div>
                    <h3>{a.title}</h3>
                  </div>
                  {user?.role === ROLES.SUPER_ADMIN && (
                    <button className="btn-delete" onClick={() => handleDelete(a._id)} title="Delete"><HiTrash /></button>
                  )}
                </div>
                <p className="announcement-item__content">{a.content}</p>
                <div className="announcement-item__footer">
                  <span>Posted by: {a.createdBy?.name || 'Municipal Admin'}</span>
                  <span><HiCalendar /> {new Date(a.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="announcements-page__empty glass-card">
              <p>No active bulletins posted in the city.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card animate-scale-in">
            <div className="modal-header">
              <h2>Broadcast New Announcement</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Announcement Title</label>
                <input type="text" name="title" value={form.title} onChange={handleInputChange} required placeholder="e.g. Ward 4 Cleanliness Drive this Sunday" />
              </div>
              <div className="form-group">
                <label>Bulletin Content</label>
                <textarea name="content" value={form.content} onChange={handleInputChange} rows="5" required placeholder="Describe the bulletin in detail..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">Broadcast</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
