-- OMP (`omp acp`) is not a preset adapter, so it is declared here. The table
-- mirrors the shipped `opencode` ACP adapter; `auth` short-circuits because OMP
-- authenticates from the credentials already stored under ~/.omp.
local function omp_adapter()
  return {
    name = "omp",
    formatted_name = "OMP",
    type = "acp",
    roles = { llm = "assistant", user = "user" },
    opts = { vision = true },
    commands = { default = { "omp", "acp" } },
    defaults = { mcpServers = {}, timeout = 20000 },
    parameters = {
      protocolVersion = 1,
      clientCapabilities = { fs = { readTextFile = true, writeTextFile = true } },
      clientInfo = { name = "CodeCompanion.nvim", version = "1.0.0" },
    },
    handlers = {
      setup = function()
        return true
      end,
      auth = function()
        return true
      end,
      form_messages = function(self, messages, capabilities)
        return require("codecompanion.adapters.acp.helpers").form_messages(self, messages, capabilities)
      end,
      on_exit = function() end,
    },
  }
end

return {
  "olimorris/codecompanion.nvim",
  version = "^19.0.0",
  dependencies = { "nvim-lua/plenary.nvim", "nvim-treesitter/nvim-treesitter" },
  cmd = { "CodeCompanion", "CodeCompanionChat", "CodeCompanionActions", "CodeCompanionCmd" },
  opts = {
    adapters = { acp = { omp = omp_adapter } },
    interactions = { chat = { adapter = "omp" } },
  },
  keys = {
    { "<leader>a", "", desc = "+ai", mode = { "n", "v" } },
    { "<leader>aa", "<cmd>CodeCompanionChat Toggle<cr>", desc = "Toggle OMP chat", mode = "n" },
    { "<leader>aa", "<cmd>CodeCompanionChat Add<cr>", desc = "Add selection to OMP chat", mode = "v" },
    { "<leader>an", "<cmd>CodeCompanionChat<cr>", desc = "New OMP chat", mode = { "n", "v" } },
    { "<leader>ap", "<cmd>CodeCompanionActions<cr>", desc = "OMP action palette", mode = { "n", "v" } },
  },
}
