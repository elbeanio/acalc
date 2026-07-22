variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone, DNS, Workers and R2 edit permissions. Provide via TF_VAR_cloudflare_api_token or a gitignored *.tfvars — never commit."
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns the zone, Worker and R2 bucket."
  type        = string
}

variable "domain" {
  description = "Apex domain for the site."
  type        = string
  default     = "acalc.io"
}

variable "worker_name" {
  description = "Name of the Worker (built from git by Cloudflare Workers Builds) that the custom domains attach to."
  type        = string
  default     = "acalc"
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
