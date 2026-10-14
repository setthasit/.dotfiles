{{- $role := index .root.roles .name -}}
{{- $definition := includeTemplate "agent-definition" (dict "name" .name "root" .root) | fromJson -}}
{{- $rules := dict -}}
{{- range $permission, $pairs := includeTemplate "opencode-permission-rules" .root | fromJson -}}
{{-   $fields := list -}}
{{-   range $pairs -}}
{{-     $fields = append $fields (printf "%s:%s" (index . 0 | toJson) (index . 1 | toJson)) -}}
{{-   end -}}
{{-   $_ := set $rules $permission (printf "{%s}" (join "," $fields)) -}}
{{- end -}}
{{- $fields := list -}}
{{- if eq $role.permissions "project-read" -}}
{{-   $fields = list
        `"*":"deny"`
        (printf `"read":%s` $rules.read)
        `"glob":"allow"`
        `"grep":"allow"`
        `"list":"allow"`
        `"lsp":"allow"`
        `"skill":"allow"`
        (printf `"bash":%s` $rules.bash)
        (printf `"external_directory":%s` $rules.external_directory)
        `"doom_loop":"deny"`
-}}
{{-   if not $role.reviewer -}}
{{-     $fields = concat $fields (list `"webfetch":"allow"` `"websearch":"allow"`) -}}
{{-   end -}}
{{-   if $role.browser -}}
{{-     range .root.mcpServers -}}
{{-       $server := printf "%s_*" .name | toJson -}}
{{-       $fields = append $fields (printf `%s:"allow"` $server) -}}
{{-     end -}}
{{-   end -}}
{{- else -}}
{{-   $task := `"deny"` -}}
{{-   if $role.delegates -}}
{{-     $targets := list `"*":"deny"` -}}
{{-     range $role.delegates -}}
{{-       $targets = append $targets (printf `%s:"allow"` (toJson .)) -}}
{{-     end -}}
{{-     $task = printf "{%s}" (join "," $targets) -}}
{{-   end -}}
{{-   $todowrite := ternary `"allow"` `"deny"` $role.todowrite -}}
{{-   $fields = list (printf `"task":%s` $task) (printf `"todowrite":%s` $todowrite) -}}
{{- end -}}
{{- if $role.browser -}}
{{-   $fields = append $fields `"playwright_*":"allow"` -}}
{{- end -}}
---
description: {{ $definition.description | toJson }}
mode: subagent
model: {{ printf "openai/%s" $role.model | toJson }}
variant: {{ $role.effort | toJson }}
permission: {{ printf "{%s}" (join "," $fields) }}
---

{{ $definition.instructions }}
