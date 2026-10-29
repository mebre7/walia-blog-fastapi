import { ArrowLeft } from "lucide-react";
import type { ApiError, Post, User } from "../lib/api";
import { ApiErrorPage } from "./ApiErrorPage";
import { formatPostDate, getMediaUrl } from "../lib/api";
import ReactMarkdown from "react-markdown";

type SinglePostPageProps = {
  post: Post | null;
  loading: boolean;
  error: ApiError | null;
  user: User | null;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
  actionError: string | null;
};

export function SinglePostPage({ post, loading, error, user, onEdit, onDelete, actionError }: SinglePostPageProps) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 lg:px-12">
      <a href="/" className="inline-flex items-center gap-2 text-sm text-[#a6a79e] transition hover:text-[#d1a878]">
        <ArrowLeft size={16} /> Back to stories
      </a>

      {loading && <p className="mt-16 text-[#a6a79e]">Loading story from FastAPI…</p>}
      {error && <ApiErrorPage status={error.status} message={getPostErrorMessage(error)} />}

      {post && !loading && (
        <article className="mt-12">
          {user?.id === post.author_id && (
            <div className="mb-8 flex gap-3">
              <button onClick={() => onEdit(post)} className="rounded-full border border-[#45493f] px-5 py-2 text-sm hover:border-[#d1a878] hover:text-[#d1a878]">Edit post</button>
              <button onClick={() => onDelete(post)} className="rounded-full border border-[#7d4a40] px-5 py-2 text-sm text-[#e8b0a4] hover:bg-[#2b1916]">Delete post</button>
            </div>
          )}
          {actionError && <p role="alert" className="mb-6 rounded-lg border border-[#7d4a40] bg-[#2b1916] p-3 text-sm text-[#e8b0a4]">{actionError}</p>}
          <div className="flex items-center gap-3 text-sm uppercase tracking-[.2em] text-[#d1a878]">
            <img src={getMediaUrl(post.author.image_path)} alt="" className="size-9 rounded-full border border-[#45493f] object-cover" />
            <span>{post.category} · {post.author.username}</span>
          </div>
          <h1 className="mt-4 font-display text-5xl leading-tight tracking-[-.04em] text-[#f2eee6] sm:text-7xl">
            {post.title}
          </h1>
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="mt-4 font-display text-5xl leading-tight tracking-[-.04em] text-[#f2eee6] sm:text-7xl">
                  {children}
                </h1>
              ),
              p: ({ children }) => (
                <p className="mt-7 max-w-2xl text-xl leading-8 text-[#a6a79e]">
                  {children}
                </p>
              ),
            }}
          >
            {/* {`# ${post.title}`} */}
          </ReactMarkdown>

          <div className="prose prose-invert mt-7 max-w-2xl">
            <ReactMarkdown>{post.description}</ReactMarkdown>
          </div>

          <dl className="mt-12 grid gap-5 border-y border-[#30332c] py-6 text-sm sm:grid-cols-2">
            <div><dt className="text-[#6f746a]">Published</dt><dd className="mt-1 text-[#e8e5dd]">{formatPostDate(post.date_posted)}</dd></div>
            <div><dt className="text-[#6f746a]">Reading time</dt><dd className="mt-1 text-[#e8e5dd]">{post.readTime}</dd></div>
          </dl>
        </article>
      )}
    </main>
  );
}

function getPostErrorMessage(error: ApiError) {
  if (error.status === 404) return "That post does not exist.";
  if (error.status === 422) return "The post ID sent to the backend is invalid.";
  if (error.status !== undefined && error.status >= 500) {
    return "The backend could not complete this request. Try again later.";
  }
  return error.message;
}
