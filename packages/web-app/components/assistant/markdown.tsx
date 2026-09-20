"use client";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeHighlight];
const components: Components = {
  a: ({ href, children, title }) => (
    <a href={href} title={title} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  img: ({ alt }) => <span>{alt}</span>,
  table: ({ children }) => (
    <div className="assistant-table"><table>{children}</table></div>
  ),
};

export function Markdown({ text }: { text: string }) {
  return (
    <div className="assistant-markdown">
      <ReactMarkdown
        skipHtml
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
