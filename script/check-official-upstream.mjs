/** Create one reminder per upstream release, including already closed reminders. */
export async function checkOfficialUpstream({ github, repo, channel }) {
  if (channel !== 'stable' && channel !== 'beta') {
    throw new Error(`Unsupported upstream channel: ${channel}`)
  }

  const upstream = { owner: 'desktop', repo: 'desktop' }
  const release =
    channel === 'stable'
      ? (await github.rest.repos.getLatestRelease(upstream)).data
      : (
          await github.paginate(github.rest.repos.listReleases, {
            ...upstream,
            per_page: 100,
          })
        ).find(r => !r.draft && r.prerelease && r.tag_name.includes('-beta'))

  if (!release) {
    return
  }

  const tag = release.tag_name
  try {
    await github.rest.repos.getReleaseByTag({ ...repo, tag })
    return
  } catch (error) {
    if (error.status !== 404) {
      throw error
    }
  }

  const title = `${
    channel === 'stable' ? 'Stable' : 'Beta'
  } upstream release detected: ${tag}`
  // Enumerate titles instead of relying on indexed search or shell escaping.
  const issues = await github.paginate(github.rest.issues.listForRepo, {
    ...repo,
    state: 'all',
    per_page: 100,
  })
  if (issues.some(issue => !issue.pull_request && issue.title === title)) {
    return
  }

  const branch = channel === 'stable' ? 'l10n' : 'l10n-beta'
  const buildChannel = channel === 'stable' ? 'production' : 'beta'
  await github.rest.issues.create({
    ...repo,
    title,
    body: `The official repository published the ${channel} release [${tag}](https://github.com/desktop/desktop/releases/tag/${tag}). Sync it into \`${branch}\`, resolve localization conflicts, build ${buildChannel} artifacts, then run the metadata release workflow.`,
  })
}
