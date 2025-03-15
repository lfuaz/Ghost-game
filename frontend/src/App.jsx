import React, { useState, useEffect } from 'react';
import RoomList from './components/RoomList';
import GameRoom from './components/GameRoom';
import NameModal from './components/NameModal';
import socket from './socket';
import './styles/main.scss';

function App() {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [isNameModalOpen, setIsNameModalOpen] = useState(true);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [connectionError, setConnectionError] = useState(null);
  const [playerSessionId, setPlayerSessionId] = useState('');

  useEffect(() => {
    // Generate a unique session ID if one doesn't exist yet
    let sessionId = sessionStorage.getItem('ghostPlayerSessionId');
    if (!sessionId) {
      sessionId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('ghostPlayerSessionId', sessionId);
    }
    setPlayerSessionId(sessionId);

    // Check if we have a stored name in sessionStorage for this browser session
    const storedName = sessionStorage.getItem('ghostPlayerName');
    if (storedName) {
      setPlayerName(storedName);
      setIsNameModalOpen(false);
    }

    // Listen for connection events
    const onConnect = () => {
      setIsConnected(true);
      setConnectionError(null);

      // When connecting, check if the server recognizes our session ID
      if (sessionId) {
        console.log("Checking session on connect:", sessionId);
        socket.emit('checkSession', { sessionId });
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setConnectionError('Disconnected from server. Trying to reconnect...');
    };

    const onConnectError = (error) => {
      setIsConnected(false);
      setConnectionError(`Connection error: ${error.message}`);
    };

    // Listen for session restoration confirmation
    const onSessionRestored = (data) => {
      if (data.success && data.name) {
        console.log("Session restored with name:", data.name);
        setPlayerName(data.name);
        sessionStorage.setItem('ghostPlayerName', data.name);
        setIsNameModalOpen(false);
      } else if (!storedName) {
        // If session couldn't be restored and we don't have a stored name, show the modal
        setIsNameModalOpen(true);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('sessionRestored', onSessionRestored);

    // If already connected when component mounts, check the session
    if (socket.connected && sessionId) {
      socket.emit('checkSession', { sessionId });
    }

    // Cleanup on component unmount
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('sessionRestored', onSessionRestored);
    };
  }, []); // Empty dependency array - only run once on mount

  // Separate useEffect to handle sending player name when it changes
  useEffect(() => {
    // Only send name if we have a connection and a name
    if (socket.connected && playerName) {
      socket.emit('setPlayerName', {
        name: playerName,
        sessionId: playerSessionId // Send session ID with the name
      });
    }
  }, [playerName, socket.connected, playerSessionId]);

  const handleSaveName = (name) => {
    setPlayerName(name);
    // Store in sessionStorage (not localStorage) so it's only for this browser session
    sessionStorage.setItem('ghostPlayerName', name);
    setIsNameModalOpen(false);

    // Send player name to server
    if (socket.connected) {
      socket.emit('setPlayerName', {
        name,
        sessionId: playerSessionId
      });
    }
  };

  const handleJoinRoom = (roomName) => {
    setCurrentRoom(roomName);
  };

  const handleLeaveRoom = () => {
    if (currentRoom) {
      socket.emit('leaveRoom', currentRoom);
      setCurrentRoom(null);
    }
  };

  // Allow user to logout/clear name
  const handleLogout = () => {
    sessionStorage.removeItem('ghostPlayerName');
    setPlayerName('');
    setIsNameModalOpen(true);
  };

  return (
    <div className="app">
      <h1>Ghost Game</h1>

      {/* Name modal */}
      <NameModal
        isOpen={isNameModalOpen}
        onSaveName={handleSaveName}
      />

      {connectionError && (
        <div className="connection-error" style={{
          backgroundColor: '#f44336',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {connectionError}
        </div>
      )}

      {!isConnected ? (
        <div className="connecting" style={{ textAlign: 'center' }}>
          <p>Connecting to server...</p>
          <div className="loading-spinner" style={{
            border: '4px solid rgba(0,0,0,0.1)',
            borderLeft: '4px solid #7b1fa2',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            margin: '20px auto',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : !currentRoom ? (
        <>
          {playerName && (
            <div className="welcome-message" style={{ marginBottom: '20px', textAlign: 'center' }}>
              Welcome, <span style={{ fontWeight: 'bold', color: '#7b1fa2' }}>{playerName}</span>!
              <div style={{ marginTop: '5px' }}>
                <button
                  onClick={() => setIsNameModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e91e63',
                    cursor: 'pointer',
                    padding: '5px',
                    fontSize: '0.8rem',
                    marginRight: '10px'
                  }}
                >
                  Change name
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f44336',
                    cursor: 'pointer',
                    padding: '5px',
                    fontSize: '0.8rem'
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
          <RoomList joinRoom={handleJoinRoom} playerName={playerName} sessionId={playerSessionId} />
        </>
      ) : (
        <GameRoom
          room={currentRoom}
          leaveRoom={handleLeaveRoom}
          playerName={playerName}
          sessionId={playerSessionId}
        />
      )}
    </div>
  );
}

export default App;
