import * as React from 'react'
import { DialogContent } from '../dialog'
import { RefNameTextBox } from '../lib/ref-name-text-box'
import { Ref } from '../lib/ref'
import { LinkButton } from '../lib/link-button'
import { Account } from '../../models/account'
import { GitConfigUserForm } from '../lib/git-config-user-form'
import { TabBar } from '../tab-bar'
import { Checkbox, CheckboxValue } from '../lib/checkbox'
import { Select } from '../lib/select'
import {
  shellFriendlyNames,
  SupportedHooksEnvShell,
} from '../../lib/hooks/config'

interface IGitProps {
  readonly name: string
  readonly email: string
  readonly defaultBranch: string
  readonly isLoadingGitConfig: boolean

  readonly accounts: ReadonlyArray<Account>

  readonly onNameChanged: (name: string) => void
  readonly onEmailChanged: (email: string) => void
  readonly onDefaultBranchChanged: (defaultBranch: string) => void

  readonly onEditGlobalGitConfig: () => void

  readonly selectedTabIndex?: number
  readonly onSelectedTabIndexChanged: (index: number) => void

  readonly onEnableGitHookEnvChanged: (enableGitHookEnv: boolean) => void
  readonly onCacheGitHookEnvChanged: (cacheGitHookEnv: boolean) => void
  readonly onSelectedShellChanged: (selectedShell: string) => void

  readonly enableGitHookEnv: boolean
  readonly cacheGitHookEnv: boolean
  readonly selectedShell: string
}

const windowsShells: ReadonlyArray<SupportedHooksEnvShell> = [
  'git-bash',
  'pwsh',
  'powershell',
  'cmd',
]

export class Git extends React.Component<IGitProps> {
  private get selectedTabIndex() {
    return this.props.selectedTabIndex ?? 0
  }

  private onTabClicked = (index: number) => {
    this.props.onSelectedTabIndexChanged?.(index)
  }

  private onEnableGitHookEnvChanged = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    this.props.onEnableGitHookEnvChanged(event.currentTarget.checked)
  }

  private onCacheGitHookEnvChanged = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    this.props.onCacheGitHookEnvChanged(event.currentTarget.checked)
  }

  private onSelectedShellChanged = (
    event: React.FormEvent<HTMLSelectElement>
  ) => {
    this.props.onSelectedShellChanged(event.currentTarget.value)
  }

  private renderHooksSettings() {
    return (
      <>
        <Checkbox
          label="从 Shell 加载 Git 钩子的环境变量"
          ariaDescribedBy="git-hooks-env-description"
          value={
            this.props.enableGitHookEnv ? CheckboxValue.On : CheckboxValue.Off
          }
          onChange={this.onEnableGitHookEnvChanged}
        />
        <p id="git-hooks-env-description" className="settings-description">
          启用后，GitHub Desktop 将在执行 Git 钩子时尝试从 Shell
          加载环境变量。这适用于依赖 Shell 配置文件中环境变量的 Git
          钩子，例如使用 nvm、rbenv、asdf 等版本管理器的情况。
        </p>

        {this.props.enableGitHookEnv && __WIN32__ && (
          <>
            <Select
              className="git-hook-shell-select"
              label={'加载环境变量时使用的 Shell'}
              value={this.props.selectedShell}
              onChange={this.onSelectedShellChanged}
            >
              {windowsShells
                .map(s => ({ key: s, title: shellFriendlyNames[s] }))
                .map(s => (
                  <option key={s.key} value={s.key}>
                    {s.title}
                  </option>
                ))}
            </Select>
          </>
        )}

        {this.props.enableGitHookEnv && (
          <>
            <Checkbox
              label="缓存 Git 钩子的环境变量"
              ariaDescribedBy="git-hooks-cache-description"
              onChange={this.onCacheGitHookEnvChanged}
              value={
                this.props.cacheGitHookEnv
                  ? CheckboxValue.On
                  : CheckboxValue.Off
              }
            />

            <div
              id="git-hooks-cache-description"
              className="settings-description"
            >
              缓存钩子的环境变量以提高性能。如果钩子依赖经常变化的环境变量，请禁用此项。
            </div>
          </>
        )}
      </>
    )
  }

  public render() {
    return (
      <DialogContent className="git-preferences">
        <TabBar
          selectedIndex={this.selectedTabIndex}
          onTabClicked={this.onTabClicked}
        >
          <span>作者</span>
          <span>默认分支</span>
          <span>钩子</span>
        </TabBar>
        <div className="git-preferences-content">{this.renderCurrentTab()}</div>
      </DialogContent>
    )
  }

  private renderCurrentTab() {
    if (this.selectedTabIndex === 0) {
      return this.renderGitConfigAuthorInfo()
    } else if (this.selectedTabIndex === 1) {
      return this.renderDefaultBranchSetting()
    } else if (this.selectedTabIndex === 2) {
      return this.renderHooksSettings()
    }

    return null
  }

  private renderGitConfigAuthorInfo() {
    return (
      <>
        <GitConfigUserForm
          email={this.props.email}
          name={this.props.name}
          isLoadingGitConfig={this.props.isLoadingGitConfig}
          accounts={this.props.accounts}
          onEmailChanged={this.props.onEmailChanged}
          onNameChanged={this.props.onNameChanged}
        />
        {this.renderEditGlobalGitConfigInfo()}
      </>
    )
  }

  private renderDefaultBranchSetting() {
    return (
      <div className="default-branch-component">
        <h2 id="default-branch-heading">新仓库的默认分支名称</h2>

        <RefNameTextBox
          initialValue={this.props.defaultBranch}
          onValueChange={this.props.onDefaultBranchChanged}
          ariaLabelledBy={'default-branch-heading'}
          ariaDescribedBy="default-branch-description"
          warningMessageVerb="saved"
        />

        <p id="default-branch-description" className="settings-description">
          GitHub 的默认分支名称为 <Ref>main</Ref>
          。你可以根据工作流程进行更改，或因集成仍要求历史默认分支名称而使用{' '}
          <Ref>master</Ref>.
        </p>

        {this.renderEditGlobalGitConfigInfo()}
      </div>
    )
  }

  private renderEditGlobalGitConfigInfo() {
    return (
      <p className="settings-description">
        这些偏好设置将{' '}
        <LinkButton onClick={this.props.onEditGlobalGitConfig}>
          编辑全局 Git 配置文件
        </LinkButton>
        .
      </p>
    )
  }
}
