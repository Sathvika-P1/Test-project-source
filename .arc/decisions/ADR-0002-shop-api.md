---
id: ADR-0002
category: component
title: Shop API
status: accepted
superseded_by: null
component_id: comp_shop_api
responsibility: Single API for catalog, cart, checkout, orders and customer accounts;
  also hosts any background jobs until a driver separates them.
kind: api_service
split_reason: Server-side business logic and data access separate from the browser
  client.
talks_to:
- component_id: comp_relational_database
  interaction: sync
  evidence: 'User: ''clothes shopping website'''
evidence: 'User: ''clothes shopping website'''
---

## Context

User: 'clothes shopping website'

## Decision

Single API for catalog, cart, checkout, orders and customer accounts; also hosts any background jobs until a driver separates them.

Kept separate because Server-side business logic and data access separate from the browser client..

## Talks to

- **Relational Database** (sync) — User: 'clothes shopping website'
