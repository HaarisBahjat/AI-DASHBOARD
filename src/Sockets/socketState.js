// This module manages the state of the Socket.IO instance and provides utility functions for emitting events to specific users.
let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function getIO() {
  return ioInstance;
}

function emitToUser(userId, eventName, payload) {
  if (!ioInstance || !userId || !eventName) return false;
  ioInstance.to(`user:${String(userId)}`).emit(eventName, payload);
  return true;
}

module.exports = {
  setIO,
  getIO,
  emitToUser,
};
