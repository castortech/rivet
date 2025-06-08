FROM node:24.1.0-alpine

WORKDIR /app
VOLUME /project

RUN --mount=type=secret,id=npmrc,dst=/root/.npmrc \
  apk add --no-cache curl && \
  npm install -g @alpic80/rivet-cli@1.24.0-aidon.11

COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
