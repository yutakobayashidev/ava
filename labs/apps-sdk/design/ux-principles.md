# UX principles

## Overview

Creating a great ChatGPT app is about delivering a focused, conversational experience that feels native to ChatGPT.

The goal is to design experiences that feel consistent, useful, and trustworthy while extending ChatGPT in ways that add real value.

Good examples include booking a ride, ordering food, checking availability, or tracking a delivery. These are tasks that are conversational, time bound, and easy to summarize visually with a clear call to action. Poor examples include replicating long form content from a website, requiring complex multi step workflows, or using the space for ads or irrelevant messaging.

Use the UX principles below to guide your development.

## Principles for great app UX

An app should do at least one thing _better_ because it lives in ChatGPT:

- **Conversational leverage** – natural language, thread context, and multi-turn guidance unlock workflows that traditional UI cannot.
- **Native fit** – the app feels embedded in ChatGPT, with seamless hand-offs between the model and your tools.
- **Composability** – actions are small, reusable building blocks that the model can mix with other apps to complete richer tasks.

If you cannot describe the clear benefit of running inside ChatGPT, keep iterating before publishing your app.

On the other hand, your app should also _improve ChatGPT_ by either providing something new to know, new to do, or a better way to show information.

Below are a few principles you should follow to ensure your app is a great fit for ChatGPT.

### 1. Extract, don’t port

Focus on the core jobs users use your product for. Instead of mirroring your full website or native app, identify a few atomic actions that can be extracted as tools. Each tool should expose the minimum inputs and outputs needed for the model to take the next step confidently.

### 2. Design for conversational entry

Expect users to arrive mid-conversation, with a specific task in mind, or with fuzzy intent.
Your app should support:

- Open-ended prompts (e.g. "Help me plan a team offsite").
- Direct commands (e.g. "Book the conference room Thursday at 3pm").
- First-run onboarding (teach new users how to engage through ChatGPT).

### 3. Treat ChatGPT as “home”

ChatGPT owns the overall experience. Use your UI selectively to clarify actions, capture inputs, or present structured results. Skip ornamental components that do not advance the current task, and lean on the conversation for history, confirmation, and follow-up.

### 4. Optimize for conversation, not navigation

The model handles state management and routing. Your app supplies:

- Clear, declarative actions with well-typed parameters.
- Concise responses that keep the chat moving (tables, lists, or short paragraphs instead of dashboards).
- Helpful follow-up suggestions so the model can keep the user in flow.

### 5. Embrace the ecosystem moment

Highlight what is unique about your app inside ChatGPT:

- Accept rich natural language instead of form fields.
- Personalize with context gleaned from the conversation.
- (Optional) Compose with other apps when it saves the user time or cognitive load.

## Checklist before publishing

Answer these yes/no questions before publishing your app. A “no” signals an opportunity to improve your app and have a chance at broader distribution once we open up app submissions later this year.

However, please note that we will evaluate each app on a case-by-case basis, and that answering "yes" to all of these questions does not guarantee that your app will be selected for distribution: it's only a baseline to make sure it could be a great fit for ChatGPT.

To learn about strict requirements for publishing your app, see the [App
Developer Guidelines](/apps-sdk/app-developer-guidelines).

- **Conversational value** – Does at least one primary capability rely on ChatGPT’s strengths (natural language, conversation context, multi-turn dialog)?
- **Beyond base ChatGPT** – Does the app provide new knowledge, actions, or presentation that users cannot achieve with a plain conversation (e.g., proprietary data, specialized UI, or a guided flow)?
- **Atomic, model-friendly actions** – Are tools indivisible, self-contained, and defined with explicit inputs and outputs so the model can invoke them without clarifying questions?
- **Helpful UI only** – Would replacing every custom widget with plain text meaningfully degrade the user experience?
- **End-to-end in-chat completion** – Can users finish at least one meaningful task without leaving ChatGPT or juggling external tabs?
- **Performance & responsiveness** – Does the app respond quickly enough to maintain the rhythm of a chat?
- **Discoverability** – Is it easy to imagine prompts where the model would select this app confidently?
- **Platform fit** – Does the app take advantage of core platform behaviors (rich prompts, prior context, multi-tool composition, multimodality, or memory)?

Additionally, ensure that you avoid:

- Displaying **long-form or static content** better suited for a website or app.
- Requiring **complex multi-step workflows** that exceed the inline or fullscreen display modes.
- Using the space for **ads, upsells, or irrelevant messaging**.
- Surfaceing **sensitive or private information** directly in a card where others might see it.
- **Duplicating ChatGPT’s system functions** (for example, recreating the input composer).

### Next steps

Once you have made sure your app has great UX, you can polish your app's UI by following our [UI guidelines](/apps-sdk/concepts/ui-guidelines).
