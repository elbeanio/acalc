resource "cloudflare_zone" "acalc" {
  account = {
    id = var.cloudflare_account_id
  }
  name = var.domain
  type = "full"
}
