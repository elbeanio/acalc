# Cloudflare Web Analytics for acalc.io — cookieless, no PII, no consent banner,
# free. `auto_install` injects the beacon at the edge (traffic is already proxied
# through Cloudflare via the Worker custom domain), so nothing goes in the app.
resource "cloudflare_web_analytics_site" "acalc" {
  account_id   = var.cloudflare_account_id
  host         = var.domain
  auto_install = true
}

# The site tag is public (it appears in the client beacon); handy if we ever want
# to embed the snippet manually instead of edge auto-install.
output "web_analytics_site_tag" {
  description = "Cloudflare Web Analytics site tag (public)."
  value       = cloudflare_web_analytics_site.acalc.site_tag
}
