import { Menu, shell, app, BrowserWindow } from 'electron'
import { ensureItemIds } from './ensure-item-ids'
import { MenuEvent } from './menu-event'
import { truncateWithEllipsis } from '../../lib/truncate-with-ellipsis'
import { getLogDirectoryPath } from '../../lib/logging/get-log-path'
import { UNSAFE_openDirectory } from '../shell'
import {
  enableCopilotAppHandoff,
  enableWorktreeSupport,
} from '../../lib/feature-flag'
import { MenuLabelsEvent } from '../../models/menu-labels'
import * as ipcWebContents from '../ipc-webcontents'
import { mkdir } from 'fs/promises'
import { buildTestMenu } from './build-test-menu'

const createPullRequestLabel = __DARWIN__ ? '创建拉取请求' : '创建拉取请求(&P)'
const showPullRequestLabel = __DARWIN__
  ? '在 GitHub 上查看拉取请求'
  : '在 GitHub 上查看拉取请求(&P)'
const defaultBranchNameValue = __DARWIN__ ? '默认分支' : '默认分支'
const confirmRepositoryRemovalLabel = __DARWIN__ ? '移除…' : '移除(&R)…'
const repositoryRemovalLabel = __DARWIN__ ? '移除' : '移除(&R)'
const confirmStashAllChangesLabel = __DARWIN__
  ? '储藏所有更改…'
  : '储藏所有更改(&S)…'
const stashAllChangesLabel = __DARWIN__ ? '储藏所有更改' : '储藏所有更改(&S)'

enum ZoomDirection {
  Reset,
  In,
  Out,
}

export const separator: Electron.MenuItemConstructorOptions = {
  type: 'separator',
}

export function buildDefaultMenu(params: MenuLabelsEvent): Electron.Menu {
  return Menu.buildFromTemplate(buildDefaultMenuTemplate(params))
}

