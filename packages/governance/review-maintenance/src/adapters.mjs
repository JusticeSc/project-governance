import { spawn } from 'node:child_process'
import { access, readFile, realpath, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { basename, dirname, isAbsolute, join, parse } from 'node:path'

const operations = ['adoption', 'classification', 'draft', 'review']
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
function fail(message) { throw new Error(`Reviewer adapter: ${message}`) }
function keys(value, required, optional = []) {
  if (!isObject(value) || required.some(key => !Object.hasOwn(value, key)) ||
      Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) fail('invalid schema')
}
function text(value, empty = false) {
  if (typeof value !== 'string' || (!empty && !value.trim()) || value.includes('\0')) fail('invalid string')
}
function choice(value, values) { if (!values.includes(value)) fail('unknown enum') }

async function resolveCommand(command) {
  keys(command, ['file', 'identity'], ['args', 'program'])
  text(command.file)
  if (!isAbsolute(command.file)) fail('executable must be absolute')
  const file = await realpath(command.file)
  if (!(await stat(file)).isFile()) fail('executable is not a file')
  await access(file, process.platform === 'win32' ? constants.F_OK : constants.X_OK)
  const args = command.args ?? []
  if (!Array.isArray(args)) fail('args must be an array')
  for (const arg of args) text(arg, true)
  keys(command.identity, ['provider', 'model'])
  text(command.identity.provider); text(command.identity.model)
  let effective = file
  if (command.program !== undefined) {
    text(command.program)
    if (!isAbsolute(command.program)) fail('program must be absolute')
    effective = await realpath(command.program)
    if (!(await stat(effective)).isFile()) fail('program is not a file')
    const interpreter = basename(file).toLowerCase().replace(/\.exe$/, '')
    // No -e/-c/eval/loader/preload options: the script must be the actual entry point.
    if (!/^(?:node|python(?:\d+(?:\.\d+)*)?)$/.test(interpreter) || !args.length ||
        !isAbsolute(args[0]) || await realpath(args[0]) !== effective) {
      fail('program must be the first absolute script argument to node or python')
    }
  }
  return { file, args, effective }
}

/** A declared provider/model distinction plus byte comparison, not proof of model independence. */
export async function assertIndependentCommands(primary, secondary) {
  const [a, b] = await Promise.all([resolveCommand(primary), resolveCommand(secondary)])
  if (primary.identity.provider === secondary.identity.provider && primary.identity.model === secondary.identity.model) {
    fail('reviewers declare the same provider/model')
  }
  const [left, right] = await Promise.all([readFile(a.effective), readFile(b.effective)])
  if (left.equals(right)) fail('reviewer programs are byte-identical')
}

function validateRequest(request) {
  keys(request, ['version', 'operation'], ['items', 'skill', 'guidance', 'candidate', 'diff', 'feedbackNonce'])
  if (request.version !== 1 && !(request.version === 2 && request.operation === 'adoption')) fail('unsupported version')
  choice(request.operation, operations)
  for (const name of ['skill', 'candidate', 'diff', 'feedbackNonce']) {
    if (request[name] !== undefined) text(request[name], name === 'diff')
  }
  if (request.feedbackNonce !== undefined && !/^[a-f0-9]{32}$/i.test(request.feedbackNonce)) fail('invalid feedback nonce')
  if (request.guidance !== undefined && typeof request.guidance !== 'string' && !Array.isArray(request.guidance)) fail('invalid guidance')
  if (['adoption', 'classification'].includes(request.operation)) {
    if (!Array.isArray(request.items)) fail('items required')
  }
  const ids = new Set()
  if (request.items !== undefined) {
    if (!Array.isArray(request.items)) fail('invalid items')
    for (const item of request.items) {
      if (!isObject(item)) fail('invalid item')
      if (request.version === 2) {
        keys(item, ['id', 'body', 'pullNumber', 'commitId', 'baselineCommit', 'targetParent', 'landingCommit', 'feedbackPatch', 'finalPatch'])
        if (!Number.isSafeInteger(item.pullNumber) || item.pullNumber < 1) fail('invalid pull number')
        for (const name of ['body', 'commitId', 'baselineCommit', 'targetParent', 'landingCommit']) text(item[name])
        for (const name of ['feedbackPatch', 'finalPatch']) text(item[name], true)
      }
      text(item.id)
      if (ids.has(item.id)) fail('duplicate request id')
      ids.add(item.id)
    }
  }
  return ids
}

function validateResponse(response, request, ids) {
  const operation = request.operation
  const field = ['adoption', 'classification'].includes(operation) ? 'results' : operation === 'draft' ? 'content' : 'approved'
  keys(response, ['version', 'operation', field, ...(operation === 'review' ? ['findings'] : [])])
  if (response.version !== request.version || response.operation !== operation) fail('response version/operation mismatch')
  if (field === 'results') {
    if (!Array.isArray(response.results)) fail('invalid results')
    const seen = new Set()
    for (const result of response.results) {
      keys(result, operation === 'adoption' ? ['id', 'authorship', 'adoption', 'reason'] : ['id', 'classification', 'guidance', 'reason'])
      text(result.id); text(result.reason)
      if (!ids.has(result.id) || seen.has(result.id)) fail('unexpected or duplicate response id')
      seen.add(result.id)
      if (operation === 'adoption') {
        choice(result.authorship, ['human-authored', 'forwarded-automation', 'unclear'])
        choice(result.adoption, ['adopted', 'rejected', 'unclear'])
      } else {
        choice(result.classification, ['candidate', 'covered', 'specific', 'not-feedback', 'unclear'])
        text(result.guidance, true)
      }
    }
    if (seen.size !== ids.size) fail('missing response id')
  } else if (operation === 'draft') text(response.content)
  else {
    if (typeof response.approved !== 'boolean' || !Array.isArray(response.findings)) fail('invalid review')
    for (const finding of response.findings) {
      keys(finding, ['severity', 'message'])
      choice(finding.severity, ['blocking', 'advisory']); text(finding.message)
    }
    if (response.approved && response.findings.some(finding => finding.severity === 'blocking')) fail('approved blocking review')
  }
  return response
}

async function privateDirectory(directory) {
  if (typeof directory !== 'string' || !isAbsolute(directory)) fail('runDirectory must be absolute')
  const canonical = await realpath(directory)
  const info = await stat(canonical)
  if (!info.isDirectory()) fail('runDirectory must be a directory')
  if (process.platform !== 'win32' && (info.mode & 0o077)) fail('runDirectory must be private (0700)')
  // Reject any checkout, including nested worktrees. Windows ACL privacy remains an operator obligation.
  for (let cursor = canonical;; cursor = dirname(cursor)) {
    try { await stat(join(cursor, '.git')); fail('runDirectory must be outside repositories') }
    catch (error) { if (error.code !== 'ENOENT') throw error }
    if (cursor === parse(cursor).root) break
  }
  return canonical
}

function scrubEnvironment(overrides) {
  if (!isObject(overrides)) fail('invalid environment')
  const environment = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (!/(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|AUTH|COOKIE|SESSION|DSH_|GIT_|GH_|GITHUB_|NODE_OPTIONS|PYTHONPATH|PYTHONSTARTUP|LD_PRELOAD|DYLD_)/i.test(key)) environment[key] = value
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (!key || /[=\0]/.test(key) || typeof value !== 'string' || value.includes('\0')) fail('invalid environment entry')
    environment[key] = value
  }
  return environment
}


