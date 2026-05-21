import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  PackageSource,
  ResolvedResource,
  Settings,
  SourceInfo,
} from "@earendil-works/pi-coding-agent";
import { DefaultPackageManager, getAgentDir, SettingsManager } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

type ResourceType = "extensions" | "skills" | "prompts" | "themes";
type SettingsScope = "project" | "global";
type RunResult = "save" | "cancel";

type MutableSettings = Settings & Record<string, unknown>;
type MutablePackageSource = string | {
  source: string;
  extensions?: string[];
  skills?: string[];
  prompts?: string[];
  themes?: string[];
};

interface ManagedResource {
  id: string;
  type: ResourceType;
  path: string;
  relPath: string;
  sourceInfo: SourceInfo;
  enabled: boolean;
}

const RESOURCE_TYPES: ResourceType[] = ["extensions", "skills", "prompts", "themes"];

const TYPE_TITLE: Record<ResourceType, string> = {
  extensions: "Extensions",
  skills: "Skills",
  prompts: "Prompts",
  themes: "Themes",
};

export default function resourceControl(pi: ExtensionAPI) {
  pi.registerCommand("pi-resources", {
    description: "Choose which Pi extensions, skills, prompts, and themes run, write settings.json, then reload",
    handler: async (args, ctx) => {
      await runResourceControl(args, ctx);
    },
  });

  pi.registerCommand("resource-config", {
    description: "Alias for /pi-resources",
    handler: async (args, ctx) => {
      await runResourceControl(args, ctx);
    },
  });

  pi.registerCommand("local-resources", {
    description: "Alias for /pi-resources project",
    handler: async (_args, ctx) => {
      await runResourceControl("project", ctx);
    },
  });
}

async function runResourceControl(args: string, ctx: ExtensionCommandContext): Promise<void> {
  if (!ctx.hasUI) {
    ctx.ui.notify("/pi-resources needs the interactive UI", "warning");
    return;
  }

  await ctx.waitForIdle();

  const scope = await chooseScope(args, ctx);
  if (!scope) return;

  const allResources = await discoverResources(ctx, scope);
  const resources = allResources.filter((resource) => isManagedByScope(resource, scope));
  const hiddenCount = allResources.length - resources.length;

  if (resources.length === 0) {
    ctx.ui.notify(`No ${scope} Pi resources were discovered.`, "warning");
    return;
  }

  const desired = new Map(resources.map((resource) => [resource.id, resource.enabled]));
  const result = await showResourceWindow(ctx, scope, resources, desired, hiddenCount);
  if (result !== "save") {
    ctx.ui.notify("Pi resource settings unchanged", "info");
    return;
  }

  const changed = resources.filter((resource) => desired.get(resource.id) !== resource.enabled);
  if (changed.length === 0) {
    ctx.ui.notify("No Pi resource changes to write", "info");
    return;
  }

  try {
    const settingsPath = writeSettings(ctx.cwd, scope, changed, desired);
    ctx.ui.notify(`Updated ${settingsPath}; reloading Pi resources...`, "info");
    await ctx.reload();
  } catch (error) {
    ctx.ui.notify(`Failed to update Pi resource settings: ${errorMessage(error)}`, "error");
  }
}

async function chooseScope(args: string, ctx: ExtensionCommandContext): Promise<SettingsScope | undefined> {
  const trimmed = args.trim().toLowerCase();
  if (trimmed === "project" || trimmed === "local") return "project";
  if (trimmed === "global" || trimmed === "user") return "global";

  const choice = await ctx.ui.select("Write resource decisions to:", [
    "project — .pi/settings.json (per repo; can override package resources)",
    "global — ~/.pi/agent/settings.json (all projects; controls global top-level resources)",
  ]);

  if (!choice) return undefined;
  return choice.startsWith("global") ? "global" : "project";
}

