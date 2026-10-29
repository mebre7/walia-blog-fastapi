from fastapi import FastAPI, status
from fastapi.exceptions import RequestValidationError
from fastapi.requests import Request
from fastapi.responses import HTMLResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

app = FastAPI(title="Walia Blog API", version="1.0.0")
# Handle HTTP exceptions
@app.exception_handler(StarletteHTTPException)
def general_http_exception_handler(request: Request, exception: StarletteHTTPException):
    message = (
        exception.detail
        if exception.detail
        else "An error occurred. Please check your request and try again."
    )

    if request.url.path.startswith("/api"):
        return JSONResponse(
            status_code=exception.status_code,
            content={"detail": message},
        )
    return HTMLResponse(
        status_code=exception.status_code,
        content=f"<h1>{exception.status_code} - {message}</h1>",
    )

# Handle validation errors
@app.exception_handler(RequestValidationError)
def validation_exception_handler(request: Request, exception: RequestValidationError):
    if request.url.path.startswith("/api"):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={"detail": exception.errors()},
        )
    return HTMLResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=f"<h1>422 - Validation Error</h1><p>{exception.errors()}</p>",
    )