export function buildDefaultMenuTemplate({
  selectedExternalEditor,
  selectedShell,
  askForConfirmationOnForcePush,
  askForConfirmationOnRepositoryRemoval,
  hasCurrentPullRequest = false,
  contributionTargetDefaultBranch = defaultBranchNameValue,
  isForcePushForCurrentRepository = false,
  isStashedChangesVisible = false,
  askForConfirmationWhenStashingAllChanges = true,
  isChangesFilterVisible = true,
}: MenuLabelsEvent): Electron.MenuItemConstructorOptions[] {
  contributionTargetDefaultBranch = truncateWithEllipsis(
    contributionTargetDefaultBranch,
    25
  )

  const removeRepoLabel = askForConfirmationOnRepositoryRemoval
    ? confirmRepositoryRemovalLabel
    : repositoryRemovalLabel

  const pullRequestLabel = hasCurrentPullRequest
    ? showPullRequestLabel
    : createPullRequestLabel

  const template = new Array<Electron.MenuItemConstructorOptions>()

  if (__DARWIN__) {
    template.push({
      label: 'GitHub Desktop',
      submenu: [
        {
          label: '关于 GitHub Desktop',
          click: emit('show-about'),
          id: 'about',
        },
        separator,
        {
          label: '设置…',
          id: 'preferences',
          accelerator: 'CmdOrCtrl+,',
          click: emit('show-preferences'),
        },
        separator,
        {
          label: '安装命令行工具…',
          id: 'install-cli',
          click: emit('install-darwin-cli'),
        },
        separator,
        {
          role: 'services',
          label: '服务',
          submenu: [],
        },
        separator,
        { role: 'hide', label: '隐藏 GitHub Desktop' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        separator,
        { role: 'quit', label: '退出 GitHub Desktop' },
      ],
    })
  }

  const fileMenu: Electron.MenuItemConstructorOptions = {
    label: __DARWIN__ ? '文件' : '文件(&F)',
    submenu: [
      {
        label: __DARWIN__ ? '新建仓库…' : '新建仓库(&R)…',
        id: 'new-repository',
        click: emit('create-repository'),
        accelerator: 'CmdOrCtrl+N',
      },
      separator,
      {
        label: __DARWIN__ ? '添加本地仓库…' : '添加本地仓库(&L)…',
        id: 'add-local-repository',
        accelerator: 'CmdOrCtrl+O',
        click: emit('add-local-repository'),
      },
      {
        label: __DARWIN__ ? '克隆仓库…' : '克隆仓库(&N)…',
        id: 'clone-repository',
        accelerator: 'CmdOrCtrl+Shift+O',
        click: emit('clone-repository'),
      },
    ],
  }

  if (!__DARWIN__) {
    const fileItems = fileMenu.submenu as Electron.MenuItemConstructorOptions[]
    const exitAccelerator = __WIN32__ ? 'Alt+F4' : 'CmdOrCtrl+Q'

    fileItems.push(
      separator,
      {
        label: '选项(&O)…',
        id: 'preferences',
        accelerator: 'CmdOrCtrl+,',
        click: emit('show-preferences'),
      },
      separator,
      {
        role: 'quit',
        label: '退出(&X)',
        accelerator: exitAccelerator,
      }
    )
  }

  template.push(fileMenu)

  template.push({
    label: __DARWIN__ ? '编辑' : '编辑(&E)',
    submenu: [
      { role: 'undo', label: __DARWIN__ ? '撤销' : '撤销(&U)' },
      { role: 'redo', label: __DARWIN__ ? '重做' : '重做(&R)' },
      separator,
      { role: 'cut', label: __DARWIN__ ? '剪切' : '剪切(&T)' },
      { role: 'copy', label: __DARWIN__ ? '复制' : '复制(&C)' },
      { role: 'paste', label: __DARWIN__ ? '粘贴' : '粘贴(&P)' },
      {
        label: __DARWIN__ ? '全选' : '全选(&A)',
        accelerator: 'CmdOrCtrl+A',
        click: emit('select-all'),
      },
      separator,
      {
        id: 'find',
        label: __DARWIN__ ? '查找' : '查找(&F)',
        accelerator: 'CmdOrCtrl+F',
        click: emit('find-text'),
      },
    ],
  })

  template.push({
    label: __DARWIN__ ? '视图' : '视图(&V)',
    submenu: [
      {
        label: __DARWIN__ ? '显示文件更改' : '文件更改(&C)',
        id: 'show-changes',
        accelerator: 'CmdOrCtrl+1',
        click: emit('show-changes'),
      },
      {
        label: __DARWIN__ ? '显示提交历史' : '提交历史(&H)',
        id: 'show-history',
        accelerator: 'CmdOrCtrl+2',
        click: emit('show-history'),
      },
      {
        label: __DARWIN__ ? '显示仓库列表' : '仓库列表(&L)',
        id: 'show-repository-list',
        accelerator: 'CmdOrCtrl+T',
        click: emit('choose-repository'),
      },
      {
        label: __DARWIN__ ? '显示分支列表' : '分支列表(&B)',
        id: 'show-branches-list',
        accelerator: 'CmdOrCtrl+B',
        click: emit('show-branches'),
      },
      {
        label: __DARWIN__ ? '显示工作区列表' : '工作区列表(&K)',
        id: 'show-worktrees-list',
        accelerator: 'CmdOrCtrl+Alt+W',
        click: emit('show-worktrees'),
        visible: enableWorktreeSupport(),
      },
      separator,
      {
        label: __DARWIN__ ? '转到提交摘要' : '转到提交摘要(&S)',
        id: 'go-to-commit-message',
        accelerator: 'CmdOrCtrl+G',
        click: emit('go-to-commit-message'),
      },
      {
        label: getStashedChangesLabel(isStashedChangesVisible),
        id: 'toggle-stashed-changes',
        accelerator: 'Ctrl+H',
        click: isStashedChangesVisible
          ? emit('hide-stashed-changes')
          : emit('show-stashed-changes'),
      },
      {
        label: __DARWIN__
          ? `${isChangesFilterVisible ? '隐藏' : '显示'}更改筛选器`
          : `${isChangesFilterVisible ? '隐藏' : '显示'}更改筛选器(&G)`,
        id: 'toggle-changes-filter',
        accelerator: 'CmdOrCtrl+L',
        click: emit('toggle-changes-filter'),
      },
      {
        label: __DARWIN__ ? '切换全屏' : '切换全屏(&F)',
        role: 'togglefullscreen',
      },
      separator,
      {
        label: __DARWIN__ ? '重置缩放' : '重置缩放',
        accelerator: 'CmdOrCtrl+0',
        click: zoom(ZoomDirection.Reset),
      },
      {
        label: __DARWIN__ ? '放大' : '放大',
        accelerator: 'CmdOrCtrl+=',
        click: zoom(ZoomDirection.In),
      },
      {
        label: __DARWIN__ ? '缩小' : '缩小',
        accelerator: 'CmdOrCtrl+-',
        click: zoom(ZoomDirection.Out),
      },
      {
        label: __DARWIN__ ? '加宽当前面板' : '加宽当前面板',
        id: 'increase-active-resizable-width',
        accelerator: 'CmdOrCtrl+9',
        click: emit('increase-active-resizable-width'),
      },
      {
        label: __DARWIN__ ? '缩窄当前面板' : '缩窄当前面板',
        id: 'decrease-active-resizable-width',
        accelerator: 'CmdOrCtrl+8',
        click: emit('decrease-active-resizable-width'),
      },
      separator,
      {
        label: '重新加载(&R)',
        id: 'reload-window',
        // Ctrl+Alt is interpreted as AltGr on international keyboards and this
        // can clash with other shortcuts. We should always use Ctrl+Shift for
        // chorded shortcuts, but this menu item is not a user-facing feature
        // so we are going to keep this one around.
        accelerator: 'CmdOrCtrl+Alt+R',
        click(item: any, focusedWindow: Electron.BaseWindow | undefined) {
          if (focusedWindow instanceof BrowserWindow) {
            focusedWindow.reload()
          }
        },
        visible: __RELEASE_CHANNEL__ === 'development',
      },
      {
        id: 'show-devtools',
        label: __DARWIN__ ? '切换开发者工具' : '切换开发者工具(&T)',
        accelerator: (() => {
          return __DARWIN__ ? 'Alt+Command+I' : 'Ctrl+Shift+I'
        })(),
        click(item: any, focusedWindow: Electron.BaseWindow | undefined) {
          if (focusedWindow instanceof BrowserWindow) {
            focusedWindow.webContents.toggleDevTools()
          }
        },
      },
    ],
  })

  const pushLabel = getPushLabel(
    isForcePushForCurrentRepository,
    askForConfirmationOnForcePush
  )

  const pushEventType = isForcePushForCurrentRepository ? 'force-push' : 'push'

  template.push({
    label: __DARWIN__ ? '仓库' : '仓库(&R)',
    id: 'repository',
    submenu: [
      {
        id: 'push',
        label: pushLabel,
        accelerator: 'CmdOrCtrl+P',
        click: emit(pushEventType),
      },
      {
        id: 'pull',
        label: __DARWIN__ ? '拉取' : '拉取(&L)',
        accelerator: 'CmdOrCtrl+Shift+P',
        click: emit('pull'),
      },
      {
        id: 'fetch',
        label: __DARWIN__ ? '获取更新' : '获取更新(&F)',
        accelerator: 'CmdOrCtrl+Shift+T',
        click: emit('fetch'),
      },
      {
        label: removeRepoLabel,
        id: 'remove-repository',
        accelerator: 'CmdOrCtrl+Backspace',
        click: emit('remove-repository'),
      },
      separator,
      {
        id: 'view-repository-on-github',
        label: __DARWIN__ ? '在 GitHub 上查看' : '在 GitHub 上查看(&V)',
        accelerator: 'CmdOrCtrl+Shift+G',
        click: emit('view-repository-on-github'),
      },
      {
        label: __DARWIN__
          ? `打开 ${selectedShell ?? '终端'}`
          : `打开 ${selectedShell ?? '终端'}(&P)`,
        id: 'open-in-shell',
        accelerator: 'Ctrl+`',
        click: emit('open-in-shell'),
      },
      {
        label: __DARWIN__
          ? '在 Finder 中显示'
          : __WIN32__
          ? '打开文件夹(&X)'
          : '打开文件夹',
        id: 'open-working-directory',
        accelerator: 'CmdOrCtrl+Shift+F',
        click: emit('open-working-directory'),
      },
      {
        label: __DARWIN__
          ? `打开 ${selectedExternalEditor ?? '外部编辑器'}`
          : `打开 ${selectedExternalEditor ?? '外部编辑器'}(&O)`,
        id: 'open-external-editor',
        accelerator: 'CmdOrCtrl+Shift+A',
        click: emit('open-external-editor'),
      },
      ...(enableCopilotAppHandoff()
        ? [
            {
              label: __DARWIN__
                ? '打开 GitHub Copilot'
                : '打开 GitHub Copilot(&C)',
              id: 'open-in-copilot-app',
              accelerator: 'CmdOrCtrl+Shift+J',
              click: emit('open-in-copilot-app'),
            },
          ]
        : []),
      {
        label: __DARWIN__ ? '选择编辑器打开…' : '选择编辑器打开(&W)…',
        id: 'open-with-external-editor',
        accelerator: 'CmdOrCtrl+Shift+Alt+A',
        click: emit('open-with-external-editor'),
      },
      separator,
      {
        id: 'create-issue-in-repository-on-github',
        label: __DARWIN__ ? '在 GitHub 上创建议题' : '在 GitHub 上创建议题(&I)',
        accelerator: 'CmdOrCtrl+I',
        click: emit('create-issue-in-repository-on-github'),
      },
      separator,
      {
        id: 'create-worktree',
        label: __DARWIN__ ? '新建工作区…' : '新建工作区(&T)…',
        click: emit('create-worktree'),
        accelerator: 'CmdOrCtrl+Shift+W',
        visible: enableWorktreeSupport(),
      },
      ...(enableWorktreeSupport() ? [separator] : []),
      {
        label: __DARWIN__ ? '仓库设置…' : '仓库设置(&S)…',
        id: 'show-repository-settings',
        click: emit('show-repository-settings'),
      },
    ],
  })

  const branchSubmenu = [
    {
      label: __DARWIN__ ? '新建分支…' : '新建分支(&B)…',
      id: 'create-branch',
      accelerator: 'CmdOrCtrl+Shift+N',
      click: emit('create-branch'),
    },
    {
      label: __DARWIN__ ? '重命名…' : '重命名(&R)…',
      id: 'rename-branch',
      accelerator: 'CmdOrCtrl+Shift+R',
      click: emit('rename-branch'),
    },
    {
      label: __DARWIN__ ? '删除…' : '删除(&D)…',
      id: 'delete-branch',
      accelerator: 'CmdOrCtrl+Shift+D',
      click: emit('delete-branch'),
    },
    separator,
    {
      label: __DARWIN__ ? '丢弃所有更改…' : '丢弃所有更改…',
      id: 'discard-all-changes',
      accelerator: 'CmdOrCtrl+Shift+Backspace',
      click: emit('discard-all-changes'),
    },
    {
      label: askForConfirmationWhenStashingAllChanges
        ? confirmStashAllChangesLabel
        : stashAllChangesLabel,
      id: 'stash-all-changes',
      accelerator: 'CmdOrCtrl+Shift+S',
      click: emit('stash-all-changes'),
    },
    separator,
    {
      label: __DARWIN__
        ? `从 ${contributionTargetDefaultBranch} 更新`
        : `从 ${contributionTargetDefaultBranch} 更新(&U)`,
      id: 'update-branch-with-contribution-target-branch',
      accelerator: 'CmdOrCtrl+Shift+U',
      click: emit('update-branch-with-contribution-target-branch'),
    },
    {
      label: __DARWIN__ ? '与分支比较' : '与分支比较(&C)',
      id: 'compare-to-branch',
      accelerator: 'CmdOrCtrl+Shift+B',
      click: emit('compare-to-branch'),
    },
    {
      label: __DARWIN__ ? '合并到当前分支…' : '合并到当前分支(&M)…',
      id: 'merge-branch',
      accelerator: 'CmdOrCtrl+Shift+M',
      click: emit('merge-branch'),
    },
    {
      label: __DARWIN__ ? '挤压并合并到当前分支…' : '挤压并合并到当前分支(&H)…',
      id: 'squash-and-merge-branch',
      accelerator: 'CmdOrCtrl+Shift+H',
      click: emit('squash-and-merge-branch'),
    },
    {
      label: __DARWIN__ ? '变基当前分支…' : '变基当前分支(&E)…',
      id: 'rebase-branch',
      accelerator: 'CmdOrCtrl+Shift+E',
      click: emit('rebase-branch'),
    },
    separator,
    {
      label: __DARWIN__ ? '在 GitHub 上比较' : '在 GitHub 上比较(&G)',
      id: 'compare-on-github',
      accelerator: 'CmdOrCtrl+Shift+C',
      click: emit('compare-on-github'),
    },
    {
      label: __DARWIN__ ? '在 GitHub 上查看分支' : '在 GitHub 上查看分支',
      id: 'branch-on-github',
      accelerator: 'CmdOrCtrl+Alt+B',
      click: emit('branch-on-github'),
    },
  ]

  branchSubmenu.push({
    label: __DARWIN__ ? '预览拉取请求' : '预览拉取请求',
    id: 'preview-pull-request',
    accelerator: 'CmdOrCtrl+Alt+P',
    click: emit('preview-pull-request'),
  })

  branchSubmenu.push({
    label: pullRequestLabel,
    id: 'create-pull-request',
    accelerator: 'CmdOrCtrl+R',
    click: emit('open-pull-request'),
  })

  template.push({
    label: __DARWIN__ ? '分支' : '分支(&B)',
    id: 'branch',
    submenu: branchSubmenu,
  })

  if (__DARWIN__) {
    template.push({
      role: 'window',
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        { role: 'close', label: '关闭' },
        separator,
        { role: 'front', label: '全部置于前台' },
      ],
    })
  }

  const submitIssueItem: Electron.MenuItemConstructorOptions = {
    label: __DARWIN__ ? '反馈问题…' : '反馈问题…',
    click() {
      shell
        .openExternal('https://github.com/naiheSH/desktop/issues/new')
        .catch(err => log.error('Failed opening issue creation page', err))
    },
  }

  const contactSupportItem: Electron.MenuItemConstructorOptions = {
    label: __DARWIN__ ? '联系 GitHub 支持…' : '联系 GitHub 支持(&C)…',
    click() {
      shell
        .openExternal(
          `https://github.com/contact?from_desktop_app=1&app_version=${app.getVersion()}`
        )
        .catch(err => log.error('Failed opening contact support page', err))
    },
  }

  const showUserGuides: Electron.MenuItemConstructorOptions = {
    label: '查看使用指南',
    click() {
      shell
        .openExternal('https://docs.github.com/zh/desktop')
        .catch(err => log.error('Failed opening user guides page', err))
    },
  }

  const showKeyboardShortcuts: Electron.MenuItemConstructorOptions = {
    label: __DARWIN__ ? '查看键盘快捷键' : '查看键盘快捷键',
    click() {
      shell
        .openExternal(
          'https://docs.github.com/zh/desktop/installing-and-configuring-github-desktop/overview/keyboard-shortcuts'
        )
        .catch(err => log.error('Failed opening keyboard shortcuts page', err))
    },
  }

  const showLogsLabel = __DARWIN__
    ? '在 Finder 中显示日志'
    : __WIN32__
    ? '打开日志文件夹(&H)'
    : '打开日志文件夹(&H)'

  const showLogsItem: Electron.MenuItemConstructorOptions = {
    label: showLogsLabel,
    click() {
      const logPath = getLogDirectoryPath()
      mkdir(logPath, { recursive: true })
        .then(() => UNSAFE_openDirectory(logPath))
        .catch(err => log.error('Failed opening logs directory', err))
    },
  }

  const helpItems = [
    submitIssueItem,
    contactSupportItem,
    showUserGuides,
    showKeyboardShortcuts,
    showLogsItem,
  ]

  helpItems.push(...buildTestMenu())

  if (__DARWIN__) {
    template.push({
      role: 'help',
      label: '帮助',
      submenu: helpItems,
    })
  } else {
    template.push({
      label: '帮助(&H)',
      submenu: [
        ...helpItems,
        separator,
        {
          label: '关于 GitHub Desktop(&A)',
          click: emit('show-about'),
          id: 'about',
        },
      ],
    })
  }

  ensureItemIds(template)

  return template
}

