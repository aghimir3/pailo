resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-database"
  subnet_ids = [for subnet in aws_subnet.private : subnet.id]

  tags = {
    Name = "${local.name_prefix}-database"
  }
}

resource "aws_db_instance" "main" {
  allocated_storage            = var.database_allocated_storage_gb
  auto_minor_version_upgrade   = true
  backup_retention_period      = var.database_backup_retention_days
  backup_window                = "18:00-19:00"
  copy_tags_to_snapshot        = true
  db_name                      = var.database_name
  db_subnet_group_name         = aws_db_subnet_group.main.name
  deletion_protection          = var.enable_deletion_protection
  engine                       = "postgres"
  engine_version               = var.postgres_engine_version
  final_snapshot_identifier    = "${local.name_prefix}-final-snapshot"
  identifier                   = "${local.name_prefix}-postgres"
  instance_class               = var.database_instance_class
  maintenance_window           = "sun:19:00-sun:20:00"
  manage_master_user_password  = true
  max_allocated_storage        = var.database_max_allocated_storage_gb
  multi_az                     = var.database_multi_az
  performance_insights_enabled = false
  publicly_accessible          = false
  skip_final_snapshot          = var.skip_final_snapshot
  storage_encrypted            = true
  storage_type                 = "gp3"
  username                     = var.database_username
  vpc_security_group_ids       = [aws_security_group.database.id]

  tags = {
    Name = "${local.name_prefix}-postgres"
  }
}
