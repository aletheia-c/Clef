# Clef frontend

plain TypeScript without a framework, still, bundled with Vite (my beloved)

for a running Clef server, add `.env.local` with its address.
every `/api` request will be forwarded to it.

```
API_TARGET=http://localhost:8080
```

buildable with npm, the result goes to `dist/`, which `docker/Dockerfile` copies into the image.
