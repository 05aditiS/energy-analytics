"""Automatic compatibility support for uvicorn invocations without attribute colon."""

try:
    import uvicorn.importer
    _orig_import_from_string = uvicorn.importer.import_from_string

    def _patched_import_from_string(import_str):
        if isinstance(import_str, str) and ":" not in import_str:
            import_str = f"{import_str}:app"
        return _orig_import_from_string(import_str)

    uvicorn.importer.import_from_string = _patched_import_from_string
except ImportError:
    pass
