return {
  "nvim-neotest/neotest",
  optional = true,
  dependencies = {
    "fredrikaverpil/neotest-golang",
  },
  opts = {
    adapters = {
      ["neotest-golang"] = {
        go_test_args = { "-v", "-count=1", "-tags=dynamic" },
        dap_go_enabled = true,
      },
    },
  },
}
