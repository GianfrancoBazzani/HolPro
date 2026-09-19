import { Fragment } from "react";
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(<em>[^<>]*<\/em>)/g)
        .map((part, index) =>
          part.startsWith("<em>") && part.endsWith("</em>") ? (
            <em key={index}>{part.slice(4, -5)}</em>
          ) : (
            <Fragment key={index}>{part}</Fragment>
          ),
        )}
    </>
  );
}
