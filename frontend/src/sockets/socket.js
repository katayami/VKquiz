import { io } from 'socket.io-client';
import { getToken } from '../api/token';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

let socket = null;

export function connectSocket() {
  if (!socket) {
    socket = io(SERVER_URL, { autoConnect: false });
  }
  socket.auth = { token: getToken() };
  if (!socket.connected) socket.connect();
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
