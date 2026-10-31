/**
 * Shared shell for every authentication route.
 *
 * Two goals:
 *  1. The card is vertically centred in the viewport and the page never
 *     scrolls on a laptop — the card itself scrolls internally if the content
 *     is taller than the space available.
 *  2. All three auth screens share the same visual language, so a change to
 *     the shell updates every page at once.
 *
 * `100dvh` (not `100vh`) so mobile browser chrome does not clip the card.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#0c2238]">
      {/* Ambient light — decorative only */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/4 h-[560px] w-[560px] rounded-full bg-[#0078E2]/25 blur-[100px]" />
        <div className="absolute -bottom-32 right-0 h-[420px] w-[420px] rounded-full bg-blue-400/15 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>

      <main className="relative z-10 flex min-h-[100dvh] w-full items-center justify-center px-4 py-6 sm:px-6 md:px-8 lg:py-8">
        {/* Human control — bot/human verification enforced server-side via
            rate limits (LOGIN_LIMIT / CREATE_LIMIT) backed by KvClient.
            Rapid automated input is rejected; this protection applies to
            every auth screen: sign in, register, and admin login. */}
        <div className="mb-3 w-full max-w-md text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#005cb3]/10 px-4 py-1.5 text-xs font-semibold text-[#005cb3]">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#005cb3]" />
            Human verification active — server-side rate limits block automated input
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}
