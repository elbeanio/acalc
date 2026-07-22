provider "cloudflare" {
  # Supply via TF_VAR_cloudflare_api_token (preferred) or a gitignored *.tfvars.
  api_token = var.cloudflare_api_token
}
