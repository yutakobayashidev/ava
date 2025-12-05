import type { ModalView } from "@slack/web-api";

export const createCompleteTaskModal = (taskSessionId: string): ModalView => ({
  type: "modal",
  callback_id: "complete_task_modal",
  title: {
    type: "plain_text",
    text: "タスクを完了",
  },
  submit: {
    type: "plain_text",
    text: "完了",
  },
  close: {
    type: "plain_text",
    text: "キャンセル",
  },
  blocks: [
    {
      type: "input",
      block_id: "summary_block",
      element: {
        type: "plain_text_input",
        action_id: "summary_input",
        multiline: true,
        placeholder: {
          type: "plain_text",
          text: "完了内容を入力してください",
        },
      },
      label: {
        type: "plain_text",
        text: "完了サマリー",
      },
    },
  ],
  private_metadata: taskSessionId,
});

export const createReportBlockedModal = (taskSessionId: string): ModalView => ({
  type: "modal",
  callback_id: "report_blocked_modal",
  title: {
    type: "plain_text",
    text: "詰まりを報告",
  },
  submit: {
    type: "plain_text",
    text: "報告",
  },
  close: {
    type: "plain_text",
    text: "キャンセル",
  },
  blocks: [
    {
      type: "input",
      block_id: "reason_block",
      element: {
        type: "plain_text_input",
        action_id: "reason_input",
        multiline: true,
        placeholder: {
          type: "plain_text",
          text: "詰まっている理由を入力してください",
        },
      },
      label: {
        type: "plain_text",
        text: "詰まりの理由",
      },
    },
  ],
  private_metadata: taskSessionId,
});

export const createPauseTaskModal = (taskSessionId: string): ModalView => ({
  type: "modal",
  callback_id: "pause_task_modal",
  title: {
    type: "plain_text",
    text: "タスクを休止",
  },
  submit: {
    type: "plain_text",
    text: "休止",
  },
  close: {
    type: "plain_text",
    text: "キャンセル",
  },
  blocks: [
    {
      type: "input",
      block_id: "reason_block",
      element: {
        type: "plain_text_input",
        action_id: "reason_input",
        multiline: true,
        placeholder: {
          type: "plain_text",
          text: "休止する理由を入力してください",
        },
      },
      label: {
        type: "plain_text",
        text: "休止の理由",
      },
    },
  ],
  private_metadata: taskSessionId,
});

export const createResumeTaskModal = (taskSessionId: string): ModalView => ({
  type: "modal",
  callback_id: "resume_task_modal",
  title: {
    type: "plain_text",
    text: "タスクを再開",
  },
  submit: {
    type: "plain_text",
    text: "再開",
  },
  close: {
    type: "plain_text",
    text: "キャンセル",
  },
  blocks: [
    {
      type: "input",
      block_id: "summary_block",
      element: {
        type: "plain_text_input",
        action_id: "summary_input",
        multiline: true,
        placeholder: {
          type: "plain_text",
          text: "再開時のコメントを入力してください",
        },
      },
      label: {
        type: "plain_text",
        text: "再開サマリー",
      },
    },
  ],
  private_metadata: taskSessionId,
});

export const createResolveBlockedModal = (
  taskSessionId: string,
): ModalView => ({
  type: "modal",
  callback_id: "resolve_blocked_modal",
  title: {
    type: "plain_text",
    text: "詰まりを解決",
  },
  submit: {
    type: "plain_text",
    text: "解決",
  },
  close: {
    type: "plain_text",
    text: "キャンセル",
  },
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "詰まりが解決されたことを報告します。",
      },
    },
  ],
  private_metadata: taskSessionId,
});
