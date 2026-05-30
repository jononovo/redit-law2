# secure-fill (Claude plugin)

The agent-facing half of the SecureFill system. Ships one skill that teaches the
assistant to fill sensitive fields by handing an opaque reference to the
SecureFill browser extension, so the values never enter the conversation.

- **This plugin** — `skills/secure-fill/SKILL.md`: when and how to hand off.
- **The extension** — `plugins/secure-fill-extension/`: does the actual
  resolution and filling, out of the assistant's context.

Both halves are required: the skill is the brain (when/what), the extension is
the hands (secure fill). Install the extension in the browser and this plugin in
the assistant.
