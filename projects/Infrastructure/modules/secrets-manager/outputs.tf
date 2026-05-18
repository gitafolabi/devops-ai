output "irsa_role_arn" {
  value       = aws_iam_role.external_secrets_irsa.arn
  description = "Annotate the external-secrets-sa ServiceAccount with this ARN (eks.amazonaws.com/role-arn)"
}

output "secret_arns" {
  value       = { for k, v in aws_secretsmanager_secret.boutique : k => v.arn }
  description = "ARNs of all created Secrets Manager secrets"
}
