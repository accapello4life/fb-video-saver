import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileEdit, setProfileEdit] = useState({});
  const itemsPerPage = 5;

  const handleLogin = () => {
    const apiUrl = process.env.NODE_ENV === 'production'
      ? process.env.REACT_APP_API_URL
      : 'http://localhost:5000';
    window.location.href = `${apiUrl}/auth/facebook`;
  };

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NODE_ENV === 'production'
      ? process.env.REACT_APP_API_URL
      : 'http://localhost:5000';
    const response = await axios.get(`${apiUrl}/api/videos`, { withCredentials: true });
      setVideos(response.data.data);
    } catch (error) {
      console.error('Error fetching videos:', error);
      if (error.response?.status === 401) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (videoUrl) => {
    try {
      setDownloadProgress(0);
      setError(null);

      // Simulate progress updates (in real app, use WebSocket or polling)
      const interval = setInterval(() => {
        setDownloadProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress > 100 ? 100 : newProgress;
        });
      }, 300);

      const apiUrl = process.env.NODE_ENV === 'production'
      ? process.env.REACT_APP_API_URL
      : 'http://localhost:5000';
    window.open(`${apiUrl}/api/download?videoUrl=${videoUrl}`, '_blank');

      setTimeout(() => {
        clearInterval(interval);
        setDownloadProgress(0);
        if (user?.profile?.id) {
          fetchHistory();
        }
      }, 3000);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download video. Please try again.');
    }
  };

  const toggleVideoSelection = (videoId) => {
    setSelectedVideos(prev =>
      prev.includes(videoId)
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  const handleBulkDownload = async () => {
    try {
      setDownloadProgress(0);
      setError(null);

      // Simulate progress updates
      const interval = setInterval(() => {
        setDownloadProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress > 100 ? 100 : newProgress;
        });
      }, 300);

      // Open each selected video in new tab
      selectedVideos.forEach(videoId => {
        const video = videos.find(v => v.id === videoId);
        if (video) {
          const apiUrl = process.env.NODE_ENV === 'production'
      ? process.env.REACT_APP_API_URL
      : 'http://localhost:5000';
    window.open(`${apiUrl}/api/download?videoUrl=${video.source}`, '_blank');
        }
      });

      setTimeout(() => {
        clearInterval(interval);
        setDownloadProgress(0);
        if (user?.profile?.id) {
          fetchHistory();
        }
      }, 3000);
    } catch (error) {
      console.error('Bulk download error:', error);
      setError('Failed to download videos. Please try again.');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.NODE_ENV === 'production'
      ? process.env.REACT_APP_API_URL
      : 'http://localhost:5000';
    await axios.post(`${apiUrl}/api/profile`, profileEdit, {
        withCredentials: true
      });
      setUser({
        ...user,
        profile: {
          ...user.profile,
          displayName: profileEdit.displayName || user.profile.displayName
        }
      });
      setShowProfileEdit(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const apiUrl = process.env.NODE_ENV === 'production'
      ? process.env.REACT_APP_API_URL
      : 'http://localhost:5000';
    const response = await axios.get(`${apiUrl}/api/history`, { withCredentials: true });
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <Router>
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={
            <div className="text-center">
              {!user ? (
                <div>
                  <h1>Facebook Video Saver</h1>
                  <p>Login with Facebook to save your videos</p>
                  <button className="btn btn-primary" onClick={handleLogin}>
                    Login with Facebook
                  </button>
                </div>
              ) : (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2>Welcome, {user.profile.displayName}</h2>
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => setShowProfileEdit(!showProfileEdit)}
                    >
                      Edit Profile
                    </button>
                  </div>

                  {showProfileEdit && (
                    <div className="card mb-4">
                      <div className="card-body">
                        <h4>Edit Profile</h4>
                        <form onSubmit={handleProfileUpdate}>
                          <div className="mb-3">
                            <label className="form-label">Display Name</label>
                            <input
                              type="text"
                              className="form-control"
                              value={profileEdit.displayName || ''}
                              onChange={(e) => setProfileEdit({...profileEdit, displayName: e.target.value})}
                            />
                          </div>
                          <button type="submit" className="btn btn-primary">
                            Save Changes
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  <button
                    className="btn btn-success mb-3"
                    onClick={fetchVideos}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Fetch My Videos'}
                  </button>

                  {videos.length > 0 && (
                    <div className="video-list">
                      <h3>Your Videos</h3>
                      {loading && <div className="loading">Loading videos...</div>}
                      <div className="d-flex justify-content-between mb-3">
                        <button
                          className="btn btn-info"
                          onClick={handleBulkDownload}
                          disabled={selectedVideos.length === 0 || downloadProgress > 0}
                        >
                          Download Selected ({selectedVideos.length})
                        </button>
                      </div>
                      <div className="row">
                        {videos.map((video) => (
                          <div key={video.id} className="col-md-4 mb-4">
                            <div className="card position-relative">
                              <div className="position-absolute top-0 start-0 m-2">
                                <input
                                  type="checkbox"
                                  checked={selectedVideos.includes(video.id)}
                                  onChange={() => toggleVideoSelection(video.id)}
                                />
                              </div>
                              <div className="card-body">
                                <div className="video-thumbnail mb-3">
                                  <img
                                    src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                                    alt="Video thumbnail"
                                    className="img-fluid rounded"
                                    onError={(e) => e.target.src='https://via.placeholder.com/320x180'}
                                  />
                                </div>
                                <p className="card-text">{video.description || 'No description'}</p>
                                <p className="text-muted">
                                  {new Date(video.created_time).toLocaleDateString()}
                                </p>
                                <>
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => handleDownload(video.source)}
                                    disabled={downloadProgress > 0}
                                  >
                                    {downloadProgress > 0 ? `Downloading (${Math.round(downloadProgress)}%)` : 'Download'}
                                  </button>
                                  {error && <div className="text-danger mt-2">{error}</div>}
                                </>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-5">
                    <h3>Download History</h3>
                    {historyLoading ? (
                      <div className="loading">Loading history...</div>
                    ) : history.length > 0 ? (
                      <>
                        <ul className="list-group">
                          {history
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((item, index) => (
                              <li key={index} className="list-group-item">
                                <a href={item.videoUrl} target="_blank" rel="noopener noreferrer">
                                  {new Date(item.downloadedAt).toLocaleString()}
                                </a>
                              </li>
                            ))}
                        </ul>
                        {history.length > itemsPerPage && (
                          <div className="mt-3">
                            <button
                              className="btn btn-sm btn-outline-secondary me-2"
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage(p => p - 1)}
                            >
                              Previous
                            </button>
                            <span>Page {currentPage} of {Math.ceil(history.length / itemsPerPage)}</span>
                            <button
                              className="btn btn-sm btn-outline-secondary ms-2"
                              disabled={currentPage === Math.ceil(history.length / itemsPerPage)}
                              onClick={() => setCurrentPage(p => p + 1)}
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p>No download history yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
