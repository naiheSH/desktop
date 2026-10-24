import * as React from 'react'
import { copilotAppMarketingUrl } from '../../lib/copilot-app'
import { Dialog, DialogContent, DefaultDialogFooter } from '../dialog'
import { LinkButton } from '../lib/link-button'

interface ICopilotAppNotFoundDialogProps {
  readonly onDismissed: () => void
  readonly showPreferencesDialog: () => void
}

/** Help the user install or configure GitHub Copilot when it cannot be found. */
export class CopilotAppNotFoundDialog extends React.Component<ICopilotAppNotFoundDialogProps> {
  private onShowPreferences = () => {
    this.props.onDismissed()
    this.props.showPreferencesDialog()
  }

  public render() {
    return (
      <Dialog
        id="copilot-app"
        title="GitHub Copilot"
        onDismissed={this.props.onDismissed}
        onSubmit={this.props.onDismissed}
      >
        <DialogContent>
          <p>
            未在此电脑上找到 GitHub Copilot 应用。你可以
            <LinkButton uri={copilotAppMarketingUrl}>
              下载 GitHub Copilot
            </LinkButton>
            。
          </p>
          <p>
            已经安装？请在
            <LinkButton onClick={this.onShowPreferences}>偏好设置</LinkButton>
            中指定应用位置。
          </p>
        </DialogContent>
        <DefaultDialogFooter />
      </Dialog>
    )
  }
}
