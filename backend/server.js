require("dotenv").config(); // Load environment variables

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");
const NodeCache = require("node-cache");
const path = require("path");
const morgan = require("morgan"); // Import morgan for logging

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const cache = new NodeCache({ stdTTL: 86400 }); // Cache with a 24-hour TTL

const TEXTGEARS_API_KEY = process.env.TEXTGEARS_API_KEY; // API key from environment variables
const port = process.env.PORT || 3000; // Port from environment variables or default to 3000

// Middleware to serve static files
app.use(express.static(path.join(__dirname, "dist")));

// Middleware for HTTP request logging
app.use(morgan("tiny")); // Using 'tiny' format for concise logs

// Function to check if a word is valid using the TextGears API
async function isValidWord(word) {
  // Check if the word is in the cache
  if (cache.has(word)) {
    return cache.get(word);
  }
  try {
    console.log(`Checking word validity for: "${word}"`);
    const response = await axios.post(
      "https://textgears-textgears-v1.p.rapidapi.com/spelling",
      `text=${encodeURIComponent(word)}&language=fr-FR`,
      {
        headers: {
          "x-rapidapi-key": TEXTGEARS_API_KEY,
          "x-rapidapi-host": "textgears-textgears-v1.p.rapidapi.com",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    // Log the response for debugging
    console.log(`API response for "${word}":`, JSON.stringify(response.data));

    // Check if response has the expected structure
    if (
      response.data &&
      response.data.response &&
      response.data.response.errors !== undefined
    ) {
      // Format: { status: true, response: { result: true, errors: [] } }
      const isValid = response.data.response.errors.length === 0;
      console.log(`Word "${word}" is ${isValid ? "valid" : "invalid"}`);
      cache.set(word, isValid);
      return isValid;
    } else if (response.data && response.data.errors !== undefined) {
      // Original format we were checking
      const isValid = response.data.errors.length === 0;
      console.log(`Word "${word}" is ${isValid ? "valid" : "invalid"}`);
      cache.set(word, isValid);
      return isValid;
    } else if (response.data && response.data.status === true) {
      // If status is true but we can't find errors array, assume valid
      console.log(`Word "${word}" is assumed valid (status: true)`);
      cache.set(word, true);
      return true;
    } else {
      console.warn(
        `Unexpected API response format for word "${word}"`,
        response.data
      );
      return false; // Assume invalid if response format is unexpected
    }
  } catch (error) {
    console.error("Error checking word validity:", error.message);
    if (error.response) {
      console.error("API error response:", JSON.stringify(error.response.data));
    }
    return false;
  }
}

// Helper function to check if a word can form a valid word by adding more letters
async function checkWordContinuation(word) {
  try {
    // First check if the word is already valid (this could happen with longer words)
    if (word.length >= 3) {
      const isValid = await isValidWord(word);
      if (isValid) {
        return true;
      }
    }

    // For checking if the word could potentially be continued to form a valid word,
    // we need to have some heuristic or dictionary check.
    // Since we're using a remote API for validation and don't have a local dictionary,
    // we'll use a simplified approach:

    // 1. Words under 6 characters are likely to be prefixes of valid words
    if (word.length <= 6) {
      return true;
    }

    // 2. Check common prefixes in French
    const commonFrenchPrefixes = [
      "ab",
      "ac",
      "ad",
      "af",
      "ag",
      "al",
      "am",
      "an",
      "ap",
      "ar",
      "as",
      "at",
      "au",
      "av",
      "be",
      "bi",
      "bl",
      "bo",
      "br",
      "ca",
      "ce",
      "ch",
      "ci",
      "cl",
      "co",
      "cr",
      "cu",
      "de",
      "dé",
      "di",
      "do",
      "du",
      "éc",
      "ef",
      "ég",
      "el",
      "em",
      "en",
      "ep",
      "ér",
      "es",
      "et",
      "eu",
      "ex",
      "fa",
      "fe",
      "fi",
      "fl",
      "fo",
      "fr",
      "ga",
      "ge",
      "gl",
      "gr",
      "gu",
      "ha",
      "hé",
      "hi",
      "ho",
      "hu",
      "hy",
      "id",
      "im",
      "in",
      "ir",
      "je",
      "jo",
      "ju",
      "la",
      "le",
      "li",
      "lo",
      "lu",
      "ma",
      "mé",
      "mi",
      "mo",
      "mu",
      "na",
      "né",
      "ni",
      "no",
      "nu",
      "ob",
      "oc",
      "om",
      "op",
      "or",
      "ou",
      "pa",
      "pé",
      "ph",
      "pi",
      "pl",
      "po",
      "pr",
      "ps",
      "qu",
      "ra",
      "ré",
      "ri",
      "ro",
      "ru",
      "sa",
      "sc",
      "se",
      "si",
      "so",
      "sp",
      "st",
      "su",
      "sy",
      "ta",
      "te",
      "th",
      "ti",
      "to",
      "tr",
      "tu",
      "ul",
      "un",
      "ur",
      "va",
      "vé",
      "vi",
      "vo",
    ];

    for (const prefix of commonFrenchPrefixes) {
      if (word.startsWith(prefix)) {
        return true;
      }
    }

    // 3. Common letter patterns that often appear in French words
    const commonLetterPatterns = [
      "eur",
      "ion",
      "ment",
      "able",
      "ique",
      "iste",
      "aire",
      "isme",
    ];

    for (const pattern of commonLetterPatterns) {
      if (word.includes(pattern)) {
        return true;
      }
    }

    // 4. Words ending with vowels can often be continued
    const endsWithVowel = /[aeiouy]$/i.test(word);
    if (endsWithVowel) {
      return true;
    }

    // If all checks fail, we need to be more permissive for gameplay
    // For now, to avoid frustration, we'll allow most words to be continued
    // In a production app, this would be replaced with a proper dictionary check
    console.log(
      `Allowing continuation for word: ${word} based on default permissiveness`
    );
    return word.length < 10; // Allow continuation for words up to 10 letters
  } catch (error) {
    console.error("Error in checkWordContinuation:", error);
    // In case of error, be permissive to not block gameplay
    return true;
  }
}

let activeRooms = {}; // Object to track active rooms and their user counts
let emptyRoomsTimestamps = {}; // Track when rooms become empty

// Modify the player name mapping to use both socket ID and session ID
let playerNames = {}; // Map socketId -> playerName
let playerSessions = {}; // Map sessionId -> playerName
let socketToSession = {}; // Map socketId -> sessionId

// Room cleanup function - runs periodically to delete empty rooms after 3 minutes
const ROOM_CLEANUP_INTERVAL = 30000; // Check every 30 seconds
const ROOM_EXPIRY_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds

function cleanupEmptyRooms() {
  const now = Date.now();
  let roomsRemoved = 0;

  for (const roomName in emptyRoomsTimestamps) {
    const emptyTimestamp = emptyRoomsTimestamps[roomName];

    // If the room has been empty for over 3 minutes, remove it
    if (now - emptyTimestamp > ROOM_EXPIRY_TIMEOUT) {
      // Double check that the room is actually still empty before deleting
      if (
        activeRooms[roomName] &&
        (!activeRooms[roomName].players ||
          activeRooms[roomName].players.length === 0)
      ) {
        console.log(
          `Auto-removing inactive empty room: ${roomName} (empty for ${Math.round(
            (now - emptyTimestamp) / 1000
          )}s)`
        );
        delete activeRooms[roomName];
        delete emptyRoomsTimestamps[roomName];
        roomsRemoved++;
      } else {
        // Room is not empty anymore or doesn't exist, remove from empty tracking
        delete emptyRoomsTimestamps[roomName];
      }
    }
  }

  if (roomsRemoved > 0) {
    // Notify all connected clients about the updated room list
    io.emit("activeRooms", activeRooms);
  }
}

// Start the room cleanup interval
const cleanupInterval = setInterval(cleanupEmptyRooms, ROOM_CLEANUP_INTERVAL);

io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Handle setting player name with improved session handling
  socket.on("setPlayerName", ({ name, sessionId }) => {
    if (name && typeof name === "string" && name.trim().length > 0) {
      const sanitizedName = name.trim().slice(0, 15);

      // Store player name indexed by socket ID
      playerNames[socket.id] = sanitizedName;

      // If we have a session ID, store it too
      if (sessionId) {
        playerSessions[sessionId] = sanitizedName;
        socketToSession[socket.id] = sessionId;
      }

      console.log(
        `Player ${socket.id} set name to: ${sanitizedName}, Session ID: ${
          sessionId || "none"
        }`
      );

      // Notify all rooms this player is in about the name change
      for (const roomName of Object.keys(activeRooms)) {
        if (
          activeRooms[roomName].players &&
          activeRooms[roomName].players.includes(socket.id)
        ) {
          io.to(roomName).emit("playerUpdate", {
            playerId: socket.id,
            name: sanitizedName,
          });
        }
      }
    }
  });

  // Check for existing session on connection
  socket.on("checkSession", ({ sessionId }) => {
    if (sessionId && playerSessions[sessionId]) {
      // Player reconnecting with the same session
      const existingName = playerSessions[sessionId];
      playerNames[socket.id] = existingName;
      socketToSession[socket.id] = sessionId;

      console.log(
        `Player ${socket.id} reconnected with session ${sessionId}, name: ${existingName}`
      );

      socket.emit("sessionRestored", {
        name: existingName,
        success: true,
      });
    } else {
      socket.emit("sessionRestored", {
        success: false,
      });
    }
  });

  // Send the list of active rooms to the newly connected user
  socket.emit("activeRooms", activeRooms);

  // Handle request for active rooms
  socket.on("requestActiveRooms", () => {
    socket.emit("activeRooms", activeRooms);
  });

  // Handle requests for current game state
  socket.on("requestGameState", (roomId) => {
    if (!activeRooms[roomId]) {
      socket.emit("error", "Room does not exist.");
      return;
    }

    // Send the current game state to the requesting player
    socket.emit("update", {
      word: activeRooms[roomId].currentWord || "",
      nextPlayer: activeRooms[roomId].currentPlayer,
      validityState: activeRooms[roomId].validityState || {
        isChecked: false,
        isValid: false,
      },
      currentPlayer: null,
      preserveChallenge: true, // Don't reset challenge state
    });

    // If there's an active challenge, also send that
    if (activeRooms[roomId].currentChallenge) {
      socket.emit("wordChallenge", {
        word: activeRooms[roomId].currentChallenge.word,
        challengingPlayer:
          activeRooms[roomId].currentChallenge.challengingPlayer,
        challengedPlayer: activeRooms[roomId].currentChallenge.challengedPlayer,
      });
    }
  });

  // Handle room creation
  socket.on("createRoom", (roomName) => {
    if (activeRooms[roomName]) {
      socket.emit("error", "Room already exists.");
      return;
    }
    socket.join(roomName);
    // Initialize room with one user and empty word
    activeRooms[roomName] = {
      users: 1,
      currentWord: "",
      players: [socket.id],
      readyPlayers: {}, // Track ready status of players
      gameStarted: false, // Track if game has started
    };

    // Set creator as not ready by default
    activeRooms[roomName].readyPlayers[socket.id] = false;

    // Notify all users about the new room - both with updated list and specific notification
    io.emit("activeRooms", activeRooms);
    io.emit("roomCreated", { roomName, creator: socket.id });
    console.log(`Room created: ${roomName}`);
  });

  // Handle joining a room
  socket.on("joinRoom", (roomName) => {
    if (activeRooms[roomName] !== undefined) {
      socket.join(roomName);

      // Check if player is already in the room
      if (!activeRooms[roomName].players.includes(socket.id)) {
        activeRooms[roomName].users++;
        activeRooms[roomName].players.push(socket.id);

        // Send player name to everyone in the room if we have it
        if (playerNames[socket.id]) {
          io.to(roomName).emit("playerUpdate", {
            playerId: socket.id,
            name: playerNames[socket.id],
          });
        }

        // Notify all users about the updated room list
        io.emit("activeRooms", activeRooms);
        console.log(`User ${socket.id} joined room: ${roomName}`);
      } else {
        console.log(`User ${socket.id} already in room: ${roomName}`);
      }
    } else {
      socket.emit("error", "Room does not exist.");
    }
  });

  // Handle joining a game (alternative room join event)
  socket.on("joinGame", (roomName) => {
    if (activeRooms[roomName] !== undefined) {
      socket.join(roomName);

      // Check if player is already in the room
      if (!activeRooms[roomName].players.includes(socket.id)) {
        // If this room was previously empty, remove from empty tracking
        if (emptyRoomsTimestamps[roomName]) {
          console.log(
            `Room ${roomName} is no longer empty, removing cleanup timer`
          );
          delete emptyRoomsTimestamps[roomName];
          delete activeRooms[roomName].emptyingSince;
        }

        activeRooms[roomName].users++;
        activeRooms[roomName].players.push(socket.id);

        // Set new player as not ready by default
        if (!activeRooms[roomName].readyPlayers) {
          activeRooms[roomName].readyPlayers = {};
        }
        activeRooms[roomName].readyPlayers[socket.id] = false;

        // Initialize the game state if it's the first player or no current player is set
        if (
          !activeRooms[roomName].currentPlayer &&
          activeRooms[roomName].players.length > 0
        ) {
          // Randomly select the first player to start
          const randomIndex = Math.floor(
            Math.random() * activeRooms[roomName].players.length
          );
          const firstPlayerId = activeRooms[roomName].players[randomIndex];

          // Broadcast the initial game state to all players in the room
          io.to(roomName).emit("update", {
            word: activeRooms[roomName].currentWord || "",
            nextPlayer: firstPlayerId,
            validityState: { isChecked: false, isValid: false },
            currentPlayer: null,
          });
        } else {
          // Send the current game state to the new player
          socket.emit("update", {
            word: activeRooms[roomName].currentWord || "",
            nextPlayer: activeRooms[roomName].currentPlayer,
            validityState: activeRooms[roomName].validityState || {
              isChecked: false,
              isValid: false,
            },
            currentPlayer: null,
            preserveChallenge: true, // Don't reset challenge state
          });
        }

        // FIX: Send all existing player names to the new player
        activeRooms[roomName].players.forEach((playerId) => {
          if (playerId !== socket.id && playerNames[playerId]) {
            // Send each existing player's name to the new player
            socket.emit("playerUpdate", {
              playerId: playerId,
              name: playerNames[playerId],
            });
          }
        });

        // Notify all users about the updated room list
        io.emit("activeRooms", activeRooms);
        console.log(`User ${socket.id} joined game: ${roomName}`);
      } else {
        console.log(`User ${socket.id} already in game: ${roomName}`);

        // Re-send the current game state to the reconnected player
        socket.emit("update", {
          word: activeRooms[roomName].currentWord || "",
          nextPlayer:
            activeRooms[roomName].currentPlayer ||
            activeRooms[roomName].players[0],
          validityState: activeRooms[roomName].validityState || {
            isChecked: false,
            isValid: false,
          },
          currentPlayer: null,
          preserveChallenge: true, // Don't reset challenge state
        });

        // If there's an active challenge, also send that
        if (activeRooms[roomName].currentChallenge) {
          socket.emit("wordChallenge", {
            word: activeRooms[roomName].currentChallenge.word,
            challengingPlayer:
              activeRooms[roomName].currentChallenge.challengingPlayer,
            challengedPlayer:
              activeRooms[roomName].currentChallenge.challengedPlayer,
          });
        }

        // FIX: Send all existing player names to the reconnected player
        activeRooms[roomName].players.forEach((playerId) => {
          if (playerId !== socket.id && playerNames[playerId]) {
            // Send each existing player's name to the reconnected player
            socket.emit("playerUpdate", {
              playerId: playerId,
              name: playerNames[playerId],
            });
          }
        });
      }
    } else {
      socket.emit("error", "Room does not exist.");
      return;
    }

    // If player is already in the room or joining newly,
    // send their name to everyone in the room if it exists
    if (playerNames[socket.id]) {
      io.to(roomName).emit("playerUpdate", {
        playerId: socket.id,
        name: playerNames[socket.id],
      });
    }

    // Send the ready status to all players in the room
    io.to(roomName).emit("readyStatus", {
      readyPlayers: activeRooms[roomName].readyPlayers,
      gameStarted: activeRooms[roomName].gameStarted || false,
    });
  });

  // New handler to request all player names in a room
  socket.on("requestPlayerNames", ({ roomId }) => {
    if (!activeRooms[roomId]) {
      return;
    }

    console.log(
      `Player ${socket.id} requested all player names in room ${roomId}`
    );

    // Send all existing player names to the requesting player
    activeRooms[roomId].players.forEach((playerId) => {
      if (playerNames[playerId]) {
        socket.emit("playerUpdate", {
          playerId: playerId,
          name: playerNames[playerId],
        });
      }
    });
  });

  // Enhance the setPlayerName event to broadcast new name to all rooms
  socket.on("setPlayerName", ({ name, sessionId }) => {
    if (name && typeof name === "string" && name.trim().length > 0) {
      const sanitizedName = name.trim().slice(0, 15);

      // Store player name indexed by socket ID
      playerNames[socket.id] = sanitizedName;

      // If we have a session ID, store it too
      if (sessionId) {
        playerSessions[sessionId] = sanitizedName;
        socketToSession[socket.id] = sessionId;
      }

      console.log(
        `Player ${socket.id} set name to: ${sanitizedName}, Session ID: ${
          sessionId || "none"
        }`
      );

      // Find all rooms this player is in and notify everyone
      const roomsPlayerIsIn = [];
      for (const roomName of Object.keys(activeRooms)) {
        if (
          activeRooms[roomName].players &&
          activeRooms[roomName].players.includes(socket.id)
        ) {
          roomsPlayerIsIn.push(roomName);
          io.to(roomName).emit("playerUpdate", {
            playerId: socket.id,
            name: sanitizedName,
          });
        }
      }

      console.log(
        `Broadcast name update to rooms: ${
          roomsPlayerIsIn.join(", ") || "none"
        }`
      );
    }
  });

  // Handle leaving a room
  socket.on("leaveRoom", (roomName) => {
    if (activeRooms[roomName] !== undefined) {
      socket.leave(roomName);

      // Debug the room state before changes
      console.log(`Before user leaves - Room ${roomName} state:`, {
        users: activeRooms[roomName].users,
        players: activeRooms[roomName].players?.length || 0,
      });

      // Make sure users count is actually numeric and properly maintained
      if (typeof activeRooms[roomName].users !== "number") {
        activeRooms[roomName].users =
          activeRooms[roomName].players?.length || 0;
      }

      // Decrement the user count only if the user is actually in the players list
      const playerIndex =
        activeRooms[roomName].players?.indexOf(socket.id) ?? -1;
      if (playerIndex !== -1) {
        activeRooms[roomName].users = Math.max(
          0,
          activeRooms[roomName].users - 1
        );
        activeRooms[roomName].players.splice(playerIndex, 1);

        if (activeRooms[roomName].readyPlayers) {
          delete activeRooms[roomName].readyPlayers[socket.id];
        }
      }

      // Debug the room state after changes
      console.log(`After user leaves - Room ${roomName} state:`, {
        users: activeRooms[roomName].users,
        players: activeRooms[roomName].players?.length || 0,
      });

      // Check if the room is now empty
      const roomIsEmpty =
        !activeRooms[roomName].players ||
        activeRooms[roomName].players.length === 0;

      if (roomIsEmpty) {
        // Instead of immediately deleting, set a timestamp for later cleanup
        emptyRoomsTimestamps[roomName] = Date.now();
        console.log(
          `Room ${roomName} is now empty, marked for cleanup in 3 minutes`
        );

        // Reset game state in case someone joins later
        if (activeRooms[roomName]) {
          activeRooms[roomName].gameStarted = false;
          activeRooms[roomName].currentWord = "";
          activeRooms[roomName].readyPlayers = {};
          // Keep the room in activeRooms but mark its state for potential new players
          activeRooms[roomName].emptyingSince = new Date().toISOString();
        }
      } else {
        // Room is not empty, make sure it's not marked for cleanup
        delete emptyRoomsTimestamps[roomName];
      }

      // Notify all users about the updated room list
      io.emit("activeRooms", activeRooms);
      console.log(`User ${socket.id} left room: ${roomName}`);

      // If players are left, send updated ready status
      if (!roomIsEmpty && activeRooms[roomName]) {
        io.to(roomName).emit("readyStatus", {
          readyPlayers: activeRooms[roomName].readyPlayers || {},
          gameStarted: activeRooms[roomName].gameStarted || false,
        });
      }
    } else {
      console.log(
        `User ${socket.id} tried to leave non-existent room: ${roomName}`
      );
    }
  });

  // Handle adding a letter to the current word
  socket.on("addLetter", async ({ roomId, letter }) => {
    // Use roomId parameter instead of roomName
    if (!activeRooms[roomId]) {
      socket.emit("error", "Room does not exist.");
      return;
    }

    // Get the current word for the room
    let currentWord = activeRooms[roomId].currentWord || "";

    // Add the new letter
    currentWord += letter;
    activeRooms[roomId].currentWord = currentWord;

    // Default validity state (not checked for words under 3 letters)
    let wordValidityState = { isChecked: false, isValid: false };

    // Only check word validity if we have at least 3 letters
    if (currentWord.length >= 3) {
      const isWordValid = await isValidWord(currentWord);
      wordValidityState = { isChecked: true, isValid: isWordValid };

      // In Ghost game, when a valid word is formed, start the challenge
      if (isWordValid) {
        // Get the index of the current player
        const currentPlayerIndex = activeRooms[roomId].players.indexOf(
          socket.id
        );
        // Determine the next player to be challenged
        const nextPlayerIndex =
          (currentPlayerIndex + 1) % activeRooms[roomId].players.length;
        const challengedPlayerId = activeRooms[roomId].players[nextPlayerIndex];

        // Set up the challenge
        activeRooms[roomId].currentChallenge = {
          word: currentWord,
          validWord: isWordValid,
          challengingPlayer: socket.id,
          challengedPlayer: challengedPlayerId,
          startTime: Date.now(),
          timeLimit: 10000, // 10 seconds
        };

        // Notify all players about the challenge
        io.to(roomId).emit("wordChallenge", {
          word: currentWord,
          challengingPlayer: socket.id,
          challengedPlayer: challengedPlayerId,
        });

        console.log(
          `Challenge started in room ${roomId}: ${socket.id} challenging ${challengedPlayerId} with word "${currentWord}"`
        );
        return;
      }
    }

    // Get the index of the current player
    const currentPlayerIndex = activeRooms[roomId].players.indexOf(socket.id);
    // Determine the next player
    const nextPlayerIndex =
      (currentPlayerIndex + 1) % activeRooms[roomId].players.length;
    const nextPlayerId = activeRooms[roomId].players[nextPlayerIndex];

    // Store current player for reconnection handling
    activeRooms[roomId].currentPlayer = nextPlayerId;

    // Store the current validity state for new players
    activeRooms[roomId].validityState = wordValidityState;

    // If word is not a complete valid word, continue the game
    io.to(roomId).emit("update", {
      word: currentWord,
      nextPlayer: nextPlayerId,
      validityState: wordValidityState,
      currentPlayer: socket.id,
    });
  });

  // Handle challenge responses - consolidate both handlers into one
  socket.on(
    "challengeResponse",
    async ({ roomId, success, letter, word, timeExpired = false }) => {
      if (!activeRooms[roomId] || !activeRooms[roomId].currentChallenge) {
        return;
      }

      const challenge = activeRooms[roomId].currentChallenge;

      // Verify this is the challenged player
      if (challenge.challengedPlayer !== socket.id) {
        return;
      }

      // Handle case when player responds with a letter (new-style challenge)
      if (success && letter) {
        // The player provides a single letter to add to the word
        const challengeWord = challenge.word;
        const newWord = challengeWord + letter;

        console.log(`Checking continuation for word: "${newWord}"`);

        try {
          // Check if the new word forms a valid word or prefix
          const isValidContinuation = await checkWordContinuation(newWord);

          if (isValidContinuation) {
            // Success - challenged player found a valid continuation

            // Update the current word first
            activeRooms[roomId].currentWord = newWord;

            // Notify all players with updated word
            io.to(roomId).emit("challengeResult", {
              success: true,
              player: socket.id,
              word: newWord,
              letter: letter,
            });

            // Now the original challenger becomes the challenged player
            const originalChallenger = challenge.challengingPlayer;

            // Set up the next challenge
            activeRooms[roomId].currentChallenge = {
              word: newWord, // Make sure we're using the updated word
              validWord: await isValidWord(newWord),
              challengingPlayer: socket.id,
              challengedPlayer: originalChallenger,
              startTime: Date.now(),
              timeLimit: 10000, // 10 seconds
            };

            // Continue the challenge chain
            setTimeout(() => {
              io.to(roomId).emit("wordChallenge", {
                word: newWord, // Make sure we're sending the updated word
                challengingPlayer: socket.id,
                challengedPlayer: originalChallenger,
              });
            }, 1500); // Short delay before next challenge

            console.log(
              `Challenge continues in room ${roomId}: ${socket.id} now challenging ${originalChallenger} with word "${newWord}"`
            );
          } else {
            // Failure - the letter doesn't form a valid word continuation
            handleFailedChallenge(roomId, socket.id, challenge, false, letter);
          }
        } catch (error) {
          console.error("Error handling challenge response:", error);
          // In case of error, be more forgiving to the player
          io.to(roomId).emit("challengeResult", {
            success: true,
            player: socket.id,
            word: newWord,
            letter: letter,
            note: "Server validation issue - giving benefit of the doubt",
          });

          // Continue game with the new letter
          activeRooms[roomId].currentWord = newWord;

          // Reset challenge for a new round
          delete activeRooms[roomId].currentChallenge;

          // Continue normal gameplay
          const nextPlayerIndex =
            (activeRooms[roomId].players.indexOf(socket.id) + 1) %
            activeRooms[roomId].players.length;
          const nextPlayerId = activeRooms[roomId].players[nextPlayerIndex];

          setTimeout(() => {
            io.to(roomId).emit("update", {
              word: newWord,
              nextPlayer: nextPlayerId,
              validityState: { isChecked: true, isValid: false }, // Assume it's not yet a valid complete word
              currentPlayer: socket.id,
            });
          }, 1500);
        }
      }
      // Handle case when player responds with a word (old-style challenge)
      else if (success && word) {
        // Verify the submitted word is valid and starts with the challenge word
        const isValidResponse = await isValidWord(word);
        const startsWithChallengeWord = word.startsWith(challenge.word);

        if (
          isValidResponse &&
          startsWithChallengeWord &&
          word !== challenge.word
        ) {
          // Success - challenged player found a valid word
          io.to(roomId).emit("challengeResult", {
            success: true,
            player: socket.id,
            word: word,
            winner: socket.id,
          });

          // The challenging player (who formed a valid word) loses
          if (!activeRooms[roomId].gameHistory) {
            activeRooms[roomId].gameHistory = [];
          }

          activeRooms[roomId].gameHistory.push({
            word: challenge.word,
            loser: challenge.challengingPlayer,
            winner: socket.id,
            timestamp: new Date(),
            challengeWord: word,
          });

          // Reset the game for a new round, next player is the winner of the challenge
          activeRooms[roomId].currentWord = "";
          activeRooms[roomId].currentPlayer = socket.id;
          delete activeRooms[roomId].currentChallenge;

          // Start a new round
          setTimeout(() => {
            io.to(roomId).emit("update", {
              word: "",
              nextPlayer: socket.id,
              validityState: { isChecked: false, isValid: false },
              currentPlayer: null,
            });
          }, 3000);
        } else {
          // Failure - word is not valid or doesn't start with challenge word
          handleFailedChallenge(roomId, socket.id, challenge);
        }
      } else {
        // Failure - time expired or player surrendered the challenge
        handleFailedChallenge(roomId, socket.id, challenge, timeExpired);
      }
    }
  );

  // Consolidated helper function to handle failed challenges
  function handleFailedChallenge(
    roomId,
    playerId,
    challenge,
    timeExpired = false,
    attemptedLetter = null
  ) {
    // The challenged player loses
    if (!activeRooms[roomId].gameHistory) {
      activeRooms[roomId].gameHistory = [];
    }

    // The winner is the challenging player when the challenged player fails
    const winningPlayer = challenge.challengingPlayer;

    activeRooms[roomId].gameHistory.push({
      word: challenge.word,
      loser: playerId,
      winner: winningPlayer,
      timestamp: new Date(),
      failedChallenge: true,
      timeExpired: timeExpired,
      attemptedLetter: attemptedLetter,
    });

    const failureReason = timeExpired
      ? `${formatPlayerName(playerId)} ran out of time`
      : attemptedLetter
      ? `${formatPlayerName(
          playerId
        )} tried "${attemptedLetter}" but it doesn't work`
      : `${formatPlayerName(playerId)} couldn't extend the word`;

    // Notify all players with explicit winner information
    io.to(roomId).emit("challengeResult", {
      success: false,
      player: playerId,
      timeExpired: timeExpired,
      attemptedLetter: attemptedLetter,
      failureReason: failureReason,
      winner: winningPlayer,
      word: challenge.word, // Include the current word in the failure
    });

    console.log(
      `Challenge failed: ${playerId} loses, ${winningPlayer} wins with word "${challenge.word}"`
    );

    // Reset the game for a new round, next player is the original challenger
    activeRooms[roomId].currentWord = "";
    activeRooms[roomId].currentPlayer = winningPlayer;
    delete activeRooms[roomId].currentChallenge;

    // Start a new round
    setTimeout(() => {
      io.to(roomId).emit("update", {
        word: "",
        nextPlayer: winningPlayer,
        validityState: { isChecked: false, isValid: false },
        currentPlayer: null,
      });
    }, 3000);
  }

  // Handle player surrender
  socket.on("surrender", ({ roomId }) => {
    if (!activeRooms[roomId]) {
      socket.emit("error", "Room does not exist.");
      return;
    }

    // Get the current word before resetting
    const currentWord = activeRooms[roomId].currentWord || "";

    // Record the surrender in game history
    if (!activeRooms[roomId].gameHistory) {
      activeRooms[roomId].gameHistory = [];
    }

    activeRooms[roomId].gameHistory.push({
      word: currentWord,
      loser: socket.id,
      isSurrender: true,
      timestamp: new Date(),
    });

    // Reset the word
    activeRooms[roomId].currentWord = "";

    // Get the next player (the one after the surrendering player)
    const currentPlayerIndex = activeRooms[roomId].players.indexOf(socket.id);
    const nextPlayerIndex =
      (currentPlayerIndex + 1) % activeRooms[roomId].players.length;
    const nextPlayerId = activeRooms[roomId].players[nextPlayerIndex];

    // Store current player for reconnection handling
    activeRooms[roomId].currentPlayer = nextPlayerId;

    // Notify everyone in the room about the surrender
    io.to(roomId).emit("surrenderConfirmed", {
      word: currentWord,
      surrenderingPlayer: socket.id,
      nextPlayer: nextPlayerId,
    });

    // Send an update to continue the game with a new word
    io.to(roomId).emit("update", {
      word: "",
      nextPlayer: nextPlayerId,
      validityState: { isChecked: false, isValid: false },
      currentPlayer: socket.id,
    });

    console.log(
      `Player ${socket.id} surrendered in room ${roomId} with word "${currentWord}"`
    );
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    // Don't remove player name from playerSessions to allow reconnection
    // Only remove from socket-specific mappings
    delete playerNames[socket.id];

    // Keep track of which session ID this socket was using
    const sessionId = socketToSession[socket.id];
    delete socketToSession[socket.id];

    // Iterate over all rooms to remove the user from any rooms they were part of
    for (const roomName of Object.keys(activeRooms)) {
      const room = activeRooms[roomName];
      const playerIndex = room.players ? room.players.indexOf(socket.id) : -1;

      if (playerIndex !== -1) {
        // Debug the room state before changes
        console.log(`Before disconnect - Room ${roomName} state:`, {
          users: room.users,
          players: room.players.length,
        });

        // Make sure users count is accurate
        if (typeof room.users !== "number") {
          room.users = room.players.length;
        }

        room.users = Math.max(0, room.users - 1);
        room.players.splice(playerIndex, 1);

        // Remove from ready players too
        if (room.readyPlayers) {
          delete room.readyPlayers[socket.id];
        }

        // Debug the room state after changes
        console.log(`After disconnect - Room ${roomName} state:`, {
          users: room.users,
          players: room.players.length,
        });

        // Check if the room is now empty
        const roomIsEmpty = !room.players || room.players.length === 0;

        if (roomIsEmpty) {
          // Instead of immediately deleting, set a timestamp for later cleanup
          emptyRoomsTimestamps[roomName] = Date.now();
          console.log(
            `Room ${roomName} is now empty after disconnect, marked for cleanup in 3 minutes`
          );

          // Reset game state in case someone joins later
          if (activeRooms[roomName]) {
            activeRooms[roomName].gameStarted = false;
            activeRooms[roomName].currentWord = "";
            activeRooms[roomName].readyPlayers = {};
            activeRooms[roomName].emptyingSince = new Date().toISOString();
          }
        }

        // Notify all users about the updated room list
        io.emit("activeRooms", activeRooms);
        console.log(`User ${socket.id} removed from room: ${roomName}`);

        // If players are left, send updated ready status
        if (!roomIsEmpty && activeRooms[roomName]) {
          io.to(roomName).emit("readyStatus", {
            readyPlayers: room.readyPlayers || {},
            gameStarted: room.gameStarted || false,
          });
        }
      }
    }
  });

  // Helper function to format player name
  function formatPlayerName(id) {
    // First check by socket ID
    if (playerNames[id]) {
      return playerNames[id];
    }

    // Check if we have a session ID for this socket
    const sessionId = socketToSession[id];
    if (sessionId && playerSessions[sessionId]) {
      return playerSessions[sessionId];
    }

    return id ? id.substring(0, 6) : "Unknown";
  }

  // Add a new handler for player ready status - FIXED IMPLEMENTATION
  socket.on("toggleReady", ({ roomId }) => {
    if (!activeRooms[roomId]) {
      socket.emit("error", "Room does not exist.");
      return;
    }

    // If game has already started, don't allow toggling ready
    if (activeRooms[roomId].gameStarted) {
      return;
    }

    // Initialize readyPlayers object if it doesn't exist
    if (!activeRooms[roomId].readyPlayers) {
      activeRooms[roomId].readyPlayers = {};
    }

    // Toggle the ready status
    activeRooms[roomId].readyPlayers[socket.id] =
      !activeRooms[roomId].readyPlayers[socket.id];

    // Log the current ready status for debugging
    console.log(
      `Player ${socket.id} toggled ready status to: ${
        activeRooms[roomId].readyPlayers[socket.id]
      }`
    );
    console.log(
      `Room ${roomId} ready status:`,
      activeRooms[roomId].readyPlayers
    );

    // Broadcast the updated ready status
    io.to(roomId).emit("readyStatus", {
      readyPlayers: activeRooms[roomId].readyPlayers,
      gameStarted: activeRooms[roomId].gameStarted || false,
    });

    // Check if all players are ready - FIXED LOGIC
    const readyPlayers = Object.values(activeRooms[roomId].readyPlayers).filter(
      (status) => status === true
    );
    const playerCount = Object.keys(activeRooms[roomId].readyPlayers).length;
    const allReady = readyPlayers.length === playerCount;

    console.log(
      `Room ${roomId} - Ready players: ${readyPlayers.length}/${playerCount}, All ready: ${allReady}`
    );

    // Only start the game if all players are ready and there are at least 2 players
    if (allReady && playerCount >= 2 && !activeRooms[roomId].gameStarted) {
      console.log(
        `Starting game in room ${roomId} with ${playerCount} players`
      );
      activeRooms[roomId].gameStarted = true;

      // Randomly select the first player to start
      const randomIndex = Math.floor(
        Math.random() * activeRooms[roomId].players.length
      );
      const firstPlayerId = activeRooms[roomId].players[randomIndex];
      activeRooms[roomId].currentPlayer = firstPlayerId;

      // Let everyone know the game is starting
      io.to(roomId).emit("gameStarting", {
        message: "All players are ready! Game is starting...",
        startingPlayer: firstPlayerId,
        playerNames: Object.fromEntries(
          activeRooms[roomId].players.map((id) => [
            id,
            playerNames[id] || id.substring(0, 6),
          ])
        ),
      });

      // Update the room's gameStarted status in the activeRooms list
      io.emit("activeRooms", activeRooms);

      // Give a moment before actually starting
      setTimeout(() => {
        // Double-check that the room still exists (players may have left)
        if (activeRooms[roomId]) {
          io.to(roomId).emit("update", {
            word: "",
            nextPlayer: firstPlayerId,
            validityState: { isChecked: false, isValid: false },
            currentPlayer: null,
          });

          // Send an updated ready status with gameStarted = true
          io.to(roomId).emit("readyStatus", {
            readyPlayers: activeRooms[roomId].readyPlayers,
            gameStarted: true,
          });
        }
      }, 3000);
    }
  });
});

// Helper function to format player name (used in messages)
function formatPlayerName(id) {
  // Check by socket ID
  if (playerNames && playerNames[id]) {
    return playerNames[id];
  }

  // Check if we have a session ID for this socket
  const sessionId = socketToSession[id];
  if (sessionId && playerSessions[sessionId]) {
    return playerSessions[sessionId];
  }

  return id ? id.substring(0, 6) : "Unknown";
}

// Clean up the interval when the server shuts down
process.on("SIGINT", () => {
  clearInterval(cleanupInterval);
  console.log("Cleanup interval cleared before exit");
  process.exit();
});

// Start the server
server.listen(port, "0.0.0.0", () => {
  console.log(`Server listening at http://0.0.0.0:${port}`);
});
