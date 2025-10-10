fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Copy proto files from dubhe-indexer-grpc
    let proto_dir = "../dubhe-indexer-grpc/proto";
    let proto_file = "dubhe_grpc.proto";

    tonic_build::configure()
        .build_server(false) // We only need client
        .compile(&[&format!("{}/{}", proto_dir, proto_file)], &[proto_dir])?;

    Ok(())
}
