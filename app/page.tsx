import Link from "next/link";
import { type SanityDocument } from "next-sanity";
import { client } from "@/sanity/Client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define proper types for our post structure
interface Category {
  title: string;
}

interface Author {
  name: string;
}

interface Post extends SanityDocument {
  title: string;
  slug: {
    current: string;
  };
  publishedAt: string;
  author: Author;
  categories?: Category[];
}

// Updated query with better formatting and validation
const POSTS_QUERY = `
  *[
    _type == "post"
    && defined(slug.current)
    && defined(publishedAt)
    && status == "published"
  ] | order(publishedAt desc)[0...12] {
    _id,
    title,
    slug,
    publishedAt,
    "author": author->{name},
    "categories": categories[]->{title}
  }
`;

const options = {
  next: {
    revalidate: 30,
  },
};

export default async function BlogIndexPage() {
  const posts = await client.fetch<Post[]>(POSTS_QUERY, {}, options);

  if (!posts?.length) {
    return (
      <main className="container mx-auto min-h-screen max-w-3xl p-8">
        <h1 className="text-4xl font-bold mb-8">Blog Posts</h1>
        <p className="text-gray-600">No posts found.</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto min-h-screen max-w-3xl p-8">
      <h1 className="text-4xl font-bold mb-8">Blog Posts</h1>
      <div className="grid gap-6">
        {posts.map((post) => (
          <Card key={post._id} className="hover:shadow-lg transition-shadow duration-200">
            <Link href={`/blog/${post.slug.current}`}>
              <CardHeader>
                <CardTitle className="text-xl hover:text-blue-600 transition-colors">{post.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Published on {format(new Date(post.publishedAt), "MMMM d, yyyy")}</p>
                  <div className="flex flex-wrap gap-2 items-center text-sm text-gray-500">
                    <span>By {post.author.name}</span>
                    {post.categories && post.categories.length > 0 && (
                      <>
                        <span>•</span>
                        <span>Categories: {post.categories.map((cat) => cat.title).join(", ")}</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </main>
  );
}
