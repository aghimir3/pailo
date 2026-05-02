locals {
  app_domain_name = "${var.app_subdomain}.${var.root_domain_name}"
  name_prefix     = "${var.project_name}-${var.environment}"

  backend_container_name  = "backend"
  frontend_container_name = "frontend"

  backend_image  = var.backend_image != "" ? var.backend_image : "${aws_ecr_repository.backend.repository_url}:${var.image_tag}"
  frontend_image = var.frontend_image != "" ? var.frontend_image : "${aws_ecr_repository.frontend.repository_url}:${var.image_tag}"

  hosted_zone_id = var.enable_dns ? (var.route53_zone_id != "" ? var.route53_zone_id : aws_route53_zone.main[0].zone_id) : null

  availability_zones = slice(data.aws_availability_zones.available.names, 0, var.availability_zone_count)

  public_subnets = {
    for index, availability_zone in local.availability_zones :
    availability_zone => cidrsubnet(var.vpc_cidr, 8, index)
  }

  private_subnets = {
    for index, availability_zone in local.availability_zones :
    availability_zone => cidrsubnet(var.vpc_cidr, 8, index + 16)
  }

  common_environment = [
    {
      name  = "APP_DOMAIN"
      value = local.app_domain_name
    },
    {
      name  = "AWS_REGION"
      value = var.aws_region
    },
    {
      name  = "ENVIRONMENT"
      value = var.environment
    },
  ]

  default_tags = merge(
    var.tags,
    {
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = var.owner
      Project     = "Pailo"
    }
  )
}
