import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const PatientPortal = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('appointments');
    const [showNoteModal, setShowNoteModal] = useState(null);
    const [noteContent, setNoteContent] = useState('');
    const [showDocModal, setShowDocModal] = useState(false);
    const [docForm, setDocForm] = useState({ name: '', fileType: 'pdf', category: 'general', notes: '' });
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [profileForm, setProfileForm] = useState({});

    useEffect(() => {
        const token = localStorage.getItem('patient-token');
        const userData = localStorage.getItem('patient-user');
        if (!token || !userData) { navigate('/patient/login'); return; }
        setUser(JSON.parse(userData));
        fetchAll(token);
    }, []);

    const fetchAll = async (token) => {
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const [aptsRes, profileRes] = await Promise.all([
                api.get('/public/my-appointments', { headers }),
                api.get('/public/my-profile', { headers }).catch(() => null)
            ]);
            setAppointments(aptsRes.data.data);
            if (profileRes) setProfile(profileRes.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleLogout = () => {
        localStorage.removeItem('patient-token');
        localStorage.removeItem('patient-user');
        navigate('/patient/login');
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
        try {
            const token = localStorage.getItem('patient-token');
            const res = await api.post(`/public/cancel-appointment/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(res.data.message);
            fetchAll(token);
        } catch (err) { alert(err.response?.data?.message || 'Failed to cancel'); }
    };

    const handleAddNote = async () => {
        if (!noteContent.trim()) return;
        try {
            const token = localStorage.getItem('patient-token');
            await api.post('/public/appointment-notes', {
                appointmentId: showNoteModal, content: noteContent
            }, { headers: { Authorization: `Bearer ${token}` } });
            setShowNoteModal(null);
            setNoteContent('');
            fetchAll(token);
        } catch (err) { alert('Failed to add note'); }
    };

    const handleAddDoc = async () => {
        if (!docForm.name.trim()) return;
        try {
            const token = localStorage.getItem('patient-token');
            await api.post('/public/documents', docForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowDocModal(false);
            setDocForm({ name: '', fileType: 'pdf', category: 'general', notes: '' });
            fetchAll(token);
        } catch (err) { alert('Failed to upload'); }
    };

    const handleUpdateProfile = async () => {
        try {
            const token = localStorage.getItem('patient-token');
            await api.put('/public/my-profile', profileForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowProfileEdit(false);
            fetchAll(token);
        } catch (err) { alert('Failed to update'); }
    };

    const getStatusBadge = (status) => {
        const s = { scheduled: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-700' };
        return `px-3 py-1 rounded-full text-xs font-medium ${s[status] || s.scheduled}`;
    };

    const upcoming = appointments.filter(a => new Date(a.startTime) >= new Date() && a.status !== 'cancelled');
    const past = appointments.filter(a => new Date(a.startTime) < new Date() || a.status === 'cancelled');

    const tabs = [
        { id: 'appointments', label: 'Appointments', icon: '📅' },
        { id: 'profile', label: 'My Profile', icon: '👤' },
        { id: 'documents', label: 'Documents', icon: '📄' },
        { id: 'history', label: 'History', icon: '🕐' }
    ];

    if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center"><div className="spinner" /></div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-medical-500 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </Link>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">MediCore</span>
                        <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 px-2 py-0.5 rounded-full font-medium">Patient</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/doctors" className="text-sm text-gray-500 hover:text-primary-500 font-medium hidden sm:inline">Find Doctors</Link>
                        <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">Hi, <b>{user?.firstName}</b></span>
                        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500 font-medium">Logout</button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-primary-500 to-medical-500 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {user?.firstName}! 👋</h1>
                        <p className="text-white/80 mt-1">{upcoming.length} upcoming appointment{upcoming.length !== 1 ? 's' : ''}</p>
                    </div>
                    <Link to="/patient/book" className="inline-flex items-center gap-2 bg-white text-primary-600 px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition shadow-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Book Appointment
                    </Link>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-xl p-1 border border-gray-200 dark:border-slate-700 overflow-x-auto">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                                activeTab === t.id ? 'bg-primary-500 text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                            }`}>
                            <span>{t.icon}</span>{t.label}
                        </button>
                    ))}
                </div>

                {/* ── Appointments Tab ── */}
                {activeTab === 'appointments' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upcoming Appointments</h2>
                        {upcoming.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-8 text-center">
                                <span className="text-5xl mb-3 block">📅</span>
                                <p className="text-gray-500 mb-4">No upcoming appointments</p>
                                <Link to="/patient/book" className="btn-primary inline-flex items-center gap-2">Book Now</Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcoming.map(apt => (
                                    <AppointmentCard key={apt.id} apt={apt} onCancel={handleCancel}
                                        onAddNote={(id) => setShowNoteModal(id)} getStatusBadge={getStatusBadge} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Profile Tab ── */}
                {activeTab === 'profile' && profile && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Profile</h2>
                            <button onClick={() => { setProfileForm(profile); setShowProfileEdit(true); }} className="btn-secondary text-sm">Edit Profile</button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <ProfileCard label="Full Name" value={`${profile.firstName} ${profile.lastName}`} />
                            <ProfileCard label="Email" value={profile.email} />
                            <ProfileCard label="Phone" value={profile.phone || '—'} />
                            <ProfileCard label="Date of Birth" value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-US') : '—'} />
                            <ProfileCard label="Gender" value={profile.gender || '—'} />
                            <ProfileCard label="Blood Type" value={profile.bloodType || '—'} />
                            <ProfileCard label="Address" value={profile.address || '—'} />
                            <ProfileCard label="City" value={profile.city || '—'} />
                        </div>
                        {(profile.allergies?.length > 0 || profile.chronicConditions?.length > 0 || profile.currentMedications?.length > 0) && (
                            <div className="grid sm:grid-cols-3 gap-4">
                                <TagCard title="🩹 Allergies" items={profile.allergies} color="red" />
                                <TagCard title="🏥 Chronic Conditions" items={profile.chronicConditions} color="orange" />
                                <TagCard title="💊 Current Medications" items={profile.currentMedications} color="blue" />
                            </div>
                        )}
                    </div>
                )}

                {/* ── Documents Tab ── */}
                {activeTab === 'documents' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Documents</h2>
                            <button onClick={() => setShowDocModal(true)} className="btn-primary text-sm">+ Upload Document</button>
                        </div>
                        {profile?.documents?.length > 0 ? (
                            <div className="grid sm:grid-cols-2 gap-3">
                                {profile.documents.map(doc => (
                                    <div key={doc.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-xl flex-shrink-0">
                                            {doc.file_type === 'pdf' ? '📄' : doc.file_type === 'image' ? '🖼️' : '📎'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-white truncate">{doc.name}</p>
                                            <p className="text-xs text-gray-500">{doc.category} • {new Date(doc.created_at).toLocaleDateString('en-US')}</p>
                                            {doc.notes && <p className="text-xs text-gray-400 mt-1 truncate">{doc.notes}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border p-8 text-center">
                                <span className="text-5xl mb-3 block">📂</span>
                                <p className="text-gray-500 mb-4">No documents uploaded yet</p>
                                <button onClick={() => setShowDocModal(true)} className="btn-primary">Upload Your First Document</button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── History Tab ── */}
                {activeTab === 'history' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Consultation History</h2>
                        {past.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border p-8 text-center">
                                <span className="text-5xl mb-3 block">🕐</span>
                                <p className="text-gray-500">No past appointments yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {past.map(apt => (
                                    <AppointmentCard key={apt.id} apt={apt} isPast onAddNote={(id) => setShowNoteModal(id)} getStatusBadge={getStatusBadge} />
                                ))}
                            </div>
                        )}

                        {/* Appointment Notes */}
                        {profile?.appointmentNotes?.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">My Notes</h3>
                                <div className="space-y-3">
                                    {profile.appointmentNotes.map(n => (
                                        <div key={n.id} className="bg-white dark:bg-slate-800 rounded-xl border p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {n.appointment_type && `${n.appointment_type} with Dr. ${n.dr_first} ${n.dr_last}`}
                                                </p>
                                                <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString('en-US')}</span>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm">{n.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ── Note Modal ── */}
            {showNoteModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNoteModal(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Note</h3>
                        <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)}
                            className="input-field" rows={4} placeholder="Write your notes about this appointment..." />
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowNoteModal(null)} className="flex-1 btn-secondary">Cancel</button>
                            <button onClick={handleAddNote} className="flex-1 btn-primary">Save Note</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Document Modal ── */}
            {showDocModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDocModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Upload Document</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Name</label>
                                <input type="text" value={docForm.name} onChange={e => setDocForm({...docForm, name: e.target.value})}
                                    className="input-field" placeholder="e.g. Blood Test Results" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                                    <select value={docForm.fileType} onChange={e => setDocForm({...docForm, fileType: e.target.value})} className="input-field">
                                        <option value="pdf">PDF</option>
                                        <option value="image">Image</option>
                                        <option value="lab-result">Lab Result</option>
                                        <option value="prescription">Prescription</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                    <select value={docForm.category} onChange={e => setDocForm({...docForm, category: e.target.value})} className="input-field">
                                        <option value="general">General</option>
                                        <option value="lab-test">Lab Test</option>
                                        <option value="imaging">Imaging / X-Ray</option>
                                        <option value="prescription">Prescription</option>
                                        <option value="insurance">Insurance</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                                <textarea value={docForm.notes} onChange={e => setDocForm({...docForm, notes: e.target.value})}
                                    className="input-field" rows={2} placeholder="Optional notes about this document..." />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowDocModal(false)} className="flex-1 btn-secondary">Cancel</button>
                            <button onClick={handleAddDoc} className="flex-1 btn-primary">Upload</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Profile Edit Modal ── */}
            {showProfileEdit && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowProfileEdit(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Edit Profile</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                                <input type="tel" value={profileForm.phone || ''} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="input-field" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                                <input type="text" value={profileForm.address || ''} onChange={e => setProfileForm({...profileForm, address: e.target.value})} className="input-field" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                                <input type="text" value={profileForm.city || ''} onChange={e => setProfileForm({...profileForm, city: e.target.value})} className="input-field" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Blood Type</label>
                                <select value={profileForm.bloodType || ''} onChange={e => setProfileForm({...profileForm, bloodType: e.target.value})} className="input-field">
                                    <option value="">Select</option>
                                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowProfileEdit(false)} className="flex-1 btn-secondary">Cancel</button>
                            <button onClick={handleUpdateProfile} className="flex-1 btn-primary">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Sub-components ──
const AppointmentCard = ({ apt, onCancel, onAddNote, getStatusBadge, isPast }) => (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 ${isPast ? 'opacity-70' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isPast ? 'bg-gray-50 dark:bg-slate-700' : 'bg-primary-50 dark:bg-primary-900/20'}`}>
                    <span className={`text-xs font-medium ${isPast ? 'text-gray-400' : 'text-primary-500'}`}>
                        {new Date(apt.startTime).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className={`text-lg font-bold ${isPast ? 'text-gray-500' : 'text-primary-600'}`}>
                        {new Date(apt.startTime).getDate()}
                    </span>
                </div>
                <div>
                    <p className="font-medium text-gray-900 dark:text-white">{apt.practitioner}</p>
                    <p className="text-sm text-gray-500">
                        {apt.type} • {new Date(apt.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        {apt.consultationMode === 'online' && ' • 🖥️ Online'}
                    </p>
                    {apt.meetLink && apt.status !== 'cancelled' && (
                        <a href={apt.meetLink} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1 mt-1">
                            📹 Join Google Meet
                        </a>
                    )}
                    {apt.paymentStatus && (
                        <p className="text-xs text-gray-400 mt-0.5">
                            💳 {apt.paymentStatus === 'paid' ? 'Paid' : apt.paymentStatus === 'deposit-paid' ? `Deposit paid (€${apt.depositAmount})` : apt.paymentStatus === 'refunded' ? 'Refunded' : 'Due on-site'}
                            {apt.totalAmount > 0 && ` • €${apt.totalAmount}`}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className={getStatusBadge(apt.status)}>{apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}</span>
                <button onClick={() => onAddNote(apt.id)} className="p-1.5 text-gray-400 hover:text-primary-500 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" title="Add note">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                {!isPast && apt.status !== 'cancelled' && onCancel && (
                    <button onClick={() => onCancel(apt.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" title="Cancel">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    </div>
);

const ProfileCard = ({ label, value }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <p className="font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
);

const TagCard = ({ title, items, color }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{title}</p>
        <div className="flex flex-wrap gap-1">
            {(items || []).map((item, i) => (
                <span key={i} className={`text-xs px-2 py-1 rounded-full bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`}>{item}</span>
            ))}
        </div>
    </div>
);

export default PatientPortal;
