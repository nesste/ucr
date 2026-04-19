import type {
  RegistryDocument,
  RegistryItem,
  RegistryItemKind,
  RegistrySurface,
} from "@ucr/schema";

import type { ProjectAdapterId, ProjectProfile } from "./adapters";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ResolvedRegistryInputValue = unknown;
export type ResolvedRegistryInputs = Record<string, ResolvedRegistryInputValue>;

export interface LoadedRegistry {
  document: RegistryDocument;
  registryFile: string;
  rootDir: string;
}

export interface RenderedRegistryOutput {
  itemName: string;
  itemVersion: string;
  instanceId: string;
  template: string;
  surface: RegistrySurface;
  sourcePath: string;
  logicalTarget: string;
  target: string;
  targetPath: string;
  content: string;
  overwrite: boolean;
}

export interface SkippedRegistryOutput {
  surface: RegistrySurface;
  target: string;
  reason: string;
}

export interface RenderedRegistryItem {
  item: RegistryItem;
  instanceId: string;
  inputs: ResolvedRegistryInputs;
  compose: string[];
  outputs: RenderedRegistryOutput[];
  skipped: SkippedRegistryOutput[];
  adapterId: ProjectAdapterId;
  profile: ProjectProfile;
  requires: string[];
  provides: string[];
}

export type InstallAction = "create" | "overwrite" | "skip" | "conflict";

export interface InstallFileOperation {
  itemName: string;
  itemVersion: string;
  instanceId: string;
  template: string;
  surface: RegistrySurface;
  sourcePath: string;
  target: string;
  targetPath: string;
  upstreamContent: string;
  localContent: string | null;
  action: InstallAction;
  reason: string;
  trackAfterApply: boolean;
}

export interface InstallPlan {
  itemKind: RegistryItemKind;
  itemName: string;
  instanceId: string;
  adapterId: ProjectAdapterId;
  profile: ProjectProfile;
  inputs: ResolvedRegistryInputs;
  compose: string[];
  operations: InstallFileOperation[];
  skipped: SkippedRegistryOutput[];
  requires: string[];
  provides: string[];
  summary: Record<InstallAction, number>;
}

export type DiffStatus =
  | "missing"
  | "identical"
  | "modified"
  | "behind"
  | "conflict"
  | "untracked";

export interface DiffEntry {
  itemName: string;
  itemVersion: string;
  instanceId: string;
  template: string;
  surface: RegistrySurface;
  sourcePath: string;
  target: string;
  targetPath: string;
  status: DiffStatus;
  reason: string;
  trackedHash: string | null;
  localHash: string | null;
  upstreamHash: string;
}

export interface DiffReport {
  itemKind: RegistryItemKind;
  itemName: string;
  instanceId: string;
  adapterId: ProjectAdapterId;
  profile: ProjectProfile;
  compose: string[];
  entries: DiffEntry[];
  skipped: SkippedRegistryOutput[];
  requires: string[];
  provides: string[];
  summary: Record<DiffStatus, number>;
}

export type UpgradeAction = "create" | "replace" | "merge" | "skip" | "conflict";

export interface UpgradeFileOperation {
  itemName: string;
  itemVersion: string;
  instanceId: string;
  template: string;
  surface: RegistrySurface;
  sourcePath: string;
  target: string;
  targetPath: string;
  baseContent: string | null;
  upstreamContent: string;
  localContent: string | null;
  mergedContent: string | null;
  action: UpgradeAction;
  reason: string;
  trackAfterApply: boolean;
}

export interface UpgradePlan {
  itemKind: RegistryItemKind;
  itemName: string;
  instanceId: string;
  adapterId: ProjectAdapterId;
  profile: ProjectProfile;
  inputs: ResolvedRegistryInputs;
  compose: string[];
  operations: UpgradeFileOperation[];
  skipped: SkippedRegistryOutput[];
  requires: string[];
  provides: string[];
  summary: Record<UpgradeAction, number>;
}
