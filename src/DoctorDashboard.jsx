import React, { useState, useEffect } from 'react';
import { Users, FileText, Layers, Settings, LogOut, Bell, Search, Home, Activity, Calendar, MessageCircle } from 'lucide-react';
import './Dashboard.css';
import ScanCommentThread from './components/ScanCommentThread';
import ScanCommentForm from './components/ScanCommentForm';
import {
  getAllPatients,
  getAllScans,
  getDashboardStats,
  formatDate,
  getScanCommentCount
} from './utils/unifiedDataManager';
import { scanAPI } from './services/apiService';

import DoctorDashboardModern from './DoctorDashboardModern';

const DoctorDashboardLegacy = ({ username, onLogout, onToggleDashboardStyle }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patients, setPatients] = useState([]);
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedScan, setSelectedScan] = useState(null);
  const [replyToComment, setReplyToComment] = useState(null);
  const [commentRefresh, setCommentRefresh] = useState(0);

  // Current user object for comments
  const currentUser = {
    id: 'doctor_' + username,
    name: 'Dr. ' + username,
    role: 'doctor'
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allPatients = getAllPatients();
    setPatients(allPatients);
    setStats(getDashboardStats());

    try {
      const response = await scanAPI.getAll();
      const allScans = Array.isArray(response) ? response : (response.scans || []);

      console.log('🔍 DoctorDashboard - Loading data:');
      console.log('📊 Total scans:', allScans.length);
      console.log('👥 Total patients:', allPatients.length);

      setScans(allScans);

      // Auto-select first scan if none selected
      if (!selectedScan && allScans.length > 0) {
        setSelectedScan(allScans[0]);
      }
    } catch (error) {
      console.error("Failed to load scans from API", error);
    }
  };

  const handleCommentSuccess = () => {
    setCommentRefresh(prev => prev + 1);
    setReplyToComment(null);
  };

  const handleReply = (comment) => {
    setReplyToComment(comment);
  };

  // Get recent scans with patient names
  const recentScans = scans.slice(0, 5).map(scan => {
    const patient = patients.find(p => p.id === scan.patientId);
    return {
      ...scan,
      patientName: patient?.fullName || scan.patientId,
      result: scan.results?.detected ? 'Areas Detected' : 'Reviewed'
    };
  });

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="logo-section">
            <img src="/assets/logo-medic.jpg" alt="PneumAI" className="dashboard-logo-img" />
            <h2 className="dashboard-logo">PneumAI</h2>
            <span className="doctor-badge">Doctor</span>
          </div>
          <div className="admin-actions">
            <button
              className="topbar-button"
              onClick={onToggleDashboardStyle}
              title="Switch to Modern Dashboard"
              style={{ marginRight: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Layers size={16} />
              <span style={{ fontSize: '12px' }}>Modern View</span>
            </button>
            <button className="topbar-button">
              <Bell className="topbar-icon" />
            </button>
            <div className="user-info">
              <div className="user-avatar doctor">
                <span className="user-initials">{username.charAt(0).toUpperCase()}</span>
              </div>
              <span className="username">Dr. {username}</span>
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
                <span>My Patients</span>
              </button>
              <button
                className={`sidebar-item ${activeTab === 'scans' ? 'active' : ''}`}
                onClick={() => setActiveTab('scans')}
              >
                <Layers className="sidebar-icon" />
                <span>CT Scans</span>
              </button>
              <button
                className={`sidebar-item ${activeTab === 'appointments' ? 'active' : ''}`}
                onClick={() => setActiveTab('appointments')}
              >
                <Calendar className="sidebar-icon" />
                <span>Appointments</span>
              </button>
              <button
                className={`sidebar-item ${activeTab === 'messages' ? 'active' : ''}`}
                onClick={() => setActiveTab('messages')}
              >
                <MessageCircle className="sidebar-icon" />
                <span>Messages</span>
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
            </div>
            <div className="sidebar-footer">
              <button className="logout-button" onClick={onLogout}>
                <LogOut className="sidebar-icon" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          <div className="dashboard-content doctor-content">
            {activeTab === 'dashboard' && (
              <>
                <div className="admin-header">
                  <h1>Doctor Dashboard</h1>
                  <div className="search-bar">
                    <Search className="search-icon" />
                    <input type="text" placeholder="Search patients" />
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="stats-cards-row">
                  <div className="stat-card">
                    <div className="stat-card-icon patients">
                      <Users size={24} />
                    </div>
                    <div className="stat-card-content">
                      <p className="stat-card-label">Total Patients</p>
                      <h3 className="stat-card-value">{stats.totalPatients || 0}</h3>
                      <p className="stat-card-change positive">+{stats.newPatientsThisMonth || 0} this month</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-card-icon scans">
                      <Layers size={24} />
                    </div>
                    <div className="stat-card-content">
                      <p className="stat-card-label">Scans Reviewed</p>
                      <h3 className="stat-card-value">{stats.totalScans || 0}</h3>
                      <p className="stat-card-change positive">+{stats.scansThisMonth || 0} this month</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-card-icon appointments">
                      <Calendar size={24} />
                    </div>
                    <div className="stat-card-content">
                      <p className="stat-card-label">Appointments</p>
                      <h3 className="stat-card-value">{stats.upcomingAppointments || 0}</h3>
                      <p className="stat-card-change">Upcoming</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-card-icon urgent">
                      <Activity size={24} />
                    </div>
                    <div className="stat-card-content">
                      <p className="stat-card-label">High Risk Scans</p>
                      <h3 className="stat-card-value">{stats.highRiskScans || 0}</h3>
                      <p className="stat-card-change warning">Requires attention</p>
                    </div>
                  </div>
                </div>

                {/* Recent Scans */}
                <div className="dashboard-card">
                  <div className="card-header">
                    <h3>Recent CT Scans</h3>
                    <button className="view-all-button">View All</button>
                  </div>
                  <div className="scans-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Patient Name</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentScans.length > 0 ? (
                          recentScans.map(scan => (
                            <tr key={scan.scanId}>
                              <td>{scan.patientName}</td>
                              <td>{formatDate(scan.uploadTime)}</td>
                              <td>
                                <span className={`status-badge ${scan.result === 'Reviewed' ? 'success' :
                                  scan.result === 'Areas Detected' ? 'warning' : 'info'
                                  }`}>
                                  {scan.result}
                                </span>
                              </td>
                              <td>
                                <button className="table-action-button">Review</button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                              No scans available yet. Scans uploaded by patients will appear here.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Patients Requiring Attention */}
                <div className="dashboard-card">
                  <div className="card-header">
                    <h3>Patients Requiring Attention</h3>
                  </div>
                  <div className="patients-attention-list">
                    {patients.filter(p => p.status !== 'Stable').map(patient => (
                      <div className="patient-attention-item" key={patient.id}>
                        <div className="patient-attention-info">
                          <h4>{patient.name}</h4>
                          <p>ID: {patient.id} | Age: {patient.age} | Last Visit: {patient.lastVisit}</p>
                        </div>
                        <div className="patient-attention-status">
                          <span className={`status-badge ${patient.status === 'Urgent' ? 'danger' : 'warning'
                            }`}>
                            {patient.status}
                          </span>
                          <button className="action-button-small">View Details</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'patients' && (
              <>
                <div className="admin-header">
                  <h1>My Patients</h1>
                  <div className="search-bar">
                    <Search className="search-icon" />
                    <input type="text" placeholder="Search patients" />
                  </div>
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
                        <th>Risk Level</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.length > 0 ? (
                        patients.map(patient => {
                          // Get patient's scans to determine risk level
                          const patientScans = scans.filter(s => s.patientId === patient.id);
                          const highestRisk = patientScans.reduce((max, scan) => {
                            const riskLevels = { none: 0, low: 1, medium: 2, high: 3 };
                            const scanRisk = riskLevels[scan.results?.riskLevel] || 0;
                            return scanRisk > max ? scanRisk : max;
                          }, 0);
                          const riskLevel = ['none', 'low', 'medium', 'high'][highestRisk];

                          return (
                            <tr key={patient.id}>
                              <td>{patient.id}</td>
                              <td>{patient.fullName}</td>
                              <td>{patient.age}</td>
                              <td>{patient.lastVisit || 'N/A'}</td>
                              <td>
                                <span className={`status-badge ${patient.status === 'Stable' ? 'success' :
                                  patient.status === 'Urgent' ? 'danger' : 'warning'
                                  }`}>
                                  {patient.status || 'N/A'}
                                </span>
                              </td>
                              <td>
                                <span className={`risk-badge-large risk-${riskLevel}`}>
                                  {riskLevel.toUpperCase()}
                                </span>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button className="table-action-button">View</button>
                                  <button className="table-action-button">Edit</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                            No patients registered yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'scans' && (
              <>
                <div className="admin-header">
                  <h1>CT Scan Analysis & Review</h1>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>Review patient CT scans and provide professional feedback</p>
                </div>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  {/* Statistics Cards */}
                  <div className="dashboard-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Layers className="sidebar-icon" style={{ color: '#7B6BBE' }} />
                      <h3 style={{ margin: 0 }}>Scan Statistics</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.875rem' }}>Total Scans</h4>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0284c7', margin: 0 }}>{scans.length}</p>
                      </div>
                      <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.875rem' }}>No Risk</h4>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>
                          {scans.filter(s => s.results?.riskLevel === 'none').length}
                        </p>
                      </div>
                      <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.875rem' }}>Attention Needed</h4>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ea580c', margin: 0 }}>
                          {scans.filter(s => s.results?.riskLevel === 'medium' || s.results?.riskLevel === 'low').length}
                        </p>
                      </div>
                      <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '8px', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.875rem' }}>High Risk</h4>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>
                          {scans.filter(s => s.results?.riskLevel === 'high').length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Scans Table */}
                  <div className="dashboard-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0 }}>All Patient CT Scans ({scans.length})</h3>
                      <button
                        onClick={() => loadData()}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}
                      >
                        🔄 Refresh
                      </button>
                    </div>
                    {scans.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'separate',
                          borderSpacing: '0',
                          fontSize: '0.9rem'
                        }}>
                          <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Patient</th>
                              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Upload Date</th>
                              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Risk Level</th>
                              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Detection</th>
                              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Comments</th>
                              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scans.map((scan, index) => {
                              const scanId = scan.scanId || scan.id;
                              const patient = patients.find(p => p.id === scan.patientId);
                              const commentCount = getScanCommentCount(scanId);
                              return (
                                <tr
                                  key={scanId || index}
                                  style={{
                                    borderBottom: '1px solid #e5e7eb',
                                    transition: 'background 0.2s',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                  <td style={{ padding: '1rem' }}>
                                    <strong style={{ color: '#111827' }}>
                                      {patient?.fullName || patient?.firstName || scan.patientId || 'Unknown Patient'}
                                    </strong>
                                  </td>
                                  <td style={{ padding: '1rem', color: '#6b7280' }}>
                                    {formatDate(scan.uploadTime) || 'Unknown date'}
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                    <span style={{
                                      padding: '0.375rem 0.75rem',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                      background: scan.results?.riskLevel === 'high' ? '#fee2e2' :
                                        scan.results?.riskLevel === 'medium' ? '#fef3c7' :
                                          scan.results?.riskLevel === 'low' ? '#dbeafe' :
                                            scan.results?.riskLevel === 'none' ? '#d1fae5' : '#f3f4f6',
                                      color: scan.results?.riskLevel === 'high' ? '#dc2626' :
                                        scan.results?.riskLevel === 'medium' ? '#ea580c' :
                                          scan.results?.riskLevel === 'low' ? '#2563eb' :
                                            scan.results?.riskLevel === 'none' ? '#16a34a' : '#6b7280'
                                    }}>
                                      {scan.results?.riskLevel || 'Unknown'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                    {scan.results?.detected ? (
                                      <span style={{
                                        padding: '0.375rem 0.75rem',
                                        background: '#fef3c7',
                                        color: '#92400e',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem',
                                        fontWeight: '500'
                                      }}>
                                        ⚠️ Areas Detected
                                      </span>
                                    ) : (
                                      <span style={{
                                        padding: '0.375rem 0.75rem',
                                        background: '#d1fae5',
                                        color: '#065f46',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem',
                                        fontWeight: '500'
                                      }}>
                                        ✓ Clear
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <span style={{
                                      padding: '0.375rem 0.75rem',
                                      background: commentCount > 0 ? '#dbeafe' : '#f3f4f6',
                                      color: commentCount > 0 ? '#1e40af' : '#6b7280',
                                      borderRadius: '6px',
                                      fontSize: '0.875rem',
                                      fontWeight: '500',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}>
                                      <MessageCircle size={14} />
                                      {commentCount}
                                    </span>
                                  </td>
                                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        console.log('🔍 Opening scan:', scan);
                                        setSelectedScan(scan);
                                      }}
                                      style={{
                                        padding: '0.625rem 1.25rem',
                                        background: 'linear-gradient(135deg, #7B6BBE 0%, #9B8BCE 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 2px 4px rgba(123, 107, 190, 0.2)'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(123, 107, 190, 0.3)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(123, 107, 190, 0.2)';
                                      }}
                                    >
                                      📋 Review Scan
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{
                        padding: '4rem 2rem',
                        textAlign: 'center',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        border: '2px dashed #d1d5db'
                      }}>
                        <Layers size={64} style={{ color: '#9ca3af', margin: '0 auto 1.5rem' }} />
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#374151', fontSize: '1.25rem' }}>
                          No CT Scans Available
                        </h4>
                        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9375rem' }}>
                          Patient uploaded scans will appear here for your professional review
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Selected Scan Detail View */}
                  {selectedScan && (
                    <div style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '2rem',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                      border: '2px solid #7B6BBE'
                    }}>
                      {/* Header */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '2rem',
                        paddingBottom: '1rem',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        <div>
                          <h2 style={{ margin: '0 0 0.5rem 0', color: '#111827', fontSize: '1.5rem' }}>
                            CT Scan Review
                          </h2>
                          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9375rem' }}>
                            Patient: <strong>{patients.find(p => p.id === selectedScan.patientId)?.fullName || selectedScan.patientId}</strong>
                            {' · '}
                            Uploaded: {formatDate(selectedScan.uploadTime)}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            console.log('Closing scan view');
                            setSelectedScan(null);
                          }}
                          style={{
                            padding: '0.625rem 1.25rem',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#374151',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                        >
                          ✕ Close
                        </button>
                      </div>

                      {/* Main Content */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                        {/* CT Scan Image */}
                        <div>
                          <h4 style={{ marginTop: 0, marginBottom: '1rem', color: '#374151' }}>CT Scan Image</h4>
                          <div style={{
                            background: '#000',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '2px solid #e5e7eb',
                            position: 'relative',
                            minHeight: '400px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
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
                                <p style={{ margin: 0 }}>Scan image not available</p>
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>Using placeholder image</p>
                              </div>
                            )}
                          </div>
                          {selectedScan.annotatedImageUrl && (
                            <p style={{
                              margin: '0.75rem 0 0 0',
                              fontSize: '0.8125rem',
                              color: '#6b7280',
                              textAlign: 'center'
                            }}>
                              ℹ️ Image shows AI-detected areas highlighted in red
                            </p>
                          )}
                        </div>

                        {/* Analysis Results */}
                        <div>
                          <h4 style={{ marginTop: 0, marginBottom: '1rem', color: '#374151' }}>AI Analysis Results</h4>
                          <div style={{ display: 'grid', gap: '1rem' }}>
                            <div style={{
                              padding: '1.25rem',
                              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                              borderRadius: '8px',
                              border: '1px solid #bae6fd'
                            }}>
                              <span style={{ color: '#0369a1', fontSize: '0.8125rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Risk Level
                              </span>
                              <p style={{ margin: '0.75rem 0 0 0', fontSize: '1.5rem', fontWeight: 'bold', color: '#0c4a6e' }}>
                                {(selectedScan.results?.riskLevel || 'Unknown').toUpperCase()}
                              </p>
                            </div>

                            <div style={{
                              padding: '1.25rem',
                              background: selectedScan.results?.detected ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                              borderRadius: '8px',
                              border: selectedScan.results?.detected ? '1px solid #fbbf24' : '1px solid #6ee7b7'
                            }}>
                              <span style={{
                                color: selectedScan.results?.detected ? '#92400e' : '#065f46',
                                fontSize: '0.8125rem',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                Detection Status
                              </span>
                              <p style={{
                                margin: '0.75rem 0 0 0',
                                fontSize: '1.125rem',
                                fontWeight: 'bold',
                                color: selectedScan.results?.detected ? '#78350f' : '#064e3b'
                              }}>
                                {selectedScan.results?.detected ? '⚠️ Areas Detected' : '✓ No Issues Detected'}
                              </p>
                            </div>

                            <div style={{
                              padding: '1.25rem',
                              background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                              borderRadius: '8px',
                              border: '1px solid #d1d5db'
                            }}>
                              <span style={{ color: '#374151', fontSize: '0.8125rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                AI Confidence
                              </span>
                              <p style={{ margin: '0.75rem 0 0 0', fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
                                {((selectedScan.results?.confidence || 0) * 100).toFixed(1)}%
                              </p>
                            </div>

                            <div style={{
                              padding: '1.25rem',
                              background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                              borderRadius: '8px',
                              border: '1px solid #c4b5fd'
                            }}>
                              <span style={{ color: '#6d28d9', fontSize: '0.8125rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Scan ID
                              </span>
                              <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.9375rem', fontWeight: '600', color: '#5b21b6', fontFamily: 'monospace' }}>
                                {selectedScan.scanId || selectedScan.id || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Comments Section */}
                      <div style={{
                        borderTop: '2px solid #e5e7eb',
                        paddingTop: '2rem',
                        marginTop: '1rem'
                      }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', color: '#111827', fontSize: '1.25rem' }}>
                          💬 Professional Feedback & Comments
                        </h3>
                        <ScanCommentForm
                          scanId={selectedScan.scanId || selectedScan.id}
                          currentUser={currentUser}
                          parentComment={replyToComment}
                          onSuccess={handleCommentSuccess}
                          onCancel={() => setReplyToComment(null)}
                        />

                        <ScanCommentThread
                          scanId={selectedScan.scanId || selectedScan.id}
                          currentUser={currentUser}
                          onReply={handleReply}
                          onDelete={handleCommentSuccess}
                          refreshTrigger={commentRefresh}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};



const DoctorDashboard = ({ username, onLogout }) => {
  const [isModern, setIsModern] = useState(true);

  const toggleDashboardStyle = () => {
    setIsModern(!isModern);
  };

  return isModern ? (
    <DoctorDashboardModern
      username={username}
      onLogout={onLogout}
      onToggleDashboardStyle={toggleDashboardStyle}
    />
  ) : (
    <DoctorDashboardLegacy
      username={username}
      onLogout={onLogout}
      onToggleDashboardStyle={toggleDashboardStyle}
    />
  );
};

export default DoctorDashboard;
