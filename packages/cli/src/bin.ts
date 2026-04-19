#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import type { ProjectAdapterId } from "@ucr/core";

import type { CommandContext } from "./commands/add";
import { runAddCommand } from "./commands/add";
import { runDiffCommand } from "./commands/diff";
import { runInitCommand } from "./commands/init";
import { runListCommand } from "./commands/list";
import { runShowCommand } from "./commands/show";
import { runUpgradeCommand } from "./commands/upgrade";

function printHelp(): void {
  console.log(`ucr <command> [item] [--registry <path>] [--target <path>] [--instance <id>] [--input key=value] [--input-file key=path] [--force]

Commands:
  init      Create .ucr/config.json in the target project.
  list      Show registry items available in the configured registry.
  show      Show one registry item, its inputs, and adapter support.
  add       Install one registry item from source-only templates.
  diff      Compare one installed instance against the rendered upstream source.
  upgrade   Apply safe upgrades to one installed instance.

Options:
  --registry <path>             Registry JSON file. Optional: uses this flag, then .ucr/config.json, then UCR_REGISTRY, then walks up for fixtures/registries/ucr-official/registry.json.
  --target <path>               Target project root. Defaults to the current directory.
  --adapter <id>                Adapter override for \`init\` (\`bun-http\` or \`next-app-router\`).
  --instance <id>               Required for \`block\` items. Utilities and presets default to their item name.
  --input <key=value>           Repeated typed input for templated items.
  --input-file <key=path>       Repeated input file, useful for JSON values.
  --force                       Apply install or upgrade writes even when conflicts would normally abort.
`);
}

interface ParsedCommandContext {
  command: string;
  itemName: string;
  registryPath: string | undefined;
  targetRoot: string;
  adapterId: ProjectAdapterId | undefined;
  instanceId: string;
  force: boolean;
  help: boolean;
  rawInputs: Record<string, string>;
}

function parseAssignment(rawEntry: string, label: string): { key: string; value: string } {
  const equalsIndex = rawEntry.indexOf("=");

  if (equalsIndex <= 0 || equalsIndex === rawEntry.length - 1) {
    throw new Error(`Invalid ${label} "${rawEntry}". Expected key=value.`);
  }

  return {
    key: rawEntry.slice(0, equalsIndex),
    value: rawEntry.slice(equalsIndex + 1),
  };
}

async function resolveRawInputs(
  inlineEntries: string[],
  fileEntries: string[],
): Promise<Record<string, string>> {
  const rawInputs: Record<string, string> = {};

  for (const entry of inlineEntries) {
    const assignment = parseAssignment(entry, "--input");
    rawInputs[assignment.key] = assignment.value;
  }

  for (const entry of fileEntries) {
    const assignment = parseAssignment(entry, "--input-file");
    const absolutePath = path.resolve(assignment.value);
    rawInputs[assignment.key] = await fs.readFile(absolutePath, "utf8");
  }

  return rawInputs;
}

async function createCommandContext(): Promise<ParsedCommandContext> {
  const parsed = parseArgs({
    allowPositionals: true,
    options: {
      registry: {
        type: "string",
        short: "r",
      },
      target: {
        type: "string",
        short: "t",
      },
      adapter: {
        type: "string",
      },
      instance: {
        type: "string",
      },
      input: {
        type: "string",
        multiple: true,
      },
      "input-file": {
        type: "string",
        multiple: true,
      },
      force: {
        type: "boolean",
        default: false,
      },
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
    },
  });

  const [command = "", itemName = ""] = parsed.positionals;
  const adapterValue = parsed.values.adapter;

  if (
    adapterValue !== undefined &&
    adapterValue !== "bun-http" &&
    adapterValue !== "next-app-router"
  ) {
    throw new Error('Adapter must be "bun-http" or "next-app-router".');
  }

  return {
    command,
    itemName,
    registryPath: parsed.values.registry
      ? path.resolve(parsed.values.registry)
      : undefined,
    targetRoot: path.resolve(parsed.values.target ?? process.cwd()),
    adapterId: adapterValue,
    instanceId: parsed.values.instance ?? "",
    force: parsed.values.force,
    help: parsed.values.help || command.length === 0,
    rawInputs: await resolveRawInputs(
      parsed.values.input ?? [],
      parsed.values["input-file"] ?? [],
    ),
  };
}

async function main(): Promise<void> {
  const parsed = await createCommandContext();

  if (parsed.help) {
    printHelp();
    return;
  }

  const context: CommandContext = {
    registryPath: parsed.registryPath,
    targetRoot: parsed.targetRoot,
    itemName: parsed.itemName,
    instanceId: parsed.instanceId,
    rawInputs: parsed.rawInputs,
    force: parsed.force,
  };

  switch (parsed.command) {
    case "init":
      await runInitCommand({
        registryPath: parsed.registryPath,
        targetRoot: parsed.targetRoot,
        adapterId: parsed.adapterId,
      });
      break;
    case "list":
      await runListCommand({
        registryPath: parsed.registryPath,
        targetRoot: parsed.targetRoot,
      });
      break;
    case "show":
      if (parsed.itemName.length === 0) {
        throw new Error("Missing required item name.");
      }
      await runShowCommand({
        registryPath: parsed.registryPath,
        targetRoot: parsed.targetRoot,
        itemName: parsed.itemName,
      });
      break;
    case "add":
      if (parsed.itemName.length === 0) {
        throw new Error("Missing required item name.");
      }
      await runAddCommand(context);
      break;
    case "diff":
      if (parsed.itemName.length === 0) {
        throw new Error("Missing required item name.");
      }
      await runDiffCommand(context);
      break;
    case "upgrade":
      if (parsed.itemName.length === 0) {
        throw new Error("Missing required item name.");
      }
      await runUpgradeCommand(context);
      break;
    default:
      throw new Error(`Unknown command "${parsed.command}".`);
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ucr: ${message}`);
  process.exitCode = 1;
});
