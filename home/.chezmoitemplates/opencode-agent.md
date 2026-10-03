{{- $role := includeTemplate (printf "private_dot_codex/agents/%s.toml.tmpl" .name) .root | fromToml -}}
{{- $permissions := dict "task" "deny" "todowrite" "deny" -}}
{{- if eq $role.default_permissions "project-read" -}}
{{-   $config := includeTemplate "dot_config/opencode/opencode.json.tmpl" .root | fromJson -}}
{{-   $permissions = dict "*" "deny" "read" $config.permission.read "glob" "allow" "grep" "ask" "list" "allow" "lsp" "allow" "skill" "allow" "bash" $config.permission.bash "external_directory" $config.permission.external_directory "doom_loop" "ask" -}}
{{-   if not (has .name (list "reviewer" "security-reviewer")) -}}
{{-     $_ := set $permissions "webfetch" "allow" -}}
{{-     $_ := set $permissions "websearch" "allow" -}}
{{-   end -}}
{{-   if has .name (list "tester" "designer") -}}
{{-     $_ := set $permissions "playwright_*" "allow" -}}
{{-     range .root.mcpServers -}}
{{-       $_ := set $permissions (printf "%s_*" .name) "ask" -}}
{{-     end -}}
{{-   end -}}
{{- end -}}
---
description: {{ $role.description | toJson }}
mode: subagent
model: {{ printf "openai/%s" $role.model | toJson }}
variant: {{ $role.model_reasoning_effort }}
permission: {{ $permissions | toJson }}
---

{{ $role.developer_instructions }}
