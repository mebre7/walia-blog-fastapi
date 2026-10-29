from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# with the fields shared between creating and returning the post

'''
  user_id: number;
  author: string;
  category: string;
  title: string;
  description: string;
  readTime: string;
  date_posted: string;
'''

class UserBase(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    email: EmailStr = Field(max_length=120)

class UserCreate(UserBase): 
    password: str = Field(min_length=8)

class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: int
    username: str
    image_file: str | None
    image_path: str

class UserPrivate(UserPublic):
    email: EmailStr

class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=1, max_length=50)
    email: EmailStr | None = Field(default=None, max_length=120)

class Token(BaseModel):
    access_token: str
    token_type: str

class PostBase(BaseModel):
    category: str = Field(min_length=1, max_length=50)
    title: str
    description: str

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    category: str | None = Field(default=None, min_length=1, max_length=50)
    title: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, min_length=1, max_length=1000)


class PostResponse(PostBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    author_id: int
    author: UserPublic
    date_posted: datetime
    readTime: str

class PostResponseEnvelope(BaseModel):
    data: PostResponse

class PostsResponseEnvelope(BaseModel):
    data: list[PostResponse]