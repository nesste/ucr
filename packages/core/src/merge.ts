interface DiffOperation {
  type: "equal" | "insert" | "delete";
  line: string;
}

interface DiffChunk {
  baseStart: number;
  baseEnd: number;
  newLines: string[];
}

export type TextMergeResult =
  | {
      ok: true;
      mergedContent: string;
      reason: string;
    }
  | {
      ok: false;
      reason: string;
    };

function splitLines(content: string): string[] {
  const matches = content.match(/[^\n]*\n|[^\n]+/g);
  return matches ?? [];
}

function buildLcsTable(baseLines: string[], nextLines: string[]): number[][] {
  const rowCount = baseLines.length + 1;
  const columnCount = nextLines.length + 1;
  const table = Array.from({ length: rowCount }, () =>
    Array<number>(columnCount).fill(0),
  );

  for (let baseIndex = 1; baseIndex < rowCount; baseIndex += 1) {
    for (let nextIndex = 1; nextIndex < columnCount; nextIndex += 1) {
      if (baseLines[baseIndex - 1] === nextLines[nextIndex - 1]) {
        table[baseIndex]![nextIndex] =
          table[baseIndex - 1]![nextIndex - 1]! + 1;
      } else {
        table[baseIndex]![nextIndex] = Math.max(
          table[baseIndex - 1]![nextIndex]!,
          table[baseIndex]![nextIndex - 1]!,
        );
      }
    }
  }

  return table;
}

function buildDiffOperations(
  baseLines: string[],
  nextLines: string[],
): DiffOperation[] {
  const table = buildLcsTable(baseLines, nextLines);
  const operations: DiffOperation[] = [];

  let baseIndex = baseLines.length;
  let nextIndex = nextLines.length;

  while (baseIndex > 0 || nextIndex > 0) {
    if (
      baseIndex > 0 &&
      nextIndex > 0 &&
      baseLines[baseIndex - 1] === nextLines[nextIndex - 1]
    ) {
      operations.push({
        type: "equal",
        line: baseLines[baseIndex - 1]!,
      });
      baseIndex -= 1;
      nextIndex -= 1;
      continue;
    }

    if (
      nextIndex > 0 &&
      (baseIndex === 0 ||
        table[baseIndex]![nextIndex - 1]! >= table[baseIndex - 1]![nextIndex]!)
    ) {
      operations.push({
        type: "insert",
        line: nextLines[nextIndex - 1]!,
      });
      nextIndex -= 1;
      continue;
    }

    operations.push({
      type: "delete",
      line: baseLines[baseIndex - 1]!,
    });
    baseIndex -= 1;
  }

  return operations.reverse();
}

function buildDiffChunks(baseContent: string, nextContent: string): DiffChunk[] {
  const baseLines = splitLines(baseContent);
  const nextLines = splitLines(nextContent);
  const operations = buildDiffOperations(baseLines, nextLines);
  const chunks: DiffChunk[] = [];

  let baseIndex = 0;
  let currentChunk: DiffChunk | null = null;

  const flushChunk = (): void => {
    if (!currentChunk) {
      return;
    }

    chunks.push(currentChunk);
    currentChunk = null;
  };

  for (const operation of operations) {
    if (operation.type === "equal") {
      flushChunk();
      baseIndex += 1;
      continue;
    }

    currentChunk ??= {
      baseStart: baseIndex,
      baseEnd: baseIndex,
      newLines: [],
    };

    if (operation.type === "delete") {
      currentChunk.baseEnd += 1;
      baseIndex += 1;
      continue;
    }

    currentChunk.newLines.push(operation.line);
  }

  flushChunk();
  return chunks;
}

function isInsert(chunk: DiffChunk): boolean {
  return chunk.baseStart === chunk.baseEnd;
}

function sameChunk(left: DiffChunk, right: DiffChunk): boolean {
  return (
    left.baseStart === right.baseStart &&
    left.baseEnd === right.baseEnd &&
    left.newLines.length === right.newLines.length &&
    left.newLines.every((line, index) => line === right.newLines[index])
  );
}

function chunksConflict(left: DiffChunk, right: DiffChunk): boolean {
  if (sameChunk(left, right)) {
    return false;
  }

  if (isInsert(left) && isInsert(right)) {
    return left.baseStart === right.baseStart;
  }

  if (isInsert(left)) {
    return left.baseStart > right.baseStart && left.baseStart < right.baseEnd;
  }

  if (isInsert(right)) {
    return right.baseStart > left.baseStart && right.baseStart < left.baseEnd;
  }

  return left.baseStart < right.baseEnd && right.baseStart < left.baseEnd;
}

function chunkComesBefore(left: DiffChunk, right: DiffChunk): boolean {
  if (chunksConflict(left, right) || sameChunk(left, right)) {
    return false;
  }

  if (left.baseEnd < right.baseStart) {
    return true;
  }

  if (left.baseEnd > right.baseStart) {
    return false;
  }

  if (isInsert(left) && isInsert(right) && left.baseStart === right.baseStart) {
    return false;
  }

  return true;
}

function applyChunks(baseContent: string, chunks: DiffChunk[]): string {
  const baseLines = splitLines(baseContent);
  const sortedChunks = [...chunks].sort((left, right) => {
    if (left.baseStart !== right.baseStart) {
      return left.baseStart - right.baseStart;
    }

    if (left.baseEnd !== right.baseEnd) {
      return left.baseEnd - right.baseEnd;
    }

    return 0;
  });

  const output: string[] = [];
  let cursor = 0;

  for (const chunk of sortedChunks) {
    output.push(...baseLines.slice(cursor, chunk.baseStart));
    output.push(...chunk.newLines);
    cursor = Math.max(cursor, chunk.baseEnd);
  }

  output.push(...baseLines.slice(cursor));
  return output.join("");
}

export function mergeText(
  baseContent: string,
  localContent: string,
  upstreamContent: string,
): TextMergeResult {
  if (localContent === upstreamContent) {
    return {
      ok: true,
      mergedContent: localContent,
      reason: "Local and upstream already match.",
    };
  }

  const localChunks = buildDiffChunks(baseContent, localContent);
  const upstreamChunks = buildDiffChunks(baseContent, upstreamContent);
  const mergedChunks: DiffChunk[] = [];

  let localIndex = 0;
  let upstreamIndex = 0;

  while (localIndex < localChunks.length || upstreamIndex < upstreamChunks.length) {
    const localChunk = localChunks[localIndex];
    const upstreamChunk = upstreamChunks[upstreamIndex];

    if (!localChunk) {
      mergedChunks.push(upstreamChunk!);
      upstreamIndex += 1;
      continue;
    }

    if (!upstreamChunk) {
      mergedChunks.push(localChunk);
      localIndex += 1;
      continue;
    }

    if (sameChunk(localChunk, upstreamChunk)) {
      mergedChunks.push(localChunk);
      localIndex += 1;
      upstreamIndex += 1;
      continue;
    }

    if (chunksConflict(localChunk, upstreamChunk)) {
      return {
        ok: false,
        reason: "Smart merge could not resolve overlapping local and upstream edits.",
      };
    }

    if (chunkComesBefore(localChunk, upstreamChunk)) {
      mergedChunks.push(localChunk);
      localIndex += 1;
      continue;
    }

    mergedChunks.push(upstreamChunk);
    upstreamIndex += 1;
  }

  return {
    ok: true,
    mergedContent: applyChunks(baseContent, mergedChunks),
    reason: "Auto-merged local and upstream changes using the last tracked upstream snapshot.",
  };
}
