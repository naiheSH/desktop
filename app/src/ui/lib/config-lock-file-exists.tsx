import * as React from 'react'
import { Ref } from './ref'
import { LinkButton } from './link-button'
import { unlink } from 'fs/promises'

interface IConfigLockFileExistsProps {
  /**
   * The path to the lock file that's preventing a configuration
   * file update.
   */
  readonly lockFilePath: string

  /**
   * Called when the lock file has been deleted and the configuration
   * update can be retried
   */
  readonly onLockFileDeleted: () => void

  /**
   * Called if the lock file couldn't be deleted
   */
  readonly onError: (e: Error) => void
}

export class ConfigLockFileExists extends React.Component<IConfigLockFileExistsProps> {
  private onDeleteLockFile = async () => {
    try {
      await unlink(this.props.lockFilePath)
    } catch (e) {
      // We don't care about failure to unlink due to the
      // lock file not existing any more
      if (e.code !== 'ENOENT') {
        this.props.onError(e)
        return
      }
    }

    this.props.onLockFileDeleted()
  }
  public render() {
    return (
      <div className="config-lock-file-exists-component">
        <p>
          无法更新 Git 配置文件。锁文件已存在于{' '}
          <Ref>{this.props.lockFilePath}</Ref>.
        </p>
        <p>
          这可能是因为其他工具正在修改 Git 配置，或之前的 Git
          进程退出时未清理锁文件。是否{' '}
          <LinkButton onClick={this.onDeleteLockFile}>删除锁文件</LinkButton>{' '}
          并重试？
        </p>
      </div>
    )
  }
}
