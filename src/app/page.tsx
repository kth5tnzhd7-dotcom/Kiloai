import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold text-white mb-4">Link Cloaker</h1>
        <p className="text-neutral-400 mb-8 max-w-md mx-auto">
          Create short URLs with custom white pages. Cloak your destination links
          with professional-looking intermediary pages.
        </p>
        <Link
          href="/cloak"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}
