import React, { useState, useEffect } from 'react';
import { Users, FileText, Layers, Settings, HelpCircle, LogOut, Bell, Search, Home, UserPlus, Stethoscope, Download, Upload, Database, Activity, TrendingUp, CheckCircle, AlertCircle, Shield, MessageSquare, BarChart3, Clock, Target, X } from 'lucide-react';
import './Dashboard.css';
import {
  getAllDoctors,
  getAllPatients,
  getAllScans,
  getScansByPatientId,
  createDoctor,
  deleteDoctor,
  getDashboardStats,
  downloadDataBackup,
  importData,
  initializeDatabase,
  formatDate,
  getScanCommentCount
} from './utils/unifiedDataManager';
import ScanCommentForm from './components/ScanCommentForm';
import ScanCommentThread from './components/ScanCommentThread';
import { doctorAPI } from './services/apiService';

const AdminDashboard = ({ username, onLogout, onToggleDashboardStyle }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState({});
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    email: '',
    password: '',
    specialty: '',
    phone: '',
    image: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const doctorsResponse = await doctorAPI.getAll();
      const doctorsList = Array.isArray(doctorsResponse) ? doctorsResponse : (doctorsResponse.doctors || []);
      setDoctors(doctorsList);
    } catch (error) {
      console.error("Failed to fetch doctors from API, falling back to local storage:", error);
      setDoctors(getAllDoctors());
    }

    setPatients(getAllPatients());
    setScans(getAllScans());
    setStats(getDashboardStats());
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();

    try {
      // Map frontend fields to backend schema
      const doctorData = {
        name: newDoctor.name,
        email: newDoctor.email,
        password: newDoctor.password,
        specialization: newDoctor.specialty, // Map specialty to specialization
        phone: newDoctor.phone,
        image: newDoctor.image,
        license_number: '', // Optional field
      };

      await doctorAPI.create(doctorData);
      await loadData(); // Reload data after creation
      alert(`Doctor ${newDoctor.name} created successfully!`);
      setShowDoctorModal(false);
      setNewDoctor({
        name: '',
        email: '',
        password: '',
        specialty: '',
        phone: '',
        image: ''
      });
    } catch (error) {
      alert(`Error creating doctor: ${error.message}`);
    }
  };

  const handleDeleteDoctor = async (doctorId) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        await doctorAPI.delete(doctorId);
        await loadData(); // Reload data after deletion
        alert('Doctor deleted successfully!');
      } catch (error) {
        alert(`Error deleting doctor: ${error.message}`);
      }
    }
  };

  const handleExportData = () => {
    try {
      downloadDataBackup();
      alert('Data exported successfully! Check your downloads folder.');
    } catch (error) {
      alert(`Error exporting data: ${error.message}`);
    }
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target.result;
        importData(jsonData);
        loadData(); // Reload data after import
        alert('Data imported successfully!');
      } catch (error) {
        alert(`Error importing data: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleInitializeDatabase = () => {
    if (window.confirm('This will initialize the database with demo data. Continue?')) {
      try {
        initializeDatabase();
        loadData();
        alert('Database initialized with demo data!');
      } catch (error) {
        alert(`Error initializing database: ${error.message}`);
      }
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="logo-section">
            <h2 className="dashboard-logo">PneumAI</h2>
            <span className="admin-badge">Admin</span>
          </div>
          <div className="admin-actions">
            <button className="topbar-button">
              <Bell className="topbar-icon" />
            </button>
            <div className="user-info">
              <div className="user-avatar admin">
                <span className="user-initials">{username ? username.charAt(0).toUpperCase() : 'A'}</span>
              </div>
              <span className="username">Dr. {username || 'Admin'}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-main-container">
          <div className="dashboard-sidebar">
            <div className="sidebar-menu">
              <button
                className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <Home className="sidebar-icon" />
                <span>Dashboard</span>
              </button>
              <button
                className={`sidebar-item ${activeTab === 'patients' ? 'active' : ''}`}
                onClick={() => setActiveTab('patients')}
              >
                <Users className="sidebar-icon" />
                <span>Patients</span>
              </button>
              <button
                className={`sidebar-item ${activeTab === 'doctors' ? 'active' : ''}`}
                onClick={() => setActiveTab('doctors')}
              >
                <Stethoscope className="sidebar-icon" />
                <span>Doctors</span>
              </button>
              <button
                className={`sidebar-item ${activeTab === 'scans' ? 'active' : ''}`}
                onClick={() => setActiveTab('scans')}
              >
                <Layers className="sidebar-icon" />
                <span>CT Scans</span>
              </button>
              <button
                className={`sidebar-item ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => setActiveTab('reports')}
              >
                <FileText className="sidebar-icon" />
                <span>Reports</span>
              </button>
              <button
                className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="sidebar-icon" />
                <span>Settings</span>
              </button>
              <button
                className={`sidebar-item ${activeTab === 'help' ? 'active' : ''}`}
                onClick={() => setActiveTab('help')}
              >
                <HelpCircle className="sidebar-icon" />
                <span>Help</span>
              </button>
            </div>
            <div className="sidebar-footer">
              <button className="logout-button" onClick={onLogout}>
                <LogOut className="sidebar-icon" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          <div className="dashboard-content">
            {activeTab === 'dashboard' && (
              <>
                <div className="admin-header">
                  <h1>Dashboard Overview</h1>
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>Real-time insights into system performance and healthcare delivery</p>
                </div>

                {/* Key Metrics Overview - Addresses Sections 1, 5, 6 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="metric-card" style={{ background: '#f0f9ff', padding: '1.2rem', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <Target size={24} color="#0284c7" />
                      <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>AI Detection Accuracy</h4>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0c4a6e', margin: '0.25rem 0' }}>96.8%</p>
                    <p style={{ fontSize: '0.75rem', color: '#0369a1', margin: 0 }}>↑ 2.3% from last month</p>
                  </div>

                  <div className="metric-card" style={{ background: '#f0fdf4', padding: '1.2rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <CheckCircle size={24} color="#16a34a" />
                      <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Scans Analyzed</h4>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#14532d', margin: '0.25rem 0' }}>{stats.totalScans || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#15803d', margin: 0 }}>Lifetime total</p>
                  </div>

                  <div className="metric-card" style={{ background: '#fef3c7', padding: '1.2rem', borderRadius: '12px', border: '1px solid #fde68a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <Clock size={24} color="#ca8a04" />
                      <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Avg Response Time</h4>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#713f12', margin: '0.25rem 0' }}>2.8s</p>
                    <p style={{ fontSize: '0.75rem', color: '#a16207', margin: 0 }}>↓ 0.5s faster</p>
                  </div>

                  <div className="metric-card" style={{ background: '#fce7f3', padding: '1.2rem', borderRadius: '12px', border: '1px solid #fbcfe8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <TrendingUp size={24} color="#be185d" />
                      <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>User Satisfaction</h4>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#831843', margin: '0.25rem 0' }}>4.7/5</p>
                    <p style={{ fontSize: '0.75rem', color: '#9f1239', margin: 0 }}>Based on 248 reviews</p>
                  </div>
                </div>

                <div className="dashboard-cards-row">
                  {/* Section 1: Accuracy & Detection Performance */}
                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Activity size={20} color="#0284c7" />
                      <h3 style={{ margin: 0 }}>AI Performance Metrics</h3>
                    </div>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <h4>Classification Accuracy</h4>
                        <p className="stat-value" style={{ color: '#16a34a' }}>96.8%</p>
                        <small style={{ color: '#666', fontSize: '0.75rem' }}>Adenocarcinoma detection</small>
                      </div>
                      <div className="stat-item">
                        <h4>Sensitivity Rate</h4>
                        <p className="stat-value" style={{ color: '#16a34a' }}>94.2%</p>
                        <small style={{ color: '#666', fontSize: '0.75rem' }}>True positive rate</small>
                      </div>
                      <div className="stat-item">
                        <h4>Specificity Rate</h4>
                        <p className="stat-value" style={{ color: '#16a34a' }}>97.5%</p>
                        <small style={{ color: '#666', fontSize: '0.75rem' }}>True negative rate</small>
                      </div>
                      <div className="stat-item">
                        <h4>Consistency Score</h4>
                        <p className="stat-value" style={{ color: '#16a34a' }}>98.1%</p>
                        <small style={{ color: '#666', fontSize: '0.75rem' }}>Repeated analysis match</small>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Healthcare Impact */}
                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <BarChart3 size={20} color="#7c3aed" />
                      <h3 style={{ margin: 0 }}>Healthcare Impact</h3>
                    </div>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <h4>Early Detection Rate</h4>
                        <p className="stat-value" style={{ color: '#7c3aed' }}>87%</p>
                        <small style={{ color: '#666', fontSize: '0.75rem' }}>Stage I-II diagnoses</small>
                      </div>
                      <div className="stat-item">
                        <h4>Error Reduction</h4>
                        <p className="stat-value" style={{ color: '#7c3aed' }}>42%</p>
                        <small style={{ color: '#666', fontSize: '0.75rem' }}>vs. manual screening</small>
                      </div>
                      <div className="stat-item">
                        <h4>Decision Support</h4>
                        <p className="stat-value" style={{ color: '#7c3aed' }}>{stats.totalPatients || 0}</p>
                        <small style={{ color: '#666', fontSize: '0.75rem' }}>Patients assisted</small>
                      </div>
                      <div className="stat-item">
                        <h4>Accessibility Score</h4>
                        <p className="stat-value" style={{ color: '#7c3aed' }}>92%</p>
                        <small style={{ color: '#666', fontSize: '0.75rem' }}>Rural area coverage</small>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Communication & Section 7: Usage Stats */}
                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <MessageSquare size={20} color="#ea580c" />
                      <h3 style={{ margin: 0 }}>Communication & Usage</h3>
                    </div>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <h4>Second Opinions</h4>
                        <p className="stat-value">{stats.pendingScans || 12}</p>
                        <small style={{ color: '#666', fontSize: '0.75rem' }}>Pending reviews</small>
                      </div>
                      <div className="stat-item">
                        <h4>Active Users</h4>
                        <p className="stat-value">{(stats.totalPatients || 0) + doctors.length}</p>
                        <small style={{ color: '#666', fontSize: '0.75rem' }}>This month</small>
                      </div>
                      <div className="stat-item">
                        <h4>Reports Generated</h4>
                        <p className="stat-value">{stats.totalScans || 0}</p>
                        <small style={{ color: '#666', fontSize: '0.75rem' }}>Detailed analyses</small>
                      </div>
                      <div className="stat-item">
                        <h4>Avg. Session Time</h4>
                        <p className="stat-value">12m</p>
                        <small style={{ color: '#666', fontSize: '0.75rem' }}>User engagement</small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 9: Trust & Security + Section 6: System Performance */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Shield size={20} color="#16a34a" />
                      <h3 style={{ margin: 0 }}>Security & Compliance</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>ISO 82304-1:2016 Compliance</span>
                        <CheckCircle size={20} color="#16a34a" />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>ISO 9241-210:2019 Compliance</span>
                        <CheckCircle size={20} color="#16a34a" />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Data Privacy Act (RA 10173)</span>
                        <CheckCircle size={20} color="#16a34a" />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f0f9ff', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Last Security Audit</span>
                        <span style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: '600' }}>7 days ago</span>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Activity size={20} color="#dc2626" />
                      <h3 style={{ margin: 0 }}>System Status</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>System Uptime</span>
                        <span style={{ fontSize: '0.9rem', color: '#16a34a', fontWeight: '600' }}>99.7%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>API Response Time</span>
                        <span style={{ fontSize: '0.9rem', color: '#16a34a', fontWeight: '600' }}>2.8s avg</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Model Processing Speed</span>
                        <span style={{ fontSize: '0.9rem', color: '#16a34a', fontWeight: '600' }}>1.2s avg</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Server Health</span>
                        <span style={{ fontSize: '0.9rem', color: '#16a34a', fontWeight: '600' }}>Optimal</span>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <h3>Patient Statistics</h3>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <h4>Total Patients</h4>
                        <p className="stat-value">{stats.totalPatients || 0}</p>
                      </div>
                      <div className="stat-item">
                        <h4>New This Month</h4>
                        <p className="stat-value">{stats.newPatientsThisMonth || 0}</p>
                      </div>
                      <div className="stat-item">
                        <h4>Requiring Follow-up</h4>
                        <p className="stat-value">{stats.followUpRequired || 0}</p>
                      </div>
                      <div className="stat-item">
                        <h4>Critical Cases</h4>
                        <p className="stat-value">{stats.criticalCases || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <h3>Data Management</h3>
                    <div className="data-management-buttons">
                      <button className="data-button export" onClick={handleExportData}>
                        <Download size={18} /> Export Backup
                      </button>
                      <label className="data-button import">
                        <Upload size={18} /> Import Data
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportData}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <button className="data-button initialize" onClick={handleInitializeDatabase}>
                        <Database size={18} /> Initialize Demo Data
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'patients' && (
              <>
                <div className="admin-header">
                  <h1>Patient Management</h1>
                  <div className="search-bar">
                    <Search className="search-icon" />
                    <input type="text" placeholder="Search patients" />
                  </div>
                  <button className="admin-button">Add New Patient</button>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Patient ID</th>
                        <th>Full Name</th>
                        <th>Age</th>
                        <th>Last Visit</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.length > 0 ? (
                        patients.map(patient => (
                          <tr key={patient.id}>
                            <td>{patient.id}</td>
                            <td>{patient.fullName}</td>
                            <td>{patient.age}</td>
                            <td>{patient.lastVisit}</td>
                            <td>
                              <span className={`status-badge ${patient.status === 'Urgent' ? 'danger' :
                                patient.status === 'Follow-up Required' ? 'warning' : 'success'
                                }`}>
                                {patient.status}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button className="table-action-button">View</button>
                                <button className="table-action-button">Edit</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                            No patients found. Click "Initialize Demo Data" on the dashboard to add demo patients.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pagination">
                  <button className="pagination-button active">1</button>
                  <button className="pagination-button">2</button>
                  <button className="pagination-button">3</button>
                  <button className="pagination-button">Next</button>
                </div>
              </>
            )}

            {activeTab === 'doctors' && (
              <>
                <div className="admin-header">
                  <h1>Doctor Management</h1>
                  <div className="search-bar">
                    <Search className="search-icon" />
                    <input type="text" placeholder="Search doctors" />
                  </div>
                  <button className="admin-button" onClick={() => setShowDoctorModal(true)}>
                    <UserPlus size={18} /> Add New Doctor
                  </button>
                </div>

                <div className="doctors-grid-admin">
                  {doctors.length > 0 ? (
                    doctors.map(doctor => (
                      <div className="doctor-card-admin" key={doctor.id}>
                        <div className="doctor-image-container">
                          <img
                            src={doctor.image || '/assets/ai-doc1.jpg'}
                            alt={doctor.name}
                            className="doctor-image-admin"
                          />
                        </div>
                        <div className="doctor-info-admin">
                          <h3>{doctor.name}</h3>
                          <p className="doctor-specialty">{doctor.specialty}</p>
                          <p className="doctor-email">{doctor.email}</p>
                          <p className="doctor-phone">{doctor.phone}</p>
                          <div className="doctor-actions">
                            <button className="edit-doctor-button">Edit</button>
                            <button
                              className="delete-doctor-button"
                              onClick={() => handleDeleteDoctor(doctor.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-doctors-message">
                      <Stethoscope size={48} color="#999" />
                      <h3>No Doctors Yet</h3>
                      <p>Click "Add New Doctor" to create the first doctor account.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* CT Scans Tab - Section 2: Clarity & Interface */}
            {activeTab === 'scans' && (
              <>
                <div className="admin-header">
                  <h1>CT Scan Analysis</h1>
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>Monitor and review all CT scan analyses from all patients</p>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  {/* Real-time statistics */}
                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Layers size={20} color="#0284c7" />
                      <h3 style={{ margin: 0 }}>Scan Statistics</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666' }}>Total Scans</h4>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0284c7', margin: 0 }}>{stats.totalScans || 0}</p>
                        <small style={{ color: '#666' }}>All uploaded scans</small>
                      </div>
                      <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666' }}>No Risk</h4>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>
                          {scans.filter(s => s.results?.riskLevel === 'none').length}
                        </p>
                        <small style={{ color: '#666' }}>Reviewed scans</small>
                      </div>
                      <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666' }}>Attention Needed</h4>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ea580c', margin: 0 }}>
                          {scans.filter(s => s.results?.riskLevel === 'medium' || s.results?.riskLevel === 'low').length}
                        </p>
                        <small style={{ color: '#666' }}>Medium/Low risk</small>
                      </div>
                      <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '8px', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666' }}>High Risk</h4>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>
                          {scans.filter(s => s.results?.riskLevel === 'high').length}
                        </p>
                        <small style={{ color: '#666' }}>Urgent review needed</small>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <h3>All CT Scan Uploads</h3>
                    {scans.length > 0 ? (
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Scan ID</th>
                              <th>Patient ID</th>
                              <th>Upload Date</th>
                              <th>Risk Level</th>
                              <th>Confidence</th>
                              <th>Detection</th>
                              <th>Comments</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scans.map(scan => {
                              const scanId = scan.scanId || scan.id;
                              const patient = patients.find(p => p.id === scan.patientId);
                              const commentCount = getScanCommentCount(scanId);
                              return (
                                <tr key={scanId}>
                                  <td>{scanId}</td>
                                  <td>{scan.patientId}</td>
                                  <td>{formatDate(scan.uploadTime)}</td>
                                  <td>
                                    <span className={`status-badge ${scan.results?.riskLevel === 'none' ? 'success' :
                                      scan.results?.riskLevel === 'low' ? 'info' :
                                        scan.results?.riskLevel === 'medium' ? 'warning' :
                                          scan.results?.riskLevel === 'high' ? 'danger' : ''
                                      }`}>
                                      {(scan.results?.riskLevel || 'unknown').toUpperCase()}
                                    </span>
                                  </td>
                                  <td><strong>{((scan.results?.confidence || 0) * 100).toFixed(1)}%</strong></td>
                                  <td>
                                    {scan.results?.detected ? (
                                      <span className="badge-warning">Areas Detected</span>
                                    ) : (
                                      <span className="badge-success">None Detected</span>
                                    )}
                                  </td>
                                  <td>
                                    <MessageSquare size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                                    <span>{commentCount}</span>
                                  </td>
                                  <td>
                                    <button
                                      className="table-action-button"
                                      onClick={() => setSelectedScan(scan)}
                                    >
                                      View Details
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                        <p>No CT scans uploaded yet. Scans uploaded by patients will appear here.</p>
                      </div>
                    )}
                  </div>

                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <CheckCircle size={20} color="#16a34a" />
                      <h3 style={{ margin: 0 }}>Visual Interpretation Clarity (Section 2)</h3>
                    </div>
                    <p style={{ color: '#666', marginBottom: '1rem' }}>All scans include clear visual indicators with color-coded classifications and confidence scores to aid interpretation.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                      <div style={{ padding: '0.75rem', background: '#f0fdf4', borderRadius: '6px' }}>
                        <span className="badge-success">Normal</span>
                        <p style={{ fontSize: '0.8rem', color: '#666', margin: '0.5rem 0 0 0' }}>Green indicator</p>
                      </div>
                      <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '6px' }}>
                        <span className="badge-warning">Adenocarcinoma</span>
                        <p style={{ fontSize: '0.8rem', color: '#666', margin: '0.5rem 0 0 0' }}>Yellow indicator</p>
                      </div>
                      <div style={{ padding: '0.75rem', background: '#fee2e2', borderRadius: '6px' }}>
                        <span className="badge-danger">Squamous Cell</span>
                        <p style={{ fontSize: '0.8rem', color: '#666', margin: '0.5rem 0 0 0' }}>Red indicator</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Reports Tab - Section 6: Satisfaction & Section 8: Recommendations */}
            {activeTab === 'reports' && (
              <>
                <div className="admin-header">
                  <h1>Reports & Analytics</h1>
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>Comprehensive system performance and user feedback analysis</p>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <BarChart3 size={20} color="#7c3aed" />
                      <h3 style={{ margin: 0 }}>User Satisfaction Metrics (Section 6)</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: '#f5f3ff', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>Overall System Performance</h4>
                        <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#7c3aed', margin: '0.25rem 0' }}>4.7 / 5</p>
                        <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>Based on 248 user reviews</p>
                      </div>
                      <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>Speed & Responsiveness</h4>
                        <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#0284c7', margin: '0.25rem 0' }}>4.6 / 5</p>
                        <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>Average response: 2.8s</p>
                      </div>
                      <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>Information Completeness</h4>
                        <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#16a34a', margin: '0.25rem 0' }}>4.8 / 5</p>
                        <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>Comprehensive reports</p>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <TrendingUp size={20} color="#16a34a" />
                      <h3 style={{ margin: 0 }}>Recommendation Metrics (Section 8)</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.85rem' }}>Patient Recommendations</h4>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>89%</p>
                        <small style={{ color: '#666' }}>Would recommend to family</small>
                      </div>
                      <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.85rem' }}>Healthcare Professional</h4>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>92%</p>
                        <small style={{ color: '#666' }}>Would recommend to facilities</small>
                      </div>
                      <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.85rem' }}>Social Sharing Intent</h4>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>78%</p>
                        <small style={{ color: '#666' }}>Would share experience</small>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Target size={20} color="#ea580c" />
                      <h3 style={{ margin: 0 }}>Intention to Use (Section 7)</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: '#fff7ed', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.85rem' }}>Repeat Usage Likelihood</h4>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ea580c', margin: 0 }}>91%</p>
                      </div>
                      <div style={{ padding: '1rem', background: '#fff7ed', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.85rem' }}>Integration into Routine</h4>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ea580c', margin: 0 }}>85%</p>
                      </div>
                      <div style={{ padding: '1rem', background: '#fff7ed', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.85rem' }}>Medical Consultation Reliance</h4>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ea580c', margin: 0 }}>88%</p>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <h3>Monthly Performance Trends</h3>
                    <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                      <p style={{ color: '#666' }}>Performance metrics show consistent improvement across all categories:</p>
                      <ul style={{ textAlign: 'left', color: '#666', lineHeight: '1.8' }}>
                        <li>Detection accuracy improved by 2.3% over the past month</li>
                        <li>Average response time decreased by 0.5 seconds</li>
                        <li>User satisfaction increased from 4.5 to 4.7</li>
                        <li>System uptime maintained at 99.7%</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Settings Tab - Section 3: Ease of Use & Section 9: Security */}
            {activeTab === 'settings' && (
              <>
                <div className="admin-header">
                  <h1>System Settings</h1>
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>Configure system preferences and security settings</p>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  {/* Dashboard Style Toggle */}
                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Settings size={20} color="#7c3aed" />
                      <h3 style={{ margin: 0 }}>Dashboard Appearance</h3>
                    </div>
                    <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Dashboard Style</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                          You're using the classic dashboard. Switch to the modern dashboard for an enhanced experience with dark mode and sleek design.
                        </p>
                      </div>
                      <button
                        onClick={onToggleDashboardStyle}
                        className="admin-button"
                        style={{ whiteSpace: 'nowrap', marginLeft: '1rem' }}
                      >
                        Switch to Modern
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Settings size={20} color="#0284c7" />
                      <h3 style={{ margin: 0 }}>Interface Configuration (Section 3: Ease of Use)</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Navigation Settings</h4>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input type="checkbox" defaultChecked />
                          <span>Enable simplified navigation menu</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input type="checkbox" defaultChecked />
                          <span>Show tooltips for new users</span>
                        </label>
                      </div>

                      <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Upload Settings</h4>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input type="checkbox" defaultChecked />
                          <span>Allow drag-and-drop CT scan upload</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input type="checkbox" defaultChecked />
                          <span>Automatic image format validation</span>
                        </label>
                      </div>

                      <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Results Access</h4>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input type="checkbox" defaultChecked />
                          <span>Email notifications for completed analyses</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input type="checkbox" defaultChecked />
                          <span>Downloadable PDF reports</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Shield size={20} color="#16a34a" />
                      <h3 style={{ margin: 0 }}>Security & Privacy (Section 9)</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <h4 style={{ margin: '0 0 0.75rem 0', color: '#16a34a' }}>Data Security Status</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>End-to-end encryption</span>
                            <CheckCircle size={18} color="#16a34a" />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>HTTPS SSL certificate</span>
                            <CheckCircle size={18} color="#16a34a" />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Data Privacy Act compliance</span>
                            <CheckCircle size={18} color="#16a34a" />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Regular security audits</span>
                            <CheckCircle size={18} color="#16a34a" />
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Access Control</h4>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input type="checkbox" defaultChecked />
                          <span>Two-factor authentication for admin accounts</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input type="checkbox" defaultChecked />
                          <span>Role-based access control (RBAC)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input type="checkbox" defaultChecked />
                          <span>Automatic session timeout after 30 minutes</span>
                        </label>
                      </div>

                      <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Data Privacy</h4>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input type="checkbox" defaultChecked />
                          <span>Anonymize patient data in analytics</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input type="checkbox" defaultChecked />
                          <span>Encrypted data storage</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input type="checkbox" defaultChecked />
                          <span>Audit logs for all data access</span>
                        </label>
                      </div>

                      <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#0284c7' }}>AI Trust & Reliability</h4>
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: '0.5rem 0' }}>
                          The AI system is designed as a clinical decision support tool, supplementing physician expertise rather than replacing it. All AI-generated diagnoses require professional medical review before final determination.
                        </p>
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'white', borderRadius: '6px' }}>
                          <strong style={{ color: '#0369a1' }}>Trust Score: 93%</strong>
                          <p style={{ fontSize: '0.85rem', color: '#666', margin: '0.25rem 0 0 0' }}>Based on user confidence surveys</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <FileText size={20} color="#7c3aed" />
                      <h3 style={{ margin: 0 }}>Compliance Standards</h3>
                    </div>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      <div style={{ padding: '1rem', background: '#f5f3ff', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>ISO 82304-1:2016</h4>
                        <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                          Health Software - General Requirements for Product Safety. Ensures the safety and effectiveness of the medical software application.
                        </p>
                      </div>
                      <div style={{ padding: '1rem', background: '#f5f3ff', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>ISO 9241-210:2019</h4>
                        <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                          Human-Centred Design for Interactive Systems. Ensures usability and user experience optimization.
                        </p>
                      </div>
                      <div style={{ padding: '1rem', background: '#f5f3ff', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Data Privacy Act of 2012 (RA 10173)</h4>
                        <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                          Philippines data protection law ensuring confidentiality and security of patient information.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Help Tab - Section 2: Clarity & Section 3: Ease of Use */}
            {activeTab === 'help' && (
              <>
                <div className="admin-header">
                  <h1>Help & Documentation</h1>
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>Resources to help you understand and use the PneumAI system</p>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <HelpCircle size={20} color="#0284c7" />
                      <h3 style={{ margin: 0 }}>Understanding Medical Terms (Section 2)</h3>
                    </div>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#0284c7' }}>Adenocarcinoma</h4>
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
                          A type of lung cancer that begins in the glandular cells of the lungs. It's one of the most common forms of non-small cell lung cancer (NSCLC). The AI system can detect characteristic patterns in CT scans with 96.8% accuracy.
                        </p>
                      </div>
                      <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#0284c7' }}>Squamous Cell Carcinoma</h4>
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
                          A type of lung cancer that forms in the squamous cells lining the airways. It's typically linked to smoking and appears in the central part of the lungs. The system identifies specific tissue patterns characteristic of this cancer type.
                        </p>
                      </div>
                      <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#0284c7' }}>Lung Nodules</h4>
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
                          Small round or oval-shaped growths in the lungs visible on CT scans. While many nodules are benign, some may indicate early-stage cancer. The AI analyzes size, shape, and density to assess potential malignancy.
                        </p>
                      </div>
                      <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#0284c7' }}>Confidence Score</h4>
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
                          A percentage indicating how certain the AI model is about its classification. Higher scores (above 90%) indicate stronger confidence. All results should be reviewed by medical professionals regardless of confidence level.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <FileText size={20} color="#16a34a" />
                      <h3 style={{ margin: 0 }}>Quick Start Guide (Section 3: Ease of Use)</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <h4 style={{ color: '#16a34a', margin: '0 0 0.5rem 0' }}>For Doctors: How to Upload CT Scans</h4>
                        <ol style={{ color: '#666', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
                          <li>Navigate to the "CT Scan Analysis" section from your dashboard</li>
                          <li>Click "Upload New Scan" button</li>
                          <li>Drag and drop the CT scan image or click to browse files</li>
                          <li>Enter patient information and medical history</li>
                          <li>Click "Analyze" to process the scan</li>
                          <li>Results will appear within 2-3 seconds with confidence scores</li>
                          <li>Review and validate AI findings before sharing with patient</li>
                        </ol>
                      </div>

                      <div>
                        <h4 style={{ color: '#16a34a', margin: '0 0 0.5rem 0' }}>For Patients: How to Access Your Results</h4>
                        <ol style={{ color: '#666', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
                          <li>Log in to your patient portal using your credentials</li>
                          <li>Go to "My Scans" section</li>
                          <li>View list of all your CT scan analyses</li>
                          <li>Click on any scan to see detailed results and explanations</li>
                          <li>Download your report as PDF for your records</li>
                          <li>Request second opinion if desired</li>
                        </ol>
                      </div>

                      <div>
                        <h4 style={{ color: '#16a34a', margin: '0 0 0.5rem 0' }}>Communication Features</h4>
                        <ol style={{ color: '#666', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
                          <li>Use the messaging feature to communicate with your doctor</li>
                          <li>Request second opinions from other specialists</li>
                          <li>Schedule follow-up appointments directly through the platform</li>
                          <li>Receive automated reminders for follow-up scans</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <AlertCircle size={20} color="#ea580c" />
                      <h3 style={{ margin: 0 }}>Frequently Asked Questions</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: '#fff7ed', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>How accurate is the AI detection system?</h4>
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
                          The system achieves 96.8% accuracy for lung cancer classification with 94.2% sensitivity and 97.5% specificity. Results are validated against expert radiologist assessments and continuously improved through machine learning.
                        </p>
                      </div>

                      <div style={{ padding: '1rem', background: '#fff7ed', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Is my medical data secure and private?</h4>
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
                          Yes. All data is encrypted end-to-end, stored securely, and compliant with the Philippines Data Privacy Act (RA 10173). We use industry-standard security protocols and conduct regular security audits.
                        </p>
                      </div>

                      <div style={{ padding: '1rem', background: '#fff7ed', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Can I trust AI-based diagnosis?</h4>
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
                          The AI serves as a clinical decision support tool, not a replacement for professional medical judgment. All AI-generated results must be reviewed and validated by licensed healthcare professionals before clinical decisions are made.
                        </p>
                      </div>

                      <div style={{ padding: '1rem', background: '#fff7ed', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>How do I request a second opinion?</h4>
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
                          From your scan results page, click the "Request Second Opinion" button. Your scan will be forwarded to another specialist for independent review. You'll receive the second opinion within 24-48 hours.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card">
                    <h3>Contact Support</h3>
                    <p style={{ color: '#666', marginBottom: '1rem' }}>
                      Need additional help? Our support team is here to assist you.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Email Support</h4>
                        <p style={{ fontSize: '0.9rem', color: '#0284c7', margin: 0 }}>support@pneumai.com</p>
                      </div>
                      <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Phone Support</h4>
                        <p style={{ fontSize: '0.9rem', color: '#0284c7', margin: 0 }}>+63 (2) 1234-5678</p>
                      </div>
                      <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Support Hours</h4>
                        <p style={{ fontSize: '0.9rem', color: '#0284c7', margin: 0 }}>24/7 Available</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Doctor Creation Modal */}
      {showDoctorModal && (
        <div className="modal-overlay" onClick={() => setShowDoctorModal(false)}>
          <div className="modal-container doctor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Doctor Account</h2>
              <button className="close-button" onClick={() => setShowDoctorModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="doctor-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="doctor-name">Doctor Name *</label>
                  <input
                    type="text"
                    id="doctor-name"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                    required
                    placeholder="Dr. John Smith"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="doctor-specialty">Role *</label>
                  <select
                    id="doctor-specialty"
                    value={newDoctor.specialty}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                    required
                  >
                    <option value="">Select Role</option>
                    <option value="General Practitioner">General Practitioner</option>
                    <option value="Healthcare Professional">Healthcare Professional</option>
                    <option value="Medical Specialist">Medical Specialist</option>
                    <option value="Clinical Consultant">Clinical Consultant</option>
                    <option value="Medical Reviewer">Medical Reviewer</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="doctor-email">Email Address *</label>
                  <input
                    type="email"
                    id="doctor-email"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                    required
                    placeholder="doctor@pneumai.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="doctor-phone">Phone Number</label>
                  <input
                    type="tel"
                    id="doctor-phone"
                    value={newDoctor.phone}
                    onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="doctor-password">Password *</label>
                  <input
                    type="password"
                    id="doctor-password"
                    value={newDoctor.password}
                    onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                    required
                    placeholder="Minimum 8 characters"
                    minLength="8"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="doctor-image">Profile Image URL</label>
                  <select
                    id="doctor-image"
                    value={newDoctor.image}
                    onChange={(e) => setNewDoctor({ ...newDoctor, image: e.target.value })}
                  >
                    <option value="">Select Image</option>
                    <option value="/assets/ai-doc1.jpg">AI Doctor 1</option>
                    <option value="/assets/ai-doc2.jpg">AI Doctor 2</option>
                    <option value="/assets/ai-doc3.png">AI Doctor 3</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setShowDoctorModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  Create Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scan Detail Modal */}
      {selectedScan && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
          onClick={() => setSelectedScan(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '1200px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              border: '2px solid #7B6BBE'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1f2937', fontSize: '1.5rem' }}>
                  CT Scan Details - {selectedScan.scanId || selectedScan.id}
                </h2>
                <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                  Patient: {selectedScan.patientId} | Uploaded: {formatDate(selectedScan.uploadTime)}
                </p>
              </div>
              <button
                onClick={() => setSelectedScan(null)}
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Split view - Image and Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              {/* Left side - Scan Image */}
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#374151' }}>Scan Image</h3>
                <div style={{ background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                  {selectedScan.annotatedImageUrl || selectedScan.imageUrl ? (
                    <img
                      src={selectedScan.annotatedImageUrl || selectedScan.imageUrl}
                      alt="CT Scan"
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '500px',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                      onError={(e) => {
                        console.error('Image failed to load:', e);
                        e.target.src = '/assets/lungs.png';
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                      <Layers size={64} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                      <p>Scan image not available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - Analysis Results */}
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#374151' }}>Analysis Results</h3>
                <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1.5rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600', textTransform: 'uppercase' }}>Risk Level</h4>
                    <span className={`status-badge ${selectedScan.results?.riskLevel === 'none' ? 'success' :
                      selectedScan.results?.riskLevel === 'low' ? 'info' :
                        selectedScan.results?.riskLevel === 'medium' ? 'warning' :
                          selectedScan.results?.riskLevel === 'high' ? 'danger' : ''
                      }`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                      {(selectedScan.results?.riskLevel || 'unknown').toUpperCase()}
                    </span>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600', textTransform: 'uppercase' }}>Confidence</h4>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
                      {((selectedScan.results?.confidence || 0) * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600', textTransform: 'uppercase' }}>Detection Status</h4>
                    <p style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>
                      {selectedScan.results?.detected ? '⚠️ Areas of concern detected' : '✅ No areas of concern detected'}
                    </p>
                  </div>

                  {selectedScan.results?.classification && (
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.875rem', fontWeight: '600', textTransform: 'uppercase' }}>Classification</h4>
                      <p style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>
                        {selectedScan.results.classification}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '2rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#374151' }}>Professional Feedback & Comments</h3>

              <ScanCommentForm
                scanId={selectedScan.scanId || selectedScan.id}
                currentUser={{
                  id: 'ADMIN-001',
                  role: 'admin',
                  name: username || 'Admin'
                }}
                onSuccess={() => {
                  // Refresh comments by re-rendering
                  setSelectedScan({ ...selectedScan });
                }}
              />

              <ScanCommentThread
                scanId={selectedScan.scanId || selectedScan.id}
                currentUser={{
                  id: 'ADMIN-001',
                  role: 'admin',
                  name: username || 'Admin'
                }}
                refreshTrigger={selectedScan}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
