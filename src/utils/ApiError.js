class ApiError extends Error {
  constructor(statusCode, message) {
    super(message)

    // Tên của cái custom Error này, nếu không set thì mặc định nó sẽ kế thừa là "Error"
    this.name = 'ApiError'

    // Gán thêm http status code  ở đây
    this.statusCode = statusCode

    // Ghi lại Stack Trace  để thuận tiện cho việc debug
    Error.captureStackTrace(this, this.constructor)
  }
}

export default ApiError
