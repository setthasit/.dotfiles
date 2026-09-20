-- Option 2: tool windows are rounded floating islands over the editor plane.
--
-- Splits cannot have borders (`:h nvim_open_win`), so the only way to round a panel
-- is to make it a float. The editor stays the flat canvas; everything summoned on
-- top of it is an island. Delete this file to go back to flat docked panels.
return {
  {
    "nvim-neo-tree/neo-tree.nvim",
    opts = {
      popup_border_style = "rounded",
      window = {
        position = "float",
        popup = {
          title = function(state)
            return " " .. state.name:gsub("^%l", string.upper) .. " "
          end,
          size = { width = 40, height = "90%" },
          position = { row = 1, col = 2 },
        },
      },
    },
  },
  {
    "folke/trouble.nvim",
    opts = {
      win = {
        type = "float",
        border = "rounded",
        title = " Problems ",
        title_pos = "left",
        size = { width = 0.92, height = 0.4 },
        position = { 0.94, 0.5 },
      },
    },
  },
  {
    "folke/snacks.nvim",
    opts = {
      -- `Snacks.terminal.open` hardcodes `position = "bottom"` for an interactive
      -- terminal, and a style cannot outrank that. User config can.
      terminal = {
        win = {
          position = "float",
          border = "rounded",
          title = " Terminal ",
          title_pos = "left",
          row = 0.55,
          col = 0.04,
          width = 0.92,
          height = 0.4,
          -- A tool window should not dim the editor behind it.
          backdrop = false,
        },
      },
      styles = {
        lazygit = {
          border = "rounded",
          title = " Git ",
          title_pos = "left",
        },
      },
    },
  },
}
