-- Pull in the wezterm API
local wezterm = require("wezterm")

-- This will hold the configuration.
local config = wezterm.config_builder()

-- config.font = wezterm.font("JetbrainsMono Nerd Font Mono")
config.font_size = 15.0

config.color_scheme = "Goldteal"

-- and finally, return the configuration to wezterm
return config
