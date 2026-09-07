# Custom Server And Client Certificates

Reviewed against the Proxyman macOS source and official documentation on 2026-08-21.

## Choose The TLS Direction

| Type | Proxyman role | Matching |
|---|---|---|
| Server certificate | Presented by Proxyman to the intercepted client during the client-to-Proxyman TLS handshake. | Certificate Common Name and Subject Alternative Names, including reviewed leading-wildcard suffix matching. No separate host field is entered. |
| Client certificate | Presented by Proxyman to an upstream server that requires mutual TLS. | Exact configured host and port; reviewed default port is 443. |

Neither type replaces the root CA. Server/client certificates do not need to be marked as trusted roots in macOS Keychain.

## Inputs And Validation

- GUI supports a matching private key plus PEM/DER certificate, or a P12 bundle. The certificate chooser accepts common certificate extensions, but the parser must still recognize valid PEM/DER data.
- CLI `custom-cert` supports P12 only.
- Proxyman validates that a certificate and private key match before GUI import.
- Encrypted private keys and P12 files prompt for a passphrase; the reviewed app stores required passphrases in Keychain and copies managed certificate material into its certificate folder.
- Check certificate chain, validity, SAN/CN, EKU/key usage, and whether the private key is present before changing live traffic.

Import only authorized identity material. Do not promise that a server certificate will bypass arbitrary third-party certificate pinning.

Official docs: [Custom Certificates](https://docs.proxyman.com/advanced-features/custom-certificates).

## Server Certificate Workflow

1. Open **Certificate > Add Custom Certificates… > Server Certificates**.
2. Choose the certificate/private-key importer or P12 importer.
3. For separate files, select the private key and certificate and wait for both statuses to be good and matched.
4. For P12, enter the passphrase in the native prompt.
5. Import, select the resulting entry, and Preview it. Confirm SAN/CN, issuer, validity, and intended private-key pairing.
6. Generate a fresh connection for a matching hostname and inspect the certificate seen by the controlled client.
7. Confirm unrelated hosts still use the intended default/dynamic certificate.

The reviewed server match checks the certificate's CN/SAN rather than a user-entered host. Its leading-wildcard path uses suffix matching, which is broader than strict single-label wildcard semantics. Test both the intended hostname and an unrelated suffix-like hostname; a wildcard is not a reason to broaden interception beyond the authorized domain scope.

## Client Certificate Workflow

1. Confirm the upstream requires mTLS and obtain the approved client identity/chain.
2. Open **Certificate > Add Custom Certificates… > Client Certificates**.
3. Choose certificate/private-key or P12 import.
4. Enter the exact upstream host and port. Do not use the proxy listener's host/port.
5. Import and Preview the entry; verify subject, issuer, validity, client-auth usage, and displayed host mapping.
6. Start a fresh connection to that exact host:port and verify the upstream accepts the client identity.
7. Test one nonmatching host/port to confirm the identity is not applied broadly.

If mTLS still fails, separate certificate-chain/client-auth errors from ordinary server trust, SNI, DNS, External Proxy, and SSL Proxying issues.

## Edit, Replace, And Delete

- The reviewed GUI replacement path imports the new certificate first and removes the selected old entry only after successful import. Verify the new entry and a fresh handshake before discarding the external old source.
- GUI Delete removes the selected managed entry without a second confirmation in the reviewed controller. Obtain immediate confirmation yourself and record its filename or host:port first.
- Every custom-certificate add, edit, replacement, or removal posts a change that closes existing live connections. Schedule the mutation accordingly.
- Removal deletes Proxyman-managed certificate/private-key copies but is not a substitute for revoking the original credential with its issuing authority.

## CLI Boundary

For explicit shell requests, route through `proxyman-cli` and discover installed help:

- `custom-cert add|replace|remove server` identifies a stored server certificate by filename where required.
- `custom-cert add|replace|remove client` identifies the mapping by host and port.
- Add/replace accepts P12 only in the reviewed CLI.
- The password option is a command-line argument. Provide only `<P12_PASSWORD>` in agent-authored commands and have the user run/substitute it locally with awareness of shell-history/process exposure.

After CLI mutation, reopen the Custom Certificates window, inventory entries, and test a fresh TLS connection. Command exit success alone does not prove certificate matching or handshake success.

Official docs: [Command-line](https://docs.proxyman.com/command-line).
