from datetime import timedelta
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.security import OAuth2PasswordRequestForm
from PIL import UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

import models
from auth import (
    CurrentUser,
    create_access_token,
    hash_password,
    verify_password,
)
from config import settings
from database import get_db
from image_utils import delete_profile_image, process_profile_image
from schemas.schemas import Token, UserCreate, UserPrivate, UserPublic, UserUpdate

router = APIRouter(
    prefix="/api/users",
    tags=["users"]
)

# Register User
@router.post("/register", response_model=UserPrivate, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    # check if the username already exists
    result = await db.execute(select(models.User).where(func.lower(models.User.username) == user.username.lower()))
    existing_user = result.scalars().first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    # check if the email already exists
    result = await db.execute(select(models.User).where(models.User.email == user.email))
    existing_email = result.scalars().first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    # Create the new user
    new_user = models.User(
        username=user.username,
        email=user.email.lower(),
        password_hash=hash_password(user.password)
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

# Login user to access token
@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Annotated[AsyncSession, Depends(get_db)]):
    # check if the username exists
    # OAuth2PasswordRequestForm has username and password attributes, but not email. So we will use the username to get the user and then check if the email matches.
    result = await db.execute(select(models.User).where(func.lower(models.User.email) == form_data.username.lower()))
    user = result.scalars().first()

    # check if the user exists and the password is correct.
    # Don't reveal whether the username or password is incorrect to avoid giving hints to attackers.
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Create access token using the user's user_id as the subject (sub) in the token payload.
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(data={"sub": str(user.user_id)}, expires_delta=access_token_expires)
    return Token(access_token=access_token, token_type="bearer")

# Get current user
@router.get("/me", response_model=UserPrivate)
def get_current_user(current_user: CurrentUser):
    """Get the current logged-in user based on the access token."""
    return current_user

# Get User by ID and Update User
@router.patch("/{user_id}", response_model=UserPrivate)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser
):
    if current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user"
        )
    result = await db.execute(select(models.User).where(models.User.user_id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user_update.username is not None and user_update.username.lower() != user.username.lower():
        # Check if the new username already exists
        result = await db.execute(select(models.User).where(func.lower(models.User.username) == user_update.username.lower()))
        existing_user = result.scalars().first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
    if user_update.email is not None and user_update.email.lower() != user.email.lower():
        # Check if the new email already exists
        result = await db.execute(select(models.User).where(func.lower(models.User.email) == user_update.email.lower()))
        existing_email = result.scalars().first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
    # Update the user
    if user_update.username is not None:
        user.username = user_update.username
    if user_update.email is not None:
        user.email = user_update.email.lower()
    await db.commit()
    await db.refresh(user)
    return user

# Delete User by ID
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser
):
    if current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this user"
        )
    result = await db.execute(select(models.User).where(models.User.user_id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    old_filename = user.image_file
    await db.delete(user)
    await db.commit()
    if old_filename:
        delete_profile_image(old_filename)

# protected routes
'''
POST /api/posts
PATCH /api/posts/{post_id}
DELETE /api/posts/{post_id}
'''

# Create User
@router.post("", response_model=UserPrivate, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    # check if the username already exists
    result = await db.execute(select(models.User).where(models.User.username == user.username))
    existing_user = result.scalars().first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    # check if the email already exists
    result = await db.execute(select(models.User).where(models.User.email == user.email))
    existing_email = result.scalars().first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    # Create the new user
    new_user = models.User(
        username=user.username,
        email=user.email
    )
    db.add(new_user) # Add the new user to the database
    await db.commit() # Commit the transaction to save the new user
    await db.refresh(new_user) # Refresh the instance to get the updated data from the database (like the generated ID)
    return new_user

# Get User by ID
@router.get("/{user_id}", include_in_schema=False, response_model=UserPublic)
async def get_user(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser
):
    result = await db.execute(select(models.User).where(models.User.user_id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

# Upload Profile Picture Endpoint
@router.patch("/{user_id}/picture", response_model=UserPrivate)
async def upload_profile_picture(
    user_id: int,
    file: UploadFile,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)]):
    if current_user.user_id != user_id:
        raise HTTPException(
            status_code = status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user's picture"
        )
    content = await file.read()

    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum is {settings.max_upload_size_bytes // (1024*1024)}MB",
        )
    try:
        new_filename = await run_in_threadpool(process_profile_image, content)
        # new_filename = process_profile_image(content)
    except UnidentifiedImageError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file. Please upload a valid image (JPEG, PNG, GIF, WebP)."
        ) from err
    old_filename = current_user.image_file

    current_user.image_file = new_filename
    await db.commit()
    await db.refresh(current_user)

    if old_filename:
        delete_profile_image(old_filename)
    
    return current_user

# Delete profile pricture
@router.delete("/{user_id}/picture", response_model=UserPrivate)
async def delete_user_profile_picture(
    user_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    if current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this user's picture",
        )
    
    old_filename = current_user.image_file

    if old_filename is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No profile pricture to delete",
        )

    current_user.image_file = None
    await db.commit()
    await db.refresh(current_user)
    delete_profile_image(old_filename)
    return current_user
    