async function discoverResources(ctx: ExtensionCommandContext, scope: SettingsScope): Promise<ManagedResource[]> {
  const settingsManager = scope === "global" ? createGlobalOnlySettingsManager(ctx.cwd) : SettingsManager.create(ctx.cwd, getAgentDir());
  const packageManager = new DefaultPackageManager({
    cwd: ctx.cwd,
    agentDir: getAgentDir(),
    settingsManager,
  });
  const resolved = await packageManager.resolve(async () => "skip");
  const resources: ManagedResource[] = [];

  for (const type of RESOURCE_TYPES) {
    for (const resource of resolved[type] as ResolvedResource[]) {
      const relPath = relativeToBase(resource.path, resource.metadata.baseDir);
      resources.push({
        id: `${type}:${resource.path}`,
        type,
        path: resource.path,
        relPath,
        sourceInfo: resource.metadata as SourceInfo,
        enabled: resource.enabled,
      });
    }
  }

  resources.sort((left, right) => {
    const byType = RESOURCE_TYPES.indexOf(left.type) - RESOURCE_TYPES.indexOf(right.type);
    if (byType !== 0) return byType;
    return resourceSortKey(left).localeCompare(resourceSortKey(right));
  });

  return resources;
}

function createGlobalOnlySettingsManager(cwd: string): SettingsManager {
  let globalText = readOptionalText(getSettingsPath(cwd, "global"));
  let projectText: string | undefined = "{}";

  return SettingsManager.fromStorage({
    withLock(scope: SettingsScope, fn: (current: string | undefined) => string | undefined): void {
      if (scope === "global") {
        globalText = fn(globalText);
      } else {
        projectText = fn(projectText);
      }
    },
  });
}

function isManagedByScope(resource: ManagedResource, scope: SettingsScope): boolean {
  if (scope === "global") {
    return resource.sourceInfo.scope === "user";
  }

  if (resource.sourceInfo.scope === "project") return true;

  // Project settings can shadow a global package by adding a project package entry
  // with the same source. They cannot disable global top-level auto resources.
  return resource.sourceInfo.origin === "package" && resource.sourceInfo.scope === "user";
}

