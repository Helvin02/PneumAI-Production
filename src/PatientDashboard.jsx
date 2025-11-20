import React, { useState, useEffect } from 'react';
import {
  User,
  FileText,
  Calendar,
  MessageCircle,
  LogOut,
  Home,
  Upload,
  Clock,
  ChevronRight,
  Activity,
  X,
  Camera,
  CheckCircle,
  Layers,
  AlertCircle,
  Info,
  Menu,
  Search,
  Trash2,
  Eye as EyeIcon
} from 'lucide-react';
import './Dashboard.css';
import './PatientPlatformIntegration.css';
import PatientPlatform from './PatientPlatform';
import './Platform.css'; // Import platform CSS
import SimplifiedPatientPlatform from './SimplifiedPatientPlatform'; // Import the new component
import ScanUpload from './components/ScanUpload';
import ScanResults from './components/ScanResults';
import ScanCommentThread from './components/ScanCommentThread';
import ScanCommentForm from './components/ScanCommentForm';
import {
  getCurrentPatientProfile,
  getCurrentSession,
  getAllScans,
  getScansByPatientId,
  saveScan,
  deleteScan,
  getAppointments,
  getAppointmentsByPatient,
  saveAppointment,
  updateAppointment,
  deleteAppointment,
  getAllDoctors,
  getMessages,
  getMessagesByUser,
  sendMessage,
  getDashboardStats,
  formatDate,
  savePatientProfile,
  getScanCommentCount
} from './utils/unifiedDataManager';
import { scanAPI, doctorAPI } from './services/apiService';

