return {
  {
    "wojciech-kulik/xcodebuild.nvim",
    dependencies = {
      "ibhagwan/fzf-lua",
      "folke/snacks.nvim",
      "MunifTanjim/nui.nvim",
      -- "nvim-treesitter/nvim-treesitter", -- (optional) for Quick tests support (required Swift parser)
    },
    config = function()
      require("xcodebuild").setup({
        -- put some options here or leave it empty to use default settings
      })
    end,
  },
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        sourcekit = {},
      },
    },
  },
  {
    "stevearc/conform.nvim",
    event = { "BufReadPre", "BufNewFile" },
    config = function()
      local conform = require("conform")

      conform.setup({
        formatters_by_ft = {
          swift = { "swiftformat" },
        },
        format_on_save = function(bufnr)
          local ignore_filetypes = { "oil" }
          if vim.tbl_contains(ignore_filetypes, vim.bo[bufnr].filetype) then
            return
          end

          return { timeout_ms = 500, lsp_fallback = true }
        end,
        log_level = vim.log.levels.ERROR,
      })
    end,
  },
  {
    "mfussenegger/nvim-lint",
    event = { "BufReadPre", "BufNewFile" },
    config = function()
      local lint = require("lint")

      lint.linters_by_ft = {
        swift = { "swiftlint" },
      }

      local lint_augroup = vim.api.nvim_create_augroup("lint", { clear = true })

      vim.api.nvim_create_autocmd({ "BufWritePost", "BufReadPost", "InsertLeave", "TextChanged" }, {
        group = lint_augroup,
        callback = function()
          if not vim.endswith(vim.fn.bufname(), "swiftinterface") then
            require("lint").try_lint()
          end
        end,
      })

      vim.keymap.set("n", "<leader>ml", function()
        require("lint").try_lint()
      end, { desc = "Lint file" })
    end,
  },
}
