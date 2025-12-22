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

const extractNewFormatSegments = (text: string): MeshAgentSegment[] => {
  const segments: MeshAgentSegment[] = [];
  const segmentMap: Map<number, MeshAgentSegment> = new Map();

  let cursor = 0;

  while (cursor < text.length) {
    const startIndex = text.indexOf(NEW_AGENT_PREFIX, cursor);
    if (startIndex === -1) {
      break;
    }

    const metaStart = startIndex + NEW_AGENT_PREFIX.length;
    const metaEnd = text.indexOf(NEW_AGENT_SUFFIX, metaStart);
    if (metaEnd === -1) {
      break;
    }

    const metaRaw = text.slice(metaStart, metaEnd);

    let metadata: {
      index?: number;
      agentIndex?: number;
      provider?: string;
      modelId?: string | null;
    } | null = null;
    try {
      metadata = JSON.parse(metaRaw);
    } catch (e) {
      cursor = metaEnd + NEW_AGENT_SUFFIX.length;
      continue;
    }

    const agentIndex = Number(metadata?.index ?? metadata?.agentIndex ?? 0);
    if (!Number.isFinite(agentIndex) || agentIndex <= 0) {
      cursor = metaEnd + NEW_AGENT_SUFFIX.length;
      continue;
    }

    const contentStart = metaEnd + NEW_AGENT_SUFFIX.length;
    const endMarker = `${NEW_AGENT_END_PREFIX}${agentIndex}${NEW_AGENT_END_SUFFIX}`;
    const endIndex = text.indexOf(endMarker, contentStart);

    // Extract content - if no end marker yet, agent is still streaming
    const contentEnd = endIndex !== -1 ? endIndex : text.length;
    let rawContent = text.slice(contentStart, contentEnd);

    // Clean up the content - remove any nested agent markers
    rawContent = rawContent.replace(/\[\[mesh-agent:[^\]]*\]\]/g, "");
    rawContent = rawContent.replace(/\[\[mesh-agent-end:\d+\]\]/g, "");
    rawContent = rawContent.trim();

    // Update or add segment (handles streaming updates)
    segmentMap.set(agentIndex, {
      agentIndex,
      provider: metadata?.provider ?? "unknown",
      modelId: metadata?.modelId ?? undefined,
      content: rawContent,
    });

    // Move cursor past the end marker or to the end of content
    cursor = endIndex !== -1 ? endIndex + endMarker.length : contentEnd;
  }

  // Convert map to array and sort by completion order (not index order)
  // This allows displaying agents as they finish, not in sequential order
  return Array.from(segmentMap.values());
};

export const extractMeshAgentSegments = (text: string): MeshAgentSegment[] => {
  if (!text) {
    return [];
  }

  // Extract segments - they appear in order of completion, not agent index
  // Keep them in completion order for true parallel streaming visualization
  return extractNewFormatSegments(text);
};
