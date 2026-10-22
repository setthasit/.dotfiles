# Infrastructure Checklist

Each item is a check an operator would fail you on. Covers infrastructure as code, deploy pipelines, and platform config. Security follows the `application-security` skill, not this file. Practice references: https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html and https://sre.google/workbook/table-of-contents/.

## Change safety

- Every change shows its plan or dry run (`terraform plan`, `kubectl diff`) in the PR before it applies
- A resource that holds data (database, bucket, volume) has deletion protection and a tested backup. A plan that replaces or destroys one names it in the PR description
- State is remote, locked, and versioned. No state file is committed
- Rollback is one command or one revert, and it has been run at least once
- Rollout is staged (one environment, one region, or a canary), with a health check that halts it

## Reproducible

- Provider, module, chart, and image versions are pinned. Production images are pinned by digest
- No hand-made resource. Drift is detected on a schedule
- Environments differ only in variables, never in copied code
- Code passes the tool's formatter and validator, and follows its style guide. Terraform: `terraform fmt`, `terraform validate`, https://developer.hashicorp.com/terraform/language/style

## Operable

- Every service alerts on what its users feel (errors, latency, saturation). Each alert goes to a person and links a runbook
- An alert nobody acts on is fixed or deleted
- Certificates, keys, and quotas alert before they expire or run out
- Logs and metrics have a stated retention period

## Ownership and cost

- Every resource is tagged with owner, environment, and service
- Each workload has its own identity with only the permissions it uses
- The PR states the change's expected monthly cost. Every autoscaler has a maximum
