import { expect, test } from 'bun:test'
import relay from '../.github/scripts/hosted-relay.cjs'

const repo = { id: 12, full_name: 'michidk/roastbook' }
const revision = 'a'.repeat(40)
const run = {
  id: 44,
  workflow_id: 55,
  status: 'completed',
  conclusion: 'success',
  event: 'pull_request',
  head_sha: revision,
  head_branch: 'feature',
  repository: repo,
  head_repository: repo,
  pull_requests: [{ number: 123 }],
}
const pr = {
  number: 123,
  state: 'open',
  user: { login: 'author' },
  labels: [],
  base: { ref: 'main', repo },
  head: { sha: revision, repo },
}
const release = {
  id: 77,
  draft: false,
  published_at: '2026-11-03T12:00:00Z',
  tag_name: 'v1.2.3',
}
const mainRun = {
  ...run,
  event: 'push',
  head_branch: 'main',
  pull_requests: [],
}

async function invoke(eventName, payload, overrides = {}) {
  const api = {
    actions: {
      getWorkflow: async () => ({
        data: { id: 55, path: '.github/workflows/ci.yml' },
      }),
      listWorkflowRuns: async () => ({
        data: { workflow_runs: overrides.runs ?? [mainRun, run] },
      }),
    },
    pulls: { get: async () => ({ data: overrides.pr ?? pr }) },
    issues: { listEvents: 'events' },
    repos: {
      getCollaboratorPermissionLevel: async ({ username }) => ({
        data: {
          permission: (overrides.writers ?? ['author', 'maintainer']).includes(
            username,
          )
            ? 'write'
            : 'read',
        },
      }),
      getBranch: async () => ({
        data: { commit: { sha: overrides.main ?? revision } },
      }),
      getRelease: async () => ({ data: overrides.release ?? release }),
      getCommit: async () => ({ data: { sha: overrides.tag ?? revision } }),
      listReleases: 'releases',
      listPullRequestsAssociatedWithCommit: 'associated',
    },
  }
  return relay({
    github: {
      rest: api,
      paginate: async (endpoint) =>
        endpoint === 'releases'
          ? (overrides.releases ?? [])
          : endpoint === 'events'
            ? (overrides.events ?? [])
            : [{ number: 123 }],
    },
    context: {
      repo: { owner: 'michidk', repo: 'roastbook' },
      eventName,
      payload,
    },
    core: { info() {} },
  })
}

test('CI completion relays current PR head, including forks, but rejects stale and failed builds', async () => {
  expect(await invoke('workflow_run', { workflow_run: run })).toEqual([
    {
      event: 'hosted-preview',
      payload: { pullRequest: 123, runId: 44, revision },
    },
  ])
  const fork = { id: 99, full_name: 'contributor/roastbook' }
  expect(
    await invoke(
      'workflow_run',
      { workflow_run: { ...run, head_repository: fork, pull_requests: [] } },
      { pr: { ...pr, head: { sha: revision, repo: fork } } },
    ),
  ).toHaveLength(1)
  for (const altered of [
    { ...run, conclusion: 'failure' },
    { ...run, workflow_id: 56 },
    { ...run, head_sha: 'b'.repeat(40) },
  ]) {
    expect(await invoke('workflow_run', { workflow_run: altered })).toEqual([])
  }
})

test('adding preview label after CI retries the current build; unrelated labels do nothing', async () => {
  expect(
    await invoke('pull_request_target', {
      action: 'labeled',
      label: { name: 'preview' },
      pull_request: pr,
    }),
  ).toHaveLength(1)
  expect(
    await invoke('pull_request_target', {
      action: 'labeled',
      label: { name: 'bug' },
      pull_request: pr,
    }),
  ).toEqual([])
  expect(
    await invoke(
      'pull_request_target',
      { action: 'labeled', label: { name: 'preview' }, pull_request: pr },
      { runs: [] },
    ),
  ).toEqual([])
})

