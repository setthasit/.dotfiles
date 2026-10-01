vim.api.nvim_create_autocmd({ "VimEnter", "WinNew", "BufWinEnter" }, {
  group = vim.api.nvim_create_augroup("islands", { clear = true }),
  callback = function()
    for _, win in ipairs(vim.api.nvim_list_wins()) do
      if vim.wo[win].winhighlight == "" then
        vim.wo[win].winhighlight = "Normal:Island,NormalNC:IslandNC"
      end
    end
  end,
})
