// The live blurred colour field behind every page (navy, indigo, lavender light, warm olive), drifting slowly.
// Pure CSS (globals.css .blob); stops under prefers-reduced-motion.
export function LiveBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#04050c]">
      <div className="blob blob-a" />
      <div className="blob blob-b" />
      <div className="blob blob-c" />
      <div className="blob blob-d" />
      <div className="absolute inset-0 bg-[#04050c]/35" />
    </div>
  );
}