test('closing or merging a PR relays cleanup without relying on the author or head repository', async () => {
  expect(
    await invoke('pull_request_target', {
      action: 'closed',
      pull_request: {
        ...pr,
        state: 'closed',
        head: { ...pr.head, repo: null },
      },
    }),
  ).toEqual([
    { event: 'hosted-preview-cleanup', payload: { pullRequest: 123 } },
  ])
})

test('only the latest successful main push requests staging', async () => {
  expect(await invoke('workflow_run', { workflow_run: mainRun })).toEqual([
    { event: 'hosted-staging', payload: { runId: 44, revision } },
  ])
  expect(
    await invoke(
      'workflow_run',
      { workflow_run: mainRun },
      { main: 'b'.repeat(40) },
    ),
  ).toEqual([])
  expect(
    await invoke('workflow_run', {
      workflow_run: { ...mainRun, head_branch: 'v1.2.3' },
    }),
  ).toEqual([])
})

test('published releases select the tagged revision, not current main or staging', async () => {
  expect(
    await invoke(
      'release',
      { action: 'published', release },
      { main: 'b'.repeat(40) },
    ),
  ).toEqual([
    {
      event: 'hosted-production',
      payload: { runId: 44, revision, releaseId: 77 },
    },
  ])
  expect(
    await invoke(
      'release',
      { action: 'published', release },
      { release: { ...release, draft: true } },
    ),
  ).toEqual([])
  expect(
    await invoke('release', { action: 'published', release }, { runs: [] }),
  ).toEqual([])
})

test('a release published before CI completes is retried on successful main CI', async () => {
  expect(
    await invoke(
      'workflow_run',
      { workflow_run: mainRun },
      { releases: [release] },
    ),
  ).toEqual([
    { event: 'hosted-staging', payload: { runId: 44, revision } },
    {
      event: 'hosted-production',
      payload: { runId: 44, revision, releaseId: 77 },
    },
  ])
})

test('preview relay requires writer author or the latest labeler to have write access', async () => {
  expect(
    await invoke('workflow_run', { workflow_run: run }, { writers: [] }),
  ).toEqual([])
  const labeled = { ...pr, labels: [{ name: 'preview' }] }
  const label = (id, actor, action = 'labeled') => ({
    id,
    event: action,
    label: { name: 'preview' },
    actor: { login: actor },
  })
  expect(
    await invoke(
      'workflow_run',
      { workflow_run: run },
      {
        pr: labeled,
        writers: ['maintainer'],
        events: [label(1, 'maintainer')],
      },
    ),
  ).toHaveLength(1)
  expect(
    await invoke(
      'workflow_run',
      { workflow_run: run },
      { pr: labeled, writers: ['maintainer'], events: [label(1, 'outsider')] },
    ),
  ).toEqual([])
  expect(
    await invoke(
      'workflow_run',
      { workflow_run: run },
      {
        pr: labeled,
        writers: ['maintainer'],
        events: [
          label(1, 'maintainer'),
          label(2, 'outsider', 'unlabeled'),
          label(3, 'outsider'),
        ],
      },
    ),
  ).toEqual([])
})

test('privileged relay checks out only main and queues pending cleanup events', async () => {
  const workflow = Bun.YAML.parse(
    await Bun.file(
      new URL('../.github/workflows/hosted-preview-relay.yml', import.meta.url),
    ).text(),
  )
  expect(workflow.concurrency).toMatchObject({
    'cancel-in-progress': false,
    queue: 'max',
  })
  expect(workflow.jobs.relay.steps[0].with).toMatchObject({
    ref: 'main',
    'persist-credentials': false,
  })
  expect(workflow.on.pull_request_target.types).toEqual(['labeled', 'closed'])
  expect(workflow.on.release.types).toEqual(['published'])
  expect(workflow.permissions).toEqual({
    actions: 'read',
    contents: 'read',
    'pull-requests': 'read',
  })
})