async function showResourceWindow(
  ctx: ExtensionCommandContext,
  scope: SettingsScope,
  resources: ManagedResource[],
  desired: Map<string, boolean>,
  hiddenCount: number,
): Promise<RunResult> {
  const settingsPath = getSettingsPath(ctx.cwd, scope);

  return ctx.ui.custom<RunResult>((tui, theme, _keybindings, done) => {
    let activeType = RESOURCE_TYPES.find((type) => resources.some((resource) => resource.type === type)) ?? "extensions";
    const selectedByType: Record<ResourceType, number> = {
      extensions: 0,
      skills: 0,
      prompts: 0,
      themes: 0,
    };
    const scrollByType: Record<ResourceType, number> = {
      extensions: 0,
      skills: 0,
      prompts: 0,
      themes: 0,
    };
    let filter = "";
    let searchMode = false;
    let cachedWidth: number | undefined;
    let cachedLines: string[] | undefined;

    function resourceMatches(resource: ManagedResource): boolean {
      const query = filter.trim().toLowerCase();
      if (!query) return true;
      return [
        resource.type,
        resource.relPath,
        resource.path,
        resource.sourceInfo.source,
        resource.sourceInfo.scope,
        resource.sourceInfo.origin,
      ].some((value) => value.toLowerCase().includes(query));
    }

    function resourcesFor(type: ResourceType): ManagedResource[] {
      return resources.filter((resource) => resource.type === type && resourceMatches(resource));
    }

    function allResourcesFor(type: ResourceType): ManagedResource[] {
      return resources.filter((resource) => resource.type === type);
    }

    function currentResources(): ManagedResource[] {
      return resourcesFor(activeType);
    }

    function changedCount(): number {
      return resources.filter((resource) => (desired.get(resource.id) ?? resource.enabled) !== resource.enabled).length;
    }

    function updateStatus(): void {
      const count = changedCount();
      ctx.ui.setStatus("pi-resources", count > 0 ? `${count} pending resource change(s)` : undefined);
    }

    function refresh(): void {
      cachedLines = undefined;
      tui.requestRender();
    }

    function clampSelection(type: ResourceType = activeType): void {
      const list = resourcesFor(type);
      const maxIndex = Math.max(0, list.length - 1);
      selectedByType[type] = Math.min(Math.max(0, selectedByType[type]), maxIndex);
      scrollByType[type] = Math.min(Math.max(0, scrollByType[type]), maxIndex);
    }

    function clampAllSelections(): void {
      for (const type of RESOURCE_TYPES) {
        clampSelection(type);
      }
    }

    function ensureScroll(visibleRows: number): void {
      const listLength = currentResources().length;
      const selected = selectedByType[activeType];
      if (selected < scrollByType[activeType]) {
        scrollByType[activeType] = selected;
      }
      if (selected >= scrollByType[activeType] + visibleRows) {
        scrollByType[activeType] = selected - visibleRows + 1;
      }
      scrollByType[activeType] = Math.min(Math.max(0, scrollByType[activeType]), Math.max(0, listLength - visibleRows));
    }

    function cycleCategory(delta: number): void {
      const currentIndex = RESOURCE_TYPES.indexOf(activeType);
      activeType = RESOURCE_TYPES[(currentIndex + delta + RESOURCE_TYPES.length) % RESOURCE_TYPES.length];
      clampSelection();
      refresh();
    }

    function setCategoryByNumber(data: string): boolean {
      if (!/^[1-4]$/.test(data)) return false;
      activeType = RESOURCE_TYPES[Number(data) - 1];
      clampSelection();
      refresh();
      return true;
    }

    function moveSelection(delta: number): void {
      const list = currentResources();
      if (list.length === 0) return;
      selectedByType[activeType] = Math.min(Math.max(0, selectedByType[activeType] + delta), list.length - 1);
      refresh();
    }

    function toggleResource(resource: ManagedResource): void {
      const current = desired.get(resource.id) ?? resource.enabled;
      desired.set(resource.id, !current);
      updateStatus();
      refresh();
    }

    function toggleSelected(): void {
      const resource = currentResources()[selectedByType[activeType]];
      if (resource) toggleResource(resource);
    }

    function toggleCategory(): void {
      const list = currentResources();
      if (list.length === 0) return;
      const shouldEnable = list.some((resource) => !(desired.get(resource.id) ?? resource.enabled));
      for (const resource of list) {
        desired.set(resource.id, shouldEnable);
      }
      updateStatus();
      refresh();
    }

    function clearSearch(): void {
      filter = "";
      searchMode = false;
      clampAllSelections();
      refresh();
    }

    function handleSearchInput(data: string): void {
      if (matchesKey(data, Key.escape)) {
        clearSearch();
        return;
      }
      if (matchesKey(data, Key.enter)) {
        searchMode = false;
        refresh();
        return;
      }
      if (matchesKey(data, Key.backspace)) {
        filter = filter.slice(0, -1);
        clampAllSelections();
        refresh();
        return;
      }
      if (data.length === 1 && data >= " ") {
        filter += data;
        clampAllSelections();
        refresh();
      }
    }

    return {
      render(width: number) {
        if (cachedLines && cachedWidth === width) return cachedLines;
        if (width < 2) return [truncateToWidth("Pi Resource Control", width, "")];

        const boxWidth = Math.max(2, Math.min(width, 120));
        const innerWidth = Math.max(0, boxWidth - 2);
        const lines: string[] = [];
        const list = currentResources();
        const visibleRows = 14;
        ensureScroll(visibleRows);
        const start = scrollByType[activeType];
        const end = Math.min(list.length, start + visibleRows);
        const selected = list[selectedByType[activeType]];
        const hiddenNote = hiddenCount > 0 ? ` • ${hiddenCount} item(s) controlled by the other scope hidden` : "";

        const border = (text: string) => theme.fg("borderAccent", text);
        const pad = (text: string) => padAnsi(text, innerWidth);
        const row = (text = "") => `${border("│")}${pad(text)}${border("│")}`;
        const divider = () => border(`├${"─".repeat(innerWidth)}┤`);

        lines.push(border(`╭${"─".repeat(innerWidth)}╮`));
        lines.push(row(`${theme.fg("accent", theme.bold("Pi Resource Control"))} ${theme.fg("dim", `(${scope})`)}`));
        lines.push(row(theme.fg("dim", `Writes ${settingsPath}${hiddenNote}`)));
        lines.push(row(theme.fg("dim", "Separate categories: extensions, skills, prompts, themes.")));
        lines.push(divider());
        lines.push(row(renderCategoryTabs(resources, desired, activeType, theme)));
        lines.push(row(renderFilterLine(filter, searchMode, changedCount(), theme)));
        lines.push(divider());
        lines.push(row(theme.fg("muted", "  state  source / package                         resource")));

        if (list.length === 0) {
          const message = filter.trim()
            ? `No ${TYPE_TITLE[activeType].toLowerCase()} match filter "${filter}". Press Esc or r to clear.`
            : `No ${TYPE_TITLE[activeType].toLowerCase()} available in this scope.`;
          lines.push(row(theme.fg("warning", message)));
        } else {
          for (let index = start; index < end; index++) {
            const resource = list[index];
            lines.push(row(renderResourceRow(resource, desired, index === selectedByType[activeType], theme)));
          }
          if (list.length > visibleRows) {
            lines.push(row(theme.fg("dim", `Showing ${start + 1}-${end} of ${list.length}; use ↑↓ to scroll.`)));
          }
        }

        lines.push(divider());
        if (selected) {
          lines.push(row(`${theme.fg("accent", theme.bold("Selected"))} ${displayResourceName(selected)}`));
          lines.push(row(`${theme.fg("muted", "Source:")} ${formatOwner(selected)}`));
          lines.push(row(`${theme.fg("muted", "Path:  ")} ${selected.relPath}`));
          if (selected.sourceInfo.origin === "package" && scope === "project" && selected.sourceInfo.scope === "user") {
            lines.push(row(theme.fg("warning", "Project settings will shadow this global package resource.")));
          }
        } else {
          lines.push(row(theme.fg("dim", "No resource selected.")));
        }
        lines.push(divider());
        lines.push(row(theme.fg("dim", "↑↓ move • ←→/Tab category • Space/Enter toggle • a toggle category")));
        lines.push(row(theme.fg("dim", "/ search • r clear search • s save + /reload • Esc/q cancel")));
        lines.push(border(`╰${"─".repeat(innerWidth)}╯`));

        cachedWidth = width;
        cachedLines = lines;
        return lines;
      },
      invalidate() {
        cachedLines = undefined;
      },
      handleInput(data: string) {
        if (searchMode) {
          handleSearchInput(data);
          return;
        }

        if (matchesKey(data, Key.up)) {
          moveSelection(-1);
          return;
        }
        if (matchesKey(data, Key.down)) {
          moveSelection(1);
          return;
        }
        if (matchesKey(data, Key.left) || matchesKey(data, Key.shift("tab"))) {
          cycleCategory(-1);
          return;
        }
        if (matchesKey(data, Key.right) || matchesKey(data, Key.tab)) {
          cycleCategory(1);
          return;
        }
        if (matchesKey(data, Key.enter) || data === " ") {
          toggleSelected();
          return;
        }
        if (matchesKey(data, Key.escape) || data.toLowerCase() === "q") {
          done("cancel");
          return;
        }
        if (setCategoryByNumber(data)) return;

        const lower = data.toLowerCase();
        if (lower === "s") {
          done("save");
          return;
        }
        if (lower === "a") {
          toggleCategory();
          return;
        }
        if (lower === "r") {
          clearSearch();
          return;
        }
        if (data === "/") {
          searchMode = true;
          refresh();
        }
      },
      dispose() {
        ctx.ui.setStatus("pi-resources", undefined);
      },
    };
  });
}

