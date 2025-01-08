import type { Metadata } from "next";
import { PortableText, PortableTextReactComponents } from "@portabletext/react";
import type { TypedObject } from "@portabletext/types";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { client } from "@/sanity/Client";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Sanity Schema Types
interface SanityReference {
  _ref: string;
  _type: "reference";
}

interface SanityImage {
  _type: "image";
  asset: SanityReference;
  alt: string | undefined;
  caption?: string;
}

interface SanitySlug {
  _type: "slug";
  current: string;
}

interface Author {
  _id: string;
  name: string;
  image?: SanityImage;
}

interface Category {
  _id: string;
  title: string;
}

interface SEO {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
}

interface CodeBlock extends TypedObject {
  _type: "code";
  code: string;
  filename?: string;
  language?: string;
}

interface Post {
  _id: string;
  _type: "post";
  title: string;
  slug: SanitySlug;
  publishedAt: string;
  body: TypedObject[];
  author: Author;
  categories?: Category[];
  mainImage?: SanityImage;
  seo?: SEO;
  excerpt?: string;
  tags?: string[];
  status: "draft" | "published" | "archived";
}

interface PostPageProps {
  params: {
    slug: string;
  };
}

const POST_QUERY = `*[_type == "post" && slug.current == $slug && status == "published"][0]{
  _id,
  _type,
  title,
  slug,
  publishedAt,
  body,
  excerpt,
  "author": author->{
    _id,
    name,
    image
  },
  "categories": categories[]->{
    _id,
    title
  },
  mainImage {
    asset->,
    alt,
    caption
  },
  tags,
  seo,
  status
}` as const;

const { projectId, dataset } = client.config();
if (!projectId || !dataset) {
  throw new Error("Sanity project ID and dataset are required");
}
const builder = imageUrlBuilder({ projectId, dataset });
const urlFor = (source: SanityImageSource) => builder.image(source);

// Custom components for PortableText with proper TypeScript types
const components: Partial<PortableTextReactComponents> = {
  types: {
    image: ({ value }: { value: SanityImage }) => {
      const imageUrl = urlFor(value)?.width(800).url();
      if (!imageUrl) return null;

      return (
        <figure className="my-8">
          <Image src={imageUrl} alt={value.alt || ""} width={800} height={450} className="rounded-lg" />
          {value.caption && <figcaption className="text-center text-sm text-gray-500 mt-2">{value.caption}</figcaption>}
        </figure>
      );
    },
    code: ({ value }: { value: CodeBlock }) => (
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
        <code className={cn("text-sm", value.language && `language-${value.language}`)}>{value.code}</code>
        {value.filename && <div className="text-xs text-gray-500 mt-2">{value.filename}</div>}
      </pre>
    ),
  },
  block: {
    h1: ({ children }) => <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>,
    h2: ({ children }) => <h2 className="text-2xl font-bold mt-6 mb-3">{children}</h2>,
    h3: ({ children }) => <h3 className="text-xl font-bold mt-4 mb-2">{children}</h3>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 my-4 italic">{children}</blockquote>,
  },
};

// Metadata generation for the page
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = await client.fetch<Post>(POST_QUERY, params, {
    next: { revalidate: 30 },
  });

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.seo?.metaTitle ?? post.title,
    description: post.seo?.metaDescription ?? post.excerpt ?? undefined,
    keywords: post.seo?.keywords ?? undefined,
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await client.fetch<Post>(POST_QUERY, params, {
    next: { revalidate: 30 },
  });

  if (!post) {
    return (
      <main className="container mx-auto min-h-screen max-w-3xl p-8">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to posts
        </Link>
        <h1 className="text-4xl font-bold">Post not found</h1>
      </main>
    );
  }

  const mainImageUrl = post.mainImage ? urlFor(post.mainImage).width(1200).height(675).url() : null;

  return (
    <main className="container mx-auto min-h-screen max-w-3xl p-8">
      <Link href="/" className="text-blue-600 hover:underline mb-8 inline-block">
        ← Back to posts
      </Link>

      <article className="space-y-8">
        {mainImageUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl">
            <Image src={mainImageUrl} alt={post.mainImage?.alt || post.title} fill className="object-cover" priority />
            {post.mainImage?.caption && <p className="absolute bottom-0 w-full bg-black/60 p-2 text-sm text-white">{post.mainImage.caption}</p>}
          </div>
        )}

        <div className="space-y-4">
          <h1 className="text-4xl font-bold">{post.title}</h1>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <time dateTime={post.publishedAt}>{format(new Date(post.publishedAt), "MMMM d, yyyy")}</time>
            <span>•</span>
            <span>By {post.author.name}</span>
            {post.categories && post.categories.length > 0 && (
              <>
                <span>•</span>
                <span>{post.categories.map((cat) => cat.title).join(", ")}</span>
              </>
            )}
          </div>

          {post.excerpt && <p className="text-lg text-gray-600 italic">{post.excerpt}</p>}
        </div>

        <div className="prose prose-lg max-w-none">
          <PortableText value={post.body} components={components} />
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-8">
            {post.tags.map((tag) => (
              <span key={tag} className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700">
                {tag}
              </span>
            ))}
          </div>
        )}

        {post.seo && (
          <Card className="mt-12">
            <CardContent className="space-y-4 pt-6">
              <h2 className="text-xl font-semibold">SEO Information</h2>
              {post.seo.metaTitle && (
                <p>
                  <strong>Meta Title:</strong> {post.seo.metaTitle}
                </p>
              )}
              {post.seo.metaDescription && (
                <p>
                  <strong>Meta Description:</strong> {post.seo.metaDescription}
                </p>
              )}
              {post.seo.keywords && post.seo.keywords.length > 0 && (
                <p>
                  <strong>Meta Keywords:</strong> {post.seo.keywords.join(", ")}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </article>
    </main>
  );
}
