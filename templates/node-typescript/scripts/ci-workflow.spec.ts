import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { gatesForMode } from './run-gates.ts'

const root = resolve(import.meta.dirname, '..')

describe('Weighted approval workflow', () => {
  it('publishes from the trusted default branch after pull request and review updates', () => {
    const publisher = loadWorkflow('.github/workflows/weighted-approval.yml')
    const reviewEvent = loadWorkflow('.github/workflows/weighted-approval-review-event.yml')
    const pullRequest = workflowEvent(publisher, 'pull_request_target')
    const workflowRun = workflowEvent(publisher, 'workflow_run')
    const review = workflowEvent(reviewEvent, 'pull_request_review')
    const job = workflowJob(publisher, 'publish-status')
    const recordJob = workflowJob(reviewEvent, 'record-review-event')
    if (!isRecord(publisher.on)) throw new TypeError('weighted-approval workflow must define events')
    if (!isRecord(reviewEvent.on)) throw new TypeError('weighted-approval review event workflow must define events')
    if (!Array.isArray(job.steps)) throw new TypeError('weighted-approval job must define steps')
    if (!Array.isArray(recordJob.steps)) throw new TypeError('weighted-approval review event job must define steps')
    const steps = job.steps.filter(isRecord)
    const checkout = steps.find(step => step.name === 'Check out trusted approval policy')
    const publish = steps.find(step => step.name === 'Publish weighted approval status')
    const recordSteps = recordJob.steps.filter(isRecord)
    const record = recordSteps.find(step => step.name === 'Record review event')

    expect(publisher.name).toBe('weighted-approval')
    expect(Object.keys(publisher.on)).toEqual(['pull_request_target', 'issue_comment', 'workflow_run'])
    expect(workflowEvent(publisher, 'issue_comment').types).toEqual(['created', 'edited', 'deleted'])
    expect(pullRequest.types).toEqual(['opened', 'synchronize', 'reopened', 'ready_for_review', 'converted_to_draft', 'edited'])
    expect(workflowRun).toEqual({ workflows: ['weighted-approval-review-event'], types: ['completed'] })
    expect(reviewEvent.name).toBe('weighted-approval-review-event')
    expect(reviewEvent['run-name']).toBe('weighted-approval-review-event:${{ github.event.pull_request.number }}')
    expect(Object.keys(reviewEvent.on)).toEqual(['pull_request_review'])
    expect(review.types).toEqual(['submitted', 'edited', 'dismissed'])
    expect(reviewEvent.permissions).toEqual({})
    expect(publisher.permissions).toEqual({
      contents: 'read',
      'pull-requests': 'write',
      statuses: 'write',
    })
    expect(publisher.concurrency).toEqual({
      group: "weighted-approval-${{ (github.event.pull_request.number || github.event.issue.number) && format('weighted-approval-review-event:{0}', github.event.pull_request.number || github.event.issue.number) || github.event.workflow_run.display_title }}",
      'cancel-in-progress': false,
    })
    expect(job).toMatchObject({
      if: "(github.event_name != 'pull_request_target' || github.event.pull_request.state == 'open') && "
        + "(github.event_name != 'workflow_run' || github.event.workflow_run.conclusion == 'success') && "
        + "(github.event_name != 'issue_comment' || (github.event.issue.pull_request && github.event.issue.state == 'open' &&\n"
        + "  (contains(github.event.comment.body, '/delegate') || contains(github.event.changes.body.from, '/delegate'))))",
      name: 'weighted approval publisher',
      'runs-on': 'ubuntu-latest',
      'timeout-minutes': 5,
    })
    expect(checkout).toMatchObject({
      uses: 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
      with: {
        ref: '${{ github.event.repository.default_branch }}',
        'persist-credentials': false,
      },
    })
    const setupIndex = steps.findIndex(step => typeof step.uses === 'string' && step.uses.startsWith('actions/setup-python@'))
    expect(steps[setupIndex]?.if).toBe("steps.revoke.outputs.active == 'true'")
    expect(steps[setupIndex]?.uses).toBe('actions/setup-python@ece7cb06caefa5fff74198d8649806c4678c61a1')
    const revokeIndex = steps.findIndex(step => step.id === 'revoke')
    expect(revokeIndex).toBeGreaterThan(steps.indexOf(checkout!))
    expect(revokeIndex).toBeLessThan(setupIndex)
    expect(steps[revokeIndex]?.run).toBe('node .github/review-ownership/check-approval.mjs pending')
    expect(steps.at(-1)).toMatchObject({
      if: "failure() && steps.revoke.outputs.active == 'true'",
      run: 'node .github/review-ownership/check-approval.mjs error',
    })
    expect(gatesForMode('ci-primary').find(gate => gate.id === 'approval-ownership')?.args).toContain('test:approval-ownership')
    expect(steps.find(step => step.name === 'Install production lexer')).toMatchObject({
      if: "steps.revoke.outputs.active == 'true'",
      run: 'python3 -m pip install -r .github/review-ownership/requirements.txt',
    })
    expect(publish).toMatchObject({
      if: "steps.revoke.outputs.active == 'true'",
      env: {
        GITHUB_TOKEN: '${{ github.token }}',
        GITHUB_RUN_URL: '${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}',
      },
      run: 'node .github/review-ownership/check-approval.mjs',
    })
    expect(recordJob).toMatchObject({
      if: "github.event.pull_request.state == 'open'",
      name: 'record weighted approval review event',
      'runs-on': 'ubuntu-latest',
      'timeout-minutes': 2,
    })
    expect(record).toBeDefined()
    expect(record?.run).toBe("echo 'Recorded a weighted approval review event.'")
    expect(recordSteps).toHaveLength(1)
    expect(JSON.stringify(publisher)).not.toContain('github.event.pull_request.head')
    expect(JSON.stringify(publisher)).not.toContain('secrets.')
    expect(JSON.stringify(reviewEvent)).not.toContain('github.token')
    expect(JSON.stringify(reviewEvent)).not.toContain('secrets.')
  })
})

function loadWorkflow(path: string): Record<string, unknown> {
  const workflow: unknown = yaml.load(readFileSync(resolve(root, path), 'utf8'))
  if (!isRecord(workflow)) throw new TypeError(path + ' must define a workflow')
  return workflow
}

function workflowEvent(workflow: Record<string, unknown>, event: string): Record<string, unknown> {
  if (!isRecord(workflow.on) || !isRecord(workflow.on[event])) {
    throw new TypeError(`workflow must define the ${event} event`)
  }
  return workflow.on[event]
}

function workflowJob(workflow: Record<string, unknown>, job: string): Record<string, unknown> {
  if (!isRecord(workflow.jobs) || !isRecord(workflow.jobs[job])) {
    throw new TypeError(`workflow must define the ${job} job`)
  }
  return workflow.jobs[job]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
