export function formatPostDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

export type User = {
  id: number;
  user_id?: number;
  username: string;
  email: string;
  image_file: string | null;
  image_path: string;
};

export type Post = {
  id: number;
  author_id: number;
  author: User;
  category: string;
  title: string;
  description: string;
  readTime: string;
  date_posted: string;
};

type DataResponse<T> = { data: T };

export type CurrentUser = {
  id?: number;
  user_id?: number;
  username: string;
  email: string;
  image_file: string | null;
  image_path: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export function getMediaUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("The backend could not be reached.");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      typeof payload === "object" && payload !== null && "detail" in payload
        ? (payload as { detail: unknown }).detail
        : null;
    throw new ApiError(
      typeof detail === "string"
        ? detail
        : `The request failed (${response.status}).`,
      response.status,
    );
  }
  return payload as T;
}

async function authenticatedRequest<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  return request<T>(path, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getPosts(): Promise<Post[]> {
  return request<DataResponse<Post[]>>("/api/posts").then((result) => result.data);
}

export function getPost(postId: number): Promise<Post> {
  return request<Post>(`/api/posts/${postId}`);
}

export type CreatePostInput = {
  category: string;
  title: string;
  description: string;
};

export function createPost(input: CreatePostInput, token: string): Promise<Post> {
  return authenticatedRequest<DataResponse<Post>>("/api/posts", token, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((result) => result.data);
}

export type UpdatePostInput = CreatePostInput;

export function updatePost(
  postId: number,
  input: UpdatePostInput,
  token: string,
): Promise<Post> {
  return authenticatedRequest<Post>(`/api/posts/${postId}`, token, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deletePost(postId: number, token: string): Promise<void> {
  return authenticatedRequest<void>(`/api/posts/${postId}`, token, {
    method: "DELETE",
  });
}

export function getUserPosts(userId: number, token: string): Promise<Post[]> {
  return authenticatedRequest<DataResponse<Post[]>>(
    `/api/posts/${userId}/posts`,
    token,
  ).then((result) => result.data);
}

export function updateUserProfile(
  userId: number,
  token: string,
  input: { username?: string; email?: string },
): Promise<CurrentUser> {
  return authenticatedRequest<CurrentUser>(`/api/users/${userId}`, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function uploadProfilePicture(
  userId: number,
  token: string,
  file: File,
): Promise<CurrentUser> {
  const form = new FormData();
  form.append("file", file);
  return authenticatedRequest<CurrentUser>(`/api/users/${userId}/picture`, token, {
    method: "PATCH",
    body: form,
  });
}

export function deleteProfilePicture(
  userId: number,
  token: string,
): Promise<CurrentUser> {
  return authenticatedRequest<CurrentUser>(
    `/api/users/${userId}/picture`,
    token,
    { method: "DELETE" },
  );
}

export function deleteUserAccount(userId: number, token: string): Promise<void> {
  return authenticatedRequest<void>(`/api/users/${userId}`, token, {
    method: "DELETE",
  });
}

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
};

export async function registerUser(input: RegisterInput) {
  return request<CurrentUser>("/api/users/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function loginUser(
  email: string,
  password: string,
): Promise<TokenResponse> {
  const form = new URLSearchParams({ username: email, password });
  return request<TokenResponse>("/api/users/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
}

export function getCurrentUser(token: string): Promise<CurrentUser> {
  return authenticatedRequest<CurrentUser>("/api/users/me", token);
}
