---
id: ADR-0001
category: component
title: Web App
status: accepted
superseded_by: null
component_id: comp_web_app
responsibility: 'Storefront UI for shoppers: browse clothing catalog, search, cart,
  checkout, account and order history.'
kind: web_ui
split_reason: Browser client is a distinct runtime from the API.
talks_to:
- component_id: comp_shop_api
  interaction: sync
  evidence: 'User: ''clothes shopping website'''
evidence: 'User: ''clothes shopping website'''
---

## Context

User: 'clothes shopping website'

## Decision

Storefront UI for shoppers: browse clothing catalog, search, cart, checkout, account and order history.

Kept separate because Browser client is a distinct runtime from the API..

## Talks to

- **Shop API** (sync) — User: 'clothes shopping website'
