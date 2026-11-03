const repository = 'michidk/roastbook'
const positive = (value) => Number.isSafeInteger(value) && value > 0

module.exports = async function relay({ github, context, core }) {
  const { owner, repo } = context.repo
  if (`${owner}/${repo}` !== repository) return []
  const api = github.rest
  const { data: workflow } = await api.actions.getWorkflow({
    owner,
    repo,
    workflow_id: 'ci.yml',
  })
  if (workflow.path !== '.github/workflows/ci.yml')
    throw new Error('Unexpected source workflow')
  const approvedRun = (run) =>
    positive(run.id) &&
    run.workflow_id === workflow.id &&
    run.status === 'completed' &&
    run.conclusion === 'success' &&
    run.repository?.full_name === repository
  const mainRun = (run) =>
    approvedRun(run) &&
    run.event === 'push' &&
    run.head_branch === 'main' &&
    run.head_repository?.full_name === repository
  const findRun = async (revision, event) => {
    const { data } = await api.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: workflow.id,
      head_sha: revision,
      event,
      status: 'success',
      per_page: 100,
    })
    return data.workflow_runs.find(
      (run) =>
        approvedRun(run) &&
        run.event === event &&
        run.head_sha === revision &&
        (event !== 'push' || mainRun(run)),
    )
  }
  const hasPush = async (login) => {
    const { data } = await api.repos.getCollaboratorPermissionLevel({
      owner,
      repo,
      username: login,
    })
    return (
      data.user?.permissions?.push ??
      ['admin', 'maintain', 'write'].includes(data.permission)
    )
  }
  const previewApproved = async (pr) => {
    if (await hasPush(pr.user.login)) return true
    if (!pr.labels.some((label) => label.name === 'preview')) return false
    const events = await github.paginate(api.issues.listEvents, {
      owner,
      repo,
      issue_number: pr.number,
      per_page: 100,
    })
    const latest = events
      .filter(
        (event) =>
          ['labeled', 'unlabeled'].includes(event.event) &&
          event.label?.name === 'preview',
      )
      .sort((a, b) => b.id - a.id)[0]
    return (
      latest?.event === 'labeled' &&
      !!latest.actor?.login &&
      (await hasPush(latest.actor.login))
    )
  }
  const preview = async (number, run) => {
    if (!positive(number)) return null
    const { data: pr } = await api.pulls.get({
      owner,
      repo,
      pull_number: number,
    })
    if (
      pr.state !== 'open' ||
      pr.base.ref !== 'main' ||
      pr.base.repo.full_name !== repository ||
      !pr.head.repo
    )
      return null
    if (!(await previewApproved(pr))) return null
    const source = run ?? (await findRun(pr.head.sha, 'pull_request'))
    if (
      !source ||
      source.head_sha !== pr.head.sha ||
      source.head_repository?.id !== pr.head.repo.id
    )
      return null
    return {
      event: 'hosted-preview',
      payload: { pullRequest: number, runId: source.id, revision: pr.head.sha },
    }
  }
  const production = async (release, run) => {
    if (!positive(release?.id) || release.draft || !release.published_at)
      return null
    const { data: commit } = await api.repos.getCommit({
      owner,
      repo,
      ref: `tags/${release.tag_name}`,
    })
    const source = run ?? (await findRun(commit.sha, 'push'))
    if (!source || !mainRun(source) || source.head_sha !== commit.sha)
      return null
    return {
      event: 'hosted-production',
      payload: {
        runId: source.id,
        revision: commit.sha,
        releaseId: release.id,
      },
    }
  }
  const requests = []
  if (context.eventName === 'pull_request_target') {
    const pr = context.payload.pull_request
    if (
      !positive(pr?.number) ||
      pr.base.ref !== 'main' ||
      pr.base.repo.full_name !== repository
    )
      return []
    if (context.payload.action === 'closed' && pr.state === 'closed') {
      requests.push({
        event: 'hosted-preview-cleanup',
        payload: { pullRequest: pr.number },
      })
    } else if (
      context.payload.action === 'labeled' &&
      context.payload.label?.name === 'preview'
    ) {
      const request = await preview(pr.number)
      if (request) requests.push(request)
    }
  } else if (
    context.eventName === 'release' &&
    context.payload.action === 'published'
  ) {
    const { data: release } = await api.repos.getRelease({
      owner,
      repo,
      release_id: context.payload.release.id,
    })
    const request = await production(release)
    if (request) requests.push(request)
    else
      core.info(
        'No successful main CI artifact yet. CI completion will retry the release.',
      )
  } else if (context.eventName === 'workflow_run') {
    const run = context.payload.workflow_run
    if (!approvedRun(run)) return []
    if (run.event === 'pull_request') {
      let candidates = run.pull_requests ?? []
      if (!candidates.length)
        candidates = await github.paginate(
          api.repos.listPullRequestsAssociatedWithCommit,
          { owner, repo, commit_sha: run.head_sha, per_page: 100 },
        )
      for (const candidate of candidates) {
        const request = await preview(candidate.number, run)
        if (request) requests.push(request)
      }
    } else if (mainRun(run)) {
      const { data: branch } = await api.repos.getBranch({
        owner,
        repo,
        branch: 'main',
      })
      if (branch.commit.sha === run.head_sha)
        requests.push({
          event: 'hosted-staging',
          payload: { runId: run.id, revision: run.head_sha },
        })
      // A release can be published while its main CI build is still running.
      // Retry only the most recently published release, avoiding historic promotions on CI reruns.
      const releases = await github.paginate(api.repos.listReleases, {
        owner,
        repo,
        per_page: 100,
      })
      const latest = releases
        .filter((release) => !release.draft && release.published_at)
        .sort((a, b) => b.published_at.localeCompare(a.published_at))[0]
      const request = latest ? await production(latest, run) : null
      if (request) requests.push(request)
    }
  }
  return requests
}
