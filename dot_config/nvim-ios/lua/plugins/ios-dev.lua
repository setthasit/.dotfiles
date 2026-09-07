return {
  {
    "wojciech-kulik/.nvim",
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
    -- event = { "BufReadPre", "BufNewFile" },
    -- dependencies = {
    --   "hrsh7th/cmp-nvim-lsp",
    --   { "antosha417/nvim-lsp-file-operations", config = true },
    -- },
    -- config = function()
    --   local lspconfig = require("lspconfig")
    --   local cmp_nvim_lsp = require("cmp_nvim_lsp")
    --   local keymap = vim.keymap -- for conciseness
    --   local opts = { noremap = true, silent = true }
    --   local on_attach = function(_, bufnr)
    --     opts.buffer = bufnr

    --     -- set keybindings
    --     -- opts.desc = "Show LSP definitions"
    --     -- keymap.set("n", "gd", "<cmd>Telescope lsp_definitions trim_text=true<cr>", opts)

    --     -- opts.desc = "Show LSP definitions in split"
    --     -- keymap.set("n", "gD", "<cmd>vsplit | Telescope lsp_definitions trim_text=true<cr>", opts)

    --     -- opts.desc = "Show LSP references"
    --     -- vim.keymap.set("n", "gr", "<cmd>Telescope lsp_references trim_text=true include_declaration=false<cr>", opts)

    --     -- opts.desc = "Show LSP implementation"
    --     -- vim.keymap.set("n", "gi", "<cmd>Telescope lsp_implementations<cr>", opts)

    --     -- opts.desc = "Show LSP code actions"
    --     -- keymap.set({ "n", "v" }, "<leader>ca", vim.lsp.buf.code_action, opts)

    --     -- opts.desc = "Smart rename"
    --     -- keymap.set("n", "<leader>rn", vim.lsp.buf.rename, opts)

    --     -- opts.desc = "Show buffer diagnostics"
    --     -- keymap.set("n", "<leader><leader>d", "<cmd>Telescope diagnostics bufnr=0<CR>", opts)

    --     -- opts.desc = "Go to previous diagnostic"
    --     -- keymap.set("n", "[d", function()
    --     --   vim.diagnostic.jump({ count = -1 })
    --     --   vim.cmd("normal! zz")
    --     -- end, opts)

    --     -- opts.desc = "Go to next diagnostic"
    --     -- keymap.set("n", "]d", function()
    --     --   vim.diagnostic.jump({ count = 1 })
    --     --   vim.cmd("normal! zz")
    --     -- end, opts)

    --     -- opts.desc = "Show documentation for what is under cursor"
    --     -- keymap.set("n", "K", vim.lsp.buf.hover, opts)

    --     -- opts.desc = "Restart LSP"
    --     -- keymap.set("n", "<leader>rl", ":LspRestart | LspStart<CR>", opts)
    --   end

    --   local capabilities = cmp_nvim_lsp.default_capabilities()

    --   local defaultLSPs = {
    --     "sourcekit",
    --   }

    --   for _, lsp in ipairs(defaultLSPs) do
    --     lspconfig[lsp].setup({
    --       capabilities = capabilities,
    --       on_attach = on_attach,
    --       cmd = lsp == "sourcekit" and { vim.trim(vim.fn.system("xcrun -f sourcekit-lsp")) } or nil,
    --     })
    --   end

    --   opts.desc = "Show line diagnostics"
    --   keymap.set("n", "<leader>d", vim.diagnostic.open_float, opts)
    -- end,
  },
  -- {
  --   "hrsh7th/nvim-cmp",
  --   event = "InsertEnter",
  --   dependencies = {
  --     "hrsh7th/cmp-buffer", -- source for text in buffer
  --     "hrsh7th/cmp-path", -- source for file system paths
  --     "L3MON4D3/LuaSnip", -- snippet engine
  --     "saadparwaiz1/cmp_luasnip", -- for autocompletion
  --     "rafamadriz/friendly-snippets", -- useful snippets
  --     "onsails/lspkind.nvim", -- vs-code like pictograms
  --   },
  --   config = function()
  --     local cmp = require("cmp")
  --     local luasnip = require("luasnip")
  --     local lspkind = require("lspkind")

  --     -- loads vscode style snippets from installed plugins (e.g. friendly-snippets)
  --     require("luasnip.loaders.from_vscode").lazy_load()

  --     cmp.setup({
  --       completion = {
  --         completeopt = "menu,menuone,preview",
  --       },
  --       snippet = { -- configure how nvim-cmp interacts with snippet engine
  --         expand = function(args)
  --           luasnip.lsp_expand(args.body)
  --         end,
  --       },
  --       mapping = cmp.mapping.preset.insert({
  --         ["<C-k>"] = cmp.mapping.select_prev_item(), -- previous suggestion
  --         ["<C-j>"] = cmp.mapping.select_next_item(), -- next suggestion
  --         ["<C-Space>"] = cmp.mapping.complete(), -- show completion suggestions
  --         ["<C-e>"] = cmp.mapping.abort(), -- close completion window
  --         ["<CR>"] = cmp.mapping.confirm({ select = false, behavior = cmp.ConfirmBehavior.Replace }),
  --         ["<C-b>"] = cmp.mapping(function(fallback)
  --           if luasnip.jumpable(-1) then
  --             luasnip.jump(-1)
  --           else
  --             fallback()
  --           end
  --         end, { "i", "s" }),
  --         ["<C-f>"] = cmp.mapping(function(fallback)
  --           if luasnip.jumpable(1) then
  --             luasnip.jump(1)
  --           else
  --             fallback()
  --           end
  --         end, { "i", "s" }),
  --       }),
  --       -- sources for autocompletion
  --       sources = cmp.config.sources({
  --         { name = "nvim_lsp" },
  --         { name = "luasnip" }, -- snippets
  --         { name = "buffer" }, -- text within current buffer
  --         { name = "path" }, -- file system paths
  --       }),
  --       -- configure lspkind for vs-code like pictograms in completion menu
  --       formatting = {
  --         format = lspkind.cmp_format({
  --           maxwidth = 50,
  --           ellipsis_char = "...",
  --         }),
  --       },
  --     })
  --   end,
  -- },
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
