# Stage 1
FROM node:16-alpine as yarn-install
WORKDIR /usr/src/app
# Install app dependencies
COPY package.json yarn.lock ./
RUN apk update && \
    apk upgrade && \
    apk add --no-cache --virtual build-dependencies bash git openssh python3 make g++ libc6-compat && \
    yarn --frozen-lockfile --no-cache && \
    apk del build-dependencies && \
    yarn cache clean

# Runtime container with minimal dependencies
FROM node:16-alpine

RUN addgroup -S -g 998 postgres && \
	adduser -D -G postgres -u 998 -h /var/lib/postgresql -s /bin/bash postgres && \
	mkdir -p /var/lib/postgresql && \
	chown -R postgres:postgres /var/lib/postgresql

ENV POSTGRES_USER=api
ENV POSTGRES_PASSWORD=api
ENV POSTGRES_DB=api
ENV LANG=en_US.utf8

RUN apk update && \
    apk upgrade && \
    apk add ca-certificates libc6-compat && \
    ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2 && \
    apk add postgresql14 postgresql14-contrib redis sudo expect

RUN mkdir -p /var/run/postgresql && \
	chown -R postgres:postgres /var/run/postgresql && \
	chmod 2777 /var/run/postgresql

RUN yarn global add pm2

WORKDIR /usr/src/app
COPY --from=yarn-install /usr/src/app/node_modules /usr/src/app/node_modules
# Bundle app source
COPY . .
COPY overwrite/* overwrite/
COPY ecosystem.config.js ./ecosystem.config.js
RUN yarn build

ENV PGDATA=/var/lib/postgresql/data

RUN mkdir -p "$PGDATA" && \
	chown -R postgres:postgres "$PGDATA" && \
	chmod 750 "$PGDATA"

RUN sudo -E -u postgres initdb -D "$PGDATA"

ENV CHAIN_ID=137
ENV ETHEREUM_RPC_URL=https://polygon-rpc.com
ENV HTTP_PORT=8080
ENV HTTP_KEEP_ALIVE_TIMEOUT=60000
ENV HTTP_HEADERS_TIMEOUT=60000
ENV RPC_REQUEST_TIMEOUT=60000

RUN sudo -u postgres postgres -D "$PGDATA" & \
printf "\
set timeout -1\n\
spawn createuser -s -e -P api\n\
sleep 5\n\
send \"api\\n\"\n\
sleep 5\n\
send \"api\\n\"\n\
expect eof\n\
" | sudo -E -u postgres expect && \
sleep 5 && sudo -E -u postgres createdb -O api api && yarn db:migrate && sleep 5 && killall -s SIGINT postgres && sleep 10

EXPOSE 8080
CMD ["pm2-runtime", "ecosystem.config.js"]
