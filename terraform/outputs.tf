output "cloudflare_nameservers" {
  description = "Set these as the nameservers for the domain at the Route 53 registrar to delegate DNS to Cloudflare."
  value       = cloudflare_zone.acalc.name_servers
}

output "state_bucket_name" {
  description = "R2 bucket holding Terraform state (target for the state migration)."
  value       = cloudflare_r2_bucket.tfstate.name
}

output "pages_default_url" {
  description = "Default *.pages.dev URL for the Pages project."
  value       = "https://${cloudflare_pages_project.acalc.name}.pages.dev"
}

output "site_url" {
  value = "https://${var.domain}"
}
