import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents } from 'react-leaflet';
import { complaintService } from '../../services/dataService';
import api from '../../services/api';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../utils/constants';
import { HiCamera, HiMap, HiDocumentText, HiArrowRight, HiArrowLeft, HiCheckCircle } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Complaints.css';

// Fix Leaflet marker icons issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ReportComplaint = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [gpsCoordinates, setGpsCoordinates] = useState({ lat: 12.9716, lng: 77.5946 }); // Default Bangalore coordinates
  const [address, setAddress] = useState('Locating...');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('others');

  // Ward detection state
  const [detectedWard, setDetectedWard] = useState(null);
  const [detectedCouncillor, setDetectedCouncillor] = useState(null);
  const [wardLoading, setWardLoading] = useState(false);

  // Trigger geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setGpsCoordinates(coords);
          reverseGeocode(coords.lat, coords.lng);
        },
        () => {
          reverseGeocode(12.9716, 77.5946); // fallback
        }
      );
    } else {
      reverseGeocode(12.9716, 77.5946);
    }
  }, []);

  // Detect ward whenever GPS changes
  const detectWard = useCallback(async (lat, lng) => {
    setWardLoading(true);
    try {
      const res = await api.get(`/wards/locate?lat=${lat}&lng=${lng}`);
      setDetectedWard(res.data.ward || null);
      setDetectedCouncillor(res.data.councillor || null);
    } catch {
      setDetectedWard(null);
      setDetectedCouncillor(null);
    } finally {
      setWardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (gpsCoordinates.lat && gpsCoordinates.lng) {
      detectWard(gpsCoordinates.lat, gpsCoordinates.lng);
    }
  }, [gpsCoordinates, detectWard]);

  // Free OpenStreetMap Nominatim reverse geocoder
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      if (res.data && res.data.display_name) {
        setAddress(res.data.display_name);
      } else {
        setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch {
      setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      toast.error('You can upload a maximum of 5 images');
      return;
    }

    setImages([...images, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeImage = (index) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);

    const updatedPreviews = [...imagePreviews];
    updatedPreviews.splice(index, 1);
    setImagePreviews(updatedPreviews);
  };

  // Map click listener component
  const MapEvents = () => {
    useMapEvents({
      click(e) {
        setGpsCoordinates(e.latlng);
        setAddress('Updating address...');
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('address', address);
      formData.append('gpsCoordinates', JSON.stringify(gpsCoordinates));
      images.forEach((img) => {
        formData.append('images', img);
      });

      await complaintService.create(formData);
      toast.success('Complaint reported successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-comp animate-fade-in">
      <div className="report-comp__header">
        <h1>Report Complaint</h1>
        <p className="report-comp__subtitle">Follow three easy steps to submit a civic issue for resolution</p>
      </div>

      {/* Progress Steps */}
      <div className="report-comp__steps glass-card">
        <div className={`step-item ${step >= 1 ? 'step-item--active' : ''}`}>
          <div className="step-item__number"><HiCamera /></div>
          <span>1. Upload Photos</span>
        </div>
        <div className="step-line"></div>
        <div className={`step-item ${step >= 2 ? 'step-item--active' : ''}`}>
          <div className="step-item__number"><HiMap /></div>
          <span>2. Select Location</span>
        </div>
        <div className="step-line"></div>
        <div className={`step-item ${step >= 3 ? 'step-item--active' : ''}`}>
          <div className="step-item__number"><HiDocumentText /></div>
          <span>3. Enter Details</span>
        </div>
      </div>

      {/* Step Contents */}
      <div className="report-comp__content glass-card">
        {step === 1 && (
          <div className="step-content animate-fade-in">
            <h2>Add Pictures of the Issue</h2>
            <p className="step-content__desc">Upload up to 5 clear images. This helps the AI categorize and route the complaint faster.</p>

            <div className="upload-zone">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                id="file-upload"
                className="sr-only"
              />
              <label htmlFor="file-upload" className="upload-zone__label">
                <div className="upload-zone__icon">📸</div>
                <p className="upload-zone__text">Click to browse or drag and drop images here</p>
                <span className="upload-zone__limit">JPG, PNG, WebP up to 5MB (Max 5 files)</span>
              </label>
            </div>

            {imagePreviews.length > 0 && (
              <div className="previews-grid">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="preview-item">
                    <img src={preview} alt={`upload preview ${index}`} />
                    <button type="button" onClick={() => removeImage(index)} className="preview-remove">×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="step-actions">
              <button
                type="button"
                className="btn-next btn-primary-gradient"
                onClick={() => setStep(2)}
                disabled={images.length === 0}
              >
                Continue to Location <HiArrowRight />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content animate-fade-in">
            <h2>Confirm Location</h2>
            <p className="step-content__desc">Verify your GPS location on the map below. Drag or click the map to refine the spot.</p>

            <div className="map-wrapper">
              <MapContainer
                center={[gpsCoordinates.lat, gpsCoordinates.lng]}
                zoom={15}
                style={{ height: '350px', width: '100%', borderRadius: '12px' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {/* Ward boundary polygon overlay */}
                {detectedWard?.boundaries?.coordinates?.length > 0 && (
                  <Polygon
                    positions={detectedWard.boundaries.coordinates[0].map(([lng, lat]) => [lat, lng])}
                    pathOptions={{
                      color: '#EF4444',
                      fillColor: '#EF4444',
                      fillOpacity: 0.08,
                      weight: 2,
                      dashArray: '5 5',
                    }}
                  />
                )}
                <Marker position={[gpsCoordinates.lat, gpsCoordinates.lng]} />
                <MapEvents />
              </MapContainer>
            </div>

            <div className="address-display">
              <p className="address-display__label">Captured Address</p>
              <p className="address-display__text">{address}</p>
            </div>

            {/* Ward Detection Card */}
            <div className="ward-detection-card">
              {wardLoading ? (
                <div className="ward-detection-card__loading">
                  <span className="auth-spinner" /> Detecting ward from location…
                </div>
              ) : detectedWard ? (
                <div className="ward-detection-card__found">
                  <div className="ward-detection-card__ward">
                    <span className="ward-detection-badge">🗺️ Ward {detectedWard.number}</span>
                    <span className="ward-detection-name">{detectedWard.name}</span>
                  </div>
                  {detectedCouncillor ? (
                    <div className="ward-detection-card__councillor">
                      <span className="councillor-label">👤 Ward Councillor</span>
                      <strong className="councillor-name">{detectedCouncillor.name}</strong>
                      {detectedCouncillor.phone && (
                        <span className="councillor-phone">📞 {detectedCouncillor.phone}</span>
                      )}
                    </div>
                  ) : (
                    <span className="ward-detection-card__no-councillor">No councillor assigned yet</span>
                  )}
                </div>
              ) : (
                <div className="ward-detection-card__none">
                  ⚠️ Location is outside all ward boundaries. Please refine your pin.
                </div>
              )}
            </div>

            <div className="step-actions justify-between">
              <button type="button" className="btn-back" onClick={() => setStep(1)}>
                <HiArrowLeft /> Back
              </button>
              <button type="button" className="btn-next btn-primary-gradient" onClick={() => setStep(3)}>
                Enter Details <HiArrowRight />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} className="step-content animate-fade-in">
            <h2>Complaint Specifications</h2>
            <p className="step-content__desc">Describe the problem briefly. The AI will classify and queue it automatically.</p>

            <div className="form-group">
              <label>Complaint Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Overflowing garbage bin outside community hall"
                required
              />
            </div>

            <div className="form-group">
              <label>Details & Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe details such as severity, length of time the issue has existed, or specific instructions for work teams."
                rows="5"
                required
              />
            </div>

            <div className="form-group">
              <label>Category (Optional — AI will classify if left as Others)</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                  <option key={key} value={key}>
                    {CATEGORY_ICONS[key]} {val}
                  </option>
                ))}
              </select>
            </div>

            <div className="step-actions justify-between">
              <button type="button" className="btn-back" onClick={() => setStep(2)}>
                <HiArrowLeft /> Back
              </button>
              <button type="submit" className="btn-submit btn-primary-gradient" disabled={loading}>
                {loading ? <span className="auth-spinner"></span> : <><HiCheckCircle /> Submit Complaint</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportComplaint;
