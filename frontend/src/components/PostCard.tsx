import type { Post } from "../lib/api";
import { formatPostDate, getMediaUrl } from "../lib/api";


type PostCardProps = {
  post: Post;
};

export function PostCard({ post }: PostCardProps) {
  return (
    <a
      href={`/posts/${post.id}`}
      className="group w-full rounded-2xl border border-[#292c26] bg-[#171a15] p-3 text-left transition hover:-translate-y-1 hover:border-[#d1a878] focus:outline-none focus:ring-2 focus:ring-[#d1a878]"
    >
      <div className={`relative mb-5 h-48 overflow-hidden rounded-xl bg-gradient-to-br from-[#171a15] to-[#292c26] transition group-hover:scale-105`}>
        <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
        <span className="absolute bottom-4 left-4 rounded-full bg-[#10130f]/65 px-3 py-1 text-[10px] uppercase tracking-[.18em] text-[#f5eee2]">
          {post.category}
        </span>
      </div>
      <div className="px-3 pb-4">
        <div className="mb-4 flex items-center gap-2">
          <img
            src={getMediaUrl(post.author.image_path)}
            alt=""
            className="size-8 rounded-full border border-[#45493f] object-cover"
          />
          <span className="text-xs text-[#a6a79e]">{post.author.username}</span>
        </div>
        <h3 className="font-display text-2xl leading-tight text-[#f2eee6]">{post.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#92968c]">{post.description}</p>
        <div className="mt-6 flex items-center justify-between text-[11px] uppercase tracking-[.13em] text-[#6f746a]">
          <span>{formatPostDate(post.date_posted)}</span>
          <span>{post.readTime}</span>
        </div>
      </div>
    </a>
  );
}
