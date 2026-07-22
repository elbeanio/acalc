# The Worker itself is built and deployed from git by Cloudflare Workers Builds
# (the "Connect to Git" integration) — that pipeline owns the deployable and is
# already "as code" (this repo). Terraform can't create that git-build connection
# via the API, and managing the CI-built script here would fight the pipeline.
#
# So Terraform owns the infra AROUND the Worker: the zone, R2 state bucket, and
# the custom-domain -> Worker bindings below. Each binding provisions the proxied
# DNS record and TLS cert automatically (no separate cloudflare_dns_record).

resource "cloudflare_workers_custom_domain" "apex" {
  account_id  = var.cloudflare_account_id
  hostname    = var.domain
  service     = var.worker_name
  zone_id     = cloudflare_zone.acalc.id
}

resource "cloudflare_workers_custom_domain" "www" {
  account_id  = var.cloudflare_account_id
  hostname    = "www.${var.domain}"
  service     = var.worker_name
  zone_id     = cloudflare_zone.acalc.id
}
