# Terraform state bucket.
#
# Bootstrap: created on the FIRST apply while state is still local, then the
# backend is pointed at this bucket and state is migrated in (see README). After
# that, this resource stores the very state that describes it — self-hosting.
resource "cloudflare_r2_bucket" "tfstate" {
  account_id = var.cloudflare_account_id
  name       = var.state_bucket_name
  location   = var.r2_location
}
