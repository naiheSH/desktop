import { ManualConflictResolution } from '../../../models/manual-conflict-resolution'
import {
  ConflictedFileStatus,
  GitStatusEntry,
  isManualConflict,
  ManualConflict,
} from '../../../models/status'
import * as octicons from '../../octicons/octicons.generated'

export type CopilotFileResolutionChoice = 'copilot' | 'ours' | 'theirs'

/** Label and icon for each resolution choice. */
export const resolutionChoices = {
  copilot: { label: 'Copilot', icon: octicons.copilot },
  ours: { label: 'Current', icon: octicons.chevronLeft },
  theirs: { label: 'Incoming', icon: octicons.chevronRight },
} as const

/**
 * Derive the resolution choice for a file from the manual resolutions map.
 * Defaults to 'copilot' when no manual override is set.
 */
export function getResolutionChoiceForFile(
  path: string,
  manualResolutions: Map<string, ManualConflictResolution>
): CopilotFileResolutionChoice {
  const manual = manualResolutions.get(path)
  if (manual === ManualConflictResolution.ours) {
    return 'ours'
  }
  if (manual === ManualConflictResolution.theirs) {
    return 'theirs'
  }
  return 'copilot'
}

/**
 * Returns true when the conflicted file status represents a delete-vs-modify
 * conflict: one side deleted the file, the other modified it.
 */
export function isDeleteConflictFile(
  status: ConflictedFileStatus
): status is ManualConflict {
  if (!isManualConflict(status)) {
    return false
  }
  const { us, them } = status.entry
  return (
    (us === GitStatusEntry.Deleted && them !== GitStatusEntry.Deleted) ||
    (them === GitStatusEntry.Deleted && us !== GitStatusEntry.Deleted)
  )
}

/**
 * For a delete-vs-modify conflict, returns which side deleted the file.
 */
export function getDeletedSide(
  status: ManualConflict
): 'ours' | 'theirs' | undefined {
  if (status.entry.us === GitStatusEntry.Deleted) {
    return 'ours'
  }
  if (status.entry.them === GitStatusEntry.Deleted) {
    return 'theirs'
  }
  return undefined
}

/**
 * Context menu labels for a delete-vs-modify conflict file. Returns
 * user-friendly labels like "Keep file (from branch-x)" and
 * "Delete file (from branch-y)" mapped to 'ours' and 'theirs'.
 */
export function getDeleteConflictLabels(
  status: ManualConflict,
  ourBranch?: string,
  theirBranch?: string
): { readonly oursLabel: string; readonly theirsLabel: string } {
  const deletedSide = getDeletedSide(status)

  if (deletedSide === 'ours') {
    const keepSuffix = theirBranch ? `（来自 ${theirBranch}）` : ''
    const deleteSuffix = ourBranch ? `（在 ${ourBranch} 上已删除）` : ''
    return {
      oursLabel: `删除文件${deleteSuffix}`,
      theirsLabel: `保留文件${keepSuffix}`,
    }
  }

  const keepSuffix = ourBranch ? `（来自 ${ourBranch}）` : ''
  const deleteSuffix = theirBranch ? `（在 ${theirBranch} 上已删除）` : ''
  return {
    oursLabel: `保留文件${keepSuffix}`,
    theirsLabel: `删除文件${deleteSuffix}`,
  }
}

/**
 * For a delete-vs-modify conflict, returns the resolution choice label
 * ("Keep file" or "Delete file") for the current choice.
 */
export function getDeleteConflictChoiceLabel(
  choice: CopilotFileResolutionChoice,
  status: ManualConflict
): string {
  const deletedSide = getDeletedSide(status)

  if (choice === 'copilot') {
    return 'Copilot'
  }

  if (deletedSide === 'ours') {
    return choice === 'ours' ? '删除文件' : '保留文件'
  }

  return choice === 'ours' ? '保留文件' : '删除文件'
}

/**
 * Returns the ours/theirs dropdown labels for a conflicted file, handling
 * both delete-vs-modify and regular text conflicts.
 */
export function getOursTheirsLabels(
  status: ConflictedFileStatus | undefined,
  ourBranch?: string,
  theirBranch?: string
): { readonly oursLabel: string; readonly theirsLabel: string } {
  if (status !== undefined && isDeleteConflictFile(status)) {
    return getDeleteConflictLabels(status, ourBranch, theirBranch)
  }

  const oursLabel = ourBranch
    ? `使用当前文件，来源：${ourBranch}`
    : '使用当前文件'
  const theirsLabel = theirBranch
    ? `使用传入文件，来源：${theirBranch}`
    : '使用传入文件'
  return { oursLabel, theirsLabel }
}
