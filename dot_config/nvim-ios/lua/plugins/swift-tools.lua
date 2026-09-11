return {
  {
    "stevearc/conform.nvim",
    opts = {
      formatters_by_ft = {
        swift = { "swiftformat" },
      },
    },
  },
  {
    "mfussenegger/nvim-lint",
    opts = {
      linters_by_ft = {
        swift = { "swiftlint" },
      },
      linters = {
        swiftlint = {
          condition = function(ctx)
            return not vim.endswith(ctx.filename, ".swiftinterface")
          end,
        },
      },
    },
  },
}
