variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone, DNS, Pages and R2 edit permissions. Provide via TF_VAR_cloudflare_api_token or a gitignored *.tfvars — never commit."
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns the zone, Pages project and R2 bucket."
  type        = string
}

variable "domain" {
  description = "Apex domain for the site."
  type        = string
  default     = "acalc.io"
}

variable "pages_project_name" {
  description = "Cloudflare Pages project name (also the *.pages.dev subdomain)."
  type        = string
  default     = "acalc"
}

variable "production_branch" {
  description = "Git branch Pages treats as production."
  type        = string
  default     = "main"
}

variable "github_owner" {
  description = "GitHub account/org that owns the repo connected to Pages."
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name connected to Pages."
  type        = string
  default     = "acalc_ai"
}

variable "state_bucket_name" {
  description = "R2 bucket that will hold the Terraform state (created on the first apply, migrated into on the second)."
  type        = string
  default     = "acalc-tfstate"
}

variable "r2_location" {
  description = "R2 bucket location hint (weur, eeur, enam, wnam, apac)."
  type        = string
  default     = "weur"
}