function renderCategoryTabs(resources: ManagedResource[], desired: Map<string, boolean>, activeType: ResourceType, theme: { fg: (color: string, text: string) => string; bg: (color: string, text: string) => string }): string {
  return RESOURCE_TYPES.map((type, index) => {
    const typeResources = resources.filter((resource) => resource.type === type);
    const enabled = typeResources.filter((resource) => desired.get(resource.id) ?? resource.enabled).length;
    const changed = typeResources.filter((resource) => (desired.get(resource.id) ?? resource.enabled) !== resource.enabled).length;
    const label = ` ${index + 1} ${TYPE_TITLE[type]} ${enabled}/${typeResources.length}${changed ? ` Δ${changed}` : ""} `;
    if (type === activeType) return theme.bg("selectedBg", theme.fg("text", label));
    return theme.fg(changed ? "warning" : typeResources.length > 0 ? "muted" : "dim", label);
  }).join(" ");
}

function renderFilterLine(filter: string, searchMode: boolean, changedCount: number, theme: { fg: (color: string, text: string) => string }): string {
  const filterText = filter ? theme.fg("accent", filter) : theme.fg("dim", "none");
  const mode = searchMode ? theme.fg("warning", "typing search") : theme.fg("dim", "press / to search");
  const changes = changedCount > 0 ? theme.fg("warning", `${changedCount} pending change(s)`) : theme.fg("success", "no pending changes");
  return `Filter: ${filterText}  •  ${mode}  •  ${changes}`;
}

