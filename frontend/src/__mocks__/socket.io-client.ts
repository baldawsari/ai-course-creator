// Manual mock for socket.io-client
export const io = jest.fn(() => {
  const mockSocket = {
    connected: false,
    id: 'mock-socket-id',
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
  return mockSocket
})

export class Socket {
  constructor() {}
}