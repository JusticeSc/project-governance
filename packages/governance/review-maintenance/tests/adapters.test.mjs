import assert from 'node:assert/strict'
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { assertIndependentCommands, runCommand, runReviewer } from '../src/adapters.mjs'

async function fixture(t, source) {
  const directory = await mkdtemp(join(tmpdir(), 'review-adapter-'))
  await chmod(directory, 0o700)
  t.after(() => rm(directory, { recursive: true, force: true }))
  const script = join(directory, 'reviewer.cjs')
  await writeFile(script, source)
  return {
    directory, script,
    command: { file: process.execPath, args: [script], program: script, identity: { provider: 'fixture', model: 'one' } },
  }
}
function invoke(f, request, options = {}) {
  return runReviewer({ command: f.command, runDirectory: f.directory, request, ...options })
}
function responseSource(response) {
  return `process.stdin.resume(); process.stdin.on('end',()=>process.stdout.write(${JSON.stringify(JSON.stringify(response))}));`
}

for (const [operation, response, request] of [
  ['adoption', { version: 1, operation: 'adoption', results: [{ id: 'a', authorship: 'human-authored', adoption: 'adopted', reason: 'The final patch implements the requested boundary.' }, { id: 'b', authorship: 'forwarded-automation', adoption: 'unclear', reason: 'Authorship is forwarded.' }] }, { items: [{ id: 'a', body: 'one' }, { id: 'b', body: 'two' }] }],
  ['classification', { version: 1, operation: 'classification', results: [{ id: 'a', classification: 'candidate', guidance: 'Validate before writes.', reason: 'General boundary.' }] }, { items: [{ id: 'a' }], skill: '# Current' }],
  ['draft', { version: 1, operation: 'draft', content: '# Complete skill\n\nRead before writing.\n' }, { guidance: ['Read before writing.'] }],
  ['review', { version: 1, operation: 'review', approved: true, findings: [{ severity: 'advisory', message: 'Consider a shorter heading.' }] }, { candidate: '# Skill', diff: '+# Skill' }],
]) {
  test(`accepts complete ${operation} response from a real executable`, async t => {
    const f = await fixture(t, responseSource(response))
    assert.deepEqual(await invoke(f, { version: 1, operation, ...request }), response)
  })
}

test('delivers bounded stdin contract, private cwd and explicitly supplied secrets only', async t => {
  const f = await fixture(t, `const fs=require('node:fs');
  let raw=''; process.stdin.on('data', x=>raw+=x); process.stdin.on('end',()=>{
    const q=JSON.parse(raw);
    // Same-directory evidence, not a path string: Windows reports an 8.3 short name and the child's
    // process.cwd() spells the same directory with its long name.
    const facts={
      access:q.access==='read-only', tools:q.tools==='none',
      cwd:fs.existsSync('cwd-marker.txt') && fs.readFileSync('cwd-marker.txt','utf8')==='private cwd',
      token:process.env.EXPLICIT_TOKEN==='operator-value', inherited:process.env.INHERITED_SECRET===undefined,
    };
    const valid=Object.values(facts).every(Boolean);
    console.log(JSON.stringify({version:1,operation:'draft',content:valid?'contract accepted':'incorrect contract '+JSON.stringify(facts)}));
  });`)
  await writeFile(join(f.directory, 'cwd-marker.txt'), 'private cwd')
  const previous = process.env.INHERITED_SECRET
  process.env.INHERITED_SECRET = 'not-inherited'
  t.after(() => { if (previous === undefined) delete process.env.INHERITED_SECRET; else process.env.INHERITED_SECRET = previous })
  const result = await invoke(f, { version: 1, operation: 'draft' }, { environment: { EXPLICIT_TOKEN: 'operator-value' } })
  assert.equal(result.content, 'contract accepted')
})

