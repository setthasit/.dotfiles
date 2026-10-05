{{- $role := includeTemplate (printf "private_dot_codex/agents/%s.toml.tmpl" .name) .root | fromToml -}}
{{- $permissions := dict "task" "deny" "todowrite" "deny" -}}
{{- $browserRoles := list "tester" "uxui-designer" "uxui-design-review" -}}
{{- if eq $role.default_permissions "project-read" -}}
{{-   $config := includeTemplate "dot_config/opencode/opencode.json.tmpl" .root | fromJson -}}
{{-   $permissions = dict "*" "deny" "read" $config.permission.read "glob" "allow" "grep" "allow" "list" "allow" "lsp" "allow" "skill" "allow" "bash" $config.permission.bash "external_directory" $config.permission.external_directory "doom_loop" "deny" -}}
{{-   if not (has .name (list "reviewer" "security-reviewer")) -}}
{{-     $_ := set $permissions "webfetch" "allow" -}}
{{-     $_ := set $permissions "websearch" "allow" -}}
{{-   end -}}
{{-   if has .name $browserRoles -}}
{{-     range .root.mcpServers -}}
{{-       $_ := set $permissions (printf "%s_*" .name) "allow" -}}
{{-     end -}}
{{-   end -}}
{{- end -}}
{{- if has .name $browserRoles -}}
{{-   $_ := set $permissions "playwright_*" "allow" -}}
{{- end -}}
---
description: {{ $role.description | toJson }}
mode: subagent
model: {{ printf "openai/%s" $role.model | toJson }}
variant: {{ $role.model_reasoning_effort }}
permission: {{ $permissions | toJson }}
---

{{ $role.developer_instructions }}
