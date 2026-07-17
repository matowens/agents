import {
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  statSync,
  symlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const APPROVED_AGENTS = [
  {
    provider: "Codex",
    source: join("codex", "software-engineer.toml"),
    destination: join(".codex", "agents", "software-engineer.toml"),
  },
  {
    provider: "Claude",
    source: join("claude", "qa-engineer.md"),
    destination: join(".claude", "agents", "qa-engineer.md"),
  },
];

function usage() {
  return [
    "Usage: install.cmd [--check]",
    "",
    "Create or verify live links for the approved Codex and Claude agents.",
    "",
    "Options:",
    "  --check  Verify links without changing anything.",
    "  --help   Show this help.",
  ].join("\n");
}

function parseArguments(argumentsList) {
  const options = { check: false, help: false };

  for (const argument of argumentsList) {
    if (argument === "--check") {
      options.check = true;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }

  return options;
}

function normalizePath(path) {
  const normalized = resolve(path);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function mappingsFor(sourceRoot, userProfile) {
  return APPROVED_AGENTS.map((agent) => ({
    ...agent,
    sourcePath: join(sourceRoot, agent.source),
    destinationPath: join(userProfile, agent.destination),
  }));
}

function validateSources(mappings) {
  const failures = [];

  for (const mapping of mappings) {
    if (!existsSync(mapping.sourcePath)) {
      failures.push(`${mapping.provider}: missing source ${mapping.sourcePath}`);
      continue;
    }
    if (!statSync(mapping.sourcePath).isFile()) {
      failures.push(`${mapping.provider}: source is not a file ${mapping.sourcePath}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Agent source validation failed:\n${failures.join("\n")}`);
  }
}

function inspectDestination(mapping) {
  let metadata;
  try {
    metadata = lstatSync(mapping.destinationPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return { ...mapping, state: "missing" };
    }
    throw error;
  }

  if (!metadata.isSymbolicLink()) {
    return {
      ...mapping,
      state: "conflict",
      reason: "the destination exists and is not a symbolic link",
    };
  }

  const storedTarget = readlinkSync(mapping.destinationPath);
  const targetPath = resolve(dirname(mapping.destinationPath), storedTarget);
  if (normalizePath(targetPath) !== normalizePath(mapping.sourcePath)) {
    return {
      ...mapping,
      state: "conflict",
      reason: `the destination points to ${storedTarget}`,
    };
  }

  return { ...mapping, state: "linked" };
}

function createLink(mapping) {
  mkdirSync(dirname(mapping.destinationPath), { recursive: true });
  try {
    symlinkSync(mapping.sourcePath, mapping.destinationPath, "file");
  } catch (error) {
    if (error.code === "EPERM") {
      throw new Error(
        `${mapping.provider}: unable to create ${mapping.destinationPath}. Enable Windows Developer Mode or run Command Prompt as Administrator.`,
      );
    }
    throw error;
  }
}

export function installAgents({
  check = false,
  sourceRoot = ROOT,
  userProfile = homedir(),
  log = console.log,
} = {}) {
  const mappings = mappingsFor(resolve(sourceRoot), resolve(userProfile));
  validateSources(mappings);

  const inspected = mappings.map(inspectDestination);
  const conflicts = inspected.filter((mapping) => mapping.state === "conflict");
  if (conflicts.length > 0) {
    const details = conflicts.map(
      (mapping) =>
        `${mapping.provider}: ${mapping.destinationPath} conflicts because ${mapping.reason}`,
    );
    throw new Error(`Agent link verification failed:\n${details.join("\n")}`);
  }

  const missing = inspected.filter((mapping) => mapping.state === "missing");
  if (check && missing.length > 0) {
    const details = missing.map(
      (mapping) => `${mapping.provider}: missing ${mapping.destinationPath}`,
    );
    throw new Error(`Agent link verification failed:\n${details.join("\n")}`);
  }

  let created = 0;
  let linked = 0;
  for (const mapping of inspected) {
    if (mapping.state === "linked") {
      linked += 1;
      log(`${mapping.provider}: linked ${mapping.destinationPath}`);
      continue;
    }

    createLink(mapping);
    created += 1;
    log(`${mapping.provider}: created symbolic link ${mapping.destinationPath}`);
  }

  if (check) {
    log(`Verified ${linked} live agent link(s).`);
  } else {
    log(`Ready: ${created} created, ${linked} already linked.`);
  }

  return { created, linked };
}

function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }
    installAgents({ check: options.check });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  normalizePath(process.argv[1]) === normalizePath(fileURLToPath(import.meta.url))
) {
  main();
}
