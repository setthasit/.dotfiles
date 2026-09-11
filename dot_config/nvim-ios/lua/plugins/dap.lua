return {
  "mfussenegger/nvim-dap",
  optional = true,
  keys = {
    {
      "<leader>dd",
      function()
        require("xcodebuild.integrations.dap").build_and_debug()
      end,
      desc = "Build & Debug",
    },
    {
      "<leader>dR",
      function()
        require("xcodebuild.integrations.dap").debug_without_build()
      end,
      desc = "Debug Without Building",
    },
    {
      "<leader>dT",
      function()
        require("xcodebuild.integrations.dap").debug_tests()
      end,
      desc = "Debug Tests",
    },
    {
      "<leader>dx",
      function()
        require("xcodebuild.integrations.dap").terminate_session()
      end,
      desc = "Terminate Debug Session (iOS)",
    },
  },
}