function getPushLabel(
  isForcePushForCurrentRepository: boolean,
  askForConfirmationOnForcePush: boolean
): string {
  if (!isForcePushForCurrentRepository) {
    return __DARWIN__ ? '推送' : '推送(&U)'
  }

  if (askForConfirmationOnForcePush) {
    return __DARWIN__ ? '强制推送…' : '强制推送(&U)…'
  }

  return __DARWIN__ ? '强制推送' : '强制推送(&U)'
}

function getStashedChangesLabel(isStashedChangesVisible: boolean): string {
  if (isStashedChangesVisible) {
    return __DARWIN__ ? '隐藏储藏更改' : '隐藏储藏更改(&I)'
  }

  return __DARWIN__ ? '显示储藏更改' : '显示储藏更改(&W)'
}

type ClickHandler = (
  menuItem: Electron.MenuItem,
  browserWindow: Electron.BaseWindow | undefined,
  event: Electron.KeyboardEvent
) => void

/**
 * Utility function returning a Click event handler which, when invoked, emits
 * the provided menu event over IPC.
 */
export function emit(name: MenuEvent): ClickHandler {
  return (_, focusedWindow) => {
    // focusedWindow can be null if the menu item was clicked without the window
    // being in focus. A simple way to reproduce this is to click on a menu item
    // while in DevTools. Since Desktop only supports one window at a time we
    // can be fairly certain that the first BrowserWindow we find is the one we
    // want.
    const window =
      focusedWindow instanceof BrowserWindow
        ? focusedWindow
        : BrowserWindow.getAllWindows()[0]
    if (window !== undefined) {
      if (!window.isVisible()) {
        window.show()
      }
      ipcWebContents.send(window.webContents, 'menu-event', name)
    }
  }
}