for (const [name, response] of [
  ['malformed JSON', '{'],
  ['wrong id', { version: 1, operation: 'adoption', results: [{ id: 'other', authorship: 'human-authored', adoption: 'adopted', reason: 'x' }] }],
  ['missing id', { version: 1, operation: 'adoption', results: [] }],
  ['duplicate id', { version: 1, operation: 'adoption', results: Array(2).fill({ id: 'a', authorship: 'human-authored', adoption: 'adopted', reason: 'x' }) }],
  ['unknown enum', { version: 1, operation: 'adoption', results: [{ id: 'a', authorship: 'robot', adoption: 'adopted', reason: 'x' }] }],
  ['wrong schema', { version: 1, operation: 'adoption', results: [{ id: 'a', authorship: 'human-authored', adoption: 'adopted', reason: 'x', extra: true }] }],
  ['wrong operation', { version: 1, operation: 'review', approved: true, findings: [] }],
]) {
  test(`rejects ${name} without accepting a partial batch`, async t => {
    const f = await fixture(t, typeof response === 'string' ? `process.stdin.resume(); process.stdin.on('end',()=>console.log(${JSON.stringify(response)}));` : responseSource(response))
    await assert.rejects(invoke(f, { version: 1, operation: 'adoption', items: [{ id: 'a' }] }))
  })
}

test('rejects byte-identical effective scripts and same provider/model declarations', async t => {
  const f = await fixture(t, responseSource({ version: 1, operation: 'draft', content: '# Skill' }))
  const second = join(f.directory, 'second.cjs')
  await copyFile(f.script, second)
  const command = { ...f.command, args: [second], program: second, identity: { provider: 'other', model: 'two' } }
  await assert.rejects(assertIndependentCommands(f.command, command), /byte-identical/)
  await writeFile(second, 'process.exit(0)')
  await assertIndependentCommands(f.command, command)
  await assert.rejects(assertIndependentCommands(f.command, { ...command, identity: f.command.identity }), /same provider\/model/)
  await assert.rejects(assertIndependentCommands(f.command, { ...command, args: [f.script] }), /first absolute script/)
  await assert.rejects(assertIndependentCommands(f.command, { ...command, args: ['-e', 'process.exit(0)', second] }), /first absolute script/)
})

test('rejects repository cwd, duplicate inputs and oversized requests before execution', async t => {
  const f = await fixture(t, 'require("node:fs").writeFileSync("executed", "yes")')
  await mkdir(join(f.directory, '.git'))
  await assert.rejects(invoke(f, { version: 1, operation: 'draft' }), /outside repositories/)
  await rm(join(f.directory, '.git'), { recursive: true })
  await assert.rejects(invoke(f, { version: 1, operation: 'adoption', items: [{ id: 'a' }, { id: 'a' }] }), /duplicate request/)
  await assert.rejects(invoke(f, { version: 1, operation: 'draft', skill: 'x'.repeat(1000) }, { maxBytes: 100 }), /byte limit/)
  await assert.rejects(readFile(join(f.directory, 'executed')), { code: 'ENOENT' })
})

for (const stream of ['stdout', 'stderr']) {
  test(`bounds ${stream} bytes and rejects overflow`, async t => {
    const f = await fixture(t, `process.stdin.resume(); process.stdin.on('end',()=>{ process.${stream}.write('x'.repeat(4096)); setInterval(()=>{},1000) });`)
    await assert.rejects(invoke(f, { version: 1, operation: 'draft' }, { maxBytes: 512 }), new RegExp(`${stream} exceeds byte limit`))
  })
}

