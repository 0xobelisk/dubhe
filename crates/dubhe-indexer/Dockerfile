# Build stage: compile dubhe-indexer from workspace root
FROM rust:1-bookworm AS builder

# Install clang/libclang (zstd-sys/bindgen), build tools, unzip and curl for protoc
RUN apt-get update && apt-get install -y --no-install-recommends \
    clang \
    libclang-dev \
    build-essential \
    curl \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install protoc from official release (includes google/protobuf/*.proto well-known types)
# Debian's protobuf-compiler does not ship .proto includes, so dubhe_grpc.proto import fails.
# Use TARGETARCH so multi-platform build (amd64 + arm64) gets the correct protoc binary.
ARG TARGETARCH
ENV PROTOC_VERSION=25.2
RUN case "${TARGETARCH}" in \
    "amd64")  PROTOC_ARCH="x86_64" ;; \
    "arm64")  PROTOC_ARCH="aarch_64" ;; \
    *) echo "Unsupported TARGETARCH: ${TARGETARCH}"; exit 1 ;; \
    esac \
    && curl -sSL -o /tmp/protoc.zip \
    "https://github.com/protocolbuffers/protobuf/releases/download/v${PROTOC_VERSION}/protoc-${PROTOC_VERSION}-linux-${PROTOC_ARCH}.zip" \
    && unzip -o /tmp/protoc.zip -d /usr/local bin/protoc \
    && unzip -o /tmp/protoc.zip -d /usr/local 'include/*' \
    && rm /tmp/protoc.zip
ENV PROTOC_INCLUDE=/usr/local/include

WORKDIR /workspace

# Copy workspace and crate manifests first for better layer caching
COPY Cargo.toml Cargo.lock* ./
COPY crates/dubhe-common crates/dubhe-common
COPY crates/dubhe-indexer-grpc crates/dubhe-indexer-grpc
COPY crates/dubhe-indexer-grpc-client crates/dubhe-indexer-grpc-client
COPY crates/dubhe-indexer-graphql crates/dubhe-indexer-graphql
COPY crates/dubhe-indexer-graphql-client crates/dubhe-indexer-graphql-client
COPY crates/dubhe-indexer crates/dubhe-indexer

# Build release binary (dependencies are cached if manifests unchanged)
RUN cargo build --release -p dubhe-indexer

# Runtime stage: minimal image with only the binary
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1001 -s /bin/sh app
USER app

COPY --from=builder /workspace/target/release/dubhe-indexer /usr/local/bin/dubhe-indexer

ENTRYPOINT ["/usr/local/bin/dubhe-indexer"]
CMD ["--help"]
