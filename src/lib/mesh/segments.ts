const AGENT_HEADER_REGEX = /--- Agent (\d+) \(([^)]+)\):\s*/g;
const COMPLETION_REGEX = /--- (?:All agents completed|Completed with errors)\./gi;
const NEW_AGENT_PREFIX = "[[mesh-agent:";
const NEW_AGENT_SUFFIX = "]]";
const NEW_AGENT_END_PREFIX = "[[mesh-agent-end:";
const NEW_AGENT_END_SUFFIX = "]]";

export type MeshAgentSegment = {
  agentIndex: number;
  provider: string;
  modelId?: string;
  content: string;
};

const stripCompletionMarkers = (text: string): string => {
  if (!text) {
    return "";
  }
  return text.replace(COMPLETION_REGEX, "").trim();
};

const parseProviderLabel = (label: string): {
  provider: string;
  modelId?: string;
} => {
  if (!label) {
    return { provider: "unknown" };
  }

  const segments = label.trim().split(/\s+/);
  const provider = segments.shift() ?? "unknown";
  const modelId = segments.length > 0 ? segments.join(" ") : undefined;

  return {
    provider,
    modelId,
  };
};

const extractNewFormatSegments = (text: string): MeshAgentSegment[] => {
  const segments: MeshAgentSegment[] = [];
  let cursor = 0;

  console.log("=== Starting segment extraction ===");
  console.log("Full text length:", text.length);

  while (cursor < text.length) {
    const startIndex = text.indexOf(NEW_AGENT_PREFIX, cursor);
    if (startIndex === -1) {
      console.log("No more agent prefixes found at cursor:", cursor);
      break;
    }

    const metaStart = startIndex + NEW_AGENT_PREFIX.length;
    const metaEnd = text.indexOf(NEW_AGENT_SUFFIX, metaStart);
    if (metaEnd === -1) {
      console.log("No closing bracket found for metadata");
      break;
    }

    const metaRaw = text.slice(metaStart, metaEnd);
    console.log("Metadata raw:", metaRaw);
    
    let metadata: { index?: number; agentIndex?: number; provider?: string; modelId?: string | null } | null = null;
    try {
      metadata = JSON.parse(metaRaw);
      console.log("Parsed metadata:", metadata);
    } catch (e) {
      console.log("Failed to parse metadata:", e);
      cursor = metaEnd + NEW_AGENT_SUFFIX.length;
      continue;
    }

    const agentIndex = Number(metadata?.index ?? metadata?.agentIndex ?? 0);
    if (!Number.isFinite(agentIndex) || agentIndex <= 0) {
      console.log("Invalid agent index:", agentIndex);
      cursor = metaEnd + NEW_AGENT_SUFFIX.length;
      continue;
    }

    console.log("Processing agent:", agentIndex);

    const contentStart = metaEnd + NEW_AGENT_SUFFIX.length;
    const endMarker = `${NEW_AGENT_END_PREFIX}${agentIndex}${NEW_AGENT_END_SUFFIX}`;
    const endIndex = text.indexOf(endMarker, contentStart);
    
    console.log("Agent", agentIndex, "- contentStart:", contentStart, "endIndex:", endIndex);
    
    // Simple extraction: content is between start and end marker (or end of text)
    const contentEnd = endIndex !== -1 ? endIndex : text.length;
    let rawContent = text.slice(contentStart, contentEnd);
    
    console.log("Raw content for agent", agentIndex, "length:", rawContent.length, "preview:", rawContent.substring(0, 100));

    // Clean up the content
    rawContent = rawContent.replace(/\[\[mesh-agent:[^\]]*\]\]/g, '');
    rawContent = rawContent.replace(/\[\[mesh-agent-end:\d+\]\]/g, '');
    rawContent = stripCompletionMarkers(rawContent).trim();
    
    console.log("Cleaned content for agent", agentIndex, "length:", rawContent.length);

    segments.push({
      agentIndex,
      provider: metadata?.provider ?? "unknown",
      modelId: metadata?.modelId ?? undefined,
      content: rawContent,
    });

    // Move cursor past the end marker or to the end of content
    cursor = endIndex !== -1 ? endIndex + endMarker.length : contentEnd;
    console.log("Moving cursor to:", cursor);
  }

  console.log("=== Extraction complete, found", segments.length, "segments ===");
  return segments;
};

export const extractMeshAgentSegments = (text: string): MeshAgentSegment[] => {
  if (!text) {
    return [];
  }

  const newFormatSegments = extractNewFormatSegments(text);
  if (newFormatSegments.length > 0) {
    return newFormatSegments.sort((a, b) => a.agentIndex - b.agentIndex);
  }

  if (!text.includes("--- Agent ")) {
    return [];
  }

  const parts = text.split(AGENT_HEADER_REGEX);
  if (parts.length < 3) {
    return [];
  }

  const segments: MeshAgentSegment[] = [];

  for (let i = 1; i < parts.length; i += 3) {
    const indexRaw = Number(parts[i]);
    if (!Number.isFinite(indexRaw)) {
      continue;
    }

    const label = (parts[i + 1] ?? "").trim();
    const content = stripCompletionMarkers(parts[i + 2] ?? "");
    const { provider, modelId } = parseProviderLabel(label);

    segments.push({
      agentIndex: indexRaw,
      provider,
      modelId,
      content,
    });
  }

  return segments.sort((a, b) => a.agentIndex - b.agentIndex);
};
