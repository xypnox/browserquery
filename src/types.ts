export type MessageType = 'getTabs' | 'closeTabs' | 'tabs' | 'closed_tabs'

export interface ResponseType<T> {
  type: MessageType
  data: T
  error?: string
}