function renderResourceRow(resource: ManagedResource, desired: Map<string, boolean>, selected: boolean, theme: { fg: (color: string, text: string) => string }): string {
  const enabled = desired.get(resource.id) ?? resource.enabled;
  const changed = enabled !== resource.enabled;
  const cursor = selected ? theme.fg("accent", "›") : " ";
  const state = enabled ? theme.fg("success", "● on ") : theme.fg("dim", "○ off");
  const marker = changed ? theme.fg("warning", "±") : " ";
  const source = theme.fg("muted", truncateToWidth(formatCompactOwner(resource), 38, "…"));
  const name = selected ? theme.fg("accent", displayResourceName(resource)) : theme.fg("text", displayResourceName(resource));
  return `${cursor} ${state} ${marker} ${source}  ${name}`;
}

function displayResourceName(resource: ManagedResource): string {
  return resource.relPath;
}

function formatCompactOwner(resource: ManagedResource): string {
  const scope = resource.sourceInfo.scope === "user" ? "global" : resource.sourceInfo.scope;
  const source = resource.sourceInfo.origin === "package"
    ? resource.sourceInfo.source.replace(/^npm:/, "")
    : resource.sourceInfo.source;
  return `${scope}/${source}`;
}

function formatOwner(resource: ManagedResource): string {
  const scope = resource.sourceInfo.scope === "user" ? "global" : resource.sourceInfo.scope;
  if (resource.sourceInfo.origin === "package") {
    return `${scope} package ${resource.sourceInfo.source}`;
  }
  return `${scope} ${resource.sourceInfo.source}`;
}

function padAnsi(text: string, width: number): string {
  const truncated = truncateToWidth(text, width, "…");
  const padding = Math.max(0, width - visibleWidth(truncated));
  return `${truncated}${" ".repeat(padding)}`;
}

function resourceSortKey(resource: ManagedResource): string {
  return `${resource.sourceInfo.scope}:${resource.sourceInfo.origin}:${resource.sourceInfo.source}:${resource.relPath}`;
}

function writeSettings(
  cwd: string,
  scope: SettingsScope,
  changed: ManagedResource[],
  desired: Map<string, boolean>,
): string {
  const settingsPath = getSettingsPath(cwd, scope);
  const settings = readSettings(settingsPath);

  for (const resource of changed) {
    const enabled = desired.get(resource.id) ?? resource.enabled;
    if (resource.sourceInfo.origin === "package") {
      updatePackageResource(settings, resource, enabled);
    } else {
      updateTopLevelResource(settings, resource, enabled);
    }
  }

  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
  return settingsPath;
}

