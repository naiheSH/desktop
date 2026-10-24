import assert from 'node:assert'
import { describe, it } from 'node:test'
import * as React from 'react'
import { render, screen, fireEvent } from '../../helpers/ui/render'
import { Appearance } from '../../../src/ui/preferences/appearance'
import { ApplicationTheme } from '../../../src/ui/lib/application-theme'
import {
  getDateFormatPreference,
  getTimeFormatPreference,
  getNumberFormatPreference,
} from '../../../src/models/formatting-preferences'

function renderAppearance(alwaysShowWorktreeList = false) {
  const changes: boolean[] = []
  const props = {
    selectedTheme: ApplicationTheme.Light,
    onSelectedThemeChanged: () => {},
    selectedTabSize: 4,
    onSelectedTabSizeChanged: () => {},
    selectedDateFormat: getDateFormatPreference(),
    onSelectedDateFormatChanged: () => {},
    selectedTimeFormat: getTimeFormatPreference(),
    onSelectedTimeFormatChanged: () => {},
    selectedNumberFormat: getNumberFormatPreference(),
    onSelectedNumberFormatChanged: () => {},
    preferAbsoluteDates: false,
    onPreferAbsoluteDatesChanged: () => {},
    alwaysShowWorktreeList,
    onAlwaysShowWorktreeListChanged: (value: boolean) => changes.push(value),
  }
  const view = render(<Appearance {...props} />)
  return { ...view, props, changes }
}

describe('Appearance preferences', () => {
  it('shows the worktree preference below Diff Tab Size in 其他', () => {
    renderAppearance()

    const heading = screen.getByRole('heading', { name: '其他' })
    const tabSize = screen.getByRole('combobox', { name: '差异对比制表符宽度' })
    const checkbox = screen.getByRole('checkbox', {
      name: '始终显示工作区列表',
    })

    assert.strictEqual(
      heading.parentElement,
      tabSize.closest('.appearance-section')
    )
    assert.strictEqual(
      heading.parentElement,
      checkbox.closest('.appearance-section')
    )
    assert.ok(
      tabSize.compareDocumentPosition(checkbox) &
        Node.DOCUMENT_POSITION_FOLLOWING
    )
    assert.ok(checkbox instanceof HTMLInputElement)
    assert.strictEqual(checkbox.checked, false)
  })

  it('reports enabling and disabling the preference and reflects updated props', () => {
    const { rerender, props, changes } = renderAppearance()
    const checkbox = screen.getByRole('checkbox', {
      name: '始终显示工作区列表',
    })
    fireEvent.click(checkbox)
    assert.deepStrictEqual(changes, [true])

    rerender(<Appearance {...props} alwaysShowWorktreeList={true} />)
    assert.ok(checkbox instanceof HTMLInputElement)
    assert.strictEqual(checkbox.checked, true)

    fireEvent.click(checkbox)
    assert.deepStrictEqual(changes, [true, false])
  })
})
