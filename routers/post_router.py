from typing import Annotated

from fastapi import (  # (for dependency injection)
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

import models
from auth import CurrentUser
from database import get_db
from schemas.schemas import (
    PostCreate,
    PostResponse,
    PostResponseEnvelope,
    PostsResponseEnvelope,
    PostUpdate,
)

router = APIRouter(
    prefix="/api/posts",
    tags=["posts"]
)

# Create Post
@router.post("", response_model=PostResponseEnvelope, status_code=status.HTTP_201_CREATED)
async def create_post(
    post: PostCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    new_post = models.Post(
        author_id=current_user.user_id,
        category=post.category,
        title=post.title,
        description=post.description,
        readTime="5 min read"  # Placeholder, you might want to calculate this based on content
    )
    
    db.add(new_post)
    await db.commit()
    await db.refresh(new_post, attribute_names=["author"]) 
    return {"data": new_post}

# Get all posts
@router.get("", response_model=PostsResponseEnvelope)
async def get_posts(
    db: Annotated[AsyncSession, Depends(get_db)],
    # current_user: CurrentUser,
):
    result = await db.execute(select(models.Post).options(selectinload(models.Post.author)).order_by(desc(models.Post.date_posted)))
    posts = result.scalars().all()
    return {"data": posts}

# Get user posts
@router.get("/{user_id}/posts", include_in_schema=True, name="get_user_posts", response_model=PostsResponseEnvelope)
async def get_user_posts(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    if user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own posts",
        )
    result = await db.execute(select(models.Post).options(selectinload(models.Post.author)).where(models.Post.author_id == user_id))
    user_posts = result.scalars().all()
    return {"data": user_posts}

@router.get("/{post_id}", response_model=PostResponse)
async def get_post(post_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(models.Post).options(selectinload(models.Post.author)).where(models.Post.id == post_id))
    post = result.scalars().first()
    if post:
        return post
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Post not found"
    )

@router.put("/{post_id}", response_model=PostResponse)
async def update_post_full(
    post_id: int,
    post_data: PostCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    result = await db.execute(select(models.Post).options(selectinload(models.Post.author)).where(models.Post.id == post_id))
    post = result.scalars().first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    if post.author_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this post"
        )
    # Update the post with the new data
    post.category = post_data.category
    post.title = post_data.title
    post.description = post_data.description
    await db.commit()
    await db.refresh(post, attribute_names=["author"])
    return post

# Partial update of a post
@router.patch("/{post_id}", response_model=PostResponse)
async def update_post_partial(
    post_id: int,
    post_data: PostUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    result = await db.execute(select(models.Post).options(selectinload(models.Post.author)).where(models.Post.id == post_id))
    post = result.scalars().first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    # ownership check
    if post.author_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own posts",
        )
    # Update only the fields that are provided in the request
    updated_data = post_data.model_dump(exclude_unset=True)
    for key, value in updated_data.items():
        setattr(post, key, value)
    await db.commit()
    await db.refresh(post, attribute_names=["author"])
    return post

# Delete a post
@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    result = await db.execute(select(models.Post).options(selectinload(models.Post.author)).where(models.Post.id == post_id))
    post = result.scalars().first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    # ownership check
    if post.author_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own posts",
        )
    await db.delete(post)
    await db.commit()
    