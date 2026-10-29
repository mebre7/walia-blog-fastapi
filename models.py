from __future__ import annotations  # but not needed in Python 3.14+

from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    image_file: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
        default=None,
    )
    posts: Mapped[list[Post]] = relationship(back_populates="author", cascade="all, delete-orphan") # this is a one-to-many relationship, where one user can have many posts. In table terms, this means that the "users" table has a one-to-many relationship with the "posts" table, where each user can have multiple posts associated with them. The "back_populates" argument specifies the attribute on the related class (Post) that will be used to access the related User object. In this case, it is set to "author", which means that each Post object will have an "author" attribute that refers to the User object that created it. 

    @property
    def image_path(self) -> str:
        if self.image_file:
            return f"/media/profile_pics/{self.image_file}"
        return "/static/profile_pics/default.jpg"
'''
id, author, category, title, description, date, readTime, date_posted
'''
class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    readTime: Mapped[str] = mapped_column(String(20), nullable=False)
    date_posted: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    author: Mapped[User] = relationship(back_populates="posts")