const PatientDashboard = ({ username, onLogout }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Load persistent data using unified data manager
  const [patientProfile, setPatientProfile] = useState(getCurrentPatientProfile());
  const [scanHistory, setScanHistory] = useState([]); // Start empty, load from API
  const [appointments, setAppointments] = useState(() => {
    const profile = getCurrentPatientProfile();
    return profile ? getAppointmentsByPatient(profile.id) : [];
  });
  const [doctors, setDoctors] = useState(getAllDoctors());
  const [dashboardStats, setDashboardStats] = useState(getDashboardStats());

  // Scan upload and results state
  const [currentScanResult, setCurrentScanResult] = useState(null);

  // Appointment booking state
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState({
    date: '',
    time: '',
    type: 'consultation',
    notes: ''
  });
  const [isBookingAppointment, setIsBookingAppointment] = useState(false);

  // Messaging state
  const [messageForm, setMessageForm] = useState({
    recipient: '',
    subject: '',
    message: ''
  });
  const [messages, setMessages] = useState([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Comment state
  const [selectedScanForComments, setSelectedScanForComments] = useState(null);
  const [replyToComment, setReplyToComment] = useState(null);
  const [commentRefresh, setCommentRefresh] = useState(0);

  // Current user object for comments
  const currentUser = patientProfile ? {
    id: patientProfile.id,
    name: patientProfile.fullName || username,
    role: 'patient'
  } : null;

  // Load/refresh patient profile and data on mount
  useEffect(() => {
    const loadData = async () => {
      const profile = getCurrentPatientProfile();
      if (profile) {
        // Update profile state
        setPatientProfile(profile);

        // Get actual patient_id from session (this is the database ID)
        const session = getCurrentSession();
        const patientId = session?.user_id || session?.userId || profile.id;

        console.log('Loading scans for patient ID:', patientId);

        // Load scan history from API
        try {
          const response = await scanAPI.getByPatient(patientId);
          // Assuming response structure matches what we need or is { scans: [...] }
          // Adjust based on actual API response. For now assuming array or { scans: [] }
          const history = Array.isArray(response) ? response : (response.scans || []);
          console.log('Loaded scans from API:', history);
          setScanHistory(history);

          if (history.length > 0) {
            // Only set if not already set or logic requires it
            // setCurrentScanResult(history[0]); 
          }
        } catch (error) {
          console.error("Failed to load scans from API", error);
          // Fallback to local if API fails (optional, maybe remove later)
          // const history = getScansByPatientId(profile.id);
          // setScanHistory(history);
        }

        // Fallback to local for now if API fails or while migrating
        // const history = getScansByPatientId(profile.id);
        // setScanHistory(history);

        // Load appointments
        setAppointments(getAppointmentsByPatient(profile.id));

        // Load messages
        setMessages(getMessagesByUser(profile.id));
      }
    };
    loadData();
  }, []);

  // Refresh dashboard stats when scan history changes
  useEffect(() => {
    setDashboardStats(getDashboardStats());
  }, [scanHistory]);

  // Periodically refresh doctors list to show newly added doctors
  useEffect(() => {
    const refreshDoctors = async () => {
      try {
        const response = await doctorAPI.getAll();
        // Handle both array and object response formats
        const updatedDoctors = Array.isArray(response) ? response : (response.doctors || []);
        setDoctors(updatedDoctors);
      } catch (error) {
        console.error("Failed to fetch doctors:", error);
        // Fallback to local storage if API fails
        setDoctors(getAllDoctors());
      }
    };

    refreshDoctors(); // Initial load

    // Refresh every 30 seconds (less frequent than 5s to avoid API spam)
    const interval = setInterval(refreshDoctors, 30000);

    return () => clearInterval(interval);
  }, []);

  // Appointments are already loaded from localStorage via getAppointments() in state
  // No need for API call - using localStorage directly

  // Messages are already loaded from localStorage via getMessages() in state
  // No need for API call - using localStorage directly

  // Handle scan upload completion
  const handleScanComplete = async (result) => {
    setCurrentScanResult(result);

    // Get or create patient profile
    const profile = getCurrentPatientProfile();
    if (!profile) {
      console.error('❌ No patient profile found!');
      alert('Error: Patient profile not found. Please log in again.');
      return;
    }

    console.log('📋 Patient profile:', profile.id, profile.name);

    // The backend already saved the scan. We just need to refresh the list.
    try {
      console.log('✅ Scan uploaded and processed by backend');
      setUploadSuccess(true);

      // Trigger a refresh of the scan list
      const response = await scanAPI.getByPatient(profile.id);
      const updatedHistory = Array.isArray(response) ? response : (response.scans || []);
      setScanHistory(updatedHistory);
      console.log('📊 Scan history updated from API:', updatedHistory.length, 'scans');

    } catch (error) {
      console.error('Error refreshing scans:', error);
    }

    // Auto-switch to results view
    setTimeout(() => setActiveTab('results'), 500);
  };

  const handleScanError = (error) => {
    console.error('Scan upload error:', error);
    alert(`Scan upload failed: ${error.message}`);
  };

  // Handle scan deletion
  const handleDeleteScan = (scanId) => {
    if (window.confirm('Are you sure you want to delete this scan?')) {
      deleteScan(scanId);

      // Refresh scan history
      const profile = getCurrentPatientProfile();
      if (profile) {
        setScanHistory(getScansByPatientId(profile.id));
      }

      // If we're viewing the deleted scan, clear it
      if (currentScanResult?.scanId === scanId) {
        setCurrentScanResult(null);
      }

      alert('Scan deleted successfully!');
    }
  };

  // Handle viewing a specific scan
  const handleViewScan = (scan) => {
    setCurrentScanResult(scan);
    setActiveTab('results');
  };

  // Real data from localStorage - convert to format expected by UI
  const recentUploads = (scanHistory || []).slice(0, 5).map(scan => ({
    id: scan.scanId,
    name: `CT Scan - ${formatDate(scan.uploadTime)}`,
    date: formatDate(scan.uploadTime),
    status: 'Analyzed',
    riskLevel: scan.results?.riskLevel || 'none',
    detected: scan.results?.detected || false,
    scanData: scan
  }));

  // Use doctors from localStorage
  const availableDoctors = doctors;

  // ============ Appointment Booking Handlers ============

  const handleBookAppointment = (doctor) => {
    setSelectedDoctor(doctor);
    setAppointmentForm({
      date: '',
      time: '',
      type: 'consultation',
      notes: ''
    });
    setShowAppointmentModal(true);
  };

  const handleAppointmentFormChange = (field, value) => {
    setAppointmentForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitAppointment = async (e) => {
    e.preventDefault();
    setIsBookingAppointment(true);

    try {
      // Get current patient profile
      const profile = getCurrentPatientProfile();
      if (!profile) {
        throw new Error('Patient profile not found. Please log in again.');
      }

      const appointmentData = {
        patientId: profile.id,
        doctorId: selectedDoctor.id,
        doctor: selectedDoctor.name,
        date: appointmentForm.date,
        time: appointmentForm.time,
        type: appointmentForm.type,
        notes: appointmentForm.notes
      };

      // Save to unified storage
      const savedAppointment = saveAppointment(appointmentData);

      if (savedAppointment) {
        // Refresh appointments list
        setAppointments(getAppointmentsByPatient(profile.id));

        // Close modal and show success
        setShowAppointmentModal(false);
        alert('Appointment booked successfully!');
      } else {
        throw new Error('Failed to save appointment');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert(`Failed to book appointment: ${error.message}`);
    } finally {
      setIsBookingAppointment(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      deleteAppointment(appointmentId);

      // Refresh appointments
      const profile = getCurrentPatientProfile();
      if (profile) {
        setAppointments(getAppointmentsByPatient(profile.id));
      }

      alert('Appointment cancelled successfully!');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert(`Failed to cancel appointment: ${error.message}`);
    }
  };

  const handleRescheduleAppointment = async (appointment) => {
    const newDate = prompt('Enter new date (YYYY-MM-DD):', appointment.date);
    const newTime = prompt('Enter new time (HH:MM AM/PM):', appointment.time);

    if (!newDate || !newTime) return;

    try {
      updateAppointment(appointment.id, {
        date: newDate,
        time: newTime
      });

      // Refresh appointments list
      const profile = getCurrentPatientProfile();
      if (profile) {
        setAppointments(getAppointmentsByPatient(profile.id));
      }

      alert('Appointment rescheduled successfully!');
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      alert(`Failed to reschedule appointment: ${error.message}`);
    }
  };

  // ============ Messaging Handlers ============

  const handleMessageFormChange = (field, value) => {
    setMessageForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setIsSendingMessage(true);

    try {
      // Get current patient profile
      const profile = getCurrentPatientProfile();
      if (!profile) {
        throw new Error('Patient profile not found. Please log in again.');
      }

      // Find recipient doctor
      const recipientDoctor = doctors.find(d => d.id === messageForm.recipient);
      if (!recipientDoctor) {
        throw new Error('Please select a recipient');
      }

      const messageData = {
        senderId: profile.id,
        senderName: profile.name,
        senderRole: 'patient',
        receiverId: recipientDoctor.id,
        receiverName: recipientDoctor.name,
        content: `Subject: ${messageForm.subject}\n\n${messageForm.message}`
      };

      sendMessage(messageData);

      // Refresh messages list
      setMessages(getMessagesByUser(profile.id));

      // Reset form
      setMessageForm({
        recipient: '',
        subject: '',
        message: ''
      });

      alert('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert(`Failed to send message: ${error.message}`);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleUpload = (e) => {
    e.preventDefault();
    // Simulate upload process
    setTimeout(() => {
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        setShowUploadModal(false);
      }, 2000);
    }, 1500);
  };

  // Toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };

  return (
    <div className="dashboard-layout">
      {/* Decorative lung backgrounds */}
      <div className="dashboard-lung-bg dashboard-lung-bg-left"></div>
      <div className="dashboard-lung-bg dashboard-lung-bg-right"></div>

      {/* Mobile menu button */}
      <button
        className="mobile-menu-toggle"
        onClick={toggleMobileSidebar}
        type="button"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${showMobileSidebar ? 'show' : ''}`}>
        <div className="sidebar-header">
          <img src="/assets/logo-medic.jpg" alt="PneumAI" className="sidebar-logo-img" />
          <h2 className="dashboard-logo">PneumAI</h2>
          <button
            className="close-sidebar"
            onClick={() => setShowMobileSidebar(false)}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="user-profile">
          <div className="user-avatar">
            <User className="avatar-icon" />
          </div>
          <div className="user-info-sidebar">
            <span className="username-sidebar">Welcome,</span>
            <span className="username-value">{patientProfile?.name || username}</span>
          </div>
        </div>

        <div className="sidebar-menu">
          <button
            className={`sidebar-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
            type="button"
          >
            <Home className="sidebar-icon" />
            <span>Home</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
            type="button"
          >
            <Calendar className="sidebar-icon" />
            <span>Book Doctor</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === 'scans' ? 'active' : ''}`}
            onClick={() => setActiveTab('scans')}
            type="button"
          >
            <Upload className="sidebar-icon" />
            <span>CT Scans</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
            type="button"
          >
            <Activity className="sidebar-icon" />
            <span>Scan Results</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === 'platform' ? 'active' : ''}`}
            onClick={() => setActiveTab('platform')}
            type="button"
          >
            <Layers className="sidebar-icon" />
            <span>CT Scan Platform</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            type="button"
          >
            <Clock className="sidebar-icon" />
            <span>Recent Uploads</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => setActiveTab('contact')}
            type="button"
          >
            <MessageCircle className="sidebar-icon" />
            <span>Contact Doctor</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={onLogout} type="button">
            <LogOut className="sidebar-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-content-wrapper">
        {/* Main Content Header */}
        <div className="content-header">
          <h1 className="page-title">
            {activeTab === 'home' && 'Dashboard'}
            {activeTab === 'appointments' && 'Book a Doctor'}
            {activeTab === 'scans' && 'CT Scan Analysis'}
            {activeTab === 'results' && 'Scan Results'}
            {activeTab === 'platform' && 'CT Scan Platform'}
            {activeTab === 'history' && 'Recent Uploads'}
            {activeTab === 'contact' && 'Contact Your Doctor'}
          </h1>

          <div className="header-actions">
            <div className="search-container">
              <Search size={18} className="search-icon" />
              <input type="text" placeholder="Search..." className="search-input" />
            </div>

            {activeTab === 'scans' && (
              <button
                type="button"
                className="action-button"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload size={16} /> Upload Scan
              </button>
            )}
          </div>
        </div>

        {/* Main Content Body */}
        <div className="content-body">
          {activeTab === 'home' && (
            <>
              <div className="welcome-section">
                <h2>Welcome to Your Patient Portal</h2>
                <p>Monitor your lung health, upload CT scan results, and stay connected with your healthcare team.</p>
              </div>

              {/* YOLOv12 Scan Upload Component */}
              <ScanUpload
                onScanComplete={handleScanComplete}
                onError={handleScanError}
              />

              {/* Show latest scan result if available */}
              {currentScanResult && (
                <div className="latest-result-preview">
                  <h3>Latest Scan Result</h3>
                  <div className="result-quick-info">
                    <p><strong>Status:</strong> {currentScanResult.results.detected ? 'Detection Found' : 'No Detection'}</p>
                    <p><strong>Risk Level:</strong> <span className={`risk-${currentScanResult.results.riskLevel || 'none'}`}>{(currentScanResult.results.riskLevel || 'none').toUpperCase()}</span></p>
                    <button onClick={() => setActiveTab('results')} type="button" className="view-full-results">
                      View Full Results
                    </button>
                  </div>
                </div>
              )}

              <div className="upload-info-section">
                <div className="info-card">
                  <div className="info-icon">
                    <AlertCircle size={20} />
                  </div>
                  <div className="info-content">
                    <h4>Why Upload Your CT Scans?</h4>
                    <p>Our AI system assists in analyzing CT scans to provide you and your healthcare professionals with helpful insights for review.</p>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <Info size={20} />
                  </div>
                  <div className="info-content">
                    <h4>What Happens Next?</h4>
                    <p>After upload, your scan will be analyzed automatically. Results are typically available within 30 minutes.</p>
                  </div>
                </div>

                <button
                  className="view-all-scans-button"
                  onClick={() => setActiveTab('scans')}
                  type="button"
                >
                  View All My Scans
                </button>
              </div>

              {/* Dashboard Summary Cards */}
              <div className="dashboard-grid">
                <div className="dashboard-card">
                  <h3>Your Upcoming Appointments</h3>
                  <div className="card-content">
                    {(appointments || []).length > 0 ? (
                      (appointments || []).map(appointment => {
                        const formattedDate = formatDate(appointment.date) || '';
                        const dateParts = formattedDate ? formattedDate.split(' ') : ['', ''];
                        return (
                          <div className="appointment-item" key={appointment.id}>
                            <div className="appointment-date">
                              <span className="month">{dateParts[0]}</span>
                              <span className="day">{dateParts[1] ? dateParts[1].replace(',', '') : ''}</span>
                            </div>
                            <div className="appointment-details">
                              <h4>{appointment.doctor}</h4>
                              <p>{appointment.type}</p>
                              <p>{appointment.time}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="no-data-message">No upcoming appointments scheduled.</p>
                    )}
                    <button
                      className="action-button"
                      onClick={() => setActiveTab('appointments')}
                      type="button"
                    >
                      Schedule Appointment
                    </button>
                  </div>
                </div>

                <div className="dashboard-card">
                  <h3>Recent Uploads</h3>
                  <div className="card-content">
                    {(recentUploads || []).length > 0 ? (
                      (recentUploads || []).map(upload => (
                        <div className="upload-item" key={upload.id}>
                          <div className="upload-icon">
                            <FileText />
                          </div>
                          <div className="upload-details">
                            <h4>{upload.name}</h4>
                            <p>Date: {upload.date}</p>
                            <p className={`status ${upload.status === 'Analyzed' ? 'success' : 'pending'}`}>
                              {upload.status}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="no-data-message">No recent uploads.</p>
                    )}
                    <button
                      className="action-button"
                      onClick={() => setShowUploadModal(true)}
                      type="button"
                    >
                      Upload New Scan
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'results' && (
            <>
              {currentScanResult ? (
                <ScanResults scanData={currentScanResult} />
              ) : (
                <div className="no-results-message">
                  <Info size={48} color="#999" />
                  <h3>No Scan Results Available</h3>
                  <p>Upload a CT scan from the Home tab to see your results here.</p>
                  <button onClick={() => setActiveTab('home')} type="button" className="go-home-button">
                    Go to Upload
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'platform' && (
            <SimplifiedPatientPlatform />
          )}

          {activeTab === 'appointments' && (
            <>
              <div className="page-subheader">
                <p>Schedule an appointment with one of our specialists.</p>
              </div>

              <div className="doctors-grid">
                {(availableDoctors || []).map(doctor => (
                  <div className="doctor-card" key={doctor.id}>
                    <div className="doctor-avatar">
                      <img src={doctor.image} alt={doctor.name} />
                    </div>
                    <div className="doctor-info">
                      <h3>{doctor.name}</h3>
                      <p className="doctor-specialty">{doctor.specialty}</p>
                      <p className="doctor-availability">{doctor.availability}</p>
                      <button
                        className="book-button"
                        type="button"
                        onClick={() => handleBookAppointment(doctor)}
                      >
                        Book Appointment
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="dashboard-card full-width">
                <h3>Your Scheduled Appointments</h3>
                <div className="appointments-list">
                  {(appointments || []).length > 0 ? (
                    (appointments || []).map(appointment => {
                      const formattedDate = formatDate(appointment.date) || '';
                      const dateParts = formattedDate ? formattedDate.split(' ') : ['', ''];
                      return (
                        <div className="appointment-list-item" key={appointment.id}>
                          <div className="appointment-list-date">
                            <span className="month">{dateParts[0]}</span>
                            <span className="day">{dateParts[1] ? dateParts[1].replace(',', '') : ''}</span>
                          </div>
                          <div className="appointment-list-details">
                            <h4>{appointment.doctor}</h4>
                            <p>{appointment.type}</p>
                            <p>{appointment.time}</p>
                          </div>
                          <div className="appointment-list-actions">
                            <button
                              className="reschedule-button"
                              type="button"
                              onClick={() => handleRescheduleAppointment(appointment)}
                            >
                              Reschedule
                            </button>
                            <button
                              className="cancel-button"
                              type="button"
                              onClick={() => handleCancelAppointment(appointment.id)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="no-data-message">No appointments scheduled.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'scans' && (
            <>
              <div className="page-subheader">
                <p>View and analyze your CT scan results with our AI-powered platform.</p>
              </div>

              {currentScanResult ? (
                <>
                  <div className="scan-grid">
                    {/* Scan Viewer */}
                    <div className="scan-viewer">
                      <img
                        src={currentScanResult.results.annotatedImageUrl || currentScanResult.results.imageUrl}
                        alt="CT Scan"
                        className="scan-image"
                        onError={(e) => {
                          e.target.src = '/api/placeholder/400/400';
                        }}
                      />
                      <div className="scan-image-info">
                        <p className="scan-date">Uploaded: {formatDate(currentScanResult.uploadTime)}</p>
                      </div>
                    </div>

                    {/* Analysis Results */}
                    <div className="analysis-container">
                      <h4 className="analysis-title">AI Analysis Results</h4>

                      <div className="analysis-content">
                        <div className="analysis-section">
                          <div className="probability-header">
                            <span className="probability-label">Analysis Status</span>
                            <span className="probability-value" style={{
                              color: currentScanResult.results.riskLevel === 'high' ? '#ef4444' :
                                currentScanResult.results.riskLevel === 'medium' ? '#f97316' :
                                  currentScanResult.results.riskLevel === 'low' ? '#eab308' : '#22c55e'
                            }}>
                              Complete
                            </span>
                          </div>
                          <div className="risk-badge-container">
                            <span className={`risk-badge-large risk-${currentScanResult.results.riskLevel}`}>
                              {currentScanResult.results.riskLevel === 'none' ? 'REVIEWED' :
                                currentScanResult.results.riskLevel === 'low' ? 'ATTENTION SUGGESTED' :
                                  currentScanResult.results.riskLevel === 'medium' ? 'REVIEW RECOMMENDED' :
                                    'PROFESSIONAL REVIEW NEEDED'}
                            </span>
                          </div>
                        </div>

                        <div className="section-divider">
                          <h5 className="section-subtitle">Detected Abnormalities</h5>
                          {currentScanResult.results.detections && currentScanResult.results.detections.length > 0 ? (
                            <ul className="abnormality-list">
                              {currentScanResult.results.detections.map((detection, idx) => (
                                <li className="abnormality-item" key={idx}>
                                  <ChevronRight className="abnormality-icon icon-sm" />
                                  <div className="abnormality-content">
                                    <p className="abnormality-title">
                                      {detection.class.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} detected
                                    </p>
                                    <p className="abnormality-details">
                                      {detection.characteristics ? `Size: ${detection.characteristics.size_mm}mm, ${detection.characteristics.shape}` : 'Detected by AI analysis'}
                                    </p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="no-detections">No abnormalities detected in this scan.</p>
                          )}
                        </div>

                        <div className="section-divider">
                          <h5 className="section-subtitle">Suggested Considerations</h5>
                          <ul className="action-list">
                            {currentScanResult.results.riskLevel === 'high' && (
                              <>
                                <li className="action-item">
                                  <Activity className="action-icon icon-sm" />
                                  Healthcare professional consultation recommended
                                </li>
                                <li className="action-item">
                                  <Activity className="action-icon icon-sm" />
                                  Further evaluation may be beneficial
                                </li>
                              </>
                            )}
                            {currentScanResult.results.riskLevel === 'medium' && (
                              <>
                                <li className="action-item">
                                  <Activity className="action-icon icon-sm" />
                                  Follow-up imaging may be considered
                                </li>
                                <li className="action-item">
                                  <Activity className="action-icon icon-sm" />
                                  Discuss findings with healthcare professional
                                </li>
                              </>
                            )}
                            {currentScanResult.results.riskLevel === 'low' && (
                              <>
                                <li className="action-item">
                                  <Activity className="action-icon icon-sm" />
                                  Consider routine follow-up with healthcare provider
                                </li>
                                <li className="action-item">
                                  <Activity className="action-icon icon-sm" />
                                  Maintain regular health monitoring
                                </li>
                              </>
                            )}
                            {currentScanResult.results.riskLevel === 'none' && (
                              <li className="action-item">
                                <Activity className="action-icon icon-sm" />
                                Continue with routine annual checkups
                              </li>
                            )}
                            <li className="action-item">
                              <Activity className="action-icon icon-sm" />
                              Share results with your primary care physician
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="analysis-actions">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => {
                            // Download detailed report
                            const report = JSON.stringify(currentScanResult, null, 2);
                            const blob = new Blob([report], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `scan-report-${currentScanResult.scanId}.json`;
                            a.click();
                          }}
                        >
                          View Detailed Report
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setActiveTab('contact')}
                        >
                          Consult Doctor
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-results-message">
                  <AlertCircle size={48} color="#999" />
                  <h3>No Scan Results Available</h3>
                  <p>Upload a CT scan from the Home tab to view analysis results here.</p>
                  <button onClick={() => setActiveTab('home')} type="button" className="action-button">
                    Go to Upload
                  </button>
                </div>
              )}

              <div className="patient-info">
                <h4 className="patient-title">Your Information</h4>
                <div className="patient-card">
                  <div className="patient-grid">
                    <div className="patient-field">
                      <p className="field-label">Patient Name</p>
                      <p className="field-value">{patientProfile?.name || 'N/A'}</p>
                    </div>
                    <div className="patient-field">
                      <p className="field-label">Patient ID</p>
                      <p className="field-value">{patientProfile?.id || 'N/A'}</p>
                    </div>
                    <div className="patient-field">
                      <p className="field-label">Age</p>
                      <p className="field-value">{patientProfile?.age || 'N/A'}</p>
                    </div>
                    <div className="patient-field">
                      <p className="field-label">Last Scan Date</p>
                      <p className="field-value">{dashboardStats?.lastScanDate ? formatDate(dashboardStats.lastScanDate) : 'No scans yet'}</p>
                    </div>
                  </div>

                  <div className="patient-notes">
                    <p className="notes-label">Clinical Notes</p>
                    <p className="notes-text">{patientProfile?.clinicalNotes || 'No notes available'}</p>
                  </div>
                </div>
              </div>

              <div className="dashboard-card full-width">
                <h3>Upload Guidelines</h3>
                <div className="guidelines-content">
                  <div className="guideline-item">
                    <h4>File Requirements</h4>
                    <ul className="guideline-list">
                      <li>Files must be in DICOM, NIFTI, JPEG, or PNG format</li>
                      <li>Maximum file size: 100MB per file</li>
                      <li>For optimal analysis, DICOM format is preferred</li>
                    </ul>
                  </div>
                  <div className="guideline-item">
                    <h4>Processing Time</h4>
                    <ul className="guideline-list">
                      <li>Initial AI analysis typically takes 5-10 minutes</li>
                      <li>Specialist review may take up to 24 hours</li>
                      <li>You will receive a notification when results are ready</li>
                    </ul>
                  </div>
                  <div className="guideline-item">
                    <h4>Privacy Information</h4>
                    <ul className="guideline-list">
                      <li>All uploads are encrypted and stored securely</li>
                      <li>Only authorized healthcare providers have access to your scans</li>
                      <li>You can delete your uploaded scans at any time</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <>
              <div className="page-subheader">
                <p>View and manage your uploaded CT scans and results. Total scans: {(scanHistory || []).length}</p>
              </div>

              {(scanHistory || []).length > 0 ? (
                <>
                  <div className="uploads-table-container">
                    <table className="uploads-table">
                      <thead>
                        <tr>
                          <th>Scan Date</th>
                          <th>Risk Level</th>
                          <th>Findings</th>
                          <th>Comments</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(scanHistory || []).map(scan => {
                          const commentCount = getScanCommentCount(scan.scanId || scan.id);
                          return (
                            <tr key={scan.scanId || scan.id}>
                              <td>{formatDate(scan.uploadTime)}</td>
                              <td>
                                <span className={`status-badge risk-${scan.results?.riskLevel || 'none'}`}>
                                  {(scan.results?.riskLevel || 'none').toUpperCase()}
                                </span>
                              </td>
                              <td>{scan.results?.detected ? 'Areas Detected' : 'None Detected'}</td>
                              <td>
                                <span className="comment-count-badge">
                                  {commentCount > 0 ? `${commentCount} comment${commentCount > 1 ? 's' : ''}` : 'No comments'}
                                </span>
                              </td>
                              <td>
                                <div className="table-actions">
                                  <button
                                    className="table-action-button view"
                                    onClick={() => handleViewScan(scan)}
                                    type="button"
                                    title="View Results"
                                  >
                                    <EyeIcon size={16} /> View
                                  </button>
                                  <button
                                    className="table-action-button comment"
                                    onClick={() => setSelectedScanForComments(scan)}
                                    type="button"
                                    title="View Comments"
                                  >
                                    <MessageCircle size={16} /> Comments
                                  </button>
                                  <button
                                    className="table-action-button delete"
                                    onClick={() => handleDeleteScan(scan.scanId)}
                                    type="button"
                                    title="Delete Scan"
                                  >
                                    <Trash2 size={16} /> Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {selectedScanForComments && currentUser && (
                    <div style={{
                      marginTop: '2rem',
                      background: 'white',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3>Comments for Scan from {formatDate(selectedScanForComments.uploadTime)}</h3>
                        <button
                          onClick={() => setSelectedScanForComments(null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <ScanCommentForm
                        scanId={selectedScanForComments.scanId || selectedScanForComments.id}
                        currentUser={currentUser}
                        parentComment={replyToComment}
                        onSuccess={() => {
                          setCommentRefresh(prev => prev + 1);
                          setReplyToComment(null);
                        }}
                        onCancel={() => setReplyToComment(null)}
                      />

                      <ScanCommentThread
                        scanId={selectedScanForComments.scanId || selectedScanForComments.id}
                        currentUser={currentUser}
                        onReply={(comment) => setReplyToComment(comment)}
                        onDelete={() => setCommentRefresh(prev => prev + 1)}
                        refreshTrigger={commentRefresh}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="no-data-container">
                  <FileText className="no-data-icon" />
                  <h3>No Uploads Yet</h3>
                  <p>You haven't uploaded any CT scans yet. Upload a scan to get started.</p>
                  <button
                    className="action-button"
                    onClick={() => setActiveTab('home')}
                    type="button"
                  >
                    Go to Home to Upload
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'contact' && (
            <>
              <div className="page-subheader">
                <p>Reach out to your healthcare providers with any questions or concerns.</p>
              </div>

              <div className="contact-grid">
                <div className="contact-card">
                  <div className="contact-header">
                    <h3>Your Care Team</h3>
                  </div>
                  <div className="contact-list">
                    {(doctors || []).map(doctor => (
                      <div key={doctor.id} className="contact-item">
                        <div className="contact-avatar">
                          <img src={doctor.image} alt={doctor.name} />
                        </div>
                        <div className="contact-details">
                          <h4>{doctor.name}</h4>
                          <p>{doctor.specialty}</p>
                          <div className="contact-actions">
                            <button
                              className="contact-action-button"
                              type="button"
                              onClick={() => {
                                setMessageForm(prev => ({ ...prev, recipient: doctor.id }));
                                document.getElementById('subject')?.focus();
                              }}
                            >
                              Message
                            </button>
                            <button className="contact-action-button" type="button">
                              <a href={`tel:${doctor.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                Call
                              </a>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="message-card">
                  <div className="message-header">
                    <h3>Send a Message</h3>
                  </div>
                  <form className="message-form" onSubmit={handleSendMessage}>
                    <div className="form-group">
                      <label htmlFor="recipient">Recipient</label>
                      <select
                        id="recipient"
                        name="recipient"
                        value={messageForm.recipient}
                        onChange={(e) => handleMessageFormChange('recipient', e.target.value)}
                        required
                      >
                        <option value="">Select a healthcare provider</option>
                        {(doctors || []).map(doctor => (
                          <option key={doctor.id} value={doctor.id}>
                            {doctor.name} - {doctor.specialty}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="subject">Subject</label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        placeholder="Enter message subject"
                        value={messageForm.subject}
                        onChange={(e) => handleMessageFormChange('subject', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="message">Message</label>
                      <textarea
                        id="message"
                        name="message"
                        rows="5"
                        placeholder="Type your message here..."
                        value={messageForm.message}
                        onChange={(e) => handleMessageFormChange('message', e.target.value)}
                        required
                      ></textarea>
                    </div>
                    <div className="form-actions">
                      <button
                        className="cancel-button"
                        type="button"
                        onClick={() => setMessageForm({ recipient: '', subject: '', message: '' })}
                      >
                        Cancel
                      </button>
                      <button
                        className="send-button"
                        type="submit"
                        disabled={isSendingMessage}
                      >
                        {isSendingMessage ? 'Sending...' : 'Send Message'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="dashboard-card full-width">
                <h3>Message History</h3>
                <div className="message-history">
                  {(messages || []).length > 0 ? (
                    (messages || []).slice(0, 10).map(msg => {
                      const content = msg.content || '';
                      const subject = content.split('\n')[0]?.replace('Subject: ', '') || 'No Subject';
                      const preview = content.split('\n\n')[1] || content;
                      const isFromPatient = msg.senderRole === 'patient';

                      return (
                        <div className="message-history-item" key={msg.id}>
                          <div className="message-history-header">
                            <h4>{subject}</h4>
                            <span className="message-date">{formatDate(msg.timestamp)}</span>
                          </div>
                          <p className="message-recipient">
                            {isFromPatient ? `To: ${msg.receiverName}` : `From: ${msg.senderName}`}
                          </p>
                          <p className="message-preview">
                            {preview.length > 100 ? preview.substring(0, 100) + '...' : preview}
                          </p>
                          <div className="message-status">
                            <span className={`status-badge ${msg.read ? 'success' : 'warning'}`}>
                              {msg.read ? 'Read' : 'Sent'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="no-data-message">No messages yet. Send a message to your healthcare provider above.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Appointment Booking Modal */}
      {showAppointmentModal && selectedDoctor && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Book Appointment with {selectedDoctor.name}</h2>
              <button className="close-button" onClick={() => setShowAppointmentModal(false)} type="button">
                <X className="icon-sm" />
              </button>
            </div>

            <form className="upload-form" onSubmit={handleSubmitAppointment}>
              <div className="form-group">
                <label htmlFor="apt-date">Appointment Date</label>
                <input
                  type="date"
                  id="apt-date"
                  name="apt-date"
                  value={appointmentForm.date}
                  onChange={(e) => handleAppointmentFormChange('date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="apt-time">Appointment Time</label>
                <select
                  id="apt-time"
                  name="apt-time"
                  value={appointmentForm.time}
                  onChange={(e) => handleAppointmentFormChange('time', e.target.value)}
                  required
                >
                  <option value="">Select a time</option>
                  <option value="9:00 AM">9:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="1:00 PM">1:00 PM</option>
                  <option value="2:00 PM">2:00 PM</option>
                  <option value="3:00 PM">3:00 PM</option>
                  <option value="4:00 PM">4:00 PM</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="apt-type">Appointment Type</label>
                <select
                  id="apt-type"
                  name="apt-type"
                  value={appointmentForm.type}
                  onChange={(e) => handleAppointmentFormChange('type', e.target.value)}
                  required
                >
                  <option value="consultation">Consultation</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="scan-review">Scan Review</option>
                  <option value="treatment">Treatment</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="apt-notes">Notes (Optional)</label>
                <textarea
                  id="apt-notes"
                  name="apt-notes"
                  rows="3"
                  placeholder="Add any notes or concerns..."
                  value={appointmentForm.notes}
                  onChange={(e) => handleAppointmentFormChange('notes', e.target.value)}
                ></textarea>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowAppointmentModal(false)}
                  disabled={isBookingAppointment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="upload-button"
                  disabled={isBookingAppointment}
                >
                  {isBookingAppointment ? 'Booking...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Upload CT Scan</h2>
              <button className="close-button" onClick={() => setShowUploadModal(false)} type="button">
                <X className="icon-sm" />
              </button>
            </div>

            {uploadSuccess ? (
              <div className="success-message">
                <CheckCircle className="success-icon" />
                <h3>Upload Successful!</h3>
                <p>Your CT scan has been uploaded and is being processed. You will be notified when the analysis is complete.</p>
              </div>
            ) : (
              <form className="upload-form" onSubmit={handleUpload}>
                <div className="upload-drop-area">
                  <Camera className="upload-icon-large" />
                  <h3>Drag & Drop Files Here</h3>
                  <p>or</p>
                  <button type="button" className="browse-button">Browse Files</button>
                  <input type="file" id="file-upload" className="hidden-input" />
                  <p className="upload-formats">Accepted formats: DICOM, NIFTI, JPEG, PNG</p>
                </div>

                <div className="form-group">
                  <label htmlFor="scan-name">Scan Name</label>
                  <input type="text" id="scan-name" name="scan-name" placeholder="e.g., Chest CT Scan - May 2025" />
                </div>

                <div className="form-group">
                  <label htmlFor="scan-notes">Notes (Optional)</label>
                  <textarea id="scan-notes" name="scan-notes" rows="3" placeholder="Add any notes about this scan..."></textarea>
                </div>

                <div className="modal-actions">
                  <button type="button" className="cancel-button" onClick={() => setShowUploadModal(false)}>Cancel</button>
                  <button type="submit" className="upload-button">Upload Scan</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
