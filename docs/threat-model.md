# Threat model

## Assets
Workspace documents, embeddings, conversation history, API tokens, LLM prompts.

## Threats
| Threat | Mitigation |
|--------|------------|
| Prompt injection via uploaded docs | Retrieval-only context; validators; refuse path |
| Cross-tenant reads | Supabase RLS |
| LLM data exfil | Opt-in + redaction + no full-corpus send |
| Path traversal in storage | Workspace-prefixed paths + allowlists |

## Non-goals
Preventing malicious workspace admins from reading their own documents.
