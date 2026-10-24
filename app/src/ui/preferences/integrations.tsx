import * as React from 'react'
import { DialogContent } from '../dialog'
import { LinkButton } from '../lib/link-button'
import { Row } from '../../ui/lib/row'
import { Select } from '../lib/select'
import { Shell, parse as parseShell } from '../../lib/shells'
import { suggestedExternalEditor } from '../../lib/editors/shared'
import { CustomIntegrationForm } from './custom-integration-form'
import { ICustomIntegration } from '../../lib/custom-integration'
import {
  enableCopilotAppHandoff,
  enableCustomIntegration,
} from '../../lib/feature-flag'
import { TextBox } from '../lib/text-box'
import { Button } from '../lib/button'
import { InputError } from '../lib/input-description/input-error'
import { showOpenDialog } from '../main-process-proxy'
import { copilotAppMarketingUrl } from '../../lib/copilot-app'

const CustomIntegrationValue = 'other'

interface IIntegrationsPreferencesProps {
  readonly availableEditors: ReadonlyArray<string>
  readonly selectedExternalEditor: string | null
  readonly availableShells: ReadonlyArray<Shell>
  readonly selectedShell: Shell
  readonly useCustomEditor: boolean
  readonly customEditor: ICustomIntegration
  readonly useCustomShell: boolean
  readonly customShell: ICustomIntegration
  readonly copilotAppPath: string
  readonly copilotAppPathError?: string
  readonly onSelectedEditorChanged: (editor: string) => void
  readonly onSelectedShellChanged: (shell: Shell) => void
  readonly onUseCustomEditorChanged: (useCustomEditor: boolean) => void
  readonly onCustomEditorChanged: (customEditor: ICustomIntegration) => void
  readonly onUseCustomShellChanged: (useCustomShell: boolean) => void
  readonly onCustomShellChanged: (customShell: ICustomIntegration) => void
  readonly onCopilotAppPathChanged: (path: string) => void
}

interface IIntegrationsPreferencesState {
  readonly selectedExternalEditor: string | null
  readonly selectedShell: Shell
  readonly useCustomEditor: boolean
  readonly customEditor: ICustomIntegration
  readonly useCustomShell: boolean
  readonly customShell: ICustomIntegration
  readonly copilotAppPath: string
}

export class Integrations extends React.Component<
  IIntegrationsPreferencesProps,
  IIntegrationsPreferencesState
