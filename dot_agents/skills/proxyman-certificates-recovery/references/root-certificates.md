# Root Certificates

Reviewed against the Proxyman macOS source and official documentation on 2026-08-21.

## Generated Proxyman Root CA

Use the generated Proxyman CA for ordinary HTTPS interception when the user does not need an organization-owned signing identity.

### Inspect First

- Open **Certificate > Install Certificate on this Mac…** and read the status, or use MCP `get_certificate_status` when connected.
- Distinguish Missing, Installed but Not Trusted, Installed and Trusted, Expired, and Custom Root active.
- A certificate existing on disk or in Keychain is not proof that macOS trusts it.

### Automatic Install And Trust

1. Open **Certificate > Install Certificate on this Mac… > Automatic**.
2. Select **Install & Trust**.
3. Explain and obtain approval for the macOS administrator/root prompt. Automatic mode generates the local CA and adds it as a trusted root in the System keychain.
4. Wait for **Installed & Trusted**.
5. Enable SSL Proxying only for an approved test host and generate a fresh HTTPS request.
6. Verify a decrypted response with no TLS handshake error.

MCP can perform the same generated-root operation with `install_certificate` in `automatic` mode, but the user still handles the macOS privilege dialog. Inspect the live schema and obtain confirmation before the call.

### Manual Install And Trust

1. Open **Certificate > Install Certificate on this Mac… > Manual**.
2. Select **Generate…**. The reviewed app generates/adds the certificate but leaves it untrusted.
3. In Keychain Access, locate the exact current Proxyman CA, inspect its subject/fingerprint/validity, and set the required trust only after approval. Alternatively, use the exact trust command displayed by the installed app/current official page.
4. Return to Proxyman and wait for **Installed & Trusted**.
5. Verify with a fresh controlled HTTPS request.

MCP `install_certificate` in `manual` mode opens the user-assisted trust path; do not report success while status remains Installed but Not Trusted.

Official docs: [macOS certificate setup](https://docs.proxyman.com/debug-devices/macos), [SSL error troubleshooting](https://docs.proxyman.com/troubleshooting/get-ssl-error-from-https-request-and-response).

### Removal Or Regeneration

- **Certificate > Reset all Proxyman Certificates** and MCP `uninstall_certificate` remove the current Proxyman root from Keychain and clean managed certificate files.
- This breaks HTTPS decryption for every target that trusts the removed CA until a new CA is generated, installed, and trusted on each target.
- Inventory dependent Macs/devices/runtimes and obtain immediate confirmation before removal.
- After regeneration, the CA is a new trust identity; reinstalling a same-named certificate is not enough for targets that trusted the old identity.

## Custom Root Certificate

A custom root replaces the generated Proxyman signing identity. It must contain a valid CA certificate and matching private key, and client targets must trust that exact root.

### Requirements

- Direct reviewed storage/import is P12/PKCS #12. The GUI's certificate/private-key route converts the matched pair to managed P12 before import; CLI `install-root-cert` accepts P12 only.
- Confirm validity dates, CA/basic constraints, key usage, SHA-2-family signature, and modern Apple certificate requirements from the live official page.
- A successful import is separate from trust. Confirm which Keychain contains the identity and whether the exact certificate is trusted.
- Preserve the original P12 and its password outside Proxyman-managed folders before replacement.

### GUI Import

1. Open **Certificate > Add Custom Certificates… > Root Certificate**.
2. Choose P12 and select the approved file, or use the certificate/private-key importer when the installed GUI offers it.
3. Enter the passphrase in the native prompt. Do not expose it to the agent.
4. Confirm the Root tab says Proxyman is using the Custom Root Certificate and inspect name, validity, and validation errors.
5. If status is Installed but Not Trusted, use the status button/Keychain Access to trust the exact certificate after confirmation.
6. Verify **Installed & Trusted**, then make a fresh controlled HTTPS request from a target that trusts the same custom root.

The reviewed app supports one active custom root. A successful new import replaces the previous managed root record only after the new identity imports successfully. Do not delete the old external source until verification succeeds.

### CLI Import

Use `proxyman-cli` only when the user explicitly wants shell automation:

1. Read installed `install-root-cert --help`.
2. Use a command shape with `<P12_PATH>` and `<P12_PASSWORD>` placeholders for the user to run locally; do not receive or execute the real password through the agent host.
3. Without the trust flag, finish trust manually in Keychain Access.
4. With the trust flag, expect a privileged trust operation and verify the actual Keychain plus Proxyman status.

The reviewed CLI imports the root before attempting the optional trust step. A trust failure can therefore leave the new custom root imported but untrusted. Inspect status before retrying or rolling back. Its help/docs say System Keychain while the reviewed implementation targets the user's login keychain for this custom-root trust step; never infer the destination from the success message alone.

Official docs: [Custom Certificates](https://docs.proxyman.com/advanced-features/custom-certificates), [Command-line](https://docs.proxyman.com/command-line).

### Rollback

1. Keep the previous approved root source and trust instructions until the new root is proven.
2. Remove the failed custom root only after identifying the exact item.
3. Re-import/retrust the previous custom root or regenerate the default Proxyman CA.
4. Reinstall the restored root on dependent targets and verify a fresh HTTPS connection.

Do not assume removing custom-root metadata also removes every historical certificate copy from every Keychain or target trust store; inspect and clean exact items deliberately.
