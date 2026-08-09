/**
 * Next's built-in 404 renders inside the app shell's padded `main` (its own `100vh` then overflows
 * and sits off-center). This boundary keeps the default message but centers it in the area below the
 * header — canceling the shell's vertical padding and filling the remaining height, like the loading
 * state does.
 */
export default function NotFound() {
  return (
    <div className="-my-10 flex min-h-[calc(100svh-4rem)] items-center justify-center px-6">
      <div className="flex items-center gap-4">
        <span className="border-e pe-4 text-2xl font-medium">404</span>
        <span className="text-sm">This page could not be found.</span>
      </div>
    </div>
  );
}
