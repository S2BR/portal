import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

/**
 * Renders trusted markdown (our own content files) as styled React — no `dangerouslySetInnerHTML`.
 * Elements are mapped to Tailwind classes for a clean, theme- and RTL-aware reading layout.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      // Give headings stable id slugs so the preview rail can anchor to and scroll-spy them.
      rehypePlugins={[rehypeSlug]}
      components={{
        h1: (props) => (
          <h1
            className="font-heading mb-3 text-3xl font-semibold tracking-tight"
            {...props}
          />
        ),
        h2: (props) => (
          <h2
            className="mt-10 mb-3 text-xl font-semibold tracking-tight"
            {...props}
          />
        ),
        h3: (props) => <h3 className="mt-6 mb-2 font-semibold" {...props} />,
        p: (props) => (
          <p
            className="text-muted-foreground my-4 leading-relaxed"
            {...props}
          />
        ),
        ul: (props) => (
          <ul
            className="text-muted-foreground my-4 list-disc space-y-1.5 ps-6"
            {...props}
          />
        ),
        ol: (props) => (
          <ol
            className="text-muted-foreground my-4 list-decimal space-y-1.5 ps-6"
            {...props}
          />
        ),
        li: (props) => <li className="leading-relaxed" {...props} />,
        a: (props) => (
          <a className="text-primary underline underline-offset-4" {...props} />
        ),
        strong: (props) => (
          <strong className="text-foreground font-semibold" {...props} />
        ),
        hr: () => <hr className="border-border my-8" />,
        blockquote: (props) => (
          <blockquote
            className="border-brand-gold/70 text-muted-foreground my-6 border-s-4 ps-4"
            {...props}
          />
        ),
        code: (props) => (
          <code className="bg-muted rounded px-1.5 py-0.5 text-sm" {...props} />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
