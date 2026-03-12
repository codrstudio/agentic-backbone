import {
  existsSync,
  readdirSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { usersDir, userDir, userYmlPath, userAboutPath } from "../context/paths.js";
import { readYamlAs, writeYamlAs, patchYamlAs } from "../context/readers.js";
import { UserYmlSchema } from "../context/schemas.js";
import {
  type UserConfig,
  type UserPermissions,
  DEFAULT_PERMISSIONS,
  SYSTEM_USER,
} from "./types.js";
import { hashPassword } from "./password.js";

function parseUserConfig(slug: string): UserConfig | null {
  const ymlPath = userYmlPath(slug);
  if (!existsSync(ymlPath)) return null;

  const result = UserYmlSchema.safeParse(
    (() => { try { return readYamlAs(ymlPath, UserYmlSchema); } catch { return null; } })()
  );
  if (!result.success) {
    console.warn(`[users] invalid USER.yml for ${slug}:`, result.error.issues);
    return null;
  }
  const u = result.data;

  return {
    slug: u.slug ?? slug,
    displayName: u.displayName ?? slug,
    email: u.email,
    role: u.role,
    permissions: {
      canCreateAgents: u.canCreateAgents,
      canCreateChannels: u.canCreateChannels,
      maxAgents: u.maxAgents,
    },
  };
}

export function listUsers(): UserConfig[] {
  const dir = usersDir();
  if (!existsSync(dir)) return [SYSTEM_USER];

  const users: UserConfig[] = [];
  for (const slug of readdirSync(dir)) {
    const config = parseUserConfig(slug);
    if (config) users.push(config);
  }

  if (!users.find((u) => u.slug === "system")) {
    users.unshift(SYSTEM_USER);
  }

  return users;
}

export function getUser(slug: string): UserConfig | null {
  if (slug === "system") {
    return parseUserConfig("system") ?? SYSTEM_USER;
  }
  return parseUserConfig(slug);
}

export function userExists(slug: string): boolean {
  return existsSync(userYmlPath(slug));
}

export function getUserWithPasswordHash(
  slug: string
): { config: UserConfig; passwordHash: string } | null {
  const ymlPath = userYmlPath(slug);
  if (!existsSync(ymlPath)) return null;

  let data: ReturnType<typeof UserYmlSchema.parse>;
  try {
    data = readYamlAs(ymlPath, UserYmlSchema);
  } catch {
    return null;
  }

  if (!data.password) return null;

  const config = parseUserConfig(slug);
  if (!config) return null;

  return { config, passwordHash: data.password };
}

export function getUserByEmail(
  email: string
): { slug: string; config: UserConfig; passwordHash: string } | null {
  const dir = usersDir();
  if (!existsSync(dir)) return null;

  for (const slug of readdirSync(dir)) {
    const ymlPath = userYmlPath(slug);
    if (!existsSync(ymlPath)) continue;

    let data: ReturnType<typeof UserYmlSchema.parse>;
    try {
      data = readYamlAs(ymlPath, UserYmlSchema);
    } catch {
      continue;
    }

    if (data.email !== email) continue;
    if (!data.password) continue;

    const config = parseUserConfig(slug);
    if (!config) continue;

    return { slug, config, passwordHash: data.password };
  }

  return null;
}

export function createUser(
  slug: string,
  displayName: string,
  password: string,
  permissions?: Partial<UserPermissions>,
  email?: string
): UserConfig {
  const dir = userDir(slug);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, "channels"), { recursive: true });

  const perms = { ...DEFAULT_PERMISSIONS, ...permissions };
  const passwordHash = hashPassword(password);
  const userEmail = email ?? "";

  writeYamlAs(userYmlPath(slug), {
    slug,
    displayName,
    email: userEmail,
    canCreateAgents: perms.canCreateAgents,
    canCreateChannels: perms.canCreateChannels,
    maxAgents: perms.maxAgents,
    type: "user-password",
    password: passwordHash,
  }, UserYmlSchema);

  writeFileSync(userAboutPath(slug), `# ${displayName}\n`, "utf-8");

  return { slug, displayName, email: userEmail, permissions: perms };
}

export function updateUser(
  slug: string,
  updates: {
    displayName?: string;
    email?: string;
    password?: string;
    role?: string | null;
    permissions?: Partial<UserPermissions>;
  }
): UserConfig | null {
  if (!userExists(slug)) return null;

  const patch: Record<string, unknown> = {};

  if (updates.displayName !== undefined) patch.displayName = updates.displayName;
  if (updates.email !== undefined) patch.email = updates.email;
  if (updates.role !== undefined) patch.role = updates.role ?? undefined;
  if (updates.password) patch.password = hashPassword(updates.password);
  if (updates.permissions) {
    if (updates.permissions.canCreateAgents !== undefined)
      patch.canCreateAgents = updates.permissions.canCreateAgents;
    if (updates.permissions.canCreateChannels !== undefined)
      patch.canCreateChannels = updates.permissions.canCreateChannels;
    if (updates.permissions.maxAgents !== undefined)
      patch.maxAgents = updates.permissions.maxAgents;
  }

  const updated = patchYamlAs(userYmlPath(slug), patch, UserYmlSchema);

  return {
    slug: updated.slug ?? slug,
    displayName: updated.displayName ?? slug,
    email: updated.email,
    role: updated.role,
    permissions: {
      canCreateAgents: updated.canCreateAgents,
      canCreateChannels: updated.canCreateChannels,
      maxAgents: updated.maxAgents,
    },
  };
}

export function deleteUser(slug: string): boolean {
  if (slug === "system") return false;
  const dir = userDir(slug);
  if (!existsSync(dir)) return false;

  rmSync(dir, { recursive: true, force: true });
  return true;
}
