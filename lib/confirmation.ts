export interface ConfirmationOptions {
  title?: string
  message: string
  confirmLabel?: string
  destructive?: boolean
}
export type ConfirmationRequest = ConfirmationOptions & { resolve: (accepted: boolean) => void }
let receiver: ((request: ConfirmationRequest) => void) | undefined

export function registerConfirmationReceiver(next: (request: ConfirmationRequest) => void) {
  receiver = next
  return () => { if (receiver === next) receiver = undefined }
}

export function confirmAction(options: string | ConfirmationOptions): Promise<boolean> {
  if (!receiver) return Promise.resolve(false)
  const details = typeof options === 'string' ? { message: options } : options
  return new Promise(resolve => receiver!({ ...details, resolve }))
}
