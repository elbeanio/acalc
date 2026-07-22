terraform {
  # >= 1.10 for the native S3/R2 lock-file backend (use_lockfile).
  required_version = ">= 1.10.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}
