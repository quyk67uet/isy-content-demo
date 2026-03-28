import { clsx, ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import "katex/dist/katex.min.css";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import Image from "next/image";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Predefined color palette
const colors = [
  "#6366f1", // indigo-600
  "#4ade80", // green-400
  "#f97316", // orange-500
  "#22d3ee", // cyan-400
  "#a855f7", // violet-500
  "#fb923c", // amber-400
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#eab308", // yellow-500
  "#ef4444", // red-500
];

// Simple hash function to get a consistent index based on string
// Ensures the same topic name always gets the same color index.
const simpleHash = (str: string): number => {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

/**
 * Assigns a color from the predefined palette based on the topic name or ID.
 * For chapters, uses the chapter number (name field) to ensure distinct colors.
 *
 * @param {string} topicName - The name of the topic
 * @param {number|string} topicId - The ID/name of the topic (chapter number)
 * @returns {string} A hex color code
 */
export const getTopicColor = (
  topicName: string,
  topicId: number | string
): string => {
  // Check if this is a chapter topic (starts with "Chương")
  if (typeof topicName === "string" && topicName.startsWith("Chương")) {
    // Use the chapter number (topicId) to pick a color
    // Convert topicId to number if it's a string
    const chapterNum =
      typeof topicId === "number" ? topicId : parseInt(topicId, 10);

    // Make sure we have a valid number, otherwise fallback to hash method
    if (!isNaN(chapterNum)) {
      // Using modulo to wrap around if we have more chapters than colors
      return colors[(chapterNum - 1) % colors.length];
    }
  }

  // Fallback to original hash method for non-chapter topics or invalid IDs
  const topicNameForColor = (topicName || "")
    .replace(/^Chương \d+\.\s*/i, "")
    .trim();
  const hash = simpleHash(topicNameForColor);
  return colors[hash % colors.length];
};

export function formatDurationFromSeconds(totalSeconds: number): string {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) {
    return "N/A";
  }
  if (totalSeconds === 0) {
    return "0s";
  }
  const seconds = Math.floor(totalSeconds % 60);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

/**
 * Clean Math Style: Convert arrow symbols to aligned format
 * Removes \implies, \Rightarrow, \Leftrightarrow and converts to proper line breaks
 */
function cleanMathArrows(text: string): string {
  // Step 1: Replace arrow symbols within aligned/align environments
  text = text.replace(
    /(\\begin\{aligned?\}[\s\S]*?\\end\{aligned?\})/g,
    (match) => {
      return match
        .replace(/\s*\\implies\s*/g, " \\\\ ")
        .replace(/\s*\\Rightarrow\s*/g, " \\\\ ")
        .replace(/\s*\\Leftrightarrow\s*/g, " \\\\ ")
        .replace(/\s*=>\s*/g, " \\\\ ")
        .replace(/\s*⇒\s*/g, " \\\\ ");
    }
  );

  // Step 2: Handle inline math with arrows in the middle of text
  // Pattern: "text $expr1 \implies expr2$. more text"
  // Convert the math part to display aligned format and handle trailing punctuation
  text = text.replace(
    /\$([^$]+?)\s*(\\implies|\\Rightarrow|\\Leftrightarrow)\s*([^$]+?)\$\.?/g,
    (match, before, arrow, after) => {
      // Skip if already in aligned environment
      if (before.includes("\\begin{aligned}") || after.includes("\\end{aligned}")) {
        return match;
      }
      
      const beforeTrimmed = before.trim();
      const afterTrimmed = after.trim();
      
      // Check if both parts have alignment points (=, <, >, etc.)
      const hasAlignBefore = /[=<>≤≥]/.test(beforeTrimmed);
      const hasAlignAfter = /[=<>≤≥]/.test(afterTrimmed);
      
      if (hasAlignBefore && hasAlignAfter) {
        // Both have operators, use aligned with & for alignment
        // Try to add & before the operator
        const beforeAligned = beforeTrimmed.replace(/([=<>≤≥])/, "&$1");
        const afterAligned = afterTrimmed.replace(/([=<>≤≥])/, "&$1");
        return `\n\n$$ \\begin{aligned} ${beforeAligned} \\\\ ${afterAligned} \\end{aligned} $$\n\n`;
      } else {
        // Simple stacking without alignment
        return `\n\n$$ \\begin{aligned} ${beforeTrimmed} \\\\ ${afterTrimmed} \\end{aligned} $$\n\n`;
      }
    }
  );

  // Step 3: Handle display math $$...$$ with arrows
  text = text.replace(
    /\$\$\s*([^$]+?)\s*(\\implies|\\Rightarrow|\\Leftrightarrow)\s*([^$]+?)\s*\$\$/g,
    (match, before, arrow, after) => {
      // Skip if already in aligned environment
      if (before.includes("\\begin{aligned}")) {
        return match;
      }
      
      const beforeTrimmed = before.trim();
      const afterTrimmed = after.trim();
      
      // Add alignment on operators if present
      const hasAlignBefore = /[=<>≤≥]/.test(beforeTrimmed);
      const hasAlignAfter = /[=<>≤≥]/.test(afterTrimmed);
      
      if (hasAlignBefore && hasAlignAfter) {
        const beforeAligned = beforeTrimmed.replace(/([=<>≤≥])/, "&$1");
        const afterAligned = afterTrimmed.replace(/([=<>≤≥])/, "&$1");
        return `$$ \\begin{aligned} ${beforeAligned} \\\\ ${afterAligned} \\end{aligned} $$`;
      } else {
        return `$$ \\begin{aligned} ${beforeTrimmed} \\\\ ${afterTrimmed} \\end{aligned} $$`;
      }
    }
  );

  return text;
}

/**
 * Parse LaTeX text and render it with proper formatting
 * Handles the double backslash issue from JSON to proper LaTeX rendering
 */
export const parseLatex = (
  text: string | null | undefined
): React.ReactNode => {
  if (text === null || text === undefined || typeof text !== "string") {
    return text;
  }
  if (text.trim() === "") {
    return "";
  }

  // Preprocess HTML content from Quill editor
  if (text.includes('<div class="ql-editor')) {
    // Remove outer div wrapper
    text = text
      .replace(/^<div class="ql-editor[^>]*>/, "")
      .replace(/<\/div>$/, "");
    // Replace paragraph tags with newlines to preserve structure
    text = text.replace(/<\/?p>/g, "\n");
    // Remove any remaining HTML tags
    text = text.replace(/<[^>]*>/g, "");
  }

  // Fix double backslash issue from JSON
  // When JSON has "a \\\\ b", it becomes "a \\ b" in JavaScript string
  // We need to keep it as "a \\ b" for LaTeX to render line breaks correctly
  // This is already handled correctly by JSON.parse(), so no additional processing needed

  // Clean Math Style: Remove arrow symbols and convert to aligned format
  // Replace \implies, \Rightarrow, \Leftrightarrow with line breaks in aligned environments
  text = cleanMathArrows(text);

  // Check if text contains LaTeX syntax or markdown images
  const hasLatex = /\$\$|\\\(|\\\)|\\\[|\\\]|\$.*\$/.test(text);
  const hasMarkdownImages = /!\[.*?\]\(.*?\)/.test(text);
  const hasMarkdown = /\*\*.*\*\*|\*.*\*|`.*`|^\s*[-*+]\s|^\s*\d+\.\s/.test(
    text
  );

  // If there are LaTeX commands but no delimiters, wrap as inline math.
  const hasLatexCommands = /\\[a-zA-Z]+/.test(text);
  if (!hasLatex && hasLatexCommands) {
    text = `$${text}$`;
  }

  // If no LaTeX or images or markdown, return plain text
  if (!hasLatex && !hasLatexCommands && !hasMarkdownImages && !hasMarkdown) {
    return <span>{text}</span>;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkBreaks, remarkMath]}
      rehypePlugins={[rehypeRaw, [rehypeKatex, { throwOnError: false }]]}
      components={{
        img: ({ ...props }) => {
          const src = typeof props.src === 'string' ? props.src : '';
          const alt = typeof props.alt === 'string' ? props.alt : '';
          return (
            <Image
              src={src || ""}
              alt={alt || ""}
              width={600}
              height={256}
              className="max-h-32 w-auto rounded shadow border object-contain mx-auto my-4"
            />
          );
        },
        table: ({ ...props }) => (
          <table
            {...props}
            className="border-collapse border border-gray-300 mx-auto my-4"
          />
        ),
        th: ({ ...props }) => (
          <th
            {...props}
            className="border border-gray-300 px-2 py-1 text-center"
          />
        ),
        td: ({ ...props }) => (
          <td
            {...props}
            className="border border-gray-300 px-2 py-1 text-center"
          />
        ),
        ol: ({ children }) => <ol className="list-decimal ml-4">{children}</ol>,
        ul: ({ children }) => <ul className="list-disc ml-4">{children}</ul>,
        li: ({ children }) => <li className="mb-2">{children}</li>,
        strong: ({ children }) => (
          <strong className="text-blue-700 font-semibold">{children}</strong>
        ),
        p: ({ children }) => <p className="mb-3">{children}</p>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
};

const MODE_MAP: Record<string, string> = {
  Topics: "topics",
  "Practice Test": "practice-test",
  "Full Exam Simulation": "full-exam-simulation",
};
const MODE_MAP_REVERSE = Object.fromEntries(
  Object.entries(MODE_MAP).map(([k, v]) => [v, k])
);

export function getModeFromUrl(modeFromUrl: string | undefined): string {
  if (!modeFromUrl || modeFromUrl === "topics") return "Topics";
  return MODE_MAP_REVERSE[modeFromUrl] || "Topics";
}

export function getUrlForMode(
  mode: string
): string | { pathname: string; query: { mode: string } } {
  return mode === "Topics"
    ? "/test"
    : { pathname: "/test", query: { mode: MODE_MAP[mode] } };
}

