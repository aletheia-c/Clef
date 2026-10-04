<img src="frontend-v2/public/logo.svg" align="right" height="75px"></a>
# Clef

Work in progress - not stable yet (especially change history), expect some funny bugs.

Clef is a self-hosted music metadata editor that you run with Docker and access from your browser. It supports tag normalization, multi-valued tag, and change history with undo.

# Features

- Multi-valued editing
- Change history
- Remote file upload
- Easy setup
- Browser-based

# Building

```bash
git pull https://github.com/myooker/Clef.git
cd Clef
```

Example `docker-compose.yml`:
```yaml
services:
  Clef:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports:
      - "8080:80"
    volumes:
      - /path/to/music:/music
    restart: unless-stopped
```

```bash
docker compose build
docker compose up -d
```

The application should be accessible on `localhost:8080`.

# About AI usage

The frontend was built entirely with AI. At the moment, I’m not interested in learning frontend web technologies, so I rely on AI to handle that part.

Please treat the frontend as a simple demo interface - the main focus of this project is the backend and its functionality.

# Screenshots

![overview](screenshots/screenshot-1.png)
![screenshot-02](screenshots/screenshot-2.png)
![history-overview](screenshots/screenshot-3.png)
