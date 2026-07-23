export default class ApiError extends Error {
  constructor(statusCode, message, errors = [], errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.errorCode = errorCode;
    this.isOperational = true;
  }
}
