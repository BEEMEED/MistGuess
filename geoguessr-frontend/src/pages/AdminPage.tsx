import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { MistbornButton } from '../components/ui/MistbornButton';
import { MistbornCard } from '../components/ui/MistbornCard';
import { MistbornInput } from '../components/ui/MistbornInput';
import { MistbornModal } from '../components/ui/MistbornModal';
import { FogOverlay } from '../components/effects/FogOverlay';
import { AshParticles } from '../components/effects/AshParticles';
import { RainEffect } from '../components/effects/RainEffect';
import './AdminPage.css';

interface Location {
  lat: number;
  lon: number;
  region: string;
}

interface AdminData {
  data_user: [string, any][];
  data_lobby: [string, any][];
  data_location: [string, any][];
  total_users: number;
  total_lobbies: number;
  total_locations: number;
  page: number;
  limit: number;
}

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Location management state
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showEditLocation, setShowEditLocation] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [newLocation, setNewLocation] = useState({ lat: 0, lon: 0, region: '' });

  // Ban user state
  const [showBanUser, setShowBanUser] = useState(false);
  const [banUserLogin, setBanUserLogin] = useState('');
  const [banReason, setBanReason] = useState('');

  // Make admin state
  const [showMakeAdmin, setShowMakeAdmin] = useState(false);
  const [makeAdminLogin, setMakeAdminLogin] = useState('');

  // Send telegram message state (inline in table)
  const [openMessageRow, setOpenMessageRow] = useState<string | null>(null);
  const [telegramMessage, setTelegramMessage] = useState('');

  // Toast notification
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  // Modal state
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'confirm' | 'alert' | 'danger';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
  });

  // Search state
  const [searchLocation, setSearchLocation] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchLobby, setSearchLobby] = useState('');

  // Active tab
  const [activeTab, setActiveTab] = useState<'users' | 'lobbies' | 'locations'>('locations');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Reset page to 1 when switching tabs
  const handleTabChange = (tab: 'users' | 'lobbies' | 'locations') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    loadAdminData();
  }, [user, navigate, currentPage]);

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiService.getAdminPanel(currentPage, itemsPerPage);
      setAdminData(data);
    } catch (err: any) {
      console.error('Failed to load admin panel:', err);
      if (err.status === 403) {
        setError('Access denied. You are not an admin.');
      } else {
        setError(err.message || 'Failed to load admin panel');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLocation = async () => {
    try {
      await apiService.addLocation(newLocation.lat, newLocation.lon, newLocation.region);
      setNewLocation({ lat: 0, lon: 0, region: '' });
      setShowAddLocation(false);
      await loadAdminData();
      showToast('✓ Location added successfully');
    } catch (err: any) {
      showToast('✗ Failed to add location');
    }
  };

  const handleEditLocation = async () => {
    if (editingLocationId === null) return;

    try {
      await apiService.changeLocation(
        editingLocationId,
        newLocation.lat,
        newLocation.lon,
        newLocation.region
      );
      setEditingLocationId(null);
      setNewLocation({ lat: 0, lon: 0, region: '' });
      setShowEditLocation(false);
      await loadAdminData();
      showToast('✓ Location updated successfully');
    } catch (err: any) {
      showToast('✗ Failed to edit location');
    }
  };

  const handleDeleteLocation = (id: number) => {
    setModal({
      isOpen: true,
      type: 'danger',
      title: '⚠️ Delete Location',
      message: `Are you sure you want to delete location #${id}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await apiService.deleteLocation(id);
          await loadAdminData();
          showToast('✓ Location deleted successfully');
        } catch (err: any) {
          showToast('✗ Failed to delete location');
        }
      },
    });
  };

  const handleBanUser = () => {
    if (!banUserLogin || !banReason) {
      showToast('✗ Please enter both username and reason');
      return;
    }

    setModal({
      isOpen: true,
      type: 'danger',
      title: '🚫 Ban User',
      message: `Are you sure you want to ban user "${banUserLogin}"? Reason: ${banReason}`,
      onConfirm: async () => {
        try {
          await apiService.banUser(banUserLogin, banReason);
          setBanUserLogin('');
          setBanReason('');
          setShowBanUser(false);
          await loadAdminData();
          showToast('✓ User banned successfully');
        } catch (err: any) {
          showToast('✗ Failed to ban user');
        }
      },
    });
  };

  const handleQuickBanUser = (login: string) => {
    // We'll use a prompt-like modal with input field
    setBanUserLogin(login);
    setBanReason('');
    setShowBanUser(true);
  };

  const handleSendTelegramMessage = async (login: string) => {
    if (!telegramMessage.trim()) {
      showToast('✗ Please enter a message');
      return;
    }

    try {
      await apiService.sendTelegramMessage(login, telegramMessage);
      setTelegramMessage('');
      setOpenMessageRow(null);
      showToast('✓ Message sent successfully');
    } catch (err: any) {
      showToast('✗ Failed to send message');
    }
  };

  const handleQuickSendMessage = (login: string, telegram: string | null) => {
    if (!telegram || telegram === 'null') {
      showToast('✗ User has no Telegram linked');
      return;
    }
    setOpenMessageRow(login);
    setTelegramMessage('');
  };

  const handleCancelMessage = () => {
    setOpenMessageRow(null);
    setTelegramMessage('');
  };

  const handleMakeAdmin = () => {
    if (!makeAdminLogin) {
      showToast('✗ Please enter username');
      return;
    }

    setModal({
      isOpen: true,
      type: 'confirm',
      title: '⚔️ Make Admin',
      message: `Are you sure you want to grant admin privileges to "${makeAdminLogin}"?`,
      onConfirm: async () => {
        try {
          await apiService.makeAdmin(makeAdminLogin);
          setMakeAdminLogin('');
          setShowMakeAdmin(false);
          await loadAdminData();
          showToast('✓ User promoted to admin');
        } catch (err: any) {
          showToast('✗ Failed to make user admin');
        }
      },
    });
  };

  const openEditLocation = (id: number, location: Location) => {
    setEditingLocationId(id);
    setNewLocation({ lat: location.lat, lon: location.lon, region: location.region });
    setShowEditLocation(true);
  };

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast({ message: '', visible: false });
    }, 2000);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`✓ ${label} copied!`);
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast('✗ Failed to copy');
    }
  };

  const handleNextPage = () => {
    setCurrentPage(prev => prev + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const getTotalPages = (total: number) => {
    return Math.ceil(total / itemsPerPage);
  };

  const renderPagination = (total: number, dataType: string) => {
    const totalPages = getTotalPages(total);
    if (totalPages <= 1) return null;

    return (
      <div className="pagination">
        <div className="pagination-info">
          Showing page {currentPage} of {totalPages} ({total} total {dataType})
        </div>
        <div className="pagination-buttons">
          <MistbornButton
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            variant="secondary"
          >
            ← Previous
          </MistbornButton>
          <span className="pagination-current">Page {currentPage}</span>
          <MistbornButton
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            variant="secondary"
          >
            Next →
          </MistbornButton>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="admin-page">
        <FogOverlay />
        <AshParticles />
        <RainEffect />
        <div className="admin-page__loading">Loading admin panel...</div>
      </div>
    );
  }

  if (error || !adminData) {
    return (
      <div className="admin-page">
        <FogOverlay />
        <AshParticles />
        <RainEffect />
        <div className="admin-page__error">
          <p>{error || 'Failed to load admin panel'}</p>
          <MistbornButton onClick={() => navigate('/')}>Back to Home</MistbornButton>
        </div>
      </div>
    );
  }

  // Convert array of tuples to object for easier filtering
  const locations = adminData.data_location ? Object.fromEntries(adminData.data_location) : {};

  return (
    <div className="admin-page">
      <FogOverlay />
      <AshParticles />
      <RainEffect />

      <div className="admin-page__container">
        <MistbornCard>
          <div className="admin-page__header">
            <h1 className="admin-page__title">⚔️ Admin Panel</h1>
            <div className="admin-header-actions">
              <MistbornButton onClick={loadAdminData}>🔄 Refresh</MistbornButton>
              <MistbornButton onClick={() => navigate('/')}>Back to Home</MistbornButton>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === 'locations' ? 'active' : ''}`}
              onClick={() => handleTabChange('locations')}
            >
              Locations
            </button>
            <button
              className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => handleTabChange('users')}
            >
              Users
            </button>
            <button
              className={`admin-tab ${activeTab === 'lobbies' ? 'active' : ''}`}
              onClick={() => handleTabChange('lobbies')}
            >
              Lobbies
            </button>
          </div>

          {/* Locations Tab */}
          {activeTab === 'locations' && (
            <div className="admin-section">
              <div className="admin-section__header">
                <h2>Location Management</h2>
                <div className="admin-section__actions">
                  <MistbornButton onClick={() => navigate('/admin/add-location')}>
                    📍 Add Location (Map)
                  </MistbornButton>
                  <MistbornButton variant="secondary" onClick={() => setShowAddLocation(!showAddLocation)}>
                    {showAddLocation ? 'Cancel' : '+ Quick Add'}
                  </MistbornButton>
                </div>
              </div>

              {/* Search Input */}
              <MistbornInput
                type="text"
                placeholder="Search by ID, latitude, longitude, or region..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
              />

              {showAddLocation && (
                <div className="admin-form">
                  <MistbornInput
                    type="number"
                    step="0.000001"
                    placeholder="Latitude"
                    value={newLocation.lat || ''}
                    onChange={(e) => setNewLocation({ ...newLocation, lat: parseFloat(e.target.value) || 0 })}
                  />
                  <MistbornInput
                    type="number"
                    step="0.000001"
                    placeholder="Longitude"
                    value={newLocation.lon || ''}
                    onChange={(e) => setNewLocation({ ...newLocation, lon: parseFloat(e.target.value) || 0 })}
                  />
                  <MistbornInput
                    type="text"
                    placeholder="Region"
                    value={newLocation.region}
                    onChange={(e) => setNewLocation({ ...newLocation, region: e.target.value })}
                  />
                  <MistbornButton onClick={handleAddLocation}>Add Location</MistbornButton>
                </div>
              )}

              {showEditLocation && editingLocationId !== null && (
                <div className="admin-form">
                  <h3>Editing Location #{editingLocationId}</h3>
                  <MistbornInput
                    type="number"
                    step="0.000001"
                    placeholder="Latitude"
                    value={newLocation.lat || ''}
                    onChange={(e) => setNewLocation({ ...newLocation, lat: parseFloat(e.target.value) || 0 })}
                  />
                  <MistbornInput
                    type="number"
                    step="0.000001"
                    placeholder="Longitude"
                    value={newLocation.lon || ''}
                    onChange={(e) => setNewLocation({ ...newLocation, lon: parseFloat(e.target.value) || 0 })}
                  />
                  <MistbornInput
                    type="text"
                    placeholder="Region"
                    value={newLocation.region}
                    onChange={(e) => setNewLocation({ ...newLocation, region: e.target.value })}
                  />
                  <div className="admin-form__actions">
                    <MistbornButton onClick={handleEditLocation}>Save Changes</MistbornButton>
                    <MistbornButton variant="secondary" onClick={() => {
                      setShowEditLocation(false);
                      setEditingLocationId(null);
                      setNewLocation({ lat: 0, lon: 0, region: '' });
                    }}>
                      Cancel
                    </MistbornButton>
                  </div>
                </div>
              )}

              {renderPagination(adminData.total_locations, 'locations')}

              <div className="admin-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Latitude</th>
                      <th>Longitude</th>
                      <th>Region</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredLocations = Object.entries(locations).filter(([id, loc]: [string, any]) => {
                        if (!searchLocation) return true;
                        const search = searchLocation.toLowerCase();
                        return (
                          id.toLowerCase().includes(search) ||
                          loc.lat.toString().toLowerCase().includes(search) ||
                          loc.lon.toString().toLowerCase().includes(search) ||
                          loc.region.toLowerCase().includes(search)
                        );
                      });

                      if (filteredLocations.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="no-data">
                              {searchLocation ? 'No locations match your search' : 'No locations found'}
                            </td>
                          </tr>
                        );
                      }

                      return filteredLocations.map(([id, loc]: [string, any]) => (
                        <tr key={id}>
                          <td className="copyable" onClick={() => copyToClipboard(id, 'ID')}>{id}</td>
                          <td className="copyable" onClick={() => copyToClipboard(loc.lat.toString(), 'Latitude')}>{loc.lat}</td>
                          <td className="copyable" onClick={() => copyToClipboard(loc.lon.toString(), 'Longitude')}>{loc.lon}</td>
                          <td className="copyable" onClick={() => copyToClipboard(loc.region, 'Region')}>{loc.region}</td>
                          <td className="admin-table__actions">
                            <button
                              className="action-btn edit-btn"
                              onClick={() => openEditLocation(parseInt(id), loc)}
                            >
                              Edit
                            </button>
                            <button
                              className="action-btn delete-btn"
                              onClick={() => handleDeleteLocation(parseInt(id))}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {renderPagination(adminData.total_locations, 'locations')}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="admin-section">
              <div className="admin-section__header">
                <h2>User Management</h2>
                <div className="admin-section__actions">
                  <MistbornButton onClick={() => setShowMakeAdmin(!showMakeAdmin)}>
                    {showMakeAdmin ? 'Cancel' : 'Make Admin'}
                  </MistbornButton>
                  <MistbornButton variant="danger" onClick={() => setShowBanUser(!showBanUser)}>
                    {showBanUser ? 'Cancel' : 'Ban User'}
                  </MistbornButton>
                </div>
              </div>

              {/* Search Input */}
              <MistbornInput
                type="text"
                placeholder="Search by login, name, XP, or rank..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />

              {showMakeAdmin && (
                <div className="admin-form">
                  <MistbornInput
                    type="text"
                    placeholder="Username to make admin"
                    value={makeAdminLogin}
                    onChange={(e) => setMakeAdminLogin(e.target.value)}
                  />
                  <MistbornButton onClick={handleMakeAdmin}>
                    Confirm Make Admin
                  </MistbornButton>
                </div>
              )}

              {showBanUser && (
                <div className="admin-form">
                  <h3>Ban User</h3>
                  <MistbornInput
                    label="Login"
                    type="text"
                    placeholder="Login to ban"
                    value={banUserLogin}
                    onChange={(e) => setBanUserLogin(e.target.value)}
                  />
                  <MistbornInput
                    label="Reason"
                    type="text"
                    placeholder="Reason for ban"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                  />
                  <div className="admin-form__actions">
                    <MistbornButton variant="danger" onClick={handleBanUser}>
                      Confirm Ban
                    </MistbornButton>
                    <MistbornButton
                      variant="secondary"
                      onClick={() => {
                        setShowBanUser(false);
                        setBanUserLogin('');
                        setBanReason('');
                      }}>
                      Cancel
                    </MistbornButton>
                  </div>
                </div>
              )}

              {renderPagination(adminData.total_users, 'users')}

              <div className="admin-table">
                <table>
                  <thead>
                    <tr>
                      <th>Login</th>
                      <th>Name</th>
                      <th>XP</th>
                      <th>Rank</th>
                      <th>Role</th>
                      <th>Telegram</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredUsers = adminData.data_user.filter(([login, userData]: [string, any]) => {
                        if (!searchUser) return true;
                        const search = searchUser.toLowerCase();
                        return (
                          login.toLowerCase().includes(search) ||
                          (userData.name || '').toLowerCase().includes(search) ||
                          (userData.xp || 0).toString().includes(search) ||
                          (userData.rank || '').toLowerCase().includes(search)
                        );
                      });

                      if (filteredUsers.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="no-data">
                              {searchUser ? 'No users match your search' : 'No users found'}
                            </td>
                          </tr>
                        );
                      }

                      return filteredUsers.flatMap(([login, userData]: [string, any]) => [
                        <tr key={login}>
                          <td className="copyable" onClick={() => copyToClipboard(login, 'Login')}>{login}</td>
                          <td className="copyable" onClick={() => copyToClipboard(userData.name || 'N/A', 'Name')}>{userData.name || 'N/A'}</td>
                          <td className="copyable" onClick={() => copyToClipboard((userData.xp || 0).toString(), 'XP')}>{userData.xp || 0}</td>
                          <td className="copyable" onClick={() => copyToClipboard(userData.rank || 'N/A', 'Rank')}>{userData.rank || 'N/A'}</td>
                          <td>
                            <span
                              className={`role-badge ${userData.role === 'admin' ? 'role-admin' : 'role-user'} copyable`}
                              onClick={() => copyToClipboard(userData.role || 'user', 'Role')}
                            >
                              {userData.role || 'user'}
                            </span>
                          </td>
                          <td
                            className="copyable"
                            onClick={() => userData.telegram && userData.telegram !== 'null' && copyToClipboard(userData.telegram, 'Telegram ID')}
                          >
                            {userData.telegram && userData.telegram !== 'null' ? (
                              <span className="telegram-linked">✓ Linked</span>
                            ) : (
                              <span className="telegram-not-linked">✗ Not linked</span>
                            )}
                          </td>
                          <td className="admin-table__actions">
                            <button
                              className="action-btn edit-btn"
                              onClick={() => handleQuickSendMessage(login, userData.telegram)}
                              disabled={!userData.telegram || userData.telegram === 'null'}
                              title={!userData.telegram || userData.telegram === 'null' ? 'User has no Telegram linked' : 'Send Telegram message'}
                            >
                              Message
                            </button>
                            <button
                              className="action-btn delete-btn"
                              onClick={() => handleQuickBanUser(login)}
                              disabled={userData.role === 'admin'}
                            >
                              Ban
                            </button>
                          </td>
                        </tr>,
                        openMessageRow === login && (
                          <tr key={`${login}-message`} className="message-row">
                            <td colSpan={7}>
                              <div className="inline-message-form">
                                <input
                                  type="text"
                                  className="message-input"
                                  placeholder="Type your message..."
                                  value={telegramMessage}
                                  onChange={(e) => setTelegramMessage(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && telegramMessage.trim()) {
                                      handleSendTelegramMessage(login);
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  className="action-btn edit-btn"
                                  onClick={() => handleSendTelegramMessage(login)}
                                  disabled={!telegramMessage.trim()}
                                >
                                  Send
                                </button>
                                <button
                                  className="action-btn delete-btn"
                                  onClick={handleCancelMessage}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      ].filter(Boolean));
                    })()}
                  </tbody>
                </table>
              </div>

              {renderPagination(adminData.total_users, 'users')}
            </div>
          )}

          {/* Lobbies Tab */}
          {activeTab === 'lobbies' && (
            <div className="admin-section">
              <div className="admin-section__header">
                <h2>Active Lobbies</h2>
              </div>

              {/* Search Input */}
              <MistbornInput
                type="text"
                placeholder="Search by code, host, players, rounds, or status..."
                value={searchLobby}
                onChange={(e) => setSearchLobby(e.target.value)}
              />

              {renderPagination(adminData.total_lobbies, 'lobbies')}

              <div className="admin-table">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Host</th>
                      <th>Players</th>
                      <th>Rounds</th>
                      <th>Current Round</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredLobbies = adminData.data_lobby.filter(([code, lobby]: [string, any]) => {
                        if (!searchLobby) return true;
                        const search = searchLobby.toLowerCase();
                        return (
                          code.toLowerCase().includes(search) ||
                          (lobby.host || '').toLowerCase().includes(search) ||
                          `${lobby.players?.length || 0}`.includes(search) ||
                          `${lobby.max_players || 0}`.includes(search) ||
                          (lobby.rounds || 0).toString().includes(search) ||
                          (lobby.current_round || 0).toString().includes(search) ||
                          (lobby.status || '').toLowerCase().includes(search)
                        );
                      });

                      if (filteredLobbies.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="no-data">
                              {searchLobby ? 'No lobbies match your search' : 'No active lobbies'}
                            </td>
                          </tr>
                        );
                      }

                      return filteredLobbies.map(([code, lobby]: [string, any]) => (
                        <tr key={code}>
                          <td className="copyable" onClick={() => copyToClipboard(code, 'Code')}>{code}</td>
                          <td className="copyable" onClick={() => copyToClipboard(lobby.host || 'N/A', 'Host')}>{lobby.host || 'N/A'}</td>
                          <td className="copyable" onClick={() => copyToClipboard(`${lobby.players?.length || 0} / ${lobby.max_players || 0}`, 'Players')}>
                            {lobby.players?.length || 0} / {lobby.max_players || 0}
                          </td>
                          <td className="copyable" onClick={() => copyToClipboard((lobby.rounds || 0).toString(), 'Rounds')}>{lobby.rounds || 0}</td>
                          <td className="copyable" onClick={() => copyToClipboard((lobby.current_round || 0).toString(), 'Current Round')}>{lobby.current_round || 0}</td>
                          <td className="copyable" onClick={() => copyToClipboard(lobby.status || 'waiting', 'Status')}>{lobby.status || 'waiting'}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {renderPagination(adminData.total_lobbies, 'lobbies')}
            </div>
          )}
        </MistbornCard>
      </div>

      {/* Toast Notification */}
      {toast.visible && (
        <div className="admin-toast">
          {toast.message}
        </div>
      )}

      {/* Modal */}
      <MistbornModal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
};