async function killTree(child) {
  if (!child.pid) return
  if (process.platform === 'win32') {
    await new Promise((resolve, reject) => {
      const killer = spawn(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore', env: scrubEnvironment({}) })
      killer.once('error', reject); killer.once('close', resolve)
    })
  } else {
    try { process.kill(-child.pid, 'SIGKILL') } catch (error) { if (error.code !== 'ESRCH') throw error }
    // Reap the direct child via close in the caller; also wait until no live group member remains.
    // Zombies are already exited and may be awaiting the host's init reaper.
    for (let attempt = 0; attempt < 100; attempt++) {
      const live = await new Promise((resolve, reject) => {
        const ps = spawn('/bin/ps', ['-axo', 'pgid=,stat='], { shell: false, stdio: ['ignore', 'pipe', 'ignore'], env: scrubEnvironment({}) })
        let output = '', exceeded = false
        const timeout = setTimeout(() => { exceeded = true; ps.kill('SIGKILL') }, 2000)
        ps.stdout.on('data', chunk => { if (output.length + chunk.length > 1048576) { exceeded = true; ps.kill('SIGKILL') } else output += chunk.toString() })
        ps.once('error', reject)
        ps.once('close', code => {
          clearTimeout(timeout)
          if (code !== 0 || exceeded) reject(new Error('Cannot observe process-group exit'))
          else resolve(output.split('\n').some(line => { const fields = line.trim().split(/\s+/); return Number(fields[0]) === child.pid && !fields[1]?.startsWith('Z') }))
        })
      })
      if (!live) return
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    throw new Error('Process group did not exit')
  }
}


function assertJson(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return
  if ((!Array.isArray(value) && !isObject(value)) || ancestors.has(value)) fail('request is not JSON')
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) fail('request is not plain JSON')
  ancestors.add(value)
  for (const item of Object.values(value)) assertJson(item, ancestors)
  ancestors.delete(value)
}

/** Bounded subprocess execution; callers decide whether its bounded output belongs in private artifacts. */
export async function runCommand({ file, args = [], cwd, input = '', timeoutMs = 120000, maxBytes = 1048576, environment = {} }) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647 || !Number.isSafeInteger(maxBytes) || maxBytes < 1) fail('invalid resource limit')
  text(file)
  if (!Array.isArray(args)) fail('args must be an array')
  for (const arg of args) text(arg, true)
  if (typeof input !== 'string' && !Buffer.isBuffer(input)) fail('input must be text or bytes')
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input)
  if (bytes.length > maxBytes) fail('request exceeds byte limit')
  const env = scrubEnvironment(environment)
  // Native spawn preserves the adapter's streams without a code-page-dependent supervisor.
  // Windows taskkill only covers descendants discoverable while the root is still alive;
  // a root that exits first or a deliberately detached child can escape this contract.
  const launch = { file, args }
  return new Promise((resolve, reject) => {
    const child = spawn(launch.file, launch.args, { cwd, env, shell: false, detached: process.platform !== 'win32', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
    let failure, stdoutBytes = 0, stderrBytes = 0, cleanup
    const chunks = [], errors = []
    const stop = error => {
      failure ??= error
      cleanup ??= killTree(child).catch(error => { failure = new Error('Reviewer adapter: process-tree cleanup failed', { cause: error }) })
    }
    const timer = setTimeout(() => stop(Object.assign(new Error('Reviewer adapter: timeout'), { code: 'timeout' })), timeoutMs)
    child.once('error', () => stop(new Error('Reviewer adapter: could not start process')))
    child.stdout.on('data', chunk => {
      stdoutBytes += chunk.length
      if (stdoutBytes > maxBytes) stop(Object.assign(new Error('Reviewer adapter: stdout exceeds byte limit'), { code: 'output-byte-limit' }))
      else if (!failure) chunks.push(chunk)
    })
    child.stderr.on('data', chunk => {
      stderrBytes += chunk.length
      if (stderrBytes > maxBytes) stop(Object.assign(new Error('Reviewer adapter: stderr exceeds byte limit'), { code: 'output-byte-limit' }))
      else if (!failure) errors.push(chunk)
    })
    // A reviewer that exits before reading its request closes the pipe first. That is the adapter's own
    // contract violation, and the exit status and response validation below report it with a stable reason;
    // a pipe symptom must not replace the adapter's observable outcome. POSIX surfaces EPIPE, Windows does not.
    child.stdin.on('error', error => {
      if (error.code !== 'EPIPE' && error.code !== 'ECONNRESET') stop(new Error('Reviewer adapter: request pipe failed'))
    })
    child.once('exit', () => {
      if (process.platform !== 'win32') cleanup ??= killTree(child).catch(error => { failure = new Error('Reviewer adapter: process-tree cleanup failed', { cause: error }) })
    })
    child.once('close', async code => {
      clearTimeout(timer)
      await cleanup
      let stdout = '', stderr = ''
      try {
        stdout = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
        stderr = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(errors))
      } catch { failure ??= new Error('Reviewer adapter: output is not valid UTF-8') }
      if (failure || code !== 0) {
        const error = failure ?? new Error(`Reviewer adapter: process exited unsuccessfully (${code})`)
        Object.assign(error, { exitCode: code, stdout, stderr })
        reject(error)
      } else resolve({ stdout, stderr, exitCode: code })
    })
    child.stdin.end(bytes)
  })
}

/** Contract markers are not an OS sandbox. No prompts, credentials or raw I/O are persisted here. */
export async function runReviewer({ command, request, runDirectory, timeoutMs = 120000, maxBytes = 1048576, environment = {} }) {
  const ids = validateRequest(request)
  let input
  try { assertJson(request); input = JSON.stringify({ ...request, access: 'read-only', tools: 'none' }) } catch { fail('request is not JSON') }
  const resolved = await resolveCommand(command)
  const cwd = await privateDirectory(runDirectory)
  const { stdout, stderr } = await runCommand({ ...resolved, cwd, input, timeoutMs, maxBytes, environment })
  try {
    let response
    try { response = JSON.parse(stdout) } catch { fail('response is not valid JSON') }
    return validateResponse(response, request, ids)
  } catch (error) {
    Object.assign(error, { stdout, stderr, code: 'invalid-response' })
    throw error
  }
}
