return {
  {
    "wojciech-kulik/xcodebuild.nvim",
    lazy = false,
    dependencies = {
      "MunifTanjim/nui.nvim",
      "nvim-treesitter/nvim-treesitter",
    },
    config = function()
      require("xcodebuild").setup({})
      require("xcodebuild.integrations.dap").setup()
    end,
    keys = {
      { "<leader>I", "<cmd>XcodebuildPicker<cr>", desc = "Xcodebuild Actions" },
      { "<leader>ib", "<cmd>XcodebuildBuild<cr>", desc = "Build" },
      { "<leader>iB", "<cmd>XcodebuildBuildForTesting<cr>", desc = "Build For Testing" },
      { "<leader>ir", "<cmd>XcodebuildBuildRun<cr>", desc = "Build & Run" },
      { "<leader>iR", "<cmd>XcodebuildRun<cr>", desc = "Run Without Building" },
      { "<leader>ik", "<cmd>XcodebuildCancel<cr>", desc = "Cancel Running Action" },
      { "<leader>it", "<cmd>XcodebuildTest<cr>", desc = "Test" },
      { "<leader>it", "<cmd>XcodebuildTestSelected<cr>", mode = "v", desc = "Test Selected" },
      { "<leader>iT", "<cmd>XcodebuildTestClass<cr>", desc = "Test Class" },
      { "<leader>in", "<cmd>XcodebuildTestNearest<cr>", desc = "Test Nearest" },
      { "<leader>i.", "<cmd>XcodebuildTestRepeat<cr>", desc = "Repeat Last Test" },
      { "<leader>ie", "<cmd>XcodebuildTestExplorerToggle<cr>", desc = "Test Explorer" },
      { "<leader>il", "<cmd>XcodebuildToggleLogs<cr>", desc = "Build Logs" },
      { "<leader>ic", "<cmd>XcodebuildToggleCodeCoverage<cr>", desc = "Code Coverage Marks" },
      { "<leader>iC", "<cmd>XcodebuildShowCodeCoverageReport<cr>", desc = "Code Coverage Report" },
      { "<leader>id", "<cmd>XcodebuildSelectDevice<cr>", desc = "Select Device" },
      { "<leader>is", "<cmd>XcodebuildSelectScheme<cr>", desc = "Select Scheme" },
      { "<leader>ip", "<cmd>XcodebuildSelectTestPlan<cr>", desc = "Select Test Plan" },
      { "<leader>if", "<cmd>XcodebuildProjectManager<cr>", desc = "Project Files" },
      { "<leader>ia", "<cmd>XcodebuildCodeActions<cr>", desc = "Build Error Actions" },
      { "<leader>io", "<cmd>XcodebuildOpenInXcode<cr>", desc = "Open In Xcode" },
    },
  },
  {
    "folke/which-key.nvim",
    opts = {
      spec = {
        { "<leader>i", group = "ios", mode = { "n", "v" } },
      },
    },
  },
}
