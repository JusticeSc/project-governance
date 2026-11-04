/** Shared JSON boundaries and field guards for script-owned policy manifests. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Recognize a field mapping without assigning trust to any field value.
 * @param value - Untrusted JSON or YAML value.
 * @returns Whether the value is a non-null, non-array object.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Recognize an array of strings, allowing empty arrays and empty strings.
 * @param value - Untrusted field value.
 * @returns Whether every array element is a string.
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

/**
 * Recognize an array whose strings are non-empty; the array itself may be empty.
 * @param value - Untrusted field value.
 * @returns Whether the array contains only non-empty strings.
 */
export function isNonemptyStringArray(value: unknown): value is string[] {
  return isStringArray(value) && value.every(item => item.length > 0)
}

/**
 * Recognize a non-empty list of non-empty strings.
 * @param value - Untrusted field value.
 * @returns Whether at least one non-empty string exists and all entries qualify.
 */
export function isStringList(value: unknown): value is string[] {
  return isNonemptyStringArray(value) && value.length > 0
}

/**
 * Read a script-owned JSON object while leaving its fields untrusted.
 * @param repositoryRoot - Workspace root resolving the manifest path.
 * @param path - Repository-relative manifest path.
 * @param gate - Diagnostic prefix of the consuming script.
 * @returns Parsed object whose field values remain unknown.
 * @throws When reading or JSON parsing fails, or the root is not a mapping.
 */
export function readManifestObject(repositoryRoot: string, path: string, gate: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(resolve(repositoryRoot, path), 'utf8'))
  if (!isRecord(parsed)) throw new Error(`${gate}: ${path} must hold an object`)
  return parsed
}
