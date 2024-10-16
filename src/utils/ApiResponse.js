class ApiResponse {
    constructor(
      statusCode,
      message = "Request completed successfully",
      data = null,
      errors = []
    ) {
      this.statusCode = statusCode;  // HTTP status code (e.g., 200, 400, 500)
      this.message = message;        // Message describing the result
      this.success = statusCode < 400  // Determine success based on status code
      this.data = data;              // Data to return in the response
      this.errors = errors;          // Any errors associated with the response
    }
}

export {ApiResponse}