import assert from 'node:assert'
import { mkdir, writeFile } from 'fs/promises'
import * as Path from 'path'
import { describe, it, TestContext } from 'node:test'
import * as React from 'react'

import { CloneRepositoryTab } from '../../../src/models/clone-repository-tab'
import { CloneRepository } from '../../../src/ui/clone-repository/clone-repository'
import type { Dispatcher } from '../../../src/ui/dispatcher'
import { setDefaultDir } from '../../../src/ui/lib/default-dir'
import { createTempDirectory } from '../../helpers/temp'
import { fireEvent, render, screen, waitFor } from '../../helpers/ui/render'

const applicationPathError =
  '在 macOS 上，本地路径不能以 .app 结尾。请使用其他文件夹名称，以免被识别为应用程序包。'

async function renderCloneDialog(
  t: TestContext,
  initialURL = 'https://example.com/owner/repository.git',
  darwin = true
) {
  const electron = await import('electron')
  const originalDarwin = __DARWIN__
  const originalSend = electron.ipcRenderer.send
  const originalDefaultDir = localStorage.getItem('last-clone-location')
  Object.assign(globalThis, { __DARWIN__: darwin })
  electron.ipcRenderer.send = () => {}
  t.after(() => {
    Object.assign(globalThis, { __DARWIN__: originalDarwin })
    electron.ipcRenderer.send = originalSend
    if (originalDefaultDir === null) {
      localStorage.removeItem('last-clone-location')
    } else {
      setDefaultDir(originalDefaultDir)
    }
  })

  const directory = await createTempDirectory(t)
  setDefaultDir(directory)
  const clone = t.mock.fn<Dispatcher['clone']>()
  const dispatcher: Pick<Dispatcher, 'clone' | 'closeFoldout'> = {
    clone,
    closeFoldout: t.mock.fn<Dispatcher['closeFoldout']>(),
  }
  const view = render(
    <CloneRepository
      dispatcher={dispatcher as Dispatcher}
      onDismissed={t.mock.fn()}
      accounts={[]}
      initialURL={initialURL}
      selectedTab={CloneRepositoryTab.Generic}
      onTabSelected={t.mock.fn()}
      apiRepositories={new Map()}
      onRefreshRepositories={t.mock.fn()}
      isTopMost={true}
    />
  )

  const pathInput = screen.getByRole('textbox', {
    name: /本地保存文件夹/,
    hidden: true,
  })
  assert.ok(pathInput instanceof HTMLInputElement)
  await waitFor(() => assert.notStrictEqual(pathInput.value, ''))
  const cloneButton = screen.getByRole('button', {
    name: '克隆',
    hidden: true,
  })
  assert.ok(cloneButton instanceof HTMLButtonElement)

  return { ...view, directory, pathInput, cloneButton, clone }
}

