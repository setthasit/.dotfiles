-- Island chrome: flat, borderless panels whose only boundary is the 1-cell gap.
return {
  {
    "akinsho/bufferline.nvim",
    opts = function(_, opts)
      local preset = require("bufferline").style_preset
      -- Borderless tabs. The active tab shares the editor background so it reads
      -- as continuous with the buffer below it; the underline carries the state.
      opts.options = vim.tbl_deep_extend("force", opts.options or {}, {
        style_preset = { preset.minimal, preset.no_bold, preset.no_italic },
        separator_style = { "", "" },
        indicator = { style = "underline" },
        show_buffer_close_icons = false,
        always_show_bufferline = true,
      })
      -- LazyVim injects catppuccin's bufferline theme, which paints the whole strip
      -- `crust`: a dark band above the editor island. Cleared so the `minimal`
      -- preset derives every tab colour from Normal instead.
      opts.highlights = nil
    end,
  },
  {
    "nvim-lualine/lualine.nvim",
    opts = {
      options = {
        component_separators = "",
        section_separators = "",
      },
    },
  },
  {
    "folke/noice.nvim",
    opts = {
      presets = { lsp_doc_border = true },
      views = {
        cmdline_popup = { border = { padding = { 0, 2 } } },
      },
    },
  },
  {
    "folke/snacks.nvim",
    opts = {
      styles = {
        -- Pseudo-transparency blends against Neovim's own grid, which muddies the
        -- panel-versus-chrome contrast the island look depends on.
        notification = { wo = { winblend = 0 } },
        notification_history = { wo = { winblend = 0 } },
      },
    },
  },
}
