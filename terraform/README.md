# acalc infrastructure (Terraform)

Provisions the Cloudflare hosting for acalc.io:

- **Zone** for the domain (DNS delegated from the Route 53 registrar — see below).
- **Pages project** wired to the GitHub repo (git-integration deploys, PR previews).
- **Custom domains** apex + `www`, with proxied CNAMEs to the `*.pages.dev` origin.
- **R2 bucket** that will hold the Terraform state — a self-hosting bootstrap.

State starts **local**, then migrates into the R2 bucket this config creates.

## Prerequisites

- Terraform >= 1.10 (`.terraform-version` pins it via tfenv).
- A **Cloudflare API token** with permissions: Zone (edit), DNS (edit),
  Pages (edit), Workers R2 Storage (edit). Export it:
  ```sh
  export TF_VAR_cloudflare_api_token=...
  ```
- Your **Cloudflare account id** and **GitHub owner** in a gitignored
  `terraform.tfvars` (copy `terraform.tfvars.example`).
- The Cloudflare **GitHub app** authorized once in the dashboard
  (Workers & Pages → Create → connect to Git). Terraform can't complete that OAuth
  flow headlessly; once authorized, the `cloudflare_pages_project` binds to the repo.
- The repo pushed to GitHub (it has no remote yet) so Pages has something to build.

## Phase 1 — apply with local state

```sh
cd terraform
terraform init          # local backend
terraform plan
terraform apply
```

This creates the zone, Pages project, custom domains, DNS records, and the R2
state bucket. Note the outputs:

- `cloudflare_nameservers` — set these at the **Route 53 registrar** for acalc.io
  (Registered domains → acalc.io → nameservers) to delegate DNS to Cloudflare.
  Registration stays with AWS; only DNS hosting moves. Once the zone goes active,
  the Route 53 *hosted zone* can be deleted to avoid its ~$0.50/mo charge.
- `state_bucket_name` — the R2 bucket to migrate state into next.

## Phase 2 — migrate state into R2

1. Create an **R2 API token** (R2 → Manage R2 API Tokens) — this is an
   S3-compatible access key / secret, separate from the Cloudflare API token.
2. `mv backend-r2.tf.example backend.tf` and set the account id in the `endpoints`
   URL (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).
3. Migrate:
   ```sh
   AWS_ACCESS_KEY_ID=<r2-access-key> \
   AWS_SECRET_ACCESS_KEY=<r2-secret-key> \
   terraform init -migrate-state
   ```
   Terraform copies the local state into R2. The local `terraform.tfstate` becomes
   a backup (gitignored) and can be removed once you've confirmed a clean
   `terraform plan` against the remote state.

## Notes

- `.terraform.lock.hcl` is committed (provider pinning); state and `*.tfvars` are
  gitignored. No secrets live in the repo — the Cloudflare/R2 tokens come from the
  environment, and Pages' GitHub auth is held by Cloudflare, not the repo.
- Deploys after phase 1 are automatic on push to `main`; other branches/PRs get
  preview URLs. No secrets or deploy config are stored in the repo for that.
