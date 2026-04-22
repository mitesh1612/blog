import type { Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

/**
 * Remark plugin that transforms container directives into styled callout boxes.
 *
 * Usage in markdown:
 *   :::info
 *   This is an informational callout.
 *   :::
 *
 *   :::warning
 *   Watch out for this gotcha!
 *   :::
 *
 *   :::success
 *   This approach works great.
 *   :::
 *
 *   :::quote
 *   A wise person once said...
 *   :::
 *
 * Optionally provide a custom title:
 *   :::info[Did you know?]
 *   Custom titled callout.
 *   :::
 */

const VARIANTS = ["info", "warning", "success", "quote"] as const;
type Variant = (typeof VARIANTS)[number];

const VARIANT_LABELS: Record<Variant, string> = {
  info: "Info",
  warning: "Warning",
  success: "Success",
  quote: "Quote",
};

const VARIANT_ICONS: Record<Variant, string> = {
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`,
  quote: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>`,
};

const remarkCallout: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, (node: any) => {
      if (
        node.type === "containerDirective" &&
        VARIANTS.includes(node.name as Variant)
      ) {
        const variant = node.name as Variant;
        const data = node.data || (node.data = {});

        // Extract custom title from directive label, e.g. :::info[Custom Title]
        // No default title — only show one if explicitly provided
        let title: string | null = null;
        if (
          node.children?.[0]?.data?.directiveLabel &&
          node.children[0].type === "paragraph"
        ) {
          const labelNode = node.children.shift();
          title = labelNode.children
            .map((c: any) => c.value || "")
            .join("");
        }

        const icon = VARIANT_ICONS[variant];

        data.hName = "aside";
        data.hProperties = {
          class: `callout callout-${variant}`,
          role: "note",
        };

        // Prepend the decorative left edge + floating icon + title
        node.children.unshift({
          type: "html",
          value: `<div class="callout-edge"><div class="callout-edge-line"></div></div><div class="callout-icon-wrapper"><span class="callout-icon">${icon}</span></div>${title ? `<p class="callout-title">${title}</p>` : ""}`,
        });
      }
    });
  };
};

export default remarkCallout;
