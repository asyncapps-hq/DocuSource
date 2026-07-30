#!/usr/bin/env node
const base = process.env.DOCUSOURCE_URL || 'http://127.0.0.1:3000'
const res = await fetch(`${base}/api/evals`, { method: 'POST' })
const json = await res.json()
console.log(JSON.stringify(json, null, 2))
if (!res.ok || json.passed !== json.total) process.exit(1)
