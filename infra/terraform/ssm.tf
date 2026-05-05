resource "aws_ssm_parameter" "app_domain" {
  name  = "/${local.name_prefix}/app/domain"
  type  = "String"
  value = local.app_domain_name
}

resource "aws_ssm_parameter" "files_bucket" {
  name  = "/${local.name_prefix}/files/bucket"
  type  = "String"
  value = aws_s3_bucket.files.bucket
}

resource "aws_ssm_parameter" "cognito_user_pool_id" {
  name  = "/${local.name_prefix}/cognito/user-pool-id"
  type  = "String"
  value = aws_cognito_user_pool.main.id
}

resource "aws_ssm_parameter" "cognito_client_id" {
  name  = "/${local.name_prefix}/cognito/client-id"
  type  = "String"
  value = aws_cognito_user_pool_client.web.id
}

resource "aws_ssm_parameter" "database_host" {
  name  = "/${local.name_prefix}/database/host"
  type  = "String"
  value = aws_db_instance.main.address
}

resource "aws_ssm_parameter" "database_name" {
  name  = "/${local.name_prefix}/database/name"
  type  = "String"
  value = var.database_name
}

# WhatsApp Business Cloud API
resource "aws_ssm_parameter" "whatsapp_access_token" {
  name  = "/${local.name_prefix}/whatsapp/access-token"
  type  = "SecureString"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "whatsapp_phone_number_id" {
  name  = "/${local.name_prefix}/whatsapp/phone-number-id"
  type  = "String"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}