describe('CloneRepository path validation', () => {
  for (const suffix of ['.app', '.APP.git', '.App.git/']) {
    it(`rejects an automatically derived ${suffix} destination without renaming it`, async t => {
      const { directory, pathInput, cloneButton } = await renderCloneDialog(
        t,
        `https://github.com/owner/repository${suffix}`
      )

      await waitFor(() => assert.ok(screen.getByText(applicationPathError)))
      assert.strictEqual(
        pathInput.value,
        Path.join(directory, `repository${suffix.replace(/\.git\/?$/, '')}`)
      )
      assert.strictEqual(cloneButton.getAttribute('aria-disabled'), 'true')
    })
  }

  it('validates edited paths, normalizes trailing separators, and clears the error after correction', async t => {
    const { directory, pathInput, cloneButton } = await renderCloneDialog(t)
    await waitFor(() =>
      assert.strictEqual(cloneButton.getAttribute('aria-disabled'), null)
    )

    for (const name of [
      'repository.app',
      'repository.APP/',
      '.app',
      'repository.app/.',
    ]) {
      const path = `${directory}/${name}`
      fireEvent.change(pathInput, { target: { value: path } })

      await waitFor(() => assert.ok(screen.getByText(applicationPathError)))
      assert.strictEqual(pathInput.value, path)
      assert.strictEqual(cloneButton.getAttribute('aria-disabled'), 'true')
    }

    fireEvent.change(pathInput, {
      target: { value: Path.join(directory, 'repository.app-source') },
    })
    await waitFor(() =>
      assert.strictEqual(cloneButton.getAttribute('aria-disabled'), null)
    )
    assert.strictEqual(screen.queryByText(applicationPathError), null)
  })

  it('rejects an existing empty .app folder', async t => {
    const { directory, pathInput, cloneButton } = await renderCloneDialog(t)
    const path = Path.join(directory, 'empty.app')
    await mkdir(path)
    fireEvent.change(pathInput, { target: { value: path } })

    await waitFor(() => assert.ok(screen.getByText(applicationPathError)))
    assert.strictEqual(cloneButton.getAttribute('aria-disabled'), 'true')
  })

  it('validates paths derived after editing the repository URL', async t => {
    const { directory, pathInput, cloneButton } = await renderCloneDialog(t)
    const urlInput = screen.getByRole('textbox', {
      name: /仓库网址/,
      hidden: true,
    })
    fireEvent.change(urlInput, {
      target: { value: 'https://example.com/owner/changed.app.git' },
    })

    await waitFor(() => assert.ok(screen.getByText(applicationPathError)))
    assert.strictEqual(pathInput.value, Path.join(directory, 'changed.app'))
    assert.strictEqual(cloneButton.getAttribute('aria-disabled'), 'true')

    fireEvent.change(urlInput, {
      target: { value: 'https://example.com/owner/changed.git' },
    })
    await waitFor(() =>
      assert.strictEqual(cloneButton.getAttribute('aria-disabled'), null)
    )
    assert.strictEqual(pathInput.value, Path.join(directory, 'changed'))
    assert.strictEqual(screen.queryByText(applicationPathError), null)
  })

  it('validates a path chosen through the macOS directory picker', async t => {
    const { directory, pathInput, cloneButton } = await renderCloneDialog(t)
    const path = Path.join(directory, 'chosen.app')
    const electron = await import('electron')
    t.mock.method(electron.ipcRenderer, 'invoke', async (channel: string) => {
      assert.strictEqual(channel, 'show-save-dialog')
      return path
    })

    fireEvent.click(screen.getByRole('button', { name: '选择…', hidden: true }))

    await waitFor(() => assert.ok(screen.getByText(applicationPathError)))
    assert.strictEqual(pathInput.value, path)
    assert.strictEqual(cloneButton.getAttribute('aria-disabled'), 'true')
  })

  it('does not dispatch a clone when an invalid path is submitted directly', async t => {
    const { directory, pathInput, container, clone } = await renderCloneDialog(
      t
    )
    fireEvent.change(pathInput, {
      target: { value: Path.join(directory, 'repository.app') },
    })
    const form = container.querySelector('form')
    assert.ok(form)
    fireEvent.submit(form)

    await waitFor(() => {
      assert.ok(screen.getByText(applicationPathError))
      assert.strictEqual(container.querySelector('.dialog-header .spin'), null)
    })
    assert.strictEqual(clone.mock.callCount(), 0)
  })

  it('preserves existing non-empty directory validation', async t => {
    const { directory, pathInput, cloneButton } = await renderCloneDialog(t)
    await writeFile(Path.join(directory, 'file.txt'), 'existing file')
    fireEvent.change(pathInput, { target: { value: directory } })

    await waitFor(() =>
      assert.ok(
        screen.getByText('该文件夹存在文件，Git 需要克隆到空的文件夹里。')
      )
    )
    assert.strictEqual(cloneButton.getAttribute('aria-disabled'), 'true')
  })

  it('clones to a corrected destination without changing the repository URL', async t => {
    const url = 'https://example.com/owner/repository.app.git'
    const { directory, pathInput, container, clone } = await renderCloneDialog(
      t,
      url
    )
    await waitFor(() => assert.ok(screen.getByText(applicationPathError)))
    const path = Path.join(directory, 'repository-source')
    fireEvent.change(pathInput, { target: { value: path } })
    const form = container.querySelector('form')
    assert.ok(form)
    fireEvent.submit(form)

    await waitFor(() => assert.strictEqual(clone.mock.callCount(), 1))
    assert.deepStrictEqual(clone.mock.calls[0].arguments, [
      url,
      path,
      { defaultBranch: undefined },
    ])
  })

  it('allows .app destinations on other platforms', async t => {
    const { directory, pathInput, cloneButton } = await renderCloneDialog(
      t,
      'https://github.com/owner/repository.app.git',
      false
    )

    await waitFor(() =>
      assert.strictEqual(cloneButton.getAttribute('aria-disabled'), null)
    )
    assert.strictEqual(pathInput.value, Path.join(directory, 'repository.app'))
    assert.strictEqual(screen.queryByText(applicationPathError), null)
  })
})
