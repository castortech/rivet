FROM node:23.7.0-alpine3.21

WORKDIR /app
VOLUME /project

RUN --mount=type=secret,id=npmrc,dst=/root/.npmrc \
  apk add --no-cache curl && \
  npm install -g @alpic80/rivet-cli@81.24.2-aidon.8

COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
