---
id: ADR-0003
category: component
title: Relational Database
status: accepted
superseded_by: null
component_id: comp_relational_database
responsibility: System of record for products, inventory, customers and orders; runs
  on PostgreSQL.
kind: managed_service
split_reason: Backing service the project uses but does not build.
evidence: 'User: ''PostgreSQL'''
contested: true
alternatives_considered:
- 'MySQL: no stated need over PostgreSQL'
- 'SQL Server: no stated Microsoft-stack requirement'
consequences:
- Hosting stays open, but PostgreSQL is available as a managed service on all major
  clouds
---

## Context

User: 'PostgreSQL'

## Decision

System of record for products, inventory, customers and orders; runs on PostgreSQL.

Kept separate because Backing service the project uses but does not build..

## Alternatives considered

- MySQL: no stated need over PostgreSQL
- SQL Server: no stated Microsoft-stack requirement

## Consequences

- Hosting stays open, but PostgreSQL is available as a managed service on all major clouds
