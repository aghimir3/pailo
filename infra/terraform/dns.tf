resource "aws_route53_zone" "main" {
  count = var.enable_dns && var.route53_zone_id == "" ? 1 : 0

  name = var.root_domain_name
}

resource "aws_acm_certificate" "app" {
  count = var.enable_dns ? 1 : 0

  domain_name               = local.app_domain_name
  subject_alternative_names = local.public_host_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "certificate_validation" {
  for_each = var.enable_dns ? {
    for domain_validation_option in aws_acm_certificate.app[0].domain_validation_options :
    domain_validation_option.domain_name => {
      name   = domain_validation_option.resource_record_name
      record = domain_validation_option.resource_record_value
      type   = domain_validation_option.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = local.hosted_zone_id
}

resource "aws_acm_certificate_validation" "app" {
  count = var.enable_dns ? 1 : 0

  certificate_arn         = aws_acm_certificate.app[0].arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}

resource "aws_route53_record" "app_ipv4" {
  count = var.enable_dns ? 1 : 0

  name    = local.app_domain_name
  type    = "A"
  zone_id = local.hosted_zone_id

  alias {
    evaluate_target_health = true
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
  }
}

resource "aws_route53_record" "public_ipv4" {
  for_each = var.enable_dns ? { for host_name in local.public_host_names : host_name => host_name } : {}

  name    = each.value
  type    = "A"
  zone_id = local.hosted_zone_id

  alias {
    evaluate_target_health = true
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
  }
}