for (const mode of ['timeout', 'overflow', 'parent-exits']) {
  test(`cleans live grandchildren when ${mode}`, { skip: process.platform === 'win32' && mode === 'parent-exits' ? 'Native taskkill cannot discover descendants after their root has already exited; Job containment is not implemented.' : false }, async t => {
    const f = await fixture(t, `const {spawn}=require('node:child_process'); const {writeFileSync}=require('node:fs');
      if(process.argv[2]==='grandchild') { writeFileSync(process.argv[3],String(process.pid)); process.send('ready'); setInterval(()=>{},1000); }
      else { process.stdin.resume(); process.stdin.on('end',()=>{
        const child=spawn(process.execPath,[__filename,'grandchild',process.argv[2]],{stdio:['ignore','ignore','ignore','ipc']});
        child.on('message',()=>{ ${mode === 'parent-exits' ? `console.log(JSON.stringify({version:1,operation:'draft',content:'# Skill'})); process.exit(0);` : mode === 'overflow' ? `process.stdout.write('x'.repeat(8192));` : ''} });
        setInterval(()=>{},1000);
      }); }`)
    const pidFile = join(f.directory, 'grandchild.pid')
    f.command.args.push(pidFile)
    const result = invoke(f, { version: 1, operation: 'draft' }, { timeoutMs: mode === 'timeout' ? 1500 : 10000, maxBytes: 1024 })
    if (mode === 'parent-exits') assert.equal((await result).content, '# Skill')
    else await assert.rejects(result, mode === 'timeout' ? /timeout/ : /byte limit/)
    const pid = Number(await readFile(pidFile, 'utf8'))
    // POSIX zombies are exited but may remain until init reaps an orphan.
    if (process.platform === 'linux') {
      let status
      try { status = await readFile(`/proc/${pid}/stat`, 'utf8') } catch (error) { if (error.code !== 'ENOENT') throw error }
      if (status) assert.match(status, /^\d+ \(.*\) Z /)
    } else assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' })
  })
}

test('runCommand returns bounded output and classifies nonzero exits without leaking input in messages', async t => {
  const f = await fixture(t, `process.stdin.resume(); process.stdin.on('end',()=>{ console.log('out'); console.error('err'); process.exit(7) });`)
  await assert.rejects(runCommand({ file: process.execPath, args: [f.script], cwd: f.directory, input: 'private-input' }), error => {
    assert.equal(error.exitCode, 7)
    assert.equal(error.stdout.trim(), 'out'); assert.equal(error.stderr.trim(), 'err')
    assert.ok(!error.message.includes('private-input'))
    return true
  })
})

test('accepts every classification outcome and all adoption uncertainty outcomes', async t => {
  const classifications = ['candidate', 'covered', 'specific', 'not-feedback', 'unclear']
  const response = { version: 1, operation: 'classification', results: classifications.map((classification, index) => ({ id: String(index), classification, guidance: classification === 'candidate' ? 'Keep the boundary explicit.' : '', reason: 'Evidence-specific judgment.' })) }
  const f = await fixture(t, responseSource(response))
  assert.deepEqual(await invoke(f, { version: 1, operation: 'classification', items: response.results.map(({ id }) => ({ id })) }), response)
  const adoption = { version: 1, operation: 'adoption', results: [
    { id: 'a', authorship: 'unclear', adoption: 'rejected', reason: 'The change was not made.' },
    { id: 'b', authorship: 'human-authored', adoption: 'unclear', reason: 'Evidence is insufficient.' },
  ] }
  await writeFile(f.script, responseSource(adoption))
  assert.deepEqual(await invoke(f, { version: 1, operation: 'adoption', items: [{ id: 'a' }, { id: 'b' }] }), adoption)
})

test('preserves bounded malformed response for caller-owned private artifacts', async t => {
  const f = await fixture(t, `process.stdin.resume(); process.stdin.on('end',()=>console.log('{'));`)
  await assert.rejects(invoke(f, { version: 1, operation: 'draft' }), error => {
    assert.equal(error.code, 'invalid-response'); assert.equal(error.stdout.trim(), '{')
    return true
  })
})

test('rejects contradictory approvals and invalid UTF-8', async t => {
  const f = await fixture(t, responseSource({ version: 1, operation: 'review', approved: true, findings: [{ severity: 'blocking', message: 'Required boundary is missing.' }] }))
  await assert.rejects(invoke(f, { version: 1, operation: 'review' }), /approved blocking/)
  await writeFile(f.script, `process.stdin.resume(); process.stdin.on('end',()=>process.stdout.write(Buffer.from([0xff])));`)
  await assert.rejects(invoke(f, { version: 1, operation: 'draft' }), /UTF-8/)
})
