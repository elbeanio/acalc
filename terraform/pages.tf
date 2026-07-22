resource "cloudflare_pages_project" "acalc" {
  account_id        = var.cloudflare_account_id
  name              = var.pages_project_name
  production_branch = var.production_branch

  # Git integration. The one-time GitHub-app authorization is done in the
  # Cloudflare dashboard (Terraform can't complete the OAuth flow headlessly);
  # this resource then binds the project to the repo and build settings.
  source = {
    type = "github"
    config = {
      owner                          = var.github_owner
      repo_name                      = var.github_repo
      production_branch              = var.production_branch
      deployments_enabled            = true
      production_deployments_enabled = true
      pr_comments_enabled            = true
      preview_deployment_setting     = "all"
    }
  }

  build_config = {
    build_command   = "pnpm build"
    destination_dir = "dist"
  }

  deployment_configs = {
    production = {
      environment_variables = {
        NODE_VERSION = { value = "20" }
      }
    }
    preview = {
      environment_variables = {
        NODE_VERSION = { value = "20" }
      }
    }
  }
}

# Custom domains on the Pages project.
resource "cloudflare_pages_domain" "apex" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.acalc.name
  name         = var.domain
}

resource "cloudflare_pages_domain" "www" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.acalc.name
  name         = "www.${var.domain}"
}
