# Treasury / Financial Accounts

## Table of contents

- v2 Financial Accounts API
- Legacy v1 Treasury

## v2 Financial Accounts API

For embedded financial accounts (bank accounts, account and routing numbers, money movement), use the [v2 Financial Accounts API](https://docs.stripe.com/api/v2/money-management/financial-accounts.md?api-version=2026-04-22.preview) (`POST /v2/money_management/financial_accounts`). This is required for new integrations. The reference is preview-gated: without an `api-version` query parameter the page returns 404. Upstream's `/v2/core/vault/financial_accounts` path and link are stale.

For Treasury for platforms concepts and guides, see the [Treasury for platforms overview](https://docs.stripe.com/treasury/connect.md).

## Legacy v1 Treasury

Don't use the [v1 Treasury Financial Accounts API](https://docs.stripe.com/api/treasury/financial_accounts.md) (`POST /v1/treasury/financial_accounts`) for new integrations. Existing v1 integrations continue to work.
