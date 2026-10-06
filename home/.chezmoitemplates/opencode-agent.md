{{- $role := includeTemplate (printf "private_dot_codex/agents/%s.toml.tmpl" .name) .root | fromToml -}}
{{- $permissions := dict "task" "deny" "todowrite" "deny" -}}
{{- $browserRoles := list "tester" "uxui-designer" "uxui-design-review" -}}
{{- $orderedRead := "" -}}
{{- if eq $role.default_permissions "project-read" -}}
{{-   $config := includeTemplate "dot_config/opencode/opencode.json.tmpl" .root | fromJson -}}
{{-   $readRules := list -}}
{{-   range (includeTemplate "opencode-secret-paths" .root | fromJson).read -}}
{{-     $readRules = append $readRules (printf "%s:%s" (index . 0 | toJson) (index . 1 | toJson)) -}}
{{-   end -}}
{{-   $orderedRead = printf "{%s}" (join "," $readRules) -}}
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
{{- $fields := list -}}
{{- range $key, $value := $permissions -}}
{{-   $json := $value | toJson -}}
{{-   if eq $key "read" -}}
{{-     $json = $orderedRead -}}
{{-   end -}}
{{-   $fields = append $fields (printf "%s:%s" ($key | toJson) $json) -}}
{{- end -}}
---
description: {{ $role.description | toJson }}
mode: subagent
model: {{ printf "openai/%s" $role.model | toJson }}
variant: {{ $role.model_reasoning_effort }}
permission: {{ printf "{%s}" (join "," $fields) }}
---

{{ $role.developer_instructions }}
