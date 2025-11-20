import React, { useState, useEffect } from 'react';
import {
    Users,
    FileText,
    Layers,
    Settings,
    LogOut,
    Bell,
    Search,
    Home,
    Activity,
    Calendar,
    MessageCircle,
    CheckCircle,
    Clock,
    AlertCircle,
    ChevronRight,
    Filter,
    Download,
    X,
    Sun,
    Moon,
    Stethoscope
} from 'lucide-react';
import { useTheme } from './context/ThemeContext';
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

const DoctorDashboardModern = ({ username, onLogout, onToggleDashboardStyle }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [patients, setPatients] = useState([]);
    const [scans, setScans] = useState([]);
    const [stats, setStats] = useState({});
    const [selectedScan, setSelectedScan] = useState(null);
    const [replyToComment, setReplyToComment] = useState(null);
    const [commentRefresh, setCommentRefresh] = useState(0);
    const { darkMode, toggleDarkMode } = useTheme();

    // Current user object for comments
    const currentUser = {
        id: 'doctor_' + username,
        name: 'Dr. ' + username,
        role: 'doctor'
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const allPatients = getAllPatients();
        setPatients(allPatients);
        setStats(getDashboardStats());

        try {
            const response = await scanAPI.getAll();
            // Assuming response is { scans: [...] } or [...]
            const allScans = Array.isArray(response) ? response : (response.scans || []);
            setScans(allScans);
        } catch (error) {
            console.error("Failed to load scans from API", error);
            // Fallback to local if needed
            // const allScans = getAllScans();
            // setScans(allScans);
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

    // Navigation items
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'patients', label: 'My Patients', icon: Users },
        { id: 'scans', label: 'CT Scans', icon: Layers },
        { id: 'appointments', label: 'Appointments', icon: Calendar },
        { id: 'messages', label: 'Messages', icon: MessageCircle },
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-900 transition-colors duration-200">
            {/* Top Header */}
            <header className="sticky top-0 z-50 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 shadow-sm">
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow-lg shadow-primary-500/30">
                            <Stethoscope className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                                PneumAI
                            </h1>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Doctor Portal</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Dark Mode Toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors text-gray-600 dark:text-gray-300"
                            aria-label="Toggle dark mode"
                        >
                            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {/* Notifications */}
                        <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors text-gray-600 dark:text-gray-300">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full border-2 border-white dark:border-dark-800"></span>
                        </button>

                        {/* User Menu */}
                        <div className="flex items-center space-x-3 pl-4 border-l border-gray-200 dark:border-dark-700">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Dr. {username}</p>
                                <p className="text-xs text-primary-600 dark:text-primary-400">Pulmonologist</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white dark:ring-dark-800">
                                {username.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="px-6 pb-0 overflow-x-auto no-scrollbar">
                    <div className="flex space-x-1 border-b border-gray-200 dark:border-dark-700">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${isActive
                                        ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10'
                                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-700/50'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary-500' : 'opacity-70'}`} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === 'dashboard' && (
                    <div className="space-y-8">
                        {/* Welcome Section */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Welcome back, Dr. {username}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                    Here's what's happening with your patients today.
                                </p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Last login: Today, 9:41 AM</span>
                                <button className="px-4 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors shadow-sm">
                                    View Schedule
                                </button>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-soft border border-gray-100 dark:border-dark-700 hover:shadow-soft-lg transition-all duration-300 group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-semibold text-success-600 bg-success-50 dark:bg-success-900/20 px-2 py-1 rounded-full">
                                        +{stats.newPatientsThisMonth || 0} new
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Patients</p>
                                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalPatients || 0}</h3>
                            </div>

                            <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-soft border border-gray-100 dark:border-dark-700 hover:shadow-soft-lg transition-all duration-300 group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                        <Layers className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-semibold text-success-600 bg-success-50 dark:bg-success-900/20 px-2 py-1 rounded-full">
                                        +{stats.scansThisMonth || 0} this month
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Scans Reviewed</p>
                                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalScans || 0}</h3>
                            </div>

                            <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-soft border border-gray-100 dark:border-dark-700 hover:shadow-soft-lg transition-all duration-300 group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                                        Upcoming
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Appointments</p>
                                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.upcomingAppointments || 0}</h3>
                            </div>

                            <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-soft border border-gray-100 dark:border-dark-700 hover:shadow-soft-lg transition-all duration-300 group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-full">
                                        Action Required
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">High Risk Scans</p>
                                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.highRiskScans || 0}</h3>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Recent Scans */}
                            <div className="lg:col-span-2 bg-white dark:bg-dark-800 rounded-2xl shadow-soft border border-gray-100 dark:border-dark-700 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 dark:border-dark-700 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                        <Layers className="w-5 h-5 mr-2 text-primary-500" />
                                        Recent CT Scans
                                    </h3>
                                    <button
                                        onClick={() => setActiveTab('scans')}
                                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
                                    >
                                        View All <ChevronRight className="w-4 h-4 ml-1" />
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-dark-700/50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                                            {recentScans.length > 0 ? (
                                                recentScans.map((scan) => (
                                                    <tr key={scan.scanId} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xs mr-3">
                                                                    {scan.patientName.charAt(0)}
                                                                </div>
                                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{scan.patientName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                            {formatDate(scan.uploadTime)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${scan.results?.detected
                                                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                                                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                                                }`}>
                                                                {scan.results?.detected ? 'Areas Detected' : 'Clear'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedScan(scan);
                                                                    setActiveTab('scans');
                                                                }}
                                                                className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 text-sm font-medium"
                                                            >
                                                                Review
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                        No scans available yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Patients Attention List */}
                            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-soft border border-gray-100 dark:border-dark-700 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 dark:border-dark-700">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                        <Activity className="w-5 h-5 mr-2 text-rose-500" />
                                        Attention Needed
                                    </h3>
                                </div>
                                <div className="p-0">
                                    {patients.filter(p => p.status !== 'Stable').length > 0 ? (
                                        <div className="divide-y divide-gray-100 dark:divide-dark-700">
                                            {patients.filter(p => p.status !== 'Stable').slice(0, 5).map(patient => (
                                                <div key={patient.id} className="p-4 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-2 h-2 rounded-full ${patient.status === 'Urgent' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{patient.fullName}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{patient.status}</p>
                                                        </div>
                                                    </div>
                                                    <button className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center">
                                            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-20" />
                                            <p className="text-gray-500 dark:text-gray-400 text-sm">All patients are stable.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-dark-700/30 border-t border-gray-100 dark:border-dark-700 text-center">
                                    <button
                                        onClick={() => setActiveTab('patients')}
                                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                                    >
                                        View All Patients
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'scans' && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">CT Scan Analysis</h2>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">Review and analyze patient scans with AI assistance</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={loadData}
                                    className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                                >
                                    <Activity className="w-4 h-4" />
                                    <span>Refresh Data</span>
                                </button>
                                <button className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-md shadow-primary-600/20">
                                    <Filter className="w-4 h-4" />
                                    <span>Filter</span>
                                </button>
                            </div>
                        </div>

                        {selectedScan ? (
                            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-200 dark:border-dark-700 overflow-hidden animate-fadeIn">
                                <div className="p-6 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between bg-gray-50 dark:bg-dark-700/30">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                            <FileText className="w-5 h-5 mr-2 text-primary-500" />
                                            Scan Review: {selectedScan.scanId}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            Patient: <span className="font-medium text-gray-900 dark:text-white">{patients.find(p => p.id === selectedScan.patientId)?.fullName || selectedScan.patientId}</span> •
                                            Uploaded: {formatDate(selectedScan.uploadTime)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedScan(null)}
                                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-500 dark:text-gray-400 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                                    {/* Image Section */}
                                    <div className="p-6 bg-black flex items-center justify-center min-h-[500px] relative group">
                                        {selectedScan.annotatedImageUrl || selectedScan.imageUrl ? (
                                            <img
                                                src={selectedScan.annotatedImageUrl || selectedScan.imageUrl}
                                                alt="CT Scan"
                                                className="max-w-full max-h-[600px] object-contain"
                                                onError={(e) => {
                                                    e.target.src = '/assets/lungs.png';
                                                }}
                                            />
                                        ) : (
                                            <div className="text-center text-gray-500">
                                                <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                                <p>Scan image not available</p>
                                            </div>
                                        )}

                                        {selectedScan.annotatedImageUrl && (
                                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full text-white text-xs font-medium flex items-center">
                                                <AlertCircle className="w-3 h-3 mr-2 text-amber-400" />
                                                AI-detected areas highlighted in red
                                            </div>
                                        )}
                                    </div>

                                    {/* Analysis & Comments Section */}
                                    <div className="flex flex-col h-full max-h-[800px] overflow-y-auto border-l border-gray-200 dark:border-dark-700">
                                        {/* AI Results */}
                                        <div className="p-6 border-b border-gray-200 dark:border-dark-700 bg-gray-50/50 dark:bg-dark-800/50">
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">AI Analysis Results</h4>

                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div className={`p-4 rounded-xl border ${selectedScan.results?.riskLevel === 'high'
                                                    ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
                                                    : selectedScan.results?.riskLevel === 'medium'
                                                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                                                        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                                    }`}>
                                                    <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Risk Level</p>
                                                    <p className={`text-xl font-bold ${selectedScan.results?.riskLevel === 'high' ? 'text-rose-700 dark:text-rose-400' :
                                                        selectedScan.results?.riskLevel === 'medium' ? 'text-amber-700 dark:text-amber-400' :
                                                            'text-emerald-700 dark:text-emerald-400'
                                                        }`}>
                                                        {(selectedScan.results?.riskLevel || 'Unknown').toUpperCase()}
                                                    </p>
                                                </div>

                                                <div className="p-4 rounded-xl bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600">
                                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Confidence</p>
                                                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                                                        {((selectedScan.results?.confidence || 0) * 100).toFixed(1)}%
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={`p-4 rounded-xl border flex items-start ${selectedScan.results?.detected
                                                ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'
                                                : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'
                                                }`}>
                                                {selectedScan.results?.detected ? (
                                                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-3 mt-0.5" />
                                                ) : (
                                                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-3 mt-0.5" />
                                                )}
                                                <div>
                                                    <p className={`font-semibold ${selectedScan.results?.detected ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300'
                                                        }`}>
                                                        {selectedScan.results?.detected ? 'Potential Abnormalities Detected' : 'No Abnormalities Detected'}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                        {selectedScan.results?.detected
                                                            ? 'The AI model has identified regions of interest that require professional review.'
                                                            : 'The AI model did not detect any significant abnormalities in this scan.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Comments */}
                                        <div className="p-6 flex-1">
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center">
                                                <MessageCircle className="w-4 h-4 mr-2" />
                                                Professional Notes
                                            </h4>

                                            <div className="mb-6">
                                                <ScanCommentForm
                                                    scanId={selectedScan.scanId || selectedScan.id}
                                                    currentUser={currentUser}
                                                    parentComment={replyToComment}
                                                    onSuccess={handleCommentSuccess}
                                                    onCancel={() => setReplyToComment(null)}
                                                />
                                            </div>

                                            <ScanCommentThread
                                                scanId={selectedScan.scanId || selectedScan.id}
                                                currentUser={currentUser}
                                                onReply={handleReply}
                                                onDelete={handleCommentSuccess}
                                                refreshTrigger={commentRefresh}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {scans.map((scan) => {
                                    const patient = patients.find(p => p.id === scan.patientId);
                                    const commentCount = getScanCommentCount(scan.scanId || scan.id);

                                    return (
                                        <div
                                            key={scan.scanId}
                                            onClick={() => setSelectedScan(scan)}
                                            className="bg-white dark:bg-dark-800 rounded-2xl shadow-soft border border-gray-100 dark:border-dark-700 overflow-hidden hover:shadow-soft-lg transition-all duration-300 cursor-pointer group"
                                        >
                                            <div className="h-48 bg-gray-100 dark:bg-dark-700 relative overflow-hidden">
                                                {scan.annotatedImageUrl || scan.imageUrl ? (
                                                    <img
                                                        src={scan.annotatedImageUrl || scan.imageUrl}
                                                        alt="Scan Preview"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        onError={(e) => {
                                                            e.target.src = '/assets/lungs.png';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-gray-400">
                                                        <Layers className="w-12 h-12" />
                                                    </div>
                                                )}
                                                <div className="absolute top-3 right-3">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${scan.results?.riskLevel === 'high' ? 'bg-rose-500 text-white' :
                                                        scan.results?.riskLevel === 'medium' ? 'bg-amber-500 text-white' :
                                                            'bg-emerald-500 text-white'
                                                        }`}>
                                                        {(scan.results?.riskLevel || 'Unknown').toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-5">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                                                        {patient?.fullName || scan.patientId}
                                                    </h3>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {formatDate(scan.uploadTime)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                                    <div className="flex items-center">
                                                        <Activity className="w-4 h-4 mr-1.5 text-primary-500" />
                                                        <span>{((scan.results?.confidence || 0) * 100).toFixed(0)}% Conf.</span>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <MessageCircle className="w-4 h-4 mr-1.5 text-secondary-500" />
                                                        <span>{commentCount} Notes</span>
                                                    </div>
                                                </div>
                                                <button className="w-full py-2.5 bg-gray-50 dark:bg-dark-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl font-medium transition-colors text-sm flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white dark:group-hover:bg-primary-600 dark:group-hover:text-white">
                                                    Review Scan
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>

                        <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-soft border border-gray-100 dark:border-dark-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-white dark:bg-dark-600 rounded-lg shadow-sm">
                                            {darkMode ? <Moon className="w-5 h-5 text-primary-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Toggle dark theme</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={toggleDarkMode}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? 'bg-primary-500' : 'bg-gray-300 dark:bg-dark-600'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-white dark:bg-dark-600 rounded-lg shadow-sm">
                                            <Layers className="w-5 h-5 text-secondary-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">Dashboard Style</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Switch to legacy view</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onToggleDashboardStyle}
                                        className="px-4 py-2 bg-white dark:bg-dark-600 border border-gray-200 dark:border-dark-500 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-500 transition-colors shadow-sm"
                                    >
                                        Switch to Legacy
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-soft border border-gray-100 dark:border-dark-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account</h3>
                            <button
                                onClick={onLogout}
                                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl font-medium hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DoctorDashboardModern;
