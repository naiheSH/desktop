import assert from 'node:assert'
import { afterEach, beforeEach, describe, it } from 'node:test'
import * as React from 'react'
import { fireEvent, render, screen } from '../../helpers/ui/render'
import type { IBYOKProvider } from '../../../src/lib/copilot/byok'
import { CopilotCustomProvidersDialog } from '../../../src/ui/preferences/copilot-custom-providers-dialog'

const provider: IBYOKProvider = {
  id: 'ollama-id',
  name: 'Ollama',
  type: 'openai',
  baseUrl: 'http://localhost:11434/v1',
  authKind: 'none',
  models: [
    { id: 'llama3', name: 'Llama 3' },
    { id: 'phi-4', name: 'Phi 4' },
  ],
}

let restoreIpcSend: (() => void) | null = null

describe('CopilotCustomProvidersDialog', () => {
  beforeEach(async () => {
    const electron = await import('electron')
    const previousSend = electron.ipcRenderer.send
    electron.ipcRenderer.send = () => {}
    restoreIpcSend = () => {
      electron.ipcRenderer.send = previousSend
    }
  })

  afterEach(() => {
    restoreIpcSend?.()
    restoreIpcSend = null
  })

  it('renders providers and invokes management actions', () => {
    const actions = new Array<string>()

    render(
      <CopilotCustomProvidersDialog
        providers={[provider]}
        onAddProvider={() => actions.push('add')}
        onEditProvider={() => actions.push('edit')}
        onDeleteProvider={() => actions.push('delete')}
        onDismissed={() => {}}
      />
    )

    assert.ok(screen.getByText('Ollama'))
    assert.ok(screen.getByText('OpenAI-compatible · 2个模型'))
    assert.ok(screen.getByText('本地'))

    fireEvent.click(
      screen.getByRole('button', { name: /添加提供商…/i, hidden: true })
    )
    fireEvent.click(
      screen.getByRole('button', { name: '编辑Ollama', hidden: true })
    )
    fireEvent.click(
      screen.getByRole('button', { name: '移除Ollama', hidden: true })
    )

    assert.deepStrictEqual(actions, ['add', 'edit', 'delete'])
  })

  it('renders the empty state', () => {
    render(
      <CopilotCustomProvidersDialog
        providers={[]}
        onAddProvider={() => {}}
        onEditProvider={() => {}}
        onDeleteProvider={() => {}}
        onDismissed={() => {}}
      />
    )

    assert.ok(screen.getByText(/添加自定义提供商，以便使用自己的 API 密钥/))
  })
})
