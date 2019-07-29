FROM node:alpine

RUN apk add --no-cache tini \
    && adduser -D -g user user \
    && mkdir /repository \
    && chown user:user /repository

COPY default-config.yaml /default-config.yaml

COPY . /tmp/src/
RUN yarn global add "file:/tmp/src" \
    && rm -rf /tmp/src

USER user
WORKDIR /home/user
ENTRYPOINT [ "tini", "--", "simple-repository-manager" ]
CMD [ "/default-config.yaml" ]
