terraform {
  backend "s3" {
    bucket       = "pailo-prod-terraform-state-767397751806-ap-south-1"
    use_lockfile = true
    encrypt      = true
    key          = "prod/terraform.tfstate"
    region       = "ap-south-1"
  }
}
