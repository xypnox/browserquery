export type MessageType =
  | "getTabs"
  | "closeTabs"
  | "tabs"
  | "closed_tabs"
  | "success";

export interface ResponseType<T> {
  type: MessageType;
  data: T;
  error?: string;
}
