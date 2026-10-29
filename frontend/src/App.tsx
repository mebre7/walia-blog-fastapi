import { useCallback, useEffect, useState } from "react";
import { createPost, deletePost, getCurrentUser, getPost, getPosts, getUserPosts, loginUser, registerUser, updatePost } from "./lib/api";
import type { ApiError, CurrentUser, Post, User } from "./lib/api";
import { Header } from "./components/Header";
import { LoginModal } from "./components/LoginModal";
import { RegisterModal } from "./components/RegisterModal";
import { CreatePostModal } from "./components/CreatePostModal";
import { EditPostModal } from "./components/EditPostModal";
import { PostList } from "./components/PostList";
import { SinglePostPage } from "./components/SinglePostPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NotFoundPage } from "./components/NotFoundPage";
import { ProfilePage } from "./components/ProfilePage";
import { ConfirmDialog } from "./components/ConfirmDialog";

type Modal = "login" | "register" | "create" | "edit" | null;
const USER_STORAGE_KEY = "walia-blog-user";

function readSavedUser(): User | null {
  try {
    const value = localStorage.getItem(USER_STORAGE_KEY);
    return value ? (JSON.parse(value) as User) : null;
  } catch {
    return null;
  }
}

function App() {
  const [user, setUser] = useState<User | null>(readSavedUser);
  const [modal, setModal] = useState<Modal>(null);
  const [createAfterLogin, setCreateAfterLogin] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [postsLoading, setPostsLoading] = useState(true);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myPostsError, setMyPostsError] = useState<string | null>(null);
  const [myPostsLoading, setMyPostsLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPostError, setSelectedPostError] = useState<ApiError | null>(null);
  const [selectedPostLoading, setSelectedPostLoading] = useState(false);
  const [postActionError, setPostActionError] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);

  const currentPath = window.location.pathname;
  const postId = currentPath.match(/^\/posts\/(\d+)\/?$/)?.[1];
  const isHome = currentPath === "/";
  const isMyPosts = currentPath === "/my-posts" || currentPath === "/my-posts/";
  const isProfile = currentPath === "/profile" || currentPath === "/profile/";

  const loadPosts = useCallback(() => {
    setPostsLoading(true);
    setPostsError(null);
    getPosts()
      .then(setPosts)
      .catch((error: Error) => setPostsError(error.message))
      .finally(() => setPostsLoading(false));
  }, []);

  const loadMyPosts = useCallback((userId: number, token: string) => {
    setMyPostsLoading(true);
    setMyPostsError(null);
    getUserPosts(userId, token)
      .then(setMyPosts)
      .catch((error: Error) => setMyPostsError(error.message))
      .finally(() => setMyPostsLoading(false));
  }, []);

  useEffect(() => {
    if (isHome) loadPosts();
  }, [isHome, loadPosts]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (isMyPosts && user && token) loadMyPosts(user.id, token);
  }, [isMyPosts, user, loadMyPosts]);

  useEffect(() => {
    if (!postId) return;
    setSelectedPostLoading(true);
    setSelectedPostError(null);
    getPost(Number(postId))
      .then(setSelectedPost)
      .catch((error: ApiError) => setSelectedPostError(error))
      .finally(() => setSelectedPostLoading(false));
  }, [postId]);

  function saveUser(nextUser: User) {
    setUser(nextUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  }

  const handleProfileUpdated = useCallback((currentUser: CurrentUser) => {
    const userId = currentUser.user_id ?? currentUser.id;
    if (typeof userId !== "number") return;
    saveUser({ ...currentUser, id: userId });
  }, []);

  async function handleLogin(email: string, password: string) {
    const tokenResponse = await loginUser(email, password);
    localStorage.setItem("access_token", tokenResponse.access_token);

    const currentUser = await getCurrentUser(tokenResponse.access_token);

    // Keep the existing UI's `id` field working while using backend `user_id`.
    const userId = currentUser.user_id ?? currentUser.id;
    if (typeof userId !== "number") {
      throw new Error("The logged-in user response did not include an ID.");
    }
    const appUser = {
      ...currentUser,
      id: userId,
    };

    localStorage.setItem("walia-blog-user", JSON.stringify(appUser));
    setUser(appUser);
    setModal(createAfterLogin ? "create" : null);
    setCreateAfterLogin(false);
  }

  async function handleRegister(
    username: string,
    email: string,
    password: string,
  ) {
    await registerUser({ username, email, password });
    await handleLogin(email, password);
  }

  function requestCreatePost() {
    if (user) {
      setModal("create");
      return;
    }
    setCreateAfterLogin(true);
    setModal("login");
  }

  async function handleCreatePost(category: string, title: string, description: string) {
    if (!user) throw new Error("Please log in before publishing.");
    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("Your session has expired. Please log in again.");
    const newPost = await createPost({ category, title, description }, token);
    setPosts((current) => [newPost, ...current]);
    setMyPosts((current) => [newPost, ...current]);
    setModal(null);
  }

  async function handleUpdatePost(category: string, title: string, description: string) {
    if (!user || !selectedPost) throw new Error("Please log in before editing.");
    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("Your session has expired. Please log in again.");
    const updatedPost = await updatePost(selectedPost.id, {
      category,
      title,
      description,
    }, token);
    setSelectedPost(updatedPost);
    setPosts((current) => current.map((post) => post.id === updatedPost.id ? updatedPost : post));
    setMyPosts((current) => current.map((post) => post.id === updatedPost.id ? updatedPost : post));
    setPostActionError(null);
    setModal(null);
  }

  async function confirmDeletePost() {
    if (!user || !postToDelete || user.id !== postToDelete.author_id) return;
    setDeletingPost(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      await deletePost(postToDelete.id, token);
      setPosts((current) => current.filter((item) => item.id !== postToDelete.id));
      setMyPosts((current) => current.filter((item) => item.id !== postToDelete.id));
      setPostToDelete(null);
      window.location.assign("/");
    } catch (error) {
      setPostActionError(error instanceof Error ? error.message : "Could not delete this post.");
    } finally {
      setDeletingPost(false);
    }
  }

  function handleLogout() {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem("access_token");
    setMyPosts([]);
  }

  return (
    <div className="min-h-screen bg-[#0c0d0b] text-[#e8e5dd]">
      <Header
        user={user}
        onLogin={() => { setCreateAfterLogin(false); setModal("login"); }}
        onRegister={() => { setCreateAfterLogin(false); setModal("register"); }}
        onCreatePost={requestCreatePost}
        onLogout={handleLogout}
      />

      {isHome && (
        <>
          <main>
            <section className="mx-auto max-w-7xl px-6 pb-20 pt-14 lg:px-12 lg:pb-28 lg:pt-24">
              <p className="mb-6 text-xs font-semibold uppercase tracking-[.22em] text-[#d1a878]">A collection of useful thoughts</p>
              <h1 className="max-w-4xl font-display text-6xl leading-[.98] tracking-[-.055em] text-[#f2eee6] sm:text-7xl lg:text-[6.5rem]">Make space for <em className="font-serif font-normal text-[#d1a878]">wonder.</em></h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#9c9d94]">Field notes on making, learning, and living with intention. Read freely, and share your own story when you’re ready.</p>
            </section>
            <section id="stories" className="border-y border-[#272a24] bg-[#11130f]">
              <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-20">
                <div className="mb-10"><p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-[#d1a878]">From the journal</p><h2 className="font-display text-4xl tracking-[-.04em] text-[#f2eee6] sm:text-5xl">Recent stories</h2></div>
                <PostList posts={posts} loading={postsLoading} error={postsError} emptyMessage="No stories published yet." />
              </div>
            </section>
          </main>
          <footer className="mx-auto max-w-7xl px-6 py-7 text-xs text-[#6f746a] lg:px-12">© 2026 Walia Blog. Made with intention.</footer>
        </>
      )}

      {postId && <SinglePostPage post={selectedPost} loading={selectedPostLoading} error={selectedPostError} user={user} onEdit={() => { setPostActionError(null); setModal("edit"); }} onDelete={(post) => { setPostActionError(null); setPostToDelete(post); }} actionError={postActionError} />}

      {isMyPosts && (
        <ProtectedRoute user={user} onLogin={() => { setCreateAfterLogin(false); setModal("login"); }} onRegister={() => setModal("register")}>
          <main className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
            <div className="mb-10 flex items-end justify-between"><div><p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-[#d1a878]">Your writing</p><h1 className="font-display text-5xl">My Posts</h1></div><button onClick={requestCreatePost} className="rounded-full bg-[#d1a878] px-5 py-3 font-semibold text-[#151611]">Create Post</button></div>
            <PostList posts={myPosts} loading={myPostsLoading} error={myPostsError} emptyMessage="You haven’t published any posts yet." />
          </main>
        </ProtectedRoute>
      )}

      {isProfile && (
        <ProfilePage
          token={localStorage.getItem("access_token")}
          onLogin={() => { setCreateAfterLogin(false); setModal("login"); }}
          onProfileUpdated={handleProfileUpdated}
          onAccountDeleted={() => {
            localStorage.removeItem("access_token");
            localStorage.removeItem(USER_STORAGE_KEY);
            setUser(null);
          }}
        />
      )}

      {!isHome && !isMyPosts && !isProfile && !postId && <NotFoundPage />}

      {modal === "login" && <LoginModal onClose={() => { setModal(null); setCreateAfterLogin(false); }} onSubmit={handleLogin} onSwitchToRegister={() => setModal("register")} />}
      {modal === "register" && <RegisterModal onClose={() => { setModal(null); setCreateAfterLogin(false); }} onSubmit={handleRegister} onSwitchToLogin={() => setModal("login")} />}
      {modal === "create" && user && <CreatePostModal onClose={() => setModal(null)} onSubmit={handleCreatePost} />}
      {modal === "edit" && selectedPost && user?.id === selectedPost.author_id && <EditPostModal post={selectedPost} onClose={() => setModal(null)} onSubmit={handleUpdatePost} />}
      {postToDelete && (
        <ConfirmDialog
          title="Delete this post?"
          message="This story and its content will be permanently deleted."
          confirmLabel="Delete post"
          busy={deletingPost}
          onCancel={() => setPostToDelete(null)}
          onConfirm={confirmDeletePost}
        />
      )}
    </div>
  );
}

export default App;
