FROM node:alpine

RUN adduser -D -g user user && apk add --no-cache tini

COPY . /tmp/src/
RUN yarn global add "file:/tmp/src" \
    && rm -rf /tmp/src

USER user
WORKDIR /home/user
ENTRYPOINT [ "tini", "--", "simple-repository-manager" ]
