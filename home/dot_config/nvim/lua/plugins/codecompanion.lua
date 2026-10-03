return {
  "olimorris/codecompanion.nvim",
  version = "^19.0.0",
  dependencies = { "nvim-lua/plenary.nvim", "nvim-treesitter/nvim-treesitter" },
  cmd = { "CodeCompanion", "CodeCompanionChat", "CodeCompanionActions", "CodeCompanionCmd" },
  opts = {
    interactions = { chat = { adapter = "claude_code" } },
  },
  keys = {
    { "<leader>a", "", desc = "+ai", mode = { "n", "v" } },
    { "<leader>aa", "<cmd>CodeCompanionChat Toggle<cr>", desc = "Toggle Claude chat", mode = "n" },
    { "<leader>aa", "<cmd>CodeCompanionChat Add<cr>", desc = "Add selection to Claude chat", mode = "v" },
    { "<leader>an", "<cmd>CodeCompanionChat<cr>", desc = "New Claude chat", mode = { "n", "v" } },
    { "<leader>ap", "<cmd>CodeCompanionActions<cr>", desc = "Claude action palette", mode = { "n", "v" } },
  },
}
