# Apex and www both point at the Pages project. CNAME at the apex works via
# Cloudflare's CNAME flattening. Proxied (orange cloud) so Pages TLS + edge apply.
resource "cloudflare_dns_record" "apex" {
  zone_id = cloudflare_zone.acalc.id
  name    = var.domain
  type    = "CNAME"
  content = "${cloudflare_pages_project.acalc.name}.pages.dev"
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "www" {
  zone_id = cloudflare_zone.acalc.id
  name    = "www.${var.domain}"
  type    = "CNAME"
  content = "${cloudflare_pages_project.acalc.name}.pages.dev"
  proxied = true
  ttl     = 1
}
