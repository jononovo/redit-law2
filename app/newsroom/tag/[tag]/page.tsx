import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AnnouncementBar } from "@/components/announcement-bar";
import { getPostsByTag, getAllTags } from "@/content/blog/posts";
import { categories, getTagBySlug } from "@/content/blog/taxonomy";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const tagObj = getTagBySlug(tag);
  if (!tagObj) return {};

  return {
    title: `Posts tagged "${tagObj.name}" — CreditClaw Newsroom`,
    description: `All CreditClaw newsroom posts tagged with ${tagObj.name}.`,
    openGraph: {
      title: `Posts tagged "${tagObj.name}" — CreditClaw Newsroom`,
      description: `All CreditClaw newsroom posts tagged with ${tagObj.name}.`,
    },
  };
}

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

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const tagObj = getTagBySlug(tag);

  if (!tagObj) {
    notFound();
  }

  const filteredPosts = getPostsByTag(tag);

  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <AnnouncementBar />
      <Nav />

      <main className="pt-40 pb-24">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h1
              className="text-5xl md:text-7xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-6"
              data-testid="heading-tag"
            >
              #{tagObj.name}
            </h1>
            <p className="text-xl text-neutral-500 font-medium leading-relaxed" data-testid="text-tag-description">
              All posts tagged with {tagObj.name}.
            </p>
          </div>

          <div className="max-w-3xl mx-auto mb-8">
            <div className="text-center">
              <Link
                href="/newsroom"
                className="text-sm font-semibold text-neutral-400 hover:text-neutral-600 transition-colors"
                data-testid="link-back-newsroom"
              >
                ← View all posts
              </Link>
            </div>
          </div>

          <div className="max-w-3xl mx-auto space-y-10" data-testid="post-list">
            {filteredPosts.length === 0 ? (
              <p className="text-center text-neutral-400 font-medium py-12" data-testid="text-no-posts">
                No posts with this tag yet. Check back soon.
              </p>
            ) : (
              filteredPosts.map((post) => (
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
                      {post.tags.map((t) => (
                        <Link
                          key={t}
                          href={`/newsroom/tag/${t}`}
                          className={`text-xs font-medium transition-colors ${
                            t === tag
                              ? "text-neutral-700 font-bold"
                              : "text-neutral-400 hover:text-neutral-600"
                          }`}
                          data-testid={`tag-link-${t}`}
                        >
                          #{getTagBySlug(t)?.name || t}
                        </Link>
                      ))}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export async function generateStaticParams() {
  return getAllTags().map((slug) => ({ tag: slug }));
}
