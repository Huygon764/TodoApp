import { Fragment, type MouseEvent, type KeyboardEvent } from "react";
import { linkifyTitle } from "@/lib/linkifyTitle";

interface LinkifiedTextProps {
  text: string;
}

function stopLinkActivation(event: MouseEvent | KeyboardEvent) {
  event.stopPropagation();
}

/**
 * Renders title text with http(s) URLs as links.
 * Clicking a link opens a new tab and does not start inline edit.
 */
export function LinkifiedText({ text }: LinkifiedTextProps) {
  return (
    <>
      {linkifyTitle(text).map((segment, index) =>
        segment.kind === "link" ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-hover hover:underline cursor-pointer"
            onClick={stopLinkActivation}
            onKeyDown={stopLinkActivation}
          >
            {segment.value}
          </a>
        ) : (
          <Fragment key={index}>{segment.value}</Fragment>
        ),
      )}
    </>
  );
}
