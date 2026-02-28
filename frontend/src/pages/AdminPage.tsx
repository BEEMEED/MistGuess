import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { StreetViewPanorama } from '../components/game/StreetViewPanorama';
import './AdminPage.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = 'users' | 'lobbies' | 'locations' | 'reports';

interface PageState {
  page: number;
  loading: boolean;
  total: number;
}

interface BanModal { open: boolean; userId: number | null; name: string; reason: string; bannedUntil: string }
interface DemoModal { open: boolean; reportId: number | null; loading: boolean; frames: any[]; frameIdx: number; playing: boolean; speed: number; reportData: any | null }

const LIMIT = 20;
const REPORTS_LIMIT = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return a + d * t;
}
function interpFramePov(frames: any[], pos: number) {
  if (!frames.length) return null;
  const max = frames.length - 1;
  pos = Math.max(0, Math.min(max, pos));
  const i = Math.min(Math.floor(pos), max - 1);
  const t = pos - i;
  const a = frames[i], b = frames[Math.min(i + 1, max)];
  if (!a) return null;
  return {
    heading: lerpAngle(a.heading ?? 0, b?.heading ?? a.heading ?? 0, t),
    pitch:   lerp(a.pitch ?? 0, b?.pitch ?? a.pitch ?? 0, t),
    zoom:    lerp(a.zoom ?? 1, b?.zoom ?? a.zoom ?? 1, t),
  };
}

function rankBadgeClass(rank: string) {
  const r = (rank || '').toLowerCase();
  if (r === 'diamond') return 'badge-blue';
  if (r === 'gold')    return 'badge-gold';
  if (r === 'silver')  return 'badge-muted';
  if (r === 'iron')    return 'badge-muted';
  return 'badge-muted';
}

function initials(name: string) {
  return (name || '?').charAt(0).toUpperCase();
}

