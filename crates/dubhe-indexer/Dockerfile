# Build stage: compile dubhe-indexer from workspace root
FROM rust:1-bookworm AS builder

# Install protoc (dubhe-indexer-grpc), clang/libclang (zstd-sys/bindgen), and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    protobuf-compiler \
    clang \
    libclang-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

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