/** The zoom steps that we support, these factors must sorted */
const ZoomInFactors = [0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2]
const ZoomOutFactors = ZoomInFactors.slice().reverse()

/**
 * Returns the element in the array that's closest to the value parameter. Note
 * that this function will throw if passed an empty array.
 */
function findClosestValue(arr: Array<number>, value: number) {
  return arr.reduce((previous, current) => {
    return Math.abs(current - value) < Math.abs(previous - value)
      ? current
      : previous
  })
}

/**
 * Figure out the next zoom level for the given direction and alert the renderer
 * about a change in zoom factor if necessary.
 */
function zoom(direction: ZoomDirection): ClickHandler {
  return (menuItem, window) => {
    if (!(window instanceof BrowserWindow)) {
      return
    }

    const { webContents } = window

    if (direction === ZoomDirection.Reset) {
      webContents.zoomFactor = 1
      ipcWebContents.send(webContents, 'zoom-factor-changed', 1)
    } else {
      const rawZoom = webContents.zoomFactor
      const zoomFactors =
        direction === ZoomDirection.In ? ZoomInFactors : ZoomOutFactors

      // So the values that we get from zoomFactor property are floating point
      // precision numbers from chromium, that don't always round nicely, so
      // we'll have to do a little trick to figure out which of our supported
      // zoom factors the value is referring to.
      const currentZoom = findClosestValue(zoomFactors, rawZoom)

      const nextZoomLevel = zoomFactors.find(f =>
        direction === ZoomDirection.In ? f > currentZoom : f < currentZoom
      )

      // If we couldn't find a zoom level (likely due to manual manipulation
      // of the zoom factor in devtools) we'll just snap to the closest valid
      // factor we've got.
      const newZoom = nextZoomLevel === undefined ? currentZoom : nextZoomLevel

      webContents.zoomFactor = newZoom
      ipcWebContents.send(webContents, 'zoom-factor-changed', newZoom)
    }
  }
}
