// Values are injected at container start via envsubst (Docker entrypoint).
window.LEGOLOCKER_CONFIG = {
  rebrickableApiKey: "${REBRICKABLE_API_KEY:-}",
};
