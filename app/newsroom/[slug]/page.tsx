import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AnnouncementBar } from "@/components/announcement-bar";
import { DocRenderer } from "@/app/docs/[...slug]/doc-renderer";
import { posts, getPostBySlug } from "@/content/blog/posts";
import { categories, getTagsBySlug } from "@/content/blog/taxonomy";
import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} — CreditClaw Newsroom`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      url: `${BASE_URL}/newsroom/${post.slug}`,
      ...(post.ogImage ? { images: [{ url: post.ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
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

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const mdPath = path.join(process.cwd(), "content", "blog", `${slug}.md`);
  let content = "";
  try {
    content = fs.readFileSync(mdPath, "utf-8");
  } catch {
    content = `# ${post.title}\n\nThis post is coming soon.`;
  }

  const tagObjects = getTagsBySlug(post.tags);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    url: `${BASE_URL}/newsroom/${post.slug}`,
    author: {
      "@type": "Organization",
      name: "CreditClaw Team",
    },
    publisher: {
      "@type": "Organization",
      name: "CreditClaw",
      url: BASE_URL,
    },
  };

  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <AnnouncementBar />
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="pt-40 pb-24">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <Link
              href="/newsroom"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-400 hover:text-neutral-600 transition-colors mb-8"
              data-testid="link-back-newsroom"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Newsroom
            </Link>

            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Link
                  href={`/newsroom/category/${post.category}`}
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                  data-testid="post-category-badge"
                >
                  {getCategoryName(post.category)}
                </Link>
                <time className="text-sm text-neutral-400 font-medium" dateTime={post.date} data-testid="post-date">
                  {formatDate(post.date)}
                </time>
              </div>
            </div>

            <article
              className="prose prose-lg prose-neutral max-w-none prose-headings:font-bold prose-h1:text-4xl prose-h1:mb-6 prose-h1:leading-tight prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-neutral-600 prose-p:leading-relaxed prose-p:mb-5 prose-li:text-neutral-600 prose-li:leading-relaxed prose-ul:my-4 prose-ol:my-4 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-neutral-900 prose-pre:text-neutral-100 prose-strong:text-neutral-900 prose-table:text-sm prose-th:text-left prose-th:text-neutral-500 prose-th:font-semibold prose-th:uppercase prose-th:tracking-wider prose-th:text-xs prose-td:py-2 prose-hr:my-8"
              data-testid="post-content"
            >
              <DocRenderer content={content} />
            </article>

            {tagObjects.length > 0 && (
              <div className="mt-10 pt-6 border-t border-neutral-200" data-testid="post-tags">
                <div className="flex flex-wrap gap-2">
                  {tagObjects.map((tag) => (
                    <Link
                      key={tag.slug}
                      href={`/newsroom/tag/${tag.slug}`}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
                      data-testid={`post-tag-${tag.slug}`}
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export async function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}
