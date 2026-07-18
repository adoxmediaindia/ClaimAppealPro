import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-12 text-center bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-600">
          ClaimAppealPro
        </h1>
        <p className="text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto">
          AI-powered SaaS platform automating secure health insurance appeal letter generations. Turn claim denials into professional clinical documents.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/login"
            className="px-6 py-3 font-semibold text-sm rounded-md shadow bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            Get Started
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 font-semibold text-sm rounded-md border border-zinc-800 text-zinc-400 hover:bg-zinc-900 transition-colors"
          >
            Documentation
          </a>
        </div>
      </div>
    </main>
  );
}
