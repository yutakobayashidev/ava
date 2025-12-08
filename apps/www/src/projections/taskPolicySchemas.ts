import { z } from "zod/v3";

const commonFields = {
  workspaceId: z.string(),
  userId: z.string().optional(),
  channel: z.string().nullable(),
  threadTs: z.string().nullable(),
} as const;

const issueSchema = z.object({
  provider: z.enum(["github", "manual"]),
  id: z.string().nullable().optional(),
  title: z.string(),
});

const userInfoSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  slackId: z.string().nullable().optional(),
});

export const notifyPayloadSchema = z.discriminatedUnion("template", [
  z.object({
    template: z.literal("started"),
    issue: issueSchema,
    initialSummary: z.string().min(1),
    user: userInfoSchema,
    ...commonFields,
  }),
  z.object({
    template: z.literal("updated"),
    summary: z.string().min(1),
    ...commonFields,
  }),
  z.object({
    template: z.literal("blocked"),
    blockId: z.string(),
    reason: z.string().min(1),
    ...commonFields,
  }),
  z.object({
    template: z.literal("block_resolved"),
    blockId: z.string(),
    reason: z.string().min(1),
    ...commonFields,
  }),
  z.object({
    template: z.literal("paused"),
    pauseId: z.string(),
    reason: z.string().min(1),
    ...commonFields,
  }),
  z.object({
    template: z.literal("resumed"),
    summary: z.string().min(1),
    ...commonFields,
  }),
  z.object({
    template: z.literal("completed"),
    summary: z.string().min(1),
    ...commonFields,
  }),
  z.object({
    template: z.literal("cancelled"),
    reason: z.string().nullable().optional(),
    ...commonFields,
  }),
]);

export const reactionPayloadSchema = z.object({
  workspaceId: z.string(),
  userId: z.string().optional(),
  channel: z.string().nullable(),
  threadTs: z.string().nullable(),
  emoji: z.string(),
});

export type ParsedNotifyPayload = z.infer<typeof notifyPayloadSchema>;
export type ParsedReactionPayload = z.infer<typeof reactionPayloadSchema>;

export type ParsedPolicy =
  | { kind: "notify"; payload: ParsedNotifyPayload }
  | { kind: "reaction"; payload: ParsedReactionPayload };
