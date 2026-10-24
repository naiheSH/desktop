import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkOfficialUpstream } from './check-official-upstream.mjs'

function fixture({ issues = [], published = false, status = 404 } = {}) {
  const created = []
  const listReleases = () => {}
  const listForRepo = () => {}
  const release = { tag_name: 'release-3.6.7' }
  const github = {
    rest: {
      repos: {
        listReleases,
        getLatestRelease: async () => ({ data: release }),
        getReleaseByTag: async () => {
          if (!published) {
            throw Object.assign(new Error('API failure'), { status })
          }
          return { data: release }
        },
      },
      issues: {
        listForRepo,
        create: async issue => created.push(issue),
      },
    },
    paginate: async (method, params) => {
      if (method === listForRepo) {
        assert.equal(params.state, 'all')
        return issues
      }
      assert.equal(method, listReleases)
      return [
        { tag_name: 'release-3.6.8-test1', prerelease: true },
        { tag_name: 'release-3.6.8-beta2', prerelease: true, draft: true },
        { tag_name: 'release-3.6.8-beta1', prerelease: true },
      ]
    },
  }
  return { github, created, repo: { owner: 'naiheSH', repo: 'desktop' } }
}

test('creates a reminder with literal Markdown branch names', async () => {
  const f = fixture()
  await checkOfficialUpstream({ ...f, channel: 'stable' })
  assert.equal(f.created.length, 1)
  assert.match(f.created[0].body, /Sync it into `l10n`/)
  assert.match(f.created[0].body, /production artifacts/)
})

test('deduplicates an exact title, including a closed reminder', async () => {
  const f = fixture({
    issues: [
      {
        title: 'Stable upstream release detected: release-3.6.7',
        state: 'closed',
      },
    ],
  })
  await checkOfficialUpstream({ ...f, channel: 'stable' })
  assert.equal(f.created.length, 0)
})

test('does not use a similarly titled PR as a reminder', async () => {
  const f = fixture({
    issues: [
      {
        title: 'Stable upstream release detected: release-3.6.7',
        pull_request: {},
      },
    ],
  })
  await checkOfficialUpstream({ ...f, channel: 'stable' })
  assert.equal(f.created.length, 1)
})

test('skips a release already published by this fork', async () => {
  const f = fixture({ published: true })
  await checkOfficialUpstream({ ...f, channel: 'stable' })
  assert.equal(f.created.length, 0)
})

test('selects a published beta instead of drafts or test releases', async () => {
  const f = fixture()
  await checkOfficialUpstream({ ...f, channel: 'beta' })
  assert.match(f.created[0].title, /release-3.6.8-beta1$/)
  assert.match(f.created[0].body, /`l10n-beta`/)
})

test('fails on API authorization errors instead of opening a false reminder', async () => {
  const f = fixture({ status: 403 })
  await assert.rejects(checkOfficialUpstream({ ...f, channel: 'stable' }), {
    status: 403,
  })
  assert.equal(f.created.length, 0)
})
