output "cloudflare_nameservers" {
  description = "Set these as the nameservers for the domain at the Route 53 registrar to delegate DNS to Cloudflare (already done if the zone is active)."
  value       = cloudflare_zone.acalc.name_servers
}

output "state_bucket_name" {
  description = "R2 bucket holding Terraform state (target for the state migration)."
  value       = cloudflare_r2_bucket.tfstate.name
}

output "site_url" {
  value = "https://${var.domain}"
}
