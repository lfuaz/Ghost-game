import React, { useEffect, useState, useRef } from 'react';
import Confetti from 'react-confetti';
import socket from '../socket';
import '../styles/game.scss';

const GameRoom = ({ room, leaveRoom, playerName, sessionId }) => {
    // Game state
    const [word, setWord] = useState('');
    const [letter, setLetter] = useState('');
    const [players, setPlayers] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [nextPlayer, setNextPlayer] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [gameMessage, setGameMessage] = useState(null);
    const [validityState, setValidityState] = useState({ isChecked: false, isValid: false });
    const [gameHistory, setGameHistory] = useState([]);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const [challenge, setChallengeState] = useState(null);
    const [challengeInput, setChallengeInput] = useState('');
    const [showConfetti, setShowConfetti] = useState(false);
    const [toast, setToast] = useState(null);
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });
    const [playerNames, setPlayerNames] = useState({}); // Store all player names
    const [readyStatus, setReadyStatus] = useState({});
    const [gameStarted, setGameStarted] = useState(false);
    const [amIReady, setAmIReady] = useState(false);
    const [startingMessage, setStartingMessage] = useState(null);

    // Refs
    const inputRef = useRef(null);

    // Focus on input when it's the player's turn
    useEffect(() => {
        if (isMyTurn && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isMyTurn]);

    // Update window size for confetti
    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // Join the room
        socket.emit('joinGame', room);

        // Always send our name when joining, even if we've sent it before
        if (playerName) {
            socket.emit('setPlayerName', {
                name: playerName,
                sessionId: sessionId // Add session ID
            });
        }

        // Listen for game updates
        socket.on('update', (data) => {
            console.log('Received update:', data); // Add logging for debugging

            // For new players joining, make sure to respect the order of updates
            const updateStateInSequence = () => {
                // Only update word if it's provided and defined (empty string is valid)
                if (data.word !== undefined) {
                    setWord(data.word);
                    console.log(`Word updated: "${data.word}"`);
                }

                if (data.validityState) {
                    setValidityState(data.validityState);
                }

                if (data.nextPlayer) {
                    setNextPlayer(data.nextPlayer);
                }

                if (data.currentPlayer !== undefined) {
                    setCurrentPlayer(data.currentPlayer);
                }

                // Reset challenge state when receiving general updates, unless preserveChallenge is true
                if (!data.preserveChallenge) {
                    setChallengeState(null);
                    setTimeLeft(null);
                }

                // Check if it's this player's turn
                const isMyTurnNow = data.nextPlayer === socket.id;
                console.log(`Is my turn: ${isMyTurnNow}, nextPlayer: ${data.nextPlayer}, myId: ${socket.id}`);
                setIsMyTurn(isMyTurnNow);
                setGameOver(false);
            };

            // Perform updates with a small delay to ensure state is properly set
            setTimeout(updateStateInSequence, 50);
        });

        // Request room information with a slight delay to ensure we've joined
        setTimeout(() => {
            socket.emit('requestActiveRooms');
            // Also request the current game state again to ensure we have it
            socket.emit('requestGameState', room);
        }, 200);

        // Listen for game over events
        socket.on('gameOver', (data) => {
            setWord(data.word);
            setValidityState(data.validityState || { isChecked: true, isValid: true });
            setGameOver(true);
            setGameMessage(data.message || `Game over! The word "${data.word}" is complete.`);

            // Add to history
            const newHistoryItem = {
                word: data.word,
                loser: data.loser,
                timestamp: new Date()
            };
            setGameHistory(prev => [newHistoryItem, ...prev]);

            // Reset after a delay
            setTimeout(() => {
                setWord('');
                setValidityState({ isChecked: false, isValid: false });
                setGameMessage(null);
                setIsMyTurn(false);
            }, 10000);
        });

        // Listen for challenge events
        socket.on('wordChallenge', (data) => {
            console.log('Challenge received:', data);

            // Make sure to cancel any existing timer
            if (window.challengeTimerInterval) {
                clearInterval(window.challengeTimerInterval);
            }

            setTimeLeft(10); // Start with 10 seconds
            setChallengeState(data);
            setLetter(''); // Clear the main letter input instead of using separate challengeInput

            // Update the current word when challenge starts
            if (data.word) {
                setWord(data.word);
            }

            // Start countdown timer only for the challenged player
            if (data.challengedPlayer === socket.id) {
                window.challengeTimerInterval = setInterval(() => {
                    setTimeLeft(prevTime => {
                        if (prevTime <= 1) {
                            clearInterval(window.challengeTimerInterval);
                            socket.emit('challengeResponse', {
                                roomId: room,
                                success: false,
                                timeExpired: true
                            });
                            return 0;
                        }
                        return prevTime - 1;
                    });
                }, 1000);
            }
        });

        // Listen for challenge results
        socket.on('challengeResult', (data) => {
            console.log('Challenge result:', data);

            // Clear any existing timer
            if (window.challengeTimerInterval) {
                clearInterval(window.challengeTimerInterval);
                setTimeLeft(null);
            }

            // Handle challenge success
            if (data.success) {
                // Update game message
                if (data.letter) {
                    setGameMessage(`${formatPlayerName(data.player)} added "${data.letter}" to continue the word!`);
                } else if (data.word) {
                    setGameMessage(`${formatPlayerName(data.player)} found a valid word: "${data.word}"!`);
                }

                // Update current word if provided
                if (data.word) {
                    setWord(data.word);
                }
            }
            // Handle challenge failure
            else {
                // Use the failure reason if provided
                if (data.failureReason) {
                    setGameMessage(data.failureReason);
                } else if (data.timeExpired) {
                    setGameMessage(`${formatPlayerName(data.player)} ran out of time!`);
                } else if (data.attemptedLetter) {
                    setGameMessage(`${formatPlayerName(data.player)}'s letter "${data.attemptedLetter}" doesn't work!`);
                } else {
                    setGameMessage(`${formatPlayerName(data.player)} couldn't continue the word!`);
                }

                // Only show confetti for the winner
                const amIWinner = data.winner === socket.id;
                if (amIWinner) {
                    console.log('I won! Showing confetti');
                    setShowConfetti(true);
                    setTimeout(() => setShowConfetti(false), 6000);
                }

                // Only show toast for the loser
                if (data.player === socket.id) {
                    let toastMessage = "You lost!";

                    if (data.timeExpired) {
                        toastMessage += " You ran out of time.";
                    } else if (data.attemptedLetter) {
                        toastMessage += ` Your letter "${data.attemptedLetter}" doesn't form a valid word.`;
                    } else {
                        toastMessage += " You couldn't find a valid continuation.";
                    }

                    setToast({
                        message: toastMessage,
                        type: "error"
                    });

                    setTimeout(() => setToast(null), 5000);
                }

                // Reset the word if a failure ends the challenge
                if (data.word !== undefined) {
                    setWord(data.word);
                }
            }

            // Reset challenge state only if it's a failed challenge
            if (!data.success) {
                setChallengeState(null);
                setChallengeInput('');
            }
        });

        // Listen for active rooms updates to get player information
        socket.on('activeRooms', (activeRooms) => {
            if (activeRooms[room]) {
                setPlayers(activeRooms[room].players || []);

                // Get game history if available
                if (activeRooms[room].gameHistory && activeRooms[room].gameHistory.length > 0) {
                    setGameHistory(activeRooms[room].gameHistory);
                }
            }
        });

        // Listen for surrender confirmations
        socket.on('surrenderConfirmed', (data) => {
            setGameMessage(`Player surrendered. The partial word was "${data.word}"`);
            setWord('');
            setValidityState({ isChecked: false, isValid: false });
            setGameOver(false);

            // After a short delay, clear the message
            setTimeout(() => {
                setGameMessage(null);
            }, 3000);
        });

        // Listen for player name updates - enhance logging to debug the issue
        socket.on('playerUpdate', (data) => {
            console.log('Received player name update:', data);
            if (data.playerId && data.name) {
                setPlayerNames(prev => {
                    const updated = {
                        ...prev,
                        [data.playerId]: data.name
                    };
                    console.log('Updated player names:', updated);
                    return updated;
                });
            }
        });

        // Listen for ready status updates
        socket.on('readyStatus', (data) => {
            console.log('Received ready status:', data); // Add logging for debugging
            setReadyStatus(data.readyPlayers || {});
            setGameStarted(data.gameStarted || false);

            // Update my ready status
            if (data.readyPlayers && socket.id in data.readyPlayers) {
                setAmIReady(data.readyPlayers[socket.id]);
            }

            // Log the current state
            const readyCount = Object.values(data.readyPlayers || {}).filter(r => r).length;
            const totalPlayers = Object.keys(data.readyPlayers || {}).length;
            console.log(`Game started: ${data.gameStarted}, Ready players: ${readyCount}/${totalPlayers}`);
        });

        // Listen for game starting notification with improved handling
        socket.on('gameStarting', (data) => {
            console.log('Game starting:', data);
            setStartingMessage(data.message);
            setGameStarted(true); // Explicitly set game started when receiving this event

            // Clear the message after a few seconds
            setTimeout(() => {
                setStartingMessage(null);
            }, 3000);
        });

        // Request room information
        socket.emit('requestActiveRooms');

        // Request current player information immediately after joining
        setTimeout(() => {
            // Request active rooms to get player list
            socket.emit('requestActiveRooms');

            // Request any known player names
            if (activeRooms && activeRooms[room] && activeRooms[room].players) {
                console.log('Requesting player names for room:', room);
                socket.emit('requestPlayerNames', { roomId: room });
            }
        }, 300);

        // Make sure we're not joining multiple times
        return () => {
            socket.off('update');
            socket.off('gameOver');
            socket.off('activeRooms');
            socket.off('surrenderConfirmed');
            socket.off('wordChallenge');
            socket.off('challengeResult');
            socket.off('playerUpdate');
            socket.off('readyStatus');
            socket.off('gameStarting');
            // Leave room when component unmounts
            socket.emit('leaveRoom', room);

            // Clear any running timers
            if (window.challengeTimerInterval) {
                clearInterval(window.challengeTimerInterval);
            }
        };
    }, [room, playerName, sessionId]); // Add sessionId to dependency array

    // Add a useEffect to ensure isMyTurn is correctly set whenever nextPlayer changes
    useEffect(() => {
        setIsMyTurn(nextPlayer === socket.id);
    }, [nextPlayer]);

    // Modify the handleAddLetter function to handle both normal and challenge modes
    const handleAddLetter = () => {
        if (!letter.trim() || gameOver) return;

        // Validate it's a single letter
        if (letter.length !== 1 || !/^[a-zA-Z]$/.test(letter)) {
            setGameMessage('Please enter a single letter');
            return;
        }

        const singleLetter = letter.toLowerCase().charAt(0);

        // If we're in a challenge state and it's our turn to be challenged
        if (challenge && challenge.challengedPlayer === socket.id) {
            // Clear timer
            if (window.challengeTimerInterval) {
                clearInterval(window.challengeTimerInterval);
            }

            console.log(`Submitting letter: ${singleLetter} for challenge`);

            socket.emit('challengeResponse', {
                roomId: room,
                success: true,
                letter: singleLetter
            });
        }
        // Regular game play
        else if (isMyTurn) {
            socket.emit('addLetter', {
                roomId: room,
                letter: singleLetter
            });
        }

        setLetter('');
    };

    const handleSurrender = () => {
        if (!isMyTurn || gameOver) return;

        if (window.confirm("Are you sure you want to surrender? This will reset the current word.")) {
            socket.emit('surrender', { roomId: room });
            setLetter('');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleAddLetter();
        }
    };

    // Improved ready toggle for better debugging
    const toggleReady = () => {
        console.log(`Toggling ready state. Current ready status: ${amIReady}`);
        socket.emit('toggleReady', { roomId: room });
    };

    // Format player display name - updated to use the playerNames state
    const formatPlayerName = (id) => {
        if (!id) return 'Waiting...';

        // First, check if we have the name in our playerNames state
        if (playerNames[id]) {
            return id === socket.id ? `You (${playerNames[id]})` : playerNames[id];
        }

        // Fallback to using the current player's name for the current socket
        if (id === socket.id && playerName) {
            return `You (${playerName})`;
        }

        // Final fallback to socket ID prefix
        const shortId = id.substring(0, 6);
        return id === socket.id ? `You (${shortId})` : `Player ${shortId}`;
    };

    // Render players with their ready status
    const renderPlayersList = () => {
        // Filter out duplicate players if any
        const uniquePlayers = [...new Set(players)];

        return uniquePlayers.map((playerId) => (
            <div
                key={playerId}
                className={`player-card ${(nextPlayer === playerId) ? 'current-turn' : ''}`}
            >
                <div className="player-info">
                    <span className="player-name">{formatPlayerName(playerId)}</span>
                    <span className="turn-status">
                        {nextPlayer === playerId ? '(Current Turn)' : ''}
                    </span>
                </div>
                <div className="ready-status">
                    {readyStatus[playerId] ?
                        <span className="ready-badge">READY</span> :
                        <span className="not-ready-badge">NOT READY</span>
                    }
                </div>
            </div>
        ));
    };

    // Get validity status text
    const getValidityText = () => {
        if (!validityState.isChecked) return "Not enough letters to check";
        return validityState.isValid ? "Valid word!" : "Not yet a valid word";
    };

    // Get validity class
    const getValidityClass = () => {
        if (!validityState.isChecked) return "unchecked";
        return validityState.isValid ? "valid" : "invalid";
    };

    // Format timestamp
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Get history item text based on whether it was a surrender or normal loss
    const getHistoryItemText = (item) => {
        if (item.isSurrender) {
            return `${formatPlayerName(item.loser)} surrendered with partial word: "${item.word}"`;
        } else {
            return (
                <>
                    Word: <span className="word">{item.word}</span> - Lost by: <span className="loser">{formatPlayerName(item.loser)}</span>
                </>
            );
        }
    };

    // Toast component
    const Toast = ({ message, type }) => (
        <div
            className={`toast ${type}`}
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                padding: '16px 24px',
                borderRadius: '8px',
                color: 'white',
                backgroundColor: type === 'error' ? '#f44336' : '#4caf50',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                zIndex: 1000,
                animation: 'slideIn 0.3s ease-out forwards',
                maxWidth: '350px',
            }}
        >
            {message}
        </div>
    );

    return (
        <div className="game-room">
            {/* Confetti celebration for winner */}
            {showConfetti && (
                <Confetti
                    width={windowSize.width}
                    height={windowSize.height}
                    recycle={false}
                    numberOfPieces={500}
                    colors={['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3']}
                />
            )}

            {/* Toast notification */}
            {toast && <Toast message={toast.message} type={toast.type} />}

            <div className="game-header">
                <div className="room-info">
                    <h2>Room: {room}</h2>
                </div>
                <button className="leave-room" onClick={leaveRoom}>
                    Leave Room
                </button>
            </div>

            {startingMessage && (
                <div className="game-starting-message" style={{
                    background: '#4caf50',
                    color: 'white',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    animation: 'pulse 1s infinite'
                }}>
                    {startingMessage}
                </div>
            )}

            {!gameStarted ? (
                <div className="lobby-container" style={{
                    backgroundColor: '#1e1e1e',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <h3>Waiting for all players to be ready</h3>
                    <p>The game will start when all players are ready (minimum 2 players).</p>

                    {/* Show current ready status count */}
                    <div style={{ margin: '10px 0', fontSize: '16px' }}>
                        <strong>Ready Players: </strong>
                        {Object.values(readyStatus).filter(status => status).length} / {Object.keys(readyStatus).length}
                    </div>

                    <button
                        onClick={toggleReady}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: amIReady ? '#f44336' : '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '16px',
                            marginTop: '20px',
                            cursor: 'pointer',
                            transition: 'background-color 0.3s'
                        }}
                    >
                        {amIReady ? 'Not Ready' : 'Ready'}
                    </button>
                </div>
            ) : (
                <div className="current-word-display">
                    <h3>Current Word</h3>
                    <div className={`word ${validityState.isValid ? 'valid' : 'invalid'}`}>
                        {word || "---"}
                    </div>
                    <div className={`word-validity ${getValidityClass()}`}>
                        {getValidityText()}
                        {validityState.isValid && !challenge && (
                            <span style={{ marginLeft: '10px', fontStyle: 'italic' }}>
                                (Valid words can be extended!)
                            </span>
                        )}
                    </div>

                    {challenge && challenge.challengedPlayer === socket.id && (
                        <div className="challenge-container" style={{
                            marginTop: '15px',
                            padding: '15px',
                            backgroundColor: '#673ab7',
                            borderRadius: '8px',
                            color: 'white'
                        }}>
                            <p><strong>CHALLENGE:</strong> Add a letter to "<span style={{ fontWeight: 'bold' }}>{challenge.word}</span>" to continue the word</p>
                            <div style={{
                                marginTop: '10px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: timeLeft <= 3 ? '#f44336' : timeLeft <= 6 ? '#ff9800' : '#4caf50',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    color: 'white'
                                }}>
                                    {timeLeft}
                                </div>
                                <p style={{ margin: 0 }}>seconds remaining</p>
                            </div>
                        </div>
                    )}

                    {challenge && challenge.challengedPlayer !== socket.id && (
                        <div className="challenge-container" style={{
                            marginTop: '15px',
                            padding: '15px',
                            backgroundColor: '#2196f3',
                            borderRadius: '8px',
                            color: 'white'
                        }}>
                            <p>{formatPlayerName(challenge.challengedPlayer)} is being challenged to add a letter to "<span style={{ fontWeight: 'bold' }}>{challenge.word}</span>"</p>
                            <p>Time remaining: {timeLeft}s</p>
                        </div>
                    )}
                </div>
            )}

            {!gameStarted && gameMessage && (
                <div className="game-message" style={{
                    background: '#673ab7',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    {gameMessage}
                </div>
            )}

            <div className="players-section">
                <h3>Players</h3>
                <div className="players-list" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    {renderPlayersList()}
                </div>
            </div>

            {/* Only show game UI elements if game has started */}
            {gameStarted && (
                <>
                    {/* Game message */}
                    {gameMessage && (
                        <div className="game-message" style={{
                            background: '#673ab7',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            {gameMessage}
                        </div>
                    )}

                    {/* Input section */}
                    <div className="input-section">
                        <input
                            ref={inputRef}
                            type="text"
                            maxLength={1}
                            value={letter}
                            onChange={(e) => setLetter(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={
                                challenge && challenge.challengedPlayer === socket.id
                                    ? "Enter letter to continue word"
                                    : isMyTurn ? "Your turn" : "Wait..."
                            }
                            disabled={
                                (!isMyTurn && !(challenge && challenge.challengedPlayer === socket.id)) ||
                                gameOver
                            }
                            className="letter-input"
                            autoFocus={isMyTurn || (challenge && challenge.challengedPlayer === socket.id)}
                        />
                        <button
                            onClick={handleAddLetter}
                            disabled={
                                (!letter) ||
                                (!(challenge && challenge.challengedPlayer === socket.id) && !isMyTurn) ||
                                gameOver
                            }
                            className={`add-letter-btn ${(!letter || (!(challenge && challenge.challengedPlayer === socket.id) && !isMyTurn) || gameOver)
                                ? 'disabled' : ''
                                }`}
                        >
                            {challenge && challenge.challengedPlayer === socket.id ? "Submit" : "Add Letter"}
                        </button>
                        {isMyTurn && word && !gameOver && !challenge && (
                            <button
                                onClick={handleSurrender}
                                className="surrender-btn"
                                style={{
                                    marginLeft: '10px',
                                    backgroundColor: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 15px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Surrender
                            </button>
                        )}
                    </div>

                    {/* Game history */}
                    {gameHistory.length > 0 && (
                        <div className="game-history card">
                            <h3>Game History</h3>
                            <div className="history-list">
                                {gameHistory.map((item, index) => (
                                    <div key={index} className="history-item" style={{
                                        backgroundColor: item.isSurrender ? 'rgba(244, 67, 54, 0.1)' : 'inherit'
                                    }}>
                                        <div>
                                            {getHistoryItemText(item)}
                                        </div>
                                        <span className="timestamp">{formatTime(item.timestamp)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default GameRoom;