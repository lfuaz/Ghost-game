import React, { useEffect, useState } from 'react';
import socket from '../socket';
import '../styles/main.scss';

const RoomList = ({ joinRoom, playerName, sessionId }) => {
    const [rooms, setRooms] = useState({});
    const [roomName, setRoomName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [playerNames, setPlayerNames] = useState({});

    useEffect(() => {
        // Listen for active rooms updates
        socket.on('activeRooms', (activeRooms) => {
            setRooms(activeRooms);
            setLoading(false);
        });

        // Listen for error messages
        socket.on('error', (message) => {
            setError(message);
            setTimeout(() => setError(null), 3000); // Clear error after 3 seconds
        });

        // Listen for player name updates
        socket.on('playerUpdate', (data) => {
            if (data.playerId && data.name) {
                setPlayerNames(prev => ({
                    ...prev,
                    [data.playerId]: data.name
                }));
            }
        });

        // Send our name when component mounts
        if (playerName) {
            socket.emit('setPlayerName', {
                name: playerName,
                sessionId: sessionId
            });
        }

        // Request active rooms immediately on component mount
        socket.emit('requestActiveRooms');

        // If we have a session ID, check if the server recognizes it
        if (sessionId) {
            socket.emit('checkSession', { sessionId });
        }

        // Set up interval to refresh rooms data every few seconds
        const refreshInterval = setInterval(() => {
            if (socket.connected) {
                socket.emit('requestActiveRooms');
            }
        }, 5000); // Refresh every 5 seconds

        return () => {
            socket.off('activeRooms');
            socket.off('error');
            socket.off('playerUpdate');
            clearInterval(refreshInterval); // Clean up interval on unmount
        };
    }, [socket.connected, playerName, sessionId]); // Re-run effect if socket connection or playerName changes

    const createRoom = () => {
        if (roomName.trim()) {
            socket.emit('createRoom', roomName.trim());
            setRoomName('');
        } else {
            setError('Please enter a room name');
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            createRoom();
        }
    };

    // Format player name
    const formatPlayerName = (playerId) => {
        return playerNames[playerId] || `Player ${playerId.substring(0, 6)}`;
    };

    // Helper to calculate time until room is deleted
    const getEmptyRoomStatus = (roomData) => {
        if (roomData.emptyingSince && (!roomData.players || roomData.players.length === 0)) {
            const emptyingSince = new Date(roomData.emptyingSince);
            const now = new Date();
            const diffSeconds = Math.floor((now - emptyingSince) / 1000);
            const remainingSeconds = 180 - diffSeconds; // 3 minutes (180 seconds) is the deletion timeout

            if (remainingSeconds <= 0) {
                return "Deleting soon...";
            } else {
                const minutes = Math.floor(remainingSeconds / 60);
                const seconds = remainingSeconds % 60;
                return `Empty - Deleting in ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            }
        }
        return null;
    };

    return (
        <div className="card room-list fade-in">
            <h2>Available Game Rooms</h2>
            {playerName && (
                <p style={{ marginBottom: '20px' }}>
                    Playing as: <strong>{playerName}</strong>
                </p>
            )}

            {error && (
                <div className="error-message" style={{ color: '#f44336', marginBottom: '15px' }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div className="loading">Loading available rooms...</div>
            ) : Object.keys(rooms).length === 0 ? (
                <p>No active rooms. Create one to start playing!</p>
            ) : (
                <div className="rooms-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                    {Object.entries(rooms).map(([roomName, roomData]) => {
                        const emptyRoomStatus = getEmptyRoomStatus(roomData);
                        const isEmpty = !roomData.players || roomData.players.length === 0;

                        return (
                            <div key={roomName} className={`room-card slide-in ${isEmpty ? 'empty-room' : ''}`} style={{
                                backgroundColor: '#1e1e1e',
                                padding: '15px',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                opacity: isEmpty ? 0.7 : 1
                            }}>
                                <h3>{roomName}</h3>
                                {isEmpty ? (
                                    <p style={{ color: '#ff9800' }}>{emptyRoomStatus}</p>
                                ) : (
                                    <p>Players: {roomData.users}</p>
                                )}
                                {roomData.currentWord && (
                                    <p>Current word: <strong>{roomData.currentWord}</strong></p>
                                )}
                                {roomData.gameStatus && (
                                    <p>Status: {roomData.gameStatus}</p>
                                )}
                                <button
                                    onClick={() => joinRoom(roomName)}
                                    disabled={false} // We still allow joining empty rooms
                                >
                                    {isEmpty ? "Reopen Room" :
                                        roomData.currentWord ? "Join Ongoing Game" : "Join Game"}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="create-room" style={{ marginTop: '30px' }}>
                <h3>Create New Room</h3>
                <div style={{ display: 'flex', gap: '10px', flexDirection: "column" }}>
                    <input
                        type="text"
                        placeholder="Enter room name"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        onKeyPress={handleKeyPress}
                        style={{ flexGrow: 1 }}
                    />
                    <button onClick={createRoom} className="accent">Create Room</button>
                </div>
            </div>
        </div>
    );
};

export default RoomList;