import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AnnouncementBar } from "@/components/announcement-bar";
import { getPostsByCategory } from "@/content/blog/posts";
import { categories, getCategoryBySlug, getTagBySlug } from "@/content/blog/taxonomy";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = getCategoryBySlug(category);
  if (!cat) return {};

  return {
    title: `${cat.name} — CreditClaw Newsroom`,
    description: cat.description,
    openGraph: {
      title: `${cat.name} — CreditClaw Newsroom`,
      description: cat.description,
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

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const cat = getCategoryBySlug(category);

  if (!cat) {
    notFound();
  }

  const filteredPosts = getPostsByCategory(category);

  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <AnnouncementBar />
      <Nav />

      <main className="pt-40 pb-24">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h1
              className="text-5xl md:text-7xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-6"
              data-testid="heading-category"
            >
              {cat.name}
            </h1>
            <p className="text-xl text-neutral-500 font-medium leading-relaxed" data-testid="text-category-description">
              {cat.description}
            </p>
          </div>

          <div className="max-w-3xl mx-auto mb-12">
            <div className="flex flex-wrap gap-2 justify-center" data-testid="category-filter">
              <Link
                href="/newsroom"
                className="px-4 py-1.5 rounded-full text-sm font-semibold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                data-testid="category-link-all"
              >
                All
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/newsroom/category/${c.slug}`}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    c.slug === category
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                  data-testid={`category-link-${c.slug}`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="max-w-3xl mx-auto space-y-10" data-testid="post-list">
            {filteredPosts.length === 0 ? (
              <p className="text-center text-neutral-400 font-medium py-12" data-testid="text-no-posts">
                No posts in this category yet. Check back soon.
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
  return categories.map((cat) => ({ category: cat.slug }));
}