function avatarColor(id: number) {
  const palette = ['#4a88c8', '#c8964a', '#4ac87a', '#c84a4a', '#8a5ac8', '#4ac8c0'];
  return palette[id % palette.length];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState<Section>('users');
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-section data
  const [users, setUsers]         = useState<any[]>([]);
  const [lobbies, setLobbies]     = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [reports, setReports]     = useState<any[]>([]);

  const [usersPage,     setUsersPage]     = useState<PageState>({ page: 1, loading: false, total: 0 });
  const [lobbiesPage,   setLobbiesPage]   = useState<PageState>({ page: 1, loading: false, total: 0 });
  const [locationsPage, setLocationsPage] = useState<PageState>({ page: 1, loading: false, total: 0 });
  const [reportsPage,   setReportsPage]   = useState<PageState>({ page: 1, loading: false, total: 0 });

  // Search
  const [searchUser,     setSearchUser]     = useState('');
  const [searchLobby,    setSearchLobby]    = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  // Ban modal
  const [banModal, setBanModal] = useState<BanModal>({ open: false, userId: null, name: '', reason: '', bannedUntil: '' });

  // Location form
  const [locForm, setLocForm]     = useState({ lat: '', lon: '', region: '', country: '' });
  const [editLoc, setEditLoc]     = useState<any | null>(null);
  const [showLocForm, setShowLocForm] = useState(false);

  // Demo player
  const [demo, setDemo] = useState<DemoModal>({
    open: false, reportId: null, loading: false, frames: [],
    frameIdx: 0, playing: false, speed: 1, reportData: null,
  });
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackPosRef = useRef(0);
  const lastPosFrameIdxRef = useRef(-1);
  const [interpPov, setInterpPov] = useState<{ heading: number; pitch: number; zoom: number } | null>(null);
  const [roundNotif, setRoundNotif] = useState(false);
  const roundNotifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  // ─── Toast ──────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  }, []);

  // ─── Loaders ────────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async (page: number) => {
    setUsersPage(p => ({ ...p, loading: true }));
    try {
      const data = await apiService.getAdminUsers(page, LIMIT);
      setUsers(data.data_user);
      setUsersPage({ page, loading: false, total: data.total_users });
    } catch { showToast('Failed to load users'); setUsersPage(p => ({ ...p, loading: false })); }
  }, [showToast]);

  const loadLobbies = useCallback(async (page: number) => {
    setLobbiesPage(p => ({ ...p, loading: true }));
    try {
      const data = await apiService.getAdminLobbies(page, LIMIT);
      setLobbies(data.data_lobby);
      setLobbiesPage({ page, loading: false, total: data.total_lobbies });
    } catch { showToast('Failed to load lobbies'); setLobbiesPage(p => ({ ...p, loading: false })); }
  }, [showToast]);

  const loadLocations = useCallback(async (page: number) => {
    setLocationsPage(p => ({ ...p, loading: true }));
    try {
      const data = await apiService.getAdminLocations(page, LIMIT);
      setLocations(data.data_location);
      setLocationsPage({ page, loading: false, total: data.total_locations });
    } catch { showToast('Failed to load locations'); setLocationsPage(p => ({ ...p, loading: false })); }
  }, [showToast]);

  const loadReports = useCallback(async (page: number) => {
    setReportsPage(p => ({ ...p, loading: true }));
    try {
      const data = await apiService.getAdminReports(page, REPORTS_LIMIT);
      setReports(data.data_report);
      setReportsPage({ page, loading: false, total: data.total_reports });
    } catch { showToast('Failed to load reports'); setReportsPage(p => ({ ...p, loading: false })); }
  }, [showToast]);

  // Load on section change
  useEffect(() => {
    if (section === 'users'     && users.length     === 0) loadUsers(1);
    if (section === 'lobbies'   && lobbies.length   === 0) loadLobbies(1);
    if (section === 'locations' && locations.length === 0) loadLocations(1);
    if (section === 'reports'   && reports.length   === 0) loadReports(1);
  }, [section]); // eslint-disable-line

  // ─── Ban ────────────────────────────────────────────────────────────────────
  const openBan = (u: any) => setBanModal({ open: true, userId: u.id, name: u.name || u.username, reason: '', bannedUntil: '' });

  const confirmBan = async () => {
    if (!banModal.userId || !banModal.reason.trim() || !banModal.bannedUntil) return;
    try {
      await apiService.banUser(banModal.userId, banModal.reason, banModal.bannedUntil);
      setBanModal({ open: false, userId: null, name: '', reason: '', bannedUntil: '' });
      showToast('User banned');
      loadUsers(usersPage.page);
    } catch { showToast('Failed to ban user'); }
  };

  const handleUnban = async (userId: number) => {
    try {
      await apiService.unbanUser(userId);
      showToast('User unbanned');
      loadUsers(usersPage.page);
    } catch { showToast('Failed to unban user'); }
  };

  // ─── Make admin ─────────────────────────────────────────────────────────────
  const handleMakeAdmin = async (u: any) => {
    try {
      await apiService.makeAdmin(u.id);
      showToast(`${u.name} is now admin`);
      loadUsers(usersPage.page);
    } catch { showToast('Failed to change role'); }
  };

  // ─── Location CRUD ──────────────────────────────────────────────────────────
  const openAddLoc = () => { setEditLoc(null); setLocForm({ lat: '', lon: '', region: '', country: '' }); setShowLocForm(true); };
  const openEditLoc = (loc: any) => { setEditLoc(loc); setLocForm({ lat: loc.lat, lon: loc.lon, region: loc.region, country: loc.country || '' }); setShowLocForm(true); };

  const saveLoc = async () => {
    const lat = parseFloat(locForm.lat), lon = parseFloat(locForm.lon);
    if (!locForm.region || isNaN(lat) || isNaN(lon)) { showToast('Fill all fields'); return; }
    try {
      if (editLoc) {
        await apiService.changeLocation(editLoc.id, lat, lon, locForm.region);
        showToast('Location updated');
      } else {
        await apiService.addLocation(lat, lon, locForm.region);
        showToast('Location added');
      }
      setShowLocForm(false);
      loadLocations(locationsPage.page);
    } catch { showToast('Failed to save location'); }
  };

  const deleteLoc = async (id: number) => {
    try {
      await apiService.deleteLocation(id);
      showToast('Location deleted');
      loadLocations(locationsPage.page);
    } catch { showToast('Failed to delete location'); }
  };

  // ─── Report dismiss ──────────────────────────────────────────────────────────
  const dismissReport = async (id: number) => {
    try {
      await apiService.deleteAdminReport(id);
      showToast('Report dismissed');
      loadReports(reportsPage.page);
    } catch { showToast('Failed to dismiss report'); }
  };

  // ─── Demo player ─────────────────────────────────────────────────────────────
  const openDemo = async (reportId: number) => {
    setDemo(d => ({ ...d, open: true, loading: true, reportId, frames: [], frameIdx: 0, playing: false }));
    try {
      const data = await apiService.getAdminReport(reportId);
      // Only keep frames from the suspect player
      const frames = (data.demo || []).filter((f: any) => f.num_player === data.suspect_id);
      setDemo(d => ({ ...d, loading: false, frames, reportData: data }));
    } catch {
      showToast('Failed to load demo');
      setDemo(d => ({ ...d, open: false, loading: false }));
    }
  };

  const closeDemo = () => {
    if (playTimer.current) clearInterval(playTimer.current);
    setDemo(d => ({ ...d, open: false, playing: false }));
  };

  const togglePlay = () => {
    setDemo(d => {
      const willPlay = !d.playing;
      if (!willPlay && playTimer.current) { clearInterval(playTimer.current); playTimer.current = null; }
      return { ...d, playing: willPlay };
    });
  };

  // 30fps interpolated playback
  useEffect(() => {
    if (demo.playing && demo.frames.length > 0) {
      playbackPosRef.current = demo.frameIdx;
      const TICK = 33; // ~30fps

      playTimer.current = setInterval(() => {
        playbackPosRef.current += (TICK / 100) * demo.speed;
        const maxPos = demo.frames.length - 1;

        if (playbackPosRef.current >= maxPos) {
          playbackPosRef.current = maxPos;
          clearInterval(playTimer.current!);
          playTimer.current = null;
          const pov = interpFramePov(demo.frames, maxPos);
          if (pov) setInterpPov(pov);
          setDemo(d => ({ ...d, playing: false, frameIdx: maxPos }));
          return;
        }

        const floorIdx = Math.floor(playbackPosRef.current);
        const pov = interpFramePov(demo.frames, playbackPosRef.current);
        if (pov) setInterpPov(pov);

        // Detect new round (frame with lat/lng = panorama change)
        const f = demo.frames[floorIdx];
        if (f?.lat != null && floorIdx !== lastPosFrameIdxRef.current) {
          lastPosFrameIdxRef.current = floorIdx;
          setRoundNotif(true);
          if (roundNotifTimer.current) clearTimeout(roundNotifTimer.current);
          roundNotifTimer.current = setTimeout(() => setRoundNotif(false), 2000);
        }

        setDemo(d => ({ ...d, frameIdx: floorIdx }));
      }, TICK);
    } else {
      if (playTimer.current) { clearInterval(playTimer.current); playTimer.current = null; }
    }
    return () => { if (playTimer.current) clearInterval(playTimer.current); };
  }, [demo.playing, demo.speed]); // eslint-disable-line

  const seekDemo = (idx: number) => {
    playbackPosRef.current = idx;
    const pov = interpFramePov(demo.frames, idx);
    if (pov) setInterpPov(pov);
    setDemo(d => ({ ...d, frameIdx: idx }));
  };
  const stepDemo = (delta: number) => seekDemo(Math.max(0, Math.min(demo.frames.length - 1, demo.frameIdx + delta)));

  const currentFrame = demo.frames[demo.frameIdx] ?? null;
  const demoProgress = demo.frames.length > 1 ? (demo.frameIdx / (demo.frames.length - 1)) * 100 : 0;

  // Last known position — lat/lng only present when panorama changes
  const lastKnownPos = React.useMemo(() => {
    for (let i = demo.frameIdx; i >= 0; i--) {
      if (demo.frames[i]?.lat != null) return { lat: demo.frames[i].lat, lng: demo.frames[i].lng };
    }
    return null;
  }, [demo.frames, demo.frameIdx]);
  const firstPos = React.useMemo(() => {
    const f = demo.frames.find(f => f.lat != null);
    return f ? { lat: f.lat, lng: f.lng } : null;
  }, [demo.frames]);

  // ─── Pagination helper ───────────────────────────────────────────────────────
  const Pagination = ({ state, load }: { state: PageState; load: (p: number) => void }) => {
    const total = Math.ceil(state.total / LIMIT);
    if (total <= 1) return null;
    return (
      <div className="adm-pagination">
        <button className="adm-pg-btn" disabled={state.page <= 1} onClick={() => load(state.page - 1)}>← Prev</button>
        <span className="adm-pg-info">Page {state.page} / {total} ({state.total})</span>
        <button className="adm-pg-btn" disabled={state.page >= total} onClick={() => load(state.page + 1)}>Next →</button>
      </div>
    );
  };

  // ─── Nav items ───────────────────────────────────────────────────────────────
  const navItems: { id: Section; icon: string; label: string }[] = [
    { id: 'users',     icon: '👤', label: 'Users' },
    { id: 'lobbies',   icon: '🎮', label: 'Lobbies' },
    { id: 'locations', icon: '📍', label: 'Locations' },
    { id: 'reports',   icon: '🚨', label: 'Reports' },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="adm-root">

      {/* ── Sidebar ── */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-logo">
          <div className="adm-logo-icon">M</div>
          <span className="adm-logo-text">MISTGUESS</span>
          <span className="adm-logo-badge">ADMIN</span>
        </div>

        <nav className="adm-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`adm-nav-item ${section === item.id ? 'active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              <span className="adm-nav-icon">{item.icon}</span>
              <span className="adm-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          <div className="adm-admin-profile">
            <div className="adm-admin-avatar">{initials(user?.name || 'A')}</div>
            <div>
              <div className="adm-admin-name">{user?.name || 'admin'}</div>
              <div className="adm-admin-role">Superadmin</div>
            </div>
          </div>
          <button className="adm-back-btn" onClick={() => navigate('/')}>← Home</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="adm-main">

        <div className="adm-topbar">
          <h1 className="adm-topbar-title">
            {navItems.find(n => n.id === section)?.icon}{' '}
            {navItems.find(n => n.id === section)?.label}
          </h1>
          {section === 'users' && (
            <input className="adm-search" placeholder="Search name, rank..." value={searchUser} onChange={e => setSearchUser(e.target.value)} />
          )}
          {section === 'lobbies' && (
            <input className="adm-search" placeholder="Search code, host..." value={searchLobby} onChange={e => setSearchLobby(e.target.value)} />
          )}
          {section === 'locations' && (
            <input className="adm-search" placeholder="Search region, coords..." value={searchLocation} onChange={e => setSearchLocation(e.target.value)} />
          )}
          <button className="adm-refresh-btn" onClick={() => {
            if (section === 'users')     loadUsers(usersPage.page);
            if (section === 'lobbies')   loadLobbies(lobbiesPage.page);
            if (section === 'locations') loadLocations(locationsPage.page);
            if (section === 'reports')   loadReports(reportsPage.page);
          }}>⟳</button>
        </div>

        <div className="adm-content">

          {/* ═══ USERS ═══ */}
          {section === 'users' && (
            <div className="adm-panel">
              <div className="adm-panel-header">
                <span className="adm-panel-count">{usersPage.total} users total</span>
              </div>
              {usersPage.loading
                ? <div className="adm-loading">Loading...</div>
                : (
                  <table className="adm-table">
                    <thead><tr><th>User</th><th>XP</th><th>Rank</th><th>Role</th><th>Telegram</th><th>Actions</th></tr></thead>
                    <tbody>
                      {users
                        .filter(u => !searchUser || (u.name || u.username || '').toLowerCase().includes(searchUser.toLowerCase()) || (u.rank || '').toLowerCase().includes(searchUser.toLowerCase()))
                        .map((u: any) => (
                          <tr key={u.id}>
                            <td>
                              <div className="adm-user-cell">
                                <div className="adm-avatar" style={{ background: `linear-gradient(135deg, ${avatarColor(u.id)}, ${avatarColor(u.id + 3)})` }}>
                                  {initials(u.name || u.username)}
                                </div>
                                <div>
                                  <div className="adm-username">{u.name || u.username}</div>
                                  <div className="adm-user-id">#{u.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="adm-cell-mono">{(u.xp || 0).toLocaleString()}</td>
                            <td><span className={`adm-badge ${rankBadgeClass(u.rank)}`}>{u.rank || 'Ashborn'}</span></td>
                            <td>
                              <span className={`adm-badge ${u.role === 'admin' ? 'badge-gold' : 'badge-muted'}`}>
                                {u.role || 'user'}
                              </span>
                              {u.banned_until && (
                                <span className="adm-badge badge-red" style={{ marginLeft: 4 }} title={`Until ${new Date(u.banned_until).toLocaleString()}`}>
                                  🔨 banned
                                </span>
                              )}
                            </td>
                            <td>
                              {u.telegram
                                ? <span className="adm-badge badge-green">✓ Linked</span>
                                : <span className="adm-badge badge-muted">—</span>
                              }
                            </td>
                            <td>
                              <div className="adm-actions">
                                {u.role !== 'admin' && (
                                  <button className="adm-btn adm-btn-warn" onClick={() => handleMakeAdmin(u)}>⬆ Admin</button>
                                )}
                                {u.banned_until
                                  ? <button className="adm-btn adm-btn-success" onClick={() => handleUnban(u.id)}>✓ Unban</button>
                                  : <button className="adm-btn adm-btn-danger" onClick={() => openBan(u)}>🔨 Ban</button>
                                }
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              <Pagination state={usersPage} load={loadUsers} />
            </div>
          )}

          {/* ═══ LOBBIES ═══ */}
          {section === 'lobbies' && (
            <div className="adm-panel">
              <div className="adm-panel-header">
                <span className="adm-panel-count">{lobbiesPage.total} lobbies total</span>
              </div>
              {lobbiesPage.loading
                ? <div className="adm-loading">Loading...</div>
                : (
                  <table className="adm-table">
                    <thead><tr><th>Code</th><th>Host ID</th><th>Lobby ID</th></tr></thead>
                    <tbody>
                      {lobbies
                        .filter(l => !searchLobby || (l.invite_code || '').toLowerCase().includes(searchLobby.toLowerCase()))
                        .map((l: any) => (
                          <tr key={l.id}>
                            <td><span className="adm-code">{l.invite_code}</span></td>
                            <td className="adm-cell-mono">#{l.host_id}</td>
                            <td className="adm-cell-mono">{l.id}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              <Pagination state={lobbiesPage} load={loadLobbies} />
            </div>
          )}

          {/* ═══ LOCATIONS ═══ */}
          {section === 'locations' && (
            <div className="adm-panel">
              <div className="adm-panel-header">
                <span className="adm-panel-count">{locationsPage.total} locations total</span>
                <button className="adm-btn adm-btn-add" onClick={openAddLoc}>+ Add Location</button>
              </div>

              {showLocForm && (
                <div className="adm-form">
                  <div className="adm-form-title">{editLoc ? `Edit #${editLoc.id}` : 'New Location'}</div>
                  <div className="adm-form-row">
                    <div className="adm-form-group">
                      <label className="adm-form-label">Latitude</label>
                      <input className="adm-form-input" type="number" step="0.000001" placeholder="48.8566" value={locForm.lat} onChange={e => setLocForm(f => ({ ...f, lat: e.target.value }))} />
                    </div>
                    <div className="adm-form-group">
                      <label className="adm-form-label">Longitude</label>
                      <input className="adm-form-input" type="number" step="0.000001" placeholder="2.3522" value={locForm.lon} onChange={e => setLocForm(f => ({ ...f, lon: e.target.value }))} />
                    </div>
                    <div className="adm-form-group">
                      <label className="adm-form-label">Region</label>
                      <input className="adm-form-input" type="text" placeholder="Europe" value={locForm.region} onChange={e => setLocForm(f => ({ ...f, region: e.target.value }))} />
                    </div>
                    <div className="adm-form-group">
                      <label className="adm-form-label">Country</label>
                      <input className="adm-form-input" type="text" placeholder="France" value={locForm.country} onChange={e => setLocForm(f => ({ ...f, country: e.target.value }))} />
                    </div>
                    <button className="adm-btn adm-btn-add" onClick={saveLoc}>Save</button>
                    <button className="adm-btn adm-btn-cancel" onClick={() => setShowLocForm(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {locationsPage.loading
                ? <div className="adm-loading">Loading...</div>
                : (
                  <table className="adm-table">
                    <thead><tr><th>ID</th><th>Latitude</th><th>Longitude</th><th>Region</th><th>Actions</th></tr></thead>
                    <tbody>
                      {locations
                        .filter(l => !searchLocation || (l.region || '').toLowerCase().includes(searchLocation.toLowerCase()) || `${l.lat}`.includes(searchLocation) || `${l.lon}`.includes(searchLocation))
                        .map((loc: any) => (
                          <tr key={loc.id}>
                            <td className="adm-cell-mono">{loc.id}</td>
                            <td className="adm-cell-mono">{loc.lat}</td>
                            <td className="adm-cell-mono">{loc.lon}</td>
                            <td>{loc.region}</td>
                            <td>
                              <div className="adm-actions">
                                <button className="adm-btn adm-btn-edit" onClick={() => openEditLoc(loc)}>Edit</button>
                                <button className="adm-btn adm-btn-danger" onClick={() => deleteLoc(loc.id)}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              <Pagination state={locationsPage} load={loadLocations} />
            </div>
          )}

          {/* ═══ REPORTS ═══ */}
          {section === 'reports' && (
            <div className="adm-panel">
              <div className="adm-panel-header">
                <span className="adm-panel-count">{reportsPage.total} reports total</span>
              </div>
              {reportsPage.loading
                ? <div className="adm-loading">Loading...</div>
                : (
                  <table className="adm-table">
                    <thead><tr><th>#</th><th>Reporter</th><th>Suspect</th><th>Reason</th><th>Demo</th><th>Actions</th></tr></thead>
                    <tbody>
                      {reports.map((r: any) => (
                        <tr key={r.id}>
                          <td className="adm-cell-mono adm-muted">#{r.id}</td>
                          <td className="adm-cell-mono">#{r.reporter_id}</td>
                          <td className="adm-cell-mono">#{r.suspect_id}</td>
                          <td><span className="adm-badge badge-red">{r.reason}</span></td>
                          <td>
                            <button className="adm-btn adm-btn-demo" onClick={() => openDemo(r.id)}>
                              ▶ Watch Demo
                            </button>
                          </td>
                          <td>
                            <div className="adm-actions">
                              <button className="adm-btn adm-btn-danger" onClick={() => setBanModal({ open: true, userId: r.suspect_id, name: `#${r.suspect_id}`, reason: r.reason, bannedUntil: '' })}>
                                🔨 Ban
                              </button>
                              <button className="adm-btn adm-btn-cancel" onClick={() => dismissReport(r.id)}>
                                Dismiss
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              <Pagination state={reportsPage} load={loadReports} />
            </div>
          )}

        </div>
      </div>

      {/* ══════ BAN MODAL ══════ */}
      {banModal.open && (
        <div className="adm-overlay" onClick={() => setBanModal(b => ({ ...b, open: false }))}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">
              🔨 Ban — {banModal.name}
              <button className="adm-modal-close" onClick={() => setBanModal(b => ({ ...b, open: false }))}>✕</button>
            </div>
            <div className="adm-form-group" style={{ marginBottom: 12 }}>
              <label className="adm-form-label">Reason</label>
              <input
                className="adm-form-input"
                type="text"
                placeholder="Reason for ban..."
                value={banModal.reason}
                onChange={e => setBanModal(b => ({ ...b, reason: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="adm-form-group" style={{ marginBottom: 16 }}>
              <label className="adm-form-label">Banned until</label>
              <input
                className="adm-form-input"
                type="datetime-local"
                value={banModal.bannedUntil}
                onChange={e => setBanModal(b => ({ ...b, bannedUntil: e.target.value }))}
              />
            </div>
            <div className="adm-modal-footer">
              <button className="adm-modal-btn adm-modal-btn-danger" onClick={confirmBan} disabled={!banModal.reason.trim() || !banModal.bannedUntil}>
                Confirm Ban
              </button>
              <button className="adm-modal-btn adm-modal-btn-cancel" onClick={() => setBanModal(b => ({ ...b, open: false }))}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ DEMO MODAL ══════ */}
      {demo.open && (
        <div className="adm-overlay" onClick={closeDemo}>
          <div className="adm-demo-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="adm-demo-header">
              <div className="adm-demo-title">
                Demo Replay
                {demo.reportData && (
                  <span className="adm-demo-meta">
                    Report #{demo.reportData.id} · Suspect #{demo.reportData.suspect_id}
                    <span className="adm-badge badge-red" style={{ marginLeft: 8 }}>{demo.reportData.reason}</span>
                  </span>
                )}
              </div>
              <button className="adm-modal-close" onClick={closeDemo}>✕</button>
            </div>

            {demo.loading ? (
              <div className="adm-demo-loading">
                <div className="adm-demo-spinner" />
                Loading demo data...
              </div>
            ) : demo.frames.length === 0 ? (
              <div className="adm-demo-empty">
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                No demo frames available for this report
              </div>
            ) : (
              <>
                {/* Frame info bar */}
                <div className="adm-demo-infobar">
                  <span className="adm-demo-frame-counter">Frame {demo.frameIdx + 1} / {demo.frames.length}</span>
                  {currentFrame && (
                    <>
                      <span className="adm-demo-stat">H: <b>{(currentFrame.heading ?? 0).toFixed(1)}°</b></span>
                      <span className="adm-demo-stat">P: <b>{(currentFrame.pitch ?? 0).toFixed(1)}°</b></span>
                      <span className="adm-demo-stat">Z: <b>{(currentFrame.zoom ?? 1).toFixed(2)}×</b></span>
                      {currentFrame.lat != null && (
                        <span className="adm-demo-stat">
                          📍 <b>{currentFrame.lat.toFixed(4)}, {currentFrame.lng?.toFixed(4)}</b>
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Street View panorama replay */}
                <div className="adm-demo-screen">
                  {firstPos ? (
                    <StreetViewPanorama
                      key={`demo-${demo.reportId}`}
                      lat={firstPos.lat}
                      lon={firstPos.lng}
                      externalPosition={lastKnownPos ?? undefined}
                      externalPov={interpPov ?? { heading: currentFrame?.heading ?? 0, pitch: currentFrame?.pitch ?? 0, zoom: currentFrame?.zoom ?? 1 }}
                      disableControls={false}
                    />
                  ) : (
                    <div className="adm-demo-no-position">No position data in frames</div>
                  )}
                  <div className="adm-demo-overlay-info">
                    <div className="adm-demo-player-badge">
                      <span className="adm-demo-player-dot" />
                      Suspect #{demo.reportData?.suspect_id}
                    </div>
                    <div className="adm-demo-frame-badge">
                      {Math.round((demo.frameIdx / Math.max(demo.frames.length - 1, 1)) * 100)}%
                    </div>
                  </div>
                  {roundNotif && (
                    <div className="adm-demo-round-notif">📍 New round</div>
                  )}
                </div>

                {/* Timeline */}
                <div className="adm-demo-timeline-wrap">
                  <span className="adm-demo-time-label">0s</span>
                  <div
                    className="adm-demo-timeline"
                    onClick={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = (e.clientX - rect.left) / rect.width;
                      seekDemo(Math.round(ratio * (demo.frames.length - 1)));
                    }}
                  >
                    <div className="adm-demo-timeline-fill" style={{ width: `${demoProgress}%` }} />
                    <div className="adm-demo-timeline-thumb" style={{ left: `${demoProgress}%` }} />

                    {/* Sparse tick marks */}
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i} className="adm-demo-tick" style={{ left: `${i * 10}%` }} />
                    ))}
                  </div>
                  <span className="adm-demo-time-label">{demo.frames.length} fr</span>
                </div>

                {/* Controls */}
                <div className="adm-demo-controls">
                  <button className="adm-demo-ctrl" onClick={() => seekDemo(0)} title="Start">|◀</button>
                  <button className="adm-demo-ctrl" onClick={() => stepDemo(-10)} title="-10 frames">◀ 10</button>
                  <button className={`adm-demo-ctrl adm-demo-ctrl-primary ${demo.playing ? 'playing' : ''}`} onClick={togglePlay}>
                    {demo.playing ? 'II' : '▶'}
                  </button>
                  <button className="adm-demo-ctrl" onClick={() => stepDemo(10)} title="+10 frames">10 ▶</button>
                  <button className="adm-demo-ctrl" onClick={() => seekDemo(demo.frames.length - 1)} title="End">▶|</button>

                  <div className="adm-demo-speed-group">
                    {[0.5, 1, 2, 4].map(s => (
                      <button
                        key={s}
                        className={`adm-demo-speed-btn ${demo.speed === s ? 'active' : ''}`}
                        onClick={() => setDemo(d => ({ ...d, speed: s }))}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrubber (precise) */}
                <input
                  className="adm-demo-scrubber"
                  type="range"
                  min={0}
                  max={demo.frames.length - 1}
                  value={demo.frameIdx}
                  onChange={e => seekDemo(Number(e.target.value))}
                />

                {/* Action footer */}
                <div className="adm-demo-footer">
                  <button
                    className="adm-modal-btn adm-modal-btn-danger"
                    onClick={() => {
                      closeDemo();
                      setBanModal({ open: true, userId: demo.reportData?.suspect_id ?? null, name: `#${demo.reportData?.suspect_id}`, reason: demo.reportData?.reason || '', bannedUntil: '' });
                    }}
                  >
                    🔨 Ban Suspect
                  </button>
                  <button
                    className="adm-modal-btn adm-modal-btn-cancel"
                    onClick={() => {
                      if (demo.reportId) dismissReport(demo.reportId);
                      closeDemo();
                    }}
                  >
                    ✕ Dismiss Report
                  </button>
                  <button className="adm-modal-btn adm-modal-btn-neutral" onClick={closeDemo}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`adm-toast ${toast.startsWith('Failed') ? 'adm-toast-err' : ''}`}>{toast}</div>}
    </div>
  );
};
