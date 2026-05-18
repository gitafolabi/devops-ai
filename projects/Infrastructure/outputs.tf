output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "ecr_urls" {
  value = module.ecr.repository_urls
}

output "external_secrets_irsa_role_arn" {
  value       = module.secrets_manager.irsa_role_arn
  description = "Annotate the external-secrets-sa ServiceAccount in the external-secrets namespace with this ARN"
}
