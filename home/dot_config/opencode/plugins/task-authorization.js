function matches(value, pattern) {
  const expression = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", ".*").replaceAll("?", ".")
  return new RegExp(`^${expression}$`, "s").test(value)
}

function taskAction(rules, target) {
  let action = "deny"
  for (const rule of rules) {
    if (matches("task", rule.permission) && matches(target, rule.pattern)) {
      action = rule.action
    }
  }
  return action
}

export default async function taskAuthorization({ client }) {
  return {
    config(config) {
      if (config.subagent_depth === 1) config.subagent_depth = 2
    },
    "tool.execute.before": async ({ tool, sessionID }, { args }) => {
      if (tool !== "task") return
      if (typeof args.prompt !== "string" || /(?<![\w`])@(\.?[^\s`,.]*(?:\.[^\s`,.]+)*)/.test(args.prompt)) {
        throw new Error("Task prompt references denied. Use plain file paths or backtick-quoted mentions.")
      }
      const { data: session } = await client.session.get({ path: { id: sessionID } })
      const { data: agents } = await client.app.agents()
      if (!session || !Array.isArray(agents) || typeof args.subagent_type !== "string") {
        throw new Error("Task authorization context unavailable")
      }
      const caller = agents.find((agent) => agent.name === session.agent)
      const target = agents.find((agent) => agent.name === args.subagent_type)
      if (!caller || target?.mode !== "subagent" || !Array.isArray(caller.permission)) {
        throw new Error("Task authorization denied")
      }
      const rules = [...caller.permission, ...(session.permission ?? [])]
      if (taskAction(rules, target.name) !== "allow") {
        throw new Error("Task authorization denied")
      }
      if (args.task_id !== undefined) {
        if (typeof args.task_id !== "string") throw new Error("Task resume denied")
        const { data: child } = await client.session.get({ path: { id: args.task_id } })
        if (!child || child.parentID !== sessionID || child.agent !== target.name) {
          throw new Error("Task resume denied")
        }
      }
    },
  }
}
