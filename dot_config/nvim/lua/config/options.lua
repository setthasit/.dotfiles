-- Options are automatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua
-- Add any additional options here

-- Rounded default border for every float that does not pass one of its own.
-- Honoured by snacks, which-key, nvim-cmp, neo-tree popups, nui, gitsigns and the
-- built-in LSP hover/signature/diagnostic floats.
vim.o.winborder = "rounded"
vim.o.pumborder = "rounded"

-- Blank window separators. Paired with WinSeparator painted in the chrome colour,
-- the separator cell reads as a gap between two panels instead of a drawn line.
-- horiz* require laststatus=3, which LazyVim already sets.
vim.opt.fillchars:append({
  vert = " ",
  horiz = " ",
  horizup = " ",
  horizdown = " ",
  vertleft = " ",
  vertright = " ",
  verthoriz = " ",
})

-- Wider left gutter: interior padding for the panel, and room for git signs next
-- to diagnostics without the text shifting.
vim.o.signcolumn = "yes:2"
vim.o.numberwidth = 5
