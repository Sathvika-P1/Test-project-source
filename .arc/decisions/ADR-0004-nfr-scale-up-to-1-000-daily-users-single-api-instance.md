---
id: ADR-0004
category: nfr
title: "NFR: scale \u2014 up to 1,000 daily users; single API instance sizing is sufficient,\
  \ no\u2026"
status: accepted
superseded_by: null
dimension: scale
metric: daily active users
threshold: 'up to 1,000 daily users; single API instance sizing is sufficient, no
  autoscaling required (proposed from ''Small: under 1,000 daily users'')'
component_id: null
needs_dedicated_tracking: true
evidence: 'User: ''Small: under 1,000 daily users'''
---

## Context

User: 'Small: under 1,000 daily users'

## Decision

daily active users: up to 1,000 daily users; single API instance sizing is sufficient, no autoscaling required (proposed from 'Small: under 1,000 daily users')
