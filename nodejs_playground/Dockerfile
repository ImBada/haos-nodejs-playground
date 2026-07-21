ARG BUILD_FROM
FROM $BUILD_FROM

ARG BUILD_ARCH
ARG BUN_VERSION=1.3.14

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apk add --no-cache bash git jq "nodejs~22" npm socat tmux ttyd \
    && node --version | grep -Eq '^v22\.' \
    && npm --version \
    && apk add --no-cache --virtual .bun-install-deps curl unzip \
    && case "${BUILD_ARCH}" in \
        amd64) \
            BUN_TARGET=x64-musl-baseline; \
            BUN_SHA256=56a7d6806cf155536c0178f0ea5fbd098e684fa509ebdb4fc0a7e19fb65382dc \
            ;; \
        aarch64) \
            BUN_TARGET=aarch64-musl; \
            BUN_SHA256=b98e0ad3625c5c00d1d5b5ff55605c7adddbfae151861e68ade57b2d3b8703bb \
            ;; \
        *) \
            echo "Unsupported Bun architecture: ${BUILD_ARCH}" >&2; \
            exit 1 \
            ;; \
    esac \
    && curl -fsSLo /tmp/bun.zip \
        "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-${BUN_TARGET}.zip" \
    && echo "${BUN_SHA256}  /tmp/bun.zip" | sha256sum -c - \
    && unzip -q /tmp/bun.zip -d /tmp/bun \
    && mv "/tmp/bun/bun-linux-${BUN_TARGET}/bun" /usr/local/bin/bun \
    && chmod 0755 /usr/local/bin/bun \
    && ln -s /usr/local/bin/bun /usr/local/bin/bunx \
    && rm -rf /tmp/bun /tmp/bun.zip \
    && apk del .bun-install-deps \
    && bun --version | grep -Fx "${BUN_VERSION}" \
    && bunx --version | grep -Fx "${BUN_VERSION}"

WORKDIR /app
COPY app/ /app/
COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD ["/run.sh"]
