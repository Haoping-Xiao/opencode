FROM ubuntu:latest


ENV DEBIAN_FRONTEND=noninteractive
# Install required system tools including Node.js and npm
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    openssh-client \
    nodejs \
    npm \
    xdg-utils \
    vim \
    iputils-ping \
 && rm -rf /var/lib/apt/lists/*

# Create workspace directory
RUN mkdir -p /workspace
WORKDIR /workspace

# Configure npm
RUN npm config set registry http://mirrors.tools.huawei.com/npm/ && \
    npm config set strict-ssl false && \
    npm install -g opencode-ai && \
    opencode --version

# Copy models.json
COPY api.json /root/.cache/opencode/models.json

ENV OPENCODE_DISABLE_MODELS_FETCH=true
# Disable default plugins to avoid network requests during bootstrap
ENV OPENCODE_DISABLE_DEFAULT_PLUGINS=true
ENV XDG_CONFIG_HOME=/root/.config
ENV XDG_DATA_HOME=/root/.local/share
ENV XDG_CACHE_HOME=/root/.cache
ENV XDG_STATE_HOME=/root/.local/state
# Terminal support for TUI
ENV TERM=xterm-256color
ENV COLORTERM=truecolor
