
'use client';

import React from 'react';
import Link from 'next/link';

interface ChatMessageRendererProps {
  text: string;
}

const ChatMessageRenderer: React.FC<ChatMessageRendererProps> = ({ text }) => {
  // Regex to find mentions like @[Display Text](/licitacoes/ID)
  // It captures:
  // 1. The display text inside square brackets (e.g., "Licitação PREGÃO 123/2024")
  // 2. The path inside parentheses (e.g., "/licitacoes/LIC-123")
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Push the text before the mention
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Push the mention as a Link
    const displayText = match[1];
    const href = match[2];
    parts.push(
      <Link href={href} key={match.index} className="text-primary hover:underline font-medium bg-primary/10 px-1 py-0.5 rounded-sm">
        {displayText}
      </Link>
    );
    lastIndex = mentionRegex.lastIndex;
  }

  // Push any remaining text after the last mention
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts.map((part, i) => <React.Fragment key={i}>{part}</React.Fragment>)}</>;
};

export default ChatMessageRenderer;
