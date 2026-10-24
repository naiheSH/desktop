import * as React from 'react'
import { getHTMLURL } from '../../lib/api'
import { Ref } from './ref'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'

interface IEnterpriseServerConfirmationProps {
  readonly endpoint: string
}

export const enterpriseServerConfirmationDescriptionId =
  'enterprise-server-confirmation-description'

/** Explains the destination of an Enterprise sign-in requested by Git. */
export class EnterpriseServerConfirmation extends React.Component<IEnterpriseServerConfirmationProps> {
  public render() {
    return (
      <div
        id={enterpriseServerConfirmationDescriptionId}
        className="enterprise-server-confirmation"
      >
        <p>Git 正在请求登录以下服务器：</p>
        <p>
          <Ref>{getHTMLURL(this.props.endpoint)}</Ref>
        </p>
        <div className="enterprise-server-warning">
          <Octicon symbol={octicons.alert} />
          <p>
            <strong>请确认你认识并信任此服务器后再继续。</strong>{' '}
            请确认浏览器中显示的是此地址。如果不一致，请取消并联系仓库管理员。
          </p>
        </div>
      </div>
    )
  }
}
