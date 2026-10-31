from contextlib import asynccontextmanager

from fastapi import FastAPI, status
from fastapi.exception_handlers import (
    http_exception_handler,
    request_validation_exception_handler,
)
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from database import Base, engine
from routers import home_router, post_router, user_router

'''
I will have an endpoint /admin which works in specific network and where I can have a dashboard.
'''

# Base.metadata.create_all(bind=engine) # idempotency
@asynccontextmanager
async def lifespan(_app: FastAPI):
    # create_all was idempotent, it will not create tables if they already exist. It doesn't work for migrations. It focuses on 'if not exists' and 'if exists' checks. It doesn't handle schema changes or data migrations.
    yield
    # Shutdown code
    await engine.dispose()

app = FastAPI(lifespan=lifespan, title="Walia Blog API", version="1.0.0")

app.include_router(user_router.router)
app.include_router(post_router.router)
app.include_router(home_router.router)
app.mount("/media", StaticFiles(directory="media"), name="media")
app.mount("/static", StaticFiles(directory="static"), name="static")


posts: list[dict] = []

# CORS = Cross-Origin Resource Sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Handle HTTP exceptions
@app.exception_handler(StarletteHTTPException)
async def general_http_exception_handler(request: Request, exception: StarletteHTTPException):
    

    if request.url.path.startswith("/api"):
        return await http_exception_handler(request, exception)

    message = (
            exception.detail
            if exception.detail
            else "An error occurred. Please check your request and try again."
        )
    
    return HTMLResponse(
        status_code=exception.status_code,
        content=f"<h1>{exception.status_code} - {message}</h1>",
    )

# Handle validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exception: RequestValidationError):
    if request.url.path.startswith("/api"):
        return await request_validation_exception_handler(request, exception)
    return HTMLResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=f"<h1>422 - Validation Error</h1><p>{exception.errors()}</p>",
    )
