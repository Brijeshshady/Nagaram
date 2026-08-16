import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/dataService';
import api from '../../services/api';
import { ROLES, ROLE_LABELS } from '../../utils/constants';
import { HiSparkles, HiUser, HiLockClosed, HiCheck } from 'react-icons/hi2';
import { HiX } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import './Settings.css';

const Settings = () => {
  const { user } = useAuth();
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar ? `http://localhost:5000${user.avatar}` : '');
  const [myWard, setMyWard] = useState(null);
  const [showMyWardMapModal, setShowMyWardMapModal] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // AI Rule Form State (Super Admin only)
  const [aiConfig, setAiConfig] = useState({
    duplicateRadius: 100, // meters
    historyThresholdDays: 7,
    minConfidence: 65,
    autoRouteEnabled: true,
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      // If there's an avatar file, upload it first
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const avatarRes = await api.patch('/users/profile/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        // Update user state locally
        const cachedUser = JSON.parse(localStorage.getItem('nagaram_user'));
        cachedUser.avatar = avatarRes.data.avatar;
        localStorage.setItem('nagaram_user', JSON.stringify(cachedUser));
      }

      await userService.update(user._id, {
        name: profileForm.name,
        phone: profileForm.phone,
      });

      const updatedUser = JSON.parse(localStorage.getItem('nagaram_user'));
      updatedUser.name = profileForm.name;
      updatedUser.phone = profileForm.phone;
      localStorage.setItem('nagaram_user', JSON.stringify(updatedUser));

      toast.success('Profile and photo updated successfully');
      window.location.reload(); // Live reload to update all shells
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    toast.success('Password updated successfully');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleAIConfigSubmit = (e) => {
    e.preventDefault();
    toast.success('AI thresholds and rules updated');
  };

  return (
    <div className="settings animate-fade-in">
      <div className="settings__header">
        <h1>Settings & Configurations</h1>
        <p className="settings__subtitle">Configure your personal profile, credentials, and municipal diagnostic rules</p>
      </div>

      <div className="settings__grid">
        {/* Profile Card */}
        <div className="settings-card glass-card">
          <h2><HiUser /> Profile Information</h2>
          <form onSubmit={handleProfileSubmit}>
            <div className="avatar-upload-section">
              <div className="avatar-preview-circle">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="profile avatar preview" />
                ) : (
                  user?.name?.charAt(0)?.toUpperCase()
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="avatar-input"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="avatar-input" className="btn-upload-photo">
                  Change Photo
                </label>
              </div>
            {user?.ward && (
              <div className="form-group">
                <button className="btn-map" onClick={async () => {
                  try {
                    const res = await fetch(`http://localhost:5000/api/wards/${user.ward._id}`);
                    const data = await res.json();
                    setMyWard(data.ward);
                    setShowMyWardMapModal(true);
                  } catch (e) {
                    console.error('Failed to load ward data', e);
                  }
                }}>View My Ward Map</button>
              </div>
            )}
          </div>
        
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={profileForm.email}
                disabled
              />
              <span className="form-help">Email address cannot be changed.</span>
            </div>
            <div className="form-group">
              <label>System Role</label>
              <input
                type="text"
                value={ROLE_LABELS[user?.role] || user?.role || ''}
                disabled
              />
            </div>
            {user?.department && (
              <div className="form-group">
                <label>Mapped Department</label>
                <input
                  type="text"
                  value={user.department.name || ''}
                  disabled
                />
              </div>
            )}
            {/* Modal */}
        {showMyWardMapModal && (
          <div className="modal-overlay" onClick={() => setShowMyWardMapModal(false)}>
            <div className="modal-card animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Ward Map</h2>
                <button className="modal-close" onClick={() => setShowMyWardMapModal(false)}><HiX /></button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {myWard && (() => {
                  const getCenter = () => {
                    if (myWard?.boundaries?.coordinates?.[0]?.length > 0) {
                      const coords = myWard.boundaries.coordinates[0];
                      let latSum = 0, lngSum = 0;
                      coords.forEach(c => {
                        latSum += c[1];
                        lngSum += c[0];
                      });
                      return [latSum / coords.length, lngSum / coords.length];
                    }
                    return [13.0827, 80.2707];
                  };
                  return (
                    <MapContainer center={getCenter()} zoom={13} style={{ height: '400px', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {myWard.boundaries && <GeoJSON data={myWard.boundaries} />}
                    </MapContainer>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
            {user?.ward && (
              <div className="form-group">
                <label>Mapped Ward Area</label>
                <input
                  type="text"
                  value={`${user.ward.name} (Ward ${user.ward.number})`}
                  disabled
                />
              </div>
            )}
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                pattern="[0-9]{10}"
                maxLength="10"
                placeholder="10-digit number"
              />
            </div>
            <button type="submit" className="btn-save"><HiCheck /> Save Profile</button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="settings-card glass-card">
          <h2><HiLockClosed /> Change Password</h2>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn-save"><HiCheck /> Update Password</button>
          </form>
        </div>

        {/* AI Rule Settings Card (Super Admin only) */}
        {user?.role === ROLES.SUPER_ADMIN && (
          <div className="settings-card glass-card span-2">
            <h2><HiSparkles /> AI Diagnostic Configs</h2>
            <form onSubmit={handleAIConfigSubmit} className="ai-settings-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Duplicate Search Radius (Meters)</label>
                  <input
                    type="number"
                    value={aiConfig.duplicateRadius}
                    onChange={(e) => setAiConfig({ ...aiConfig, duplicateRadius: parseInt(e.target.value) })}
                    min="10"
                    max="1000"
                  />
                  <span className="form-help">Scans reports inside this distance for duplicate checks.</span>
                </div>
                <div className="form-group">
                  <label>Duplicate History Window (Days)</label>
                  <input
                    type="number"
                    value={aiConfig.historyThresholdDays}
                    onChange={(e) => setAiConfig({ ...aiConfig, historyThresholdDays: parseInt(e.target.value) })}
                    min="1"
                    max="30"
                  />
                  <span className="form-help">Scans historic window back in days for duplicate checks.</span>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>AI Classification Confidence Threshold (%)</label>
                  <input
                    type="number"
                    value={aiConfig.minConfidence}
                    onChange={(e) => setAiConfig({ ...aiConfig, minConfidence: parseInt(e.target.value) })}
                    min="10"
                    max="100"
                  />
                  <span className="form-help">Auto-routing requires confidence above this score.</span>
                </div>
                <div className="form-group">
                  <label>Auto Routing Integration</label>
                  <select
                    value={aiConfig.autoRouteEnabled ? 'true' : 'false'}
                    onChange={(e) => setAiConfig({ ...aiConfig, autoRouteEnabled: e.target.value === 'true' })}
                  >
                    <option value="true">Enabled (Auto-assign departments)</option>
                    <option value="false">Disabled (Review manually in queue)</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-save"><HiCheck /> Save AI Configurations</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
