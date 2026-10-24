import * as React from 'react'
import { DialogContent } from '../dialog'
import { Checkbox, CheckboxValue } from '../lib/checkbox'

interface IAccessibilityPreferencesProps {
  readonly underlineLinks: boolean
  readonly onUnderlineLinksChanged: (value: boolean) => void

  readonly showDiffCheckMarks: boolean
  readonly onShowDiffCheckMarksChanged: (value: boolean) => void
}

export class Accessibility extends React.Component<
  IAccessibilityPreferencesProps,
  {}
> {
  public constructor(props: IAccessibilityPreferencesProps) {
    super(props)
  }

  public render() {
    return (
      <DialogContent>
        <div className="accessibility-section">
          <h2>无障碍</h2>
          <Checkbox
            label="为链接添加下划线"
            value={
              this.props.underlineLinks ? CheckboxValue.On : CheckboxValue.Off
            }
            onChange={this.onUnderlineLinksChanged}
            ariaDescribedBy="underline-setting-description"
          />
          <p
            id="underline-setting-description"
            className="settings-description"
          >
            启用后，GitHub Desktop
            将在提交说明、评论和其他文本字段中为链接添加下划线，使链接更易辨认。{' '}
            {this.renderExampleLink()}
          </p>

          <Checkbox
            label="在差异中显示勾选标记"
            value={
              this.props.showDiffCheckMarks
                ? CheckboxValue.On
                : CheckboxValue.Off
            }
            onChange={this.onShowDiffCheckMarksChanged}
            ariaDescribedBy="diff-checkmarks-setting-description"
          />
          <p
            id="diff-checkmarks-setting-description"
            className="settings-description"
          >
            启用后，提交时会在差异的行号和行号组旁显示勾选标记。禁用后，行号控件将不那么突出。
          </p>
        </div>
      </DialogContent>
    )
  }

  private renderExampleLink() {
    // The example link is rendered with inline style to override the global
    // underline setting since this is a non-interactive visual preview.
    const style = {
      textDecoration: this.props.underlineLinks ? 'underline' : 'none',
    }

    return (
      <span className="link-button-component example-link" style={style}>
        这是一个示例链接
      </span>
    )
  }

  private onUnderlineLinksChanged = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    this.props.onUnderlineLinksChanged(event.currentTarget.checked)
  }

  private onShowDiffCheckMarksChanged = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    this.props.onShowDiffCheckMarksChanged(event.currentTarget.checked)
  }
}
