import assert from "node:assert/strict";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { installAgents } from "../scripts/install_agents.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "agents-install-test-"));
  const sourceRoot = join(root, "repository");
  const userProfile = join(root, "profile");
  const codexSource = join(sourceRoot, "codex", "software-engineer.toml");
  const claudeSource = join(sourceRoot, "claude", "qa-engineer.md");
  const codexDestination = join(
    userProfile,
    ".codex",
    "agents",
    "software-engineer.toml",
  );
  const claudeDestination = join(
    userProfile,
    ".claude",
    "agents",
    "qa-engineer.md",
  );

  mkdirSync(dirname(codexSource), { recursive: true });
  mkdirSync(dirname(claudeSource), { recursive: true });
  writeFileSync(codexSource, "codex source\n", "utf8");
  writeFileSync(claudeSource, "claude source\n", "utf8");
  t.after(() => rmSync(root, { recursive: true, force: true }));

  return {
    root,
    sourceRoot,
    userProfile,
    codexSource,
    claudeSource,
    codexDestination,
    claudeDestination,
  };
}

function run(paths, check = false) {
  const output = [];
  const result = installAgents({
    check,
    sourceRoot: paths.sourceRoot,
    userProfile: paths.userProfile,
    log: (message) => output.push(message),
  });
  return { output, result };
}

function comparable(path) {
  const normalized = resolve(path);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

test("creates both approved live file links", (t) => {
  const paths = fixture(t);
  const { result } = run(paths);

  assert.deepEqual(result, { created: 2, linked: 0 });
  assert.equal(lstatSync(paths.codexDestination).isSymbolicLink(), true);
  assert.equal(lstatSync(paths.claudeDestination).isSymbolicLink(), true);
  assert.equal(
    comparable(realpathSync(paths.codexDestination)),
    comparable(paths.codexSource),
  );
  assert.equal(
    comparable(realpathSync(paths.claudeDestination)),
    comparable(paths.claudeSource),
  );
});

test("source edits are immediately visible through an existing link", (t) => {
  const paths = fixture(t);
  run(paths);
  writeFileSync(paths.codexSource, "updated source\n", "utf8");
  assert.equal(readFileSync(paths.codexDestination, "utf8"), "updated source\n");
});

test("repeated installation is an idempotent no-op and check succeeds", (t) => {
  const paths = fixture(t);
  run(paths);

  const repeated = run(paths);
  assert.deepEqual(repeated.result, { created: 0, linked: 2 });
  assert.match(repeated.output.at(-1), /0 created, 2 already linked/u);

  const checked = run(paths, true);
  assert.deepEqual(checked.result, { created: 0, linked: 2 });
  assert.match(checked.output.at(-1), /Verified 2 live agent link/u);
});

test("check reports missing links without creating directories", (t) => {
  const paths = fixture(t);
  assert.throws(() => run(paths, true), /Codex: missing[\s\S]*Claude: missing/u);
  assert.equal(existsSync(join(paths.userProfile, ".codex")), false);
  assert.equal(existsSync(join(paths.userProfile, ".claude")), false);
});

test("a missing source prevents all destination changes", (t) => {
  const paths = fixture(t);
  rmSync(paths.claudeSource);

  assert.throws(() => run(paths), /Claude: missing source/u);
  assert.equal(existsSync(paths.codexDestination), false);
  assert.equal(existsSync(paths.claudeDestination), false);
});

test("a regular-file conflict prevents the other missing link", (t) => {
  const paths = fixture(t);
  mkdirSync(dirname(paths.codexDestination), { recursive: true });
  writeFileSync(paths.codexDestination, "keep me", "utf8");

  assert.throws(() => run(paths), /Codex:[\s\S]*not a symbolic link/u);
  assert.equal(readFileSync(paths.codexDestination, "utf8"), "keep me");
  assert.equal(existsSync(paths.claudeDestination), false);
});

test("directories, broken links, and wrong-target links are conflicts", async (t) => {
  await t.test("directory", (t) => {
    const paths = fixture(t);
    mkdirSync(paths.codexDestination, { recursive: true });
    assert.throws(() => run(paths), /Codex:[\s\S]*not a symbolic link/u);
  });

  await t.test("broken link", (t) => {
    const paths = fixture(t);
    mkdirSync(dirname(paths.codexDestination), { recursive: true });
    symlinkSync(join(paths.root, "missing.toml"), paths.codexDestination, "file");
    assert.throws(() => run(paths), /Codex:[\s\S]*points to/u);
  });

  await t.test("wrong target", (t) => {
    const paths = fixture(t);
    const wrongTarget = join(paths.root, "wrong.toml");
    writeFileSync(wrongTarget, "wrong", "utf8");
    mkdirSync(dirname(paths.codexDestination), { recursive: true });
    symlinkSync(wrongTarget, paths.codexDestination, "file");
    assert.throws(() => run(paths), /Codex:[\s\S]*points to/u);
  });
});

test("unrelated provider entries remain untouched", (t) => {
  const paths = fixture(t);
  const unrelated = join(paths.userProfile, ".codex", "agents", "other-agent.toml");
  mkdirSync(dirname(unrelated), { recursive: true });
  writeFileSync(unrelated, "unrelated", "utf8");

  run(paths);
  assert.equal(readFileSync(unrelated, "utf8"), "unrelated");
});
