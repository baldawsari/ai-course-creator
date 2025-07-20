export const http = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}

export const HttpResponse = {
  json: jest.fn((data, options) => ({ data, options })),
  text: jest.fn((text) => ({ text })),
  error: jest.fn(() => ({ error: true })),
}