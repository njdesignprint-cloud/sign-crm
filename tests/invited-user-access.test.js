const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("an active invitation activates first login without platform approval", () => {
  const core = fs.readFileSync(path.join(__dirname, "../assets/js/01-core.js"), "utf8");
  assert.match(core, /const hasActiveInvitation = !!\(invitedAccess && invitedAccess\.active !== false\)/);
  assert.match(core, /state\.isSuperAdmin \|\| hasActiveInvitation \? "active" : \(savedPlatformStatus \|\| \(ownRootExists \? "active" : "pending"\)\)/);
  assert.match(core, /savedPlatformStatus === "blocked"/);
  assert.doesNotMatch(core, /state\.isSuperAdmin \|\| hasActiveInvitation \|\| ownRootExists \? "active"/);
});

test("invited users update only their UID membership presence", () => {
  const auth = fs.readFileSync(path.join(__dirname, "../assets/js/11-auth.js"), "utf8");
  const core = fs.readFileSync(path.join(__dirname, "../assets/js/01-core.js"), "utf8");
  assert.doesNotMatch(auth, /teamMembersRef\(\)\.doc\(teamDocId\)\.set\(presencePatch/);
  assert.doesNotMatch(auth, /teamAccessRefByEmail\(state\.userEmail\)\.set\(presencePatch/);
  assert.match(auth, /workspaceMembersRef\(\)\.doc\(state\.uid\)\.set\(presencePatch/);
  assert.doesNotMatch(core, /teamMembersRef\(\)\.doc\(teamDocId\)\.set\(loginPayload/);
  assert.doesNotMatch(core, /teamAccessRefByEmail\(state\.userEmail\)\.set\(loginPayload/);
  assert.doesNotMatch(core, /lastLoginEmail: normalizedEmail\(state\.userEmail\)/);
  assert.match(core, /status: platformAccount \? \(savedPlatformStatus \|\| "pending"\)/);
});
