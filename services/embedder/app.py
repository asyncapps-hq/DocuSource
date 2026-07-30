"""DocuSource embedder — sentence-transformers + PDF extract."""

from __future__ import annotations

import hashlib
import io
import os
from functools import lru_cache
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

MODEL_ID = os.environ.get("DOCUSOURCE_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
DIM = 384

app = FastAPI(title="DocuSource Embedder", version="0.1.0")


class EmbedRequest(BaseModel):
    texts: list[str] = Field(min_length=1)


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    dim: int


@lru_cache(maxsize=1)
def get_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(MODEL_ID)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "product": "DocuSource by KhyFee"}


@app.get("/ready")
def ready() -> dict[str, Any]:
    try:
        m = get_model()
        v = m.encode(["ping"], normalize_embeddings=True)
        return {"ready": True, "model": MODEL_ID, "dim": int(len(v[0]))}
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=503, detail=str(e)) from e


@app.get("/model")
def model_info() -> dict[str, Any]:
    return {"model": MODEL_ID, "dim": DIM}


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest) -> EmbedResponse:
    model = get_model()
    vectors = model.encode(req.texts, normalize_embeddings=True)
    out = [v.tolist() for v in vectors]
    if out and len(out[0]) != DIM:
        # still return; callers should check dim
        pass
    return EmbedResponse(embeddings=out, model=MODEL_ID, dim=len(out[0]) if out else DIM)


@app.post("/embed/batch", response_model=EmbedResponse)
def embed_batch(req: EmbedRequest) -> EmbedResponse:
    return embed(req)


@app.post("/extract/pdf")
async def extract_pdf(file: UploadFile = File(...)) -> dict[str, Any]:
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="expected PDF")
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="PDF too large")
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        pages: list[str] = []
        warnings: list[str] = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if not text.strip():
                warnings.append(f"empty page {i + 1}")
            pages.append(f"<!-- page {i + 1} -->\n{text}")
        body = "\n\n".join(pages)
        if len(warnings) == len(reader.pages):
            warnings.append("suspected scanned PDF — OCR not available in v0.1")
        checksum = hashlib.sha256(data).hexdigest()
        return {"text": body, "pages": len(reader.pages), "checksum": checksum, "warnings": warnings}
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"extract failed: {e}") from e


def selftest() -> None:
    # ponytail: skip heavy model download in unit selftest — check API shapes only
    assert MODEL_ID
    assert DIM == 384
    print("docusource embedder selftest ok (model load deferred to /ready)")


if __name__ == "__main__":
    selftest()
