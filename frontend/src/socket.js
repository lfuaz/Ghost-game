import { io } from "socket.io-client";

// Determine the correct backend URL
const getBackendUrl = () => {
  // For local development
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return `http://${window.location.hostname}:6845`;
  }

  // For production deployment - use the same host but with secure connection
  return window.location.origin;
};

const socket = io(getBackendUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
});

// Add logging for connection events
socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});

socket.on("error", (error) => {
  console.error("Socket error:", error);
});

export default socket;
