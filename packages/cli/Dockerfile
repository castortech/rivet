FROM node:24.1.0-alpine3.21

WORKDIR /app
VOLUME /project

RUN npm install -g @alpic80/rivet-cli@1.24.0-aidon.5

COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
