import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AnnouncementBar } from "@/components/announcement-bar";
import { getAllPosts } from "@/content/blog/posts";
import { categories, getTagBySlug } from "@/content/blog/taxonomy";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Newsroom — CreditClaw",
  description: "Updates, announcements, and guides from the CreditClaw team. Stay up to date with the latest in agentic commerce, product releases, and engineering insights.",
  openGraph: {
    title: "Newsroom — CreditClaw",
    description: "Updates, announcements, and guides from the CreditClaw team.",
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getCategoryName(slug: string): string {
  return categories.find((c) => c.slug === slug)?.name || slug;
}

export default function NewsroomPage() {
  const allPosts = getAllPosts();

  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <AnnouncementBar />
      <Nav />

      <main className="pt-40 pb-24">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h1
              className="text-5xl md:text-7xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-6"
              data-testid="heading-newsroom"
            >
              Newsroom
            </h1>
            <p className="text-xl text-neutral-500 font-medium leading-relaxed" data-testid="text-newsroom-description">
              Updates, announcements, and guides from the CreditClaw team.
            </p>
          </div>

          <div className="max-w-3xl mx-auto mb-12">
            <div className="flex flex-wrap gap-2 justify-center" data-testid="category-filter">
              <Link
                href="/newsroom"
                className="px-4 py-1.5 rounded-full text-sm font-semibold bg-neutral-900 text-white transition-colors"
                data-testid="category-link-all"
              >
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/newsroom/category/${cat.slug}`}
                  className="px-4 py-1.5 rounded-full text-sm font-semibold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                  data-testid={`category-link-${cat.slug}`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="max-w-3xl mx-auto space-y-10" data-testid="post-list">
            {allPosts.map((post) => (
              <article key={post.slug} className="group" data-testid={`post-card-${post.slug}`}>
                <Link href={`/newsroom/${post.slug}`} className="block">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600" data-testid={`post-category-${post.slug}`}>
                      {getCategoryName(post.category)}
                    </span>
                    <time className="text-sm text-neutral-400 font-medium" dateTime={post.date} data-testid={`post-date-${post.slug}`}>
                      {formatDate(post.date)}
                    </time>
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900 group-hover:text-primary transition-colors mb-2" data-testid={`post-title-${post.slug}`}>
                    {post.title}
                  </h2>
                  <p className="text-neutral-500 font-medium leading-relaxed mb-3" data-testid={`post-excerpt-${post.slug}`}>
                    {post.excerpt}
                  </p>
                </Link>
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5" data-testid={`post-tags-${post.slug}`}>
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/newsroom/tag/${tag}`}
                        className="text-xs font-medium text-neutral-400 hover:text-neutral-600 transition-colors"
                        data-testid={`tag-link-${tag}`}
                      >
                        #{getTagBySlug(tag)?.name || tag}
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
