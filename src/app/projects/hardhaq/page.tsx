import Link from 'next/link';

export default function ProjectPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col pt-24 pb-12 px-6 sm:px-12 transition-colors">
            <div className="max-w-4xl mx-auto w-full">
                <nav className="mb-12">
                    <Link href="/" className="inline-flex items-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-mono text-sm">
                        ? back to portfolio
                    </Link>
                </nav>
                <header className="mb-16">
                    <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 capitalize leading-tight">
                        hardhaq
                    </h1>
                </header>
                <article className="prose prose-zinc dark:prose-invert max-w-none lg:prose-lg">
                    <h2>?? Under Construction</h2>
                    <p>Details for this page will be added soon.</p>
                </article>
            </div>
        </div>
    );
}
