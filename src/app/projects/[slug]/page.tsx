import Link from 'next/link';

export default async function ProjectTemplate({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col pt-24 pb-12 px-6 sm:px-12">
            <div className="max-w-4xl mx-auto w-full">
                {/* Navigation */}
                <nav className="mb-12">
                    <Link
                        href="/"
                        className="inline-flex items-center text-zinc-500 hover:text-zinc-900 transition-colors font-mono text-sm"
                    >
                        ← back to portfolio
                    </Link>
                </nav>

                {/* Header */}
                <header className="mb-16">
                    <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 mb-6 capitalize leading-tight">
                        {slug.replace(/-/g, ' ')}
                    </h1>
                    <div className="flex flex-wrap gap-4 text-sm text-zinc-600 font-mono">
                        <span className="px-3 py-1 bg-zinc-200 rounded-full">Project Template</span>
                        <span className="px-3 py-1 bg-zinc-200 rounded-full">2026</span>
                    </div>
                </header>

                {/* Hero Image */}
                <div className="aspect-video w-full bg-zinc-200 rounded-2xl mb-16 overflow-hidden border border-zinc-300">
                    <img
                        src={`https://placehold.co/1200x800/e4e4e7/52525b?text=${slug}`}
                        alt={slug}
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Content */}
                <article className="prose prose-zinc max-w-none lg:prose-lg">
                    <h2>Overview</h2>
                    <p>
                        This is a dynamically routed template page for <strong>{slug}</strong>.
                        All clicks from the holographic dodecahedron panels resolve to this template utilizing Next.js App Router dynamic segments (<code>[slug]</code>).
                    </p>

                    <h3>The Challenge</h3>
                    <p>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                    </p>

                    <h3>The Solution</h3>
                    <p>
                        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                    </p>
                </article>
            </div>
        </div>
    );
}