function getSettingsPath(cwd: string, scope: SettingsScope): string {
  return scope === "global" ? join(getAgentDir(), "settings.json") : join(cwd, ".pi", "settings.json");
}

function readSettings(settingsPath: string): MutableSettings {
  if (!existsSync(settingsPath)) return {};
  const text = readFileSync(settingsPath, "utf-8").trim();
  if (!text) return {};
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${settingsPath} must contain a JSON object`);
  }
  return parsed as MutableSettings;
}

function updatePackageResource(settings: MutableSettings, resource: ManagedResource, enabled: boolean): void {
  const packages = ensurePackages(settings);
  const index = packages.findIndex((entry) => packageSourceOf(entry) === resource.sourceInfo.source);
  const current = index >= 0 ? packages[index] : resource.sourceInfo.source;
  const entry = typeof current === "string" ? { source: current } : { ...current };
  const existingFilter = entry[resource.type];
  const nextFilter = updateFilter(existingFilter, resource.relPath, enabled);

  if (nextFilter === undefined) {
    delete entry[resource.type];
  } else {
    entry[resource.type] = nextFilter;
  }

  const replacement = normalizePackageEntry(entry, current);
  if (index >= 0) {
    packages[index] = replacement;
  } else {
    packages.push(replacement);
  }
}

function updateTopLevelResource(settings: MutableSettings, resource: ManagedResource, enabled: boolean): void {
  const current = arraySetting(settings[resource.type]);
  settings[resource.type] = updateFilter(current, resource.relPath, enabled) ?? [];
}

function updateFilter(existing: string[] | undefined, relPath: string, enabled: boolean): string[] | undefined {
  const hadExplicitEmptyFilter = existing !== undefined && existing.length === 0;
  let next = [...(existing ?? [])];
  next = removeExactOverride(next, relPath);

  if (enabled) {
    if (hadExplicitEmptyFilter) {
      next = ["!**/*", `+${relPath}`];
    } else if (needsForceInclude(next)) {
      next.push(`+${relPath}`);
    }
  } else if (!hadExplicitEmptyFilter) {
    next.push(`-${relPath}`);
  }

  next = dedupe(next);

  if (enabled && next.length === 0) return undefined;
  return next;
}

function needsForceInclude(patterns: string[]): boolean {
  return patterns.some((pattern) => pattern.startsWith("!") || (!pattern.startsWith("+") && !pattern.startsWith("-")));
}

function removeExactOverride(patterns: string[], relPath: string): string[] {
  return patterns.filter((pattern) => {
    if (!pattern.startsWith("+") && !pattern.startsWith("-")) return true;
    return normalizeExactPath(pattern.slice(1)) !== relPath;
  });
}

function normalizePackageEntry(
  entry: Exclude<MutablePackageSource, string>,
  original: MutablePackageSource,
): MutablePackageSource {
  const hasFilters = RESOURCE_TYPES.some((type) => Array.isArray(entry[type]));
  if (!hasFilters && typeof original === "string") return entry.source;
  return entry;
}

function ensurePackages(settings: MutableSettings): MutablePackageSource[] {
  const packages = Array.isArray(settings.packages) ? settings.packages : [];
  settings.packages = packages as PackageSource[];
  return packages as MutablePackageSource[];
}

function packageSourceOf(entry: MutablePackageSource): string {
  return typeof entry === "string" ? entry : entry.source;
}

function arraySetting(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  return value.filter((entry): entry is string => typeof entry === "string");
}

function relativeToBase(path: string, baseDir: string | undefined): string {
  if (!baseDir) return normalizeExactPath(path);
  const rel = normalizeExactPath(relative(baseDir, path));
  return rel.startsWith("../") ? normalizeExactPath(path) : rel;
}

function normalizeExactPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  return normalized.startsWith("./") ? normalized.slice(2) : normalized;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

function readOptionalText(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, "utf-8") : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