> {
  private customEditorFormRef = React.createRef<CustomIntegrationForm>()
  private customShellFormRef = React.createRef<CustomIntegrationForm>()

  public constructor(props: IIntegrationsPreferencesProps) {
    super(props)

    this.state = {
      selectedExternalEditor: this.props.selectedExternalEditor,
      selectedShell: this.props.selectedShell,
      useCustomEditor: this.props.useCustomEditor,
      customEditor: this.props.customEditor,
      useCustomShell: this.props.useCustomShell,
      customShell: this.props.customShell,
      copilotAppPath: this.props.copilotAppPath,
    }
  }

  public async componentWillReceiveProps(
    nextProps: IIntegrationsPreferencesProps
  ) {
    const editors = nextProps.availableEditors
    let selectedExternalEditor = nextProps.selectedExternalEditor
    if (editors.length) {
      const indexOf = selectedExternalEditor
        ? editors.indexOf(selectedExternalEditor)
        : -1
      if (indexOf === -1) {
        selectedExternalEditor = editors[0]
        nextProps.onSelectedEditorChanged(selectedExternalEditor)
      }
    }

    const shells = nextProps.availableShells
    let selectedShell = nextProps.selectedShell
    if (shells.length) {
      const indexOf = shells.indexOf(selectedShell)
      if (indexOf === -1) {
        selectedShell = shells[0]
        nextProps.onSelectedShellChanged(selectedShell)
      }
    }
    this.setState({
      selectedExternalEditor,
      selectedShell,
      useCustomEditor: nextProps.useCustomEditor,
      useCustomShell: nextProps.useCustomShell,
      customShell: nextProps.customShell,
      customEditor: nextProps.customEditor,
      copilotAppPath: nextProps.copilotAppPath,
    })
  }

  public componentDidMount(): void {
    if (enableCustomIntegration()) {
      const {
        availableEditors,
        availableShells,
        useCustomEditor,
        useCustomShell,
      } = this.props

      // When there are no available editors or shells, the `Select` component
      // will have the custom editor or shell already selected, but we need
      // to handle that as initial value, otherwise the custom integration
      // form won't be rendered.

      if (availableEditors.length === 0 && !useCustomEditor) {
        this.setSelectedEditor(CustomIntegrationValue)
      }

      if (availableShells.length === 0 && !useCustomShell) {
        this.setSelectedShell(CustomIntegrationValue)
      }
    }
  }

  public componentDidUpdate(
    prevProps: IIntegrationsPreferencesProps,
    prevState: IIntegrationsPreferencesState
  ): void {
    // When the user switches to the custom editor or shell, we want to focus the
    // path input field.
    if (!prevState.useCustomEditor && this.state.useCustomEditor) {
      this.customEditorFormRef.current?.focus()
    }

    if (!prevState.useCustomShell && this.state.useCustomShell) {
      this.customShellFormRef.current?.focus()
    }
  }

  private onSelectedEditorChanged = (
    event: React.FormEvent<HTMLSelectElement>
  ) => {
    const value = event.currentTarget.value
    if (!value) {
      return
    }

    this.setSelectedEditor(value)
  }

  private setSelectedEditor = (editor: string) => {
    if (editor === CustomIntegrationValue) {
      this.setState({ useCustomEditor: true })
      this.props.onUseCustomEditorChanged(true)
    } else {
      this.setState({
        useCustomEditor: false,
        selectedExternalEditor: editor,
      })
      this.props.onUseCustomEditorChanged(false)
      this.props.onSelectedEditorChanged(editor)
    }
  }

  private onSelectedShellChanged = (
    event: React.FormEvent<HTMLSelectElement>
  ) => {
    const value = event.currentTarget.value
    if (!value) {
      return
    }

    this.setSelectedShell(value)
  }

  private setSelectedShell = (shell: string) => {
    if (shell === CustomIntegrationValue) {
      this.setState({ useCustomShell: true })
      this.props.onUseCustomShellChanged(true)
    } else {
      const parsedValue = parseShell(shell)
      this.setState({
        useCustomShell: false,
        selectedShell: parsedValue,
      })
      this.props.onSelectedShellChanged(parsedValue)
      this.props.onUseCustomShellChanged(false)
    }
  }

  private renderExternalEditor() {
    const options = this.props.availableEditors
    const { selectedExternalEditor, useCustomEditor } = this.state
    const label = __DARWIN__ ? '外部编辑器' : '外部编辑器'

    if (!enableCustomIntegration() && options.length === 0) {
      // this is emulating the <Select/> component's UI so the styles are
      // consistent for either case.
      //
      // TODO: see whether it makes sense to have a fallback UI
      // which we display when the select list is empty
      return (
        <div className="select-component no-options-found">
          <label>{label}</label>
          <span>
            未找到编辑器。{' '}
            <LinkButton uri={suggestedExternalEditor.url}>
              安装 {suggestedExternalEditor.name}?
            </LinkButton>
          </span>
        </div>
      )
    }

    return (
      <Select
        label={enableCustomIntegration() ? undefined : label}
        aria-label="外部编辑器"
        value={
          useCustomEditor
            ? CustomIntegrationValue
            : selectedExternalEditor ?? undefined
        }
        onChange={this.onSelectedEditorChanged}
      >
        {options.map(n => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
        {enableCustomIntegration() && (
          <option key={CustomIntegrationValue} value={CustomIntegrationValue}>
            {__DARWIN__ ? '配置自定义编辑器…' : '配置自定义编辑器…'}
          </option>
        )}
      </Select>
    )
  }

  private renderNoExternalEditorHint() {
    const options = this.props.availableEditors
    if (options.length > 0) {
      return null
    }

    return (
      <Row>
        <div className="no-options-found">
          <span>
            未找到其他编辑器。{' '}
            <LinkButton uri={suggestedExternalEditor.url}>
              安装 {suggestedExternalEditor.name}?
            </LinkButton>
          </span>
        </div>
      </Row>
    )
  }

  private renderCustomExternalEditor() {
    return (
      <Row>
        <CustomIntegrationForm
          id="custom-editor"
          ref={this.customEditorFormRef}
          path={this.state.customEditor.path ?? ''}
          arguments={this.state.customEditor.arguments}
          onPathChanged={this.onCustomEditorPathChanged}
          onArgumentsChanged={this.onCustomEditorArgumentsChanged}
        />
      </Row>
    )
  }

  private onCustomEditorPathChanged = (path: string, bundleID?: string) => {
    const customEditor: ICustomIntegration = {
      path,
      bundleID,
      arguments: this.state.customEditor.arguments ?? [],
    }

    this.setState({ customEditor })
    this.props.onCustomEditorChanged(customEditor)
  }

  private onCustomEditorArgumentsChanged = (args: string) => {
    const customEditor: ICustomIntegration = {
      path: this.state.customEditor.path,
      bundleID: this.state.customEditor.bundleID,
      arguments: args,
    }

    this.setState({ customEditor })
    this.props.onCustomEditorChanged(customEditor)
  }

  private renderSelectedShell() {
    const options = this.props.availableShells
    const { selectedShell, useCustomShell } = this.state

    return (
      <Select
        label={enableCustomIntegration() ? undefined : 'Shell'}
        aria-label="Shell"
        value={useCustomShell ? CustomIntegrationValue : selectedShell}
        onChange={this.onSelectedShellChanged}
      >
        {options.map(n => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
        {enableCustomIntegration() && (
          <option key={CustomIntegrationValue} value={CustomIntegrationValue}>
            {__DARWIN__ ? '配置自定义 Shell…' : '配置自定义 Shell…'}
          </option>
        )}
      </Select>
    )
  }

  private renderCustomShell() {
    return (
      <Row>
        <CustomIntegrationForm
          id="custom-shell"
          ref={this.customShellFormRef}
          path={this.state.customShell.path}
          arguments={this.state.customShell.arguments}
          onPathChanged={this.onCustomShellPathChanged}
          onArgumentsChanged={this.onCustomShellArgumentsChanged}
        />
      </Row>
    )
  }

  private onCustomShellPathChanged = (path: string, bundleID?: string) => {
    const customShell: ICustomIntegration = {
      path,
      bundleID,
      arguments: this.state.customShell.arguments ?? [],
    }

    this.setState({ customShell })
    this.props.onCustomShellChanged(customShell)
  }

  private onCustomShellArgumentsChanged = (args: string) => {
    const customShell: ICustomIntegration = {
      path: this.state.customShell.path ?? '',
      bundleID: this.state.customShell.bundleID,
      arguments: args,
    }

    this.setState({ customShell })
    this.props.onCustomShellChanged(customShell)
  }

  private onCopilotAppPathChanged = (path: string) => {
    this.setState({ copilotAppPath: path })
    this.props.onCopilotAppPathChanged(path)
  }

  private onChooseCopilotAppPath = async () => {
    const path = await showOpenDialog({
      title: '选择 GitHub Copilot',
      properties: __DARWIN__ ? ['openFile', 'openDirectory'] : ['openFile'],
      filters: [
        { name: 'GitHub Copilot', extensions: [__DARWIN__ ? 'app' : 'exe'] },
      ],
    })

    if (path !== null) {
      this.onCopilotAppPathChanged(path)
    }
  }

  private renderCopilotApp() {
    if (!enableCopilotAppHandoff()) {
      return null
    }

    return (
      <fieldset>
        <legend>
          <h2>GitHub Copilot</h2>
        </legend>
        <p>
          体验 GitHub 原生的智能体开发功能。
          <LinkButton uri={copilotAppMarketingUrl}>
            了解 GitHub Copilot
          </LinkButton>
          。
        </p>
        <Row>
          <div className="custom-integration-form-container">
            <div className="custom-integration-form-path-container">
              <TextBox
                label="应用位置"
                value={this.state.copilotAppPath}
                placeholder={
                  __DARWIN__ ? 'GitHub Copilot.app 的路径' : 'github.exe 的路径'
                }
                onValueChanged={this.onCopilotAppPathChanged}
                ariaDescribedBy={
                  this.props.copilotAppPathError === undefined
                    ? undefined
                    : 'copilot-app-path-error'
                }
              />
              <Button onClick={this.onChooseCopilotAppPath}>选择…</Button>
            </div>
            {this.props.copilotAppPathError !== undefined && (
              <div className="custom-integration-form-error">
                <InputError
                  id="copilot-app-path-error"
                  trackedUserInput={this.state.copilotAppPath}
                  ariaLiveMessage={this.props.copilotAppPathError}
                >
                  {this.props.copilotAppPathError}
                </InputError>
              </div>
            )}
          </div>
        </Row>
      </fieldset>
    )
  }

  public render() {
    if (!enableCustomIntegration()) {
      return (
        <DialogContent>
          <h2>应用程序</h2>
          <Row>{this.renderExternalEditor()}</Row>
          <Row>{this.renderSelectedShell()}</Row>
          {this.renderCopilotApp()}
        </DialogContent>
      )
    }

    return (
      <DialogContent>
        <fieldset>
          <legend>
            <h2>{__DARWIN__ ? '外部编辑器' : '外部编辑器'}</h2>
          </legend>
          <Row>{this.renderExternalEditor()}</Row>
          {this.state.useCustomEditor && this.renderCustomExternalEditor()}
          {this.renderNoExternalEditorHint()}
        </fieldset>
        <fieldset>
          <legend>
            <h2>Shell</h2>
          </legend>
          <Row>{this.renderSelectedShell()}</Row>
          {this.state.useCustomShell && this.renderCustomShell()}
        </fieldset>
        {this.renderCopilotApp()}
      </DialogContent>
    )
  }